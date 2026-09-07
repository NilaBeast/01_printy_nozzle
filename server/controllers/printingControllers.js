const db = require("../config/db");
const crypto = require("crypto");
const { uploadFile } = require("../utils/cloudinaryUploader");
const { calculatePrintPrice } = require("../utils/priceCalculator");

/* ===================== UPLOAD PRINT FILE ===================== */
const uploadPrintFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload a 3D model file (.STL, .OBJ, or .3MF)" });
    }

    // Upload to Cloudinary as raw file
    const result = await uploadFile({
      filePath: req.file.path,
      folder: "electrolab/prints",
      resourceType: "raw",
      publicId: `print_${Date.now()}_${Math.round(Math.random() * 1e4)}`,
    });

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      file: {
        name: req.file.originalname,
        url: result.url,
        public_id: result.public_id,
        size: (req.file.size / (1024 * 1024)).toFixed(2), // MB
      },
    });
  } catch (error) {
    console.error("Upload print file error:", error);
    return res.status(500).json({ success: false, message: "File upload failed" });
  }
};

/* ===================== GET MATERIALS ===================== */
const getMaterials = async (req, res) => {
  try {
    const [materials] = await db.query(
      "SELECT * FROM printing_materials WHERE is_active = 1 ORDER BY sort_order ASC"
    );

    return res.status(200).json({ success: true, materials });
  } catch (error) {
    console.error("Get materials error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== GET COLORS ===================== */
const getColors = async (req, res) => {
  try {
    const [colors] = await db.query(
      "SELECT * FROM printing_colors WHERE is_active = 1 ORDER BY sort_order ASC"
    );

    return res.status(200).json({ success: true, colors });
  } catch (error) {
    console.error("Get colors error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== CALCULATE PRINT PRICE ===================== */
const calculatePrice = async (req, res) => {
  try {
    const {
      estimated_weight,
      material_id,
      color_id,
      infill_density = 50,
      surface_finish = "standard",
      quantity = 1,
    } = req.body;

    if (!estimated_weight || !material_id) {
      return res.status(400).json({ success: false, message: "Estimated weight and material are required" });
    }

    // Get material
    const [materials] = await db.query("SELECT * FROM printing_materials WHERE id = ? AND is_active = 1", [material_id]);
    if (materials.length === 0) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    // Get color adjustment
    let colorAdjustment = 0;
    if (color_id) {
      const [colors] = await db.query("SELECT price_adjustment FROM printing_colors WHERE id = ?", [color_id]);
      if (colors.length > 0) colorAdjustment = colors[0].price_adjustment;
    }

    // Get GST rate and smooth finish cost from settings
    const [settings] = await db.query(
      "SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('gst_rate', 'smooth_finish_per_gram')"
    );
    const settingsMap = {};
    settings.forEach((s) => (settingsMap[s.setting_key] = parseFloat(s.setting_value)));

    const pricing = calculatePrintPrice({
      estimatedWeight: parseFloat(estimated_weight),
      pricePerGram: parseFloat(materials[0].price_per_gram),
      infillDensity: parseInt(infill_density),
      surfaceFinish: surface_finish,
      smoothFinishPerGram: settingsMap.smooth_finish_per_gram || 3,
      colorAdjustment,
      quantity: parseInt(quantity),
      gstRate: settingsMap.gst_rate || 18,
    });

    return res.status(200).json({
      success: true,
      pricing: {
        ...pricing,
        material_name: materials[0].name,
        price_per_gram: materials[0].price_per_gram,
      },
    });
  } catch (error) {
    console.error("Calculate price error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== CREATE PRINT ORDER ===================== */
const createPrintOrder = async (req, res) => {
  try {
    const {
      file_name, file_url, file_public_id, file_size,
      dimension_x, dimension_y, dimension_z,
      material_id, color_id, custom_color_hex,
      infill_density = 50, surface_finish = "standard", quantity = 1,
      estimated_weight,
      shipping_name, shipping_phone, shipping_address1,
      shipping_city, shipping_state, shipping_pincode,
      payment_method = "cod",
      notes,
    } = req.body;

    /* -------- Validation -------- */
    if (!file_name || !file_url || !material_id || !estimated_weight) {
      return res.status(400).json({ success: false, message: "File, material, and estimated weight are required" });
    }

    // Get material
    const [materials] = await db.query("SELECT * FROM printing_materials WHERE id = ? AND is_active = 1", [material_id]);
    if (materials.length === 0) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    // Get color
    let colorAdjustment = 0;
    if (color_id) {
      const [colors] = await db.query("SELECT price_adjustment FROM printing_colors WHERE id = ?", [color_id]);
      if (colors.length > 0) colorAdjustment = colors[0].price_adjustment;
    }

    // Get settings
    const [settings] = await db.query(
      "SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('gst_rate', 'smooth_finish_per_gram')"
    );
    const settingsMap = {};
    settings.forEach((s) => (settingsMap[s.setting_key] = parseFloat(s.setting_value)));

    // Calculate price
    const pricing = calculatePrintPrice({
      estimatedWeight: parseFloat(estimated_weight),
      pricePerGram: parseFloat(materials[0].price_per_gram),
      infillDensity: parseInt(infill_density),
      surfaceFinish: surface_finish,
      smoothFinishPerGram: settingsMap.smooth_finish_per_gram || 3,
      colorAdjustment,
      quantity: parseInt(quantity),
      gstRate: settingsMap.gst_rate || 18,
    });

    // Generate order number
    const orderNumber = "3D" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString("hex").toUpperCase();

    // Create order
    const [result] = await db.query(
      `INSERT INTO printing_orders (
        user_id, order_number, status,
        file_name, file_url, file_public_id, file_size,
        dimension_x, dimension_y, dimension_z,
        material_id, color_id, custom_color_hex,
        infill_density, surface_finish, quantity,
        estimated_weight, material_cost, color_cost, finish_cost,
        subtotal, tax_amount, total_amount,
        shipping_name, shipping_phone, shipping_address1,
        shipping_city, shipping_state, shipping_pincode,
        payment_method, payment_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, orderNumber, "pending",
        file_name, file_url, file_public_id || null, file_size || null,
        dimension_x || null, dimension_y || null, dimension_z || null,
        material_id, color_id || null, custom_color_hex || null,
        parseInt(infill_density), surface_finish, parseInt(quantity),
        pricing.effectiveWeight, pricing.materialCost, pricing.colorCost, pricing.finishCost,
        pricing.subtotal, pricing.taxAmount, pricing.totalAmount,
        shipping_name || null, shipping_phone || null, shipping_address1 || null,
        shipping_city || null, shipping_state || null, shipping_pincode || null,
        payment_method, payment_method === "cod" ? "pending" : "pending",
        notes || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "3D print order placed successfully",
      order: {
        id: result.insertId,
        order_number: orderNumber,
        total_amount: pricing.totalAmount,
        estimated_delivery: "3-5 Working Days",
      },
    });
  } catch (error) {
    console.error("Create print order error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== GET USER PRINT ORDERS ===================== */
const getUserPrintOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [countResult] = await db.query(
      "SELECT COUNT(*) as total FROM printing_orders WHERE user_id = ?",
      [req.user.id]
    );

    const [orders] = await db.query(
      `SELECT po.*, pm.name as material_name, pc.name as color_name, pc.hex_code
       FROM printing_orders po
       JOIN printing_materials pm ON po.material_id = pm.id
       LEFT JOIN printing_colors pc ON po.color_id = pc.id
       WHERE po.user_id = ?
       ORDER BY po.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), offset]
    );

    return res.status(200).json({
      success: true,
      orders,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get user print orders error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== GET PRINT ORDER BY ID ===================== */
const getPrintOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const [orders] = await db.query(
      `SELECT po.*, pm.name as material_name, pm.price_per_gram,
              pc.name as color_name, pc.hex_code
       FROM printing_orders po
       JOIN printing_materials pm ON po.material_id = pm.id
       LEFT JOIN printing_colors pc ON po.color_id = pc.id
       WHERE po.id = ? AND po.user_id = ?`,
      [id, req.user.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "Print order not found" });
    }

    return res.status(200).json({ success: true, order: orders[0] });
  } catch (error) {
    console.error("Get print order by ID error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  uploadPrintFile,
  getMaterials,
  getColors,
  calculatePrice,
  createPrintOrder,
  getUserPrintOrders,
  getPrintOrderById,
};
