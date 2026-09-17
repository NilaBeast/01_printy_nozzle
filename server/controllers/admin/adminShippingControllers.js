const db = require("../../config/db");
const delhivery = require("../../utils/delhivery");
const {
  getShippingSettings,
  createShipmentForOrder,
  syncActiveShipments,
} = require("../../utils/shippingSync");

/* ===================== GET /admin/shipping/status =====================
 * Tells the admin panel exactly what is / isn't configured so the
 * "add token in env → whole system works" promise is visible.
 */
const getShippingStatus = async (req, res) => {
  try {
    const cfg = delhivery.getConfig();
    const settings = await getShippingSettings();
    const pickupReady = Boolean(settings.pickup.name) && /^\d{6}$/.test(settings.pickup.pincode || "");
    return res.status(200).json({
      success: true,
      data: {
        provider: "delhivery",
        env: settings.env || cfg.env,
        token_configured: cfg.enabled,
        auto_create: settings.autoCreate,
        pickup_configured: pickupReady,
        pickup: settings.pickup,
        default_weight_g: settings.defaultWeightG,
        ready: cfg.enabled && pickupReady,
      },
    });
  } catch (error) {
    console.error("Admin shipping status error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== POST /admin/shipping/shipment =====================
 * Body: { order_type: "order"|"print", order_id }
 * Manual create / retry. Works whenever the token + pickup are set,
 * regardless of the auto-create toggle.
 */
const createShipment = async (req, res) => {
  try {
    const { order_type = "order", order_id } = req.body || {};
    if (!["order", "print"].includes(order_type) || !order_id) {
      return res.status(400).json({ success: false, message: "order_type and order_id are required" });
    }
    const result = await createShipmentForOrder(order_type, order_id, { manual: true });
    if (result.skipped) {
      return res.status(400).json({ success: false, message: result.message });
    }
    return res.status(201).json({ success: true, message: "Shipment created with Delhivery", data: result });
  } catch (error) {
    console.error("Admin create shipment error:", error);
    const status = error && (error.code === "DELHIVERY_DISABLED" || /not configured|required/i.test(error.message || ""))
      ? 400
      : 502;
    return res.status(status).json({ success: false, message: error.message || "Shipment creation failed" });
  }
};

/* ===================== GET /admin/shipping/label?awb=… =====================
 * Proxies the Delhivery packing slip (PDF by default) to the admin browser.
 */
const downloadLabel = async (req, res) => {
  try {
    const awb = String(req.query.awb || "").trim();
    if (!awb) return res.status(400).json({ success: false, message: "awb is required" });
    const pdf = String(req.query.pdf || "true").toLowerCase() !== "false";
    const { buffer, contentType } = await delhivery.getLabel(awb, { pdf });
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="delhivery-label-${awb}.${pdf ? "pdf" : "html"}"`);
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("Admin label download error:", error);
    const status = error && error.code === "DELHIVERY_DISABLED" ? 400 : 502;
    return res.status(status).json({ success: false, message: error.message || "Label download failed" });
  }
};

/* ===================== POST /admin/shipping/pickup =====================
 * Body: { pickup_date: "YYYY-MM-DD" | ["…"], slot?, awbs?: [...] }
 * Raises ONE pickup request (many shipments). Links returned request id
 * back onto the matching orders for visibility.
 */
const raisePickup = async (req, res) => {
  try {
    const { pickup_date, slot = "11:00", awbs = [] } = req.body || {};
    if (!pickup_date) {
      return res.status(400).json({ success: false, message: "pickup_date (YYYY-MM-DD) is required" });
    }
    const settings = await getShippingSettings();
    if (!settings.pickup.name) {
      return res.status(400).json({ success: false, message: "Pickup warehouse is not configured in Settings → Shipping" });
    }
    const list = Array.isArray(awbs) ? awbs.map((a) => String(a).trim()).filter(Boolean) : [];
    const result = await delhivery.requestPickup({
      pickup_location: settings.pickup.name,
      pickup_date,
      pickup_time: slot,
      expected_package_count: Math.max(list.length, 1),
    });
    const requestId = result.requestId || null;

    let logId = null;
    try {
      const [r] = await db.query(
        `INSERT INTO pickup_requests (provider, pickup_location, pickup_date, slot, awbs, request_id, status, raw)
         VALUES ('delhivery', ?, ?, ?, ?, ?, 'requested', ?)`,
        [
          settings.pickup.name,
          Array.isArray(pickup_date) ? pickup_date[0] : pickup_date,
          slot,
          JSON.stringify(list),
          requestId,
          JSON.stringify(result.raw || {}).slice(0, 8000),
        ]
      );
      logId = r.insertId;
    } catch (e) {
      console.warn("Pickup request log skipped:", e.message);
    }

    if (requestId && list.length) {
      try {
        const placeholders = list.map(() => "?").join(",");
        await db.query(
          `UPDATE orders SET pickup_request_id = ? WHERE delhivery_awb IN (${placeholders})`,
          [requestId, ...list]
        );
        await db.query(
          `UPDATE printing_orders SET pickup_request_id = ? WHERE delhivery_awb IN (${placeholders})`,
          [requestId, ...list]
        );
      } catch (e) {
        console.warn("Linking pickup id to orders skipped:", e.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Pickup request raised with Delhivery",
      data: { request_id: requestId, pickup_log_id: logId, packages: list.length },
    });
  } catch (error) {
    console.error("Admin raise pickup error:", error);
    const status = error && error.code === "DELHIVERY_DISABLED" ? 400 : 502;
    return res.status(status).json({ success: false, message: error.message || "Pickup request failed" });
  }
};

/* ===================== POST /admin/shipping/sync =====================
 * Body (optional): { limit } — polls Delhivery for all active AWBs.
 * Same applier the webhook uses.
 */
const syncShipments = async (req, res) => {
  try {
    const summary = await syncActiveShipments({ limit: req.body?.limit || 50 });
    if (summary.skipped) {
      return res.status(400).json({ success: false, message: summary.message });
    }
    return res.status(200).json({ success: true, message: "Tracking sync complete", data: summary });
  } catch (error) {
    console.error("Admin sync shipments error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== POST /admin/shipping/warehouse =====================
 * One-time: register the pickup warehouse with Delhivery.
 */
const registerWarehouse = async (req, res) => {
  try {
    const result = await delhivery.createWarehouse(req.body || {});
    return res.status(201).json({ success: true, message: "Warehouse request sent to Delhivery", data: result });
  } catch (error) {
    console.error("Admin register warehouse error:", error);
    const status = error && error.code === "DELHIVERY_DISABLED" ? 400 : 502;
    return res.status(status).json({ success: false, message: error.message || "Warehouse registration failed" });
  }
};

/* ===================== GET /admin/shipping/waybills?count=N ===================== */
const getWaybills = async (req, res) => {
  try {
    const bills = await delhivery.fetchWaybills(req.query.count || 1);
    return res.status(200).json({ success: true, data: { waybills: bills } });
  } catch (error) {
    console.error("Admin fetch waybills error:", error);
    const status = error && error.code === "DELHIVERY_DISABLED" ? 400 : 502;
    return res.status(status).json({ success: false, message: error.message || "Waybill fetch failed" });
  }
};

module.exports = {
  getShippingStatus,
  createShipment,
  downloadLabel,
  raisePickup,
  syncShipments,
  registerWarehouse,
  getWaybills,
};
