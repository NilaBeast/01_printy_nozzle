const db = require("../config/db");
const bcrypt = require("bcrypt");
const passwordValidation = require("../utils/passwordValidation");
const { uploadFile } = require("../utils/cloudinaryUploader");

const saltRounds = Number(process.env.SALT_ROUNDS) || 10;

/* ===================== FORMAT MEMBER SINCE ===================== */
const formatMemberSince = (date) => {
  if (!date) return "Aug 2024";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

/* ===================== GET FULL PROFILE DATA ===================== */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user details
    const [users] = await db.query(
      `SELECT id, first_name, last_name, email, phone, avatar_url, dob, gender,
              email_notifications, marketing_updates, order_updates, role, created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = users[0];

    // Compute initials (e.g. "Diprati Das" -> "DD")
    const initials = `${(user.first_name || "").charAt(0)}${(user.last_name || "").charAt(0)}`.toUpperCase() || "U";

    // Format DOB to YYYY-MM-DD
    const dobFormatted = user.dob ? new Date(user.dob).toISOString().split("T")[0] : null;

    // Account Summary Metrics
    const [orderCountRes] = await db.query("SELECT COUNT(*) as count FROM orders WHERE user_id = ?", [userId]);
    const [printCountRes] = await db.query("SELECT COUNT(*) as count FROM printing_orders WHERE user_id = ?", [userId]);
    const totalOrders = (orderCountRes[0].count || 0) + (printCountRes[0].count || 0);

    const [wishlistCountRes] = await db.query("SELECT COUNT(*) as count FROM wishlist WHERE user_id = ?", [userId]);
    const wishlistItems = wishlistCountRes[0].count || 0;

    const [addressCountRes] = await db.query("SELECT COUNT(*) as count FROM addresses WHERE user_id = ?", [userId]);
    const savedAddressesCount = addressCountRes[0].count || 0;

    const [printFilesCountRes] = await db.query(
      "SELECT COUNT(DISTINCT file_url) as count FROM printing_orders WHERE user_id = ?",
      [userId]
    );
    const printFilesCount = printFilesCountRes[0].count || 0;

    // Saved Addresses
    const [addresses] = await db.query(
      "SELECT id, type, full_name, phone, email, address_line1, address_line2, city, state, pincode, country, is_default FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC",
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: {
        profile: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          phone: user.phone,
          avatar_url: user.avatar_url,
          initials,
          dob: dobFormatted,
          gender: user.gender || "Male",
          role: user.role,
          created_at: user.created_at,
        },
        account_summary: {
          total_orders: totalOrders,
          wishlist_items: wishlistItems,
          saved_addresses: savedAddressesCount,
          print_files: printFilesCount,
          member_since: formatMemberSince(user.created_at),
        },
        preferences: {
          email_notifications: Boolean(user.email_notifications),
          marketing_updates: Boolean(user.marketing_updates),
          order_updates: Boolean(user.order_updates),
        },
        saved_addresses: addresses.map((a) => ({
          ...a,
          is_default: Boolean(a.is_default),
          type: a.type || "Home",
          formatted: `${a.address_line1}${a.address_line2 ? ', ' + a.address_line2 : ''}, ${a.city}, ${a.state} ${a.pincode}, ${a.country || 'India'}`,
        })),
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== UPDATE PROFILE INFORMATION ===================== */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name, phone, dob, gender } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: "First name and last name are required",
      });
    }

    await db.query(
      `UPDATE users SET
         first_name = ?,
         last_name = ?,
         phone = COALESCE(?, phone),
         dob = COALESCE(?, dob),
         gender = COALESCE(?, gender)
       WHERE id = ?`,
      [first_name.trim(), last_name.trim(), phone ? phone.trim() : null, dob || null, gender || null, userId]
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully!",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== UPLOAD AVATAR PHOTO ===================== */
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload an image file (JPG, PNG up to 2MB)" });
    }

    const uploadRes = await uploadFile(req.file.buffer, "avatars", "image");

    await db.query("UPDATE users SET avatar_url = ? WHERE id = ?", [uploadRes.secure_url, userId]);

    return res.status(200).json({
      success: true,
      message: "Profile photo updated successfully!",
      avatar_url: uploadRes.secure_url,
    });
  } catch (error) {
    console.error("Upload avatar error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== UPDATE USER PREFERENCES ===================== */
const updatePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email_notifications, marketing_updates, order_updates } = req.body;

    await db.query(
      `UPDATE users SET
         email_notifications = COALESCE(?, email_notifications),
         marketing_updates = COALESCE(?, marketing_updates),
         order_updates = COALESCE(?, order_updates)
       WHERE id = ?`,
      [
        email_notifications !== undefined ? (email_notifications ? 1 : 0) : null,
        marketing_updates !== undefined ? (marketing_updates ? 1 : 0) : null,
        order_updates !== undefined ? (order_updates ? 1 : 0) : null,
        userId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Notification preferences updated successfully!",
    });
  } catch (error) {
    console.error("Update preferences error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== CHANGE PASSWORD ===================== */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (confirm_password && new_password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation password do not match",
      });
    }

    if (!(await passwordValidation(new_password))) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long with uppercase, lowercase, number and special character",
      });
    }

    // Verify current password
    const [users] = await db.query("SELECT password_hash FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(current_password, users[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    // Hash and update
    const newHash = await bcrypt.hash(new_password, saltRounds);
    await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, userId]);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully!",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== SAVED ADDRESSES CRUD ===================== */
const getAddresses = async (req, res) => {
  try {
    const [addresses] = await db.query(
      "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC",
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      addresses: addresses.map((a) => ({
        ...a,
        is_default: Boolean(a.is_default),
      })),
    });
  } catch (error) {
    console.error("Get addresses error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const addAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      type = "Home",
      full_name,
      phone,
      email,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      country = "India",
      is_default = false,
    } = req.body;

    if (!full_name || !phone || !address_line1 || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "Full name, phone, address line 1, city, state, and pincode are required",
      });
    }

    // If making default, unset other defaults
    if (is_default) {
      await db.query("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [userId]);
    }

    // If first address, make it default automatically
    const [existing] = await db.query("SELECT COUNT(*) as count FROM addresses WHERE user_id = ?", [userId]);
    const willBeDefault = is_default || existing[0].count === 0 ? 1 : 0;

    const [result] = await db.query(
      `INSERT INTO addresses (user_id, type, full_name, phone, email, address_line1, address_line2, city, state, pincode, country, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        type,
        full_name.trim(),
        phone.trim(),
        email ? email.trim() : null,
        address_line1.trim(),
        address_line2 ? address_line2.trim() : null,
        city.trim(),
        state.trim(),
        pincode.trim(),
        country || "India",
        willBeDefault,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Address added successfully!",
      address_id: result.insertId,
    });
  } catch (error) {
    console.error("Add address error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      type,
      full_name,
      phone,
      email,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      country,
      is_default,
    } = req.body;

    const [existing] = await db.query("SELECT id FROM addresses WHERE id = ? AND user_id = ?", [id, userId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    if (is_default) {
      await db.query("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [userId]);
    }

    await db.query(
      `UPDATE addresses SET
         type = COALESCE(?, type),
         full_name = COALESCE(?, full_name),
         phone = COALESCE(?, phone),
         email = ?,
         address_line1 = COALESCE(?, address_line1),
         address_line2 = ?,
         city = COALESCE(?, city),
         state = COALESCE(?, state),
         pincode = COALESCE(?, pincode),
         country = COALESCE(?, country),
         is_default = COALESCE(?, is_default)
       WHERE id = ? AND user_id = ?`,
      [
        type || null,
        full_name || null,
        phone || null,
        email !== undefined ? email : null,
        address_line1 || null,
        address_line2 !== undefined ? address_line2 : null,
        city || null,
        state || null,
        pincode || null,
        country || null,
        is_default !== undefined ? (is_default ? 1 : 0) : null,
        id,
        userId,
      ]
    );

    return res.status(200).json({ success: true, message: "Address updated successfully!" });
  } catch (error) {
    console.error("Update address error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [result] = await db.query("DELETE FROM addresses WHERE id = ? AND user_id = ?", [id, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    return res.status(200).json({ success: true, message: "Address removed successfully!" });
  } catch (error) {
    console.error("Delete address error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await db.query("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [userId]);
    const [result] = await db.query("UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?", [id, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    return res.status(200).json({ success: true, message: "Default address updated!" });
  } catch (error) {
    console.error("Set default address error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== WISHLIST CRUD ===================== */
const getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const [items] = await db.query(
      `SELECT p.id, p.name, p.slug, p.tagline, p.price, p.compare_price, p.stock, (p.stock > 0) as is_in_stock,
              p.avg_rating, p.review_count,
              (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
              w.created_at as added_at
       FROM wishlist w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = ? AND p.is_active = 1
       ORDER BY w.id DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      wishlist: items,
      count: items.length,
    });
  } catch (error) {
    console.error("Get wishlist error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const toggleWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const [existing] = await db.query("SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?", [userId, productId]);

    if (existing.length > 0) {
      await db.query("DELETE FROM wishlist WHERE id = ?", [existing[0].id]);
      return res.status(200).json({ success: true, in_wishlist: false, message: "Removed from wishlist" });
    } else {
      await db.query("INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)", [userId, productId]);
      return res.status(201).json({ success: true, in_wishlist: true, message: "Added to wishlist" });
    }
  } catch (error) {
    console.error("Toggle wishlist error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    await db.query("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?", [userId, productId]);
    return res.status(200).json({ success: true, message: "Removed from wishlist" });
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== USER 3D PRINT FILES ===================== */
const getUser3DFiles = async (req, res) => {
  try {
    const userId = req.user.id;

    const [files] = await db.query(
      `SELECT po.id as order_id, po.order_number, po.file_name, po.file_url, po.file_size,
              po.created_at, po.status,
              pm.name as material_name, pc.name as color_name
       FROM printing_orders po
       LEFT JOIN printing_materials pm ON po.material_id = pm.id
       LEFT JOIN printing_colors pc ON po.color_id = pc.id
       WHERE po.user_id = ?
       ORDER BY po.id DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      files,
    });
  } catch (error) {
    console.error("Get user 3D files error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  updatePreferences,
  changePassword,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getWishlist,
  toggleWishlist,
  removeFromWishlist,
  getUser3DFiles,
};
