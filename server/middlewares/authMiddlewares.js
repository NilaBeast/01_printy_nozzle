const jwt = require("jsonwebtoken");
const db = require("../config/db");
require("dotenv").config();

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.query(
      "SELECT id, first_name, last_name, email, phone, role, is_active, is_verified FROM users WHERE id = ?",
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    if (!rows[0].is_active) {
      return res.status(403).json({
        success: false,
        message: "Account has been deactivated",
      });
    }

    if (!rows[0].is_verified) {
      return res.status(403).json({
        success: false,
        message: "Account not verified",
      });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }
    next();
  };
};

module.exports = { protect, authorizeRoles };
