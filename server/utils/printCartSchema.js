const db = require("../config/db");

/**
 * Ensures cart_items / order_items can store custom 3D-print configurations.
 *
 * cart_items historically only supported product_id (NOT NULL) + variant_id.
 * To let 3D models be added to the cart we allow:
 *   - product_id NULL
 *   - item_type ('product' | 'print')
 *   - snapshot unit_price + full print config (file, dims, material, color...)
 *
 * This helper is idempotent — safe to call on every request / startup.
 * Failures are swallowed (logged once) so the app never crashes on old DBs.
 */

const CART_PRINT_COLUMNS = [
  ["item_type", "VARCHAR(20) DEFAULT 'product'"],
  ["unit_price", "DECIMAL(10,2) NULL"],
  ["file_name", "VARCHAR(300) NULL"],
  ["file_url", "VARCHAR(500) NULL"],
  ["file_public_id", "VARCHAR(300) NULL"],
  ["file_size", "DECIMAL(10,2) NULL"],
  ["dimension_x", "DECIMAL(8,2) NULL"],
  ["dimension_y", "DECIMAL(8,2) NULL"],
  ["dimension_z", "DECIMAL(8,2) NULL"],
  ["material_id", "INT NULL"],
  ["color_id", "INT NULL"],
  ["custom_color_hex", "VARCHAR(7) NULL"],
  ["infill_density", "INT DEFAULT 50"],
  ["surface_finish", "VARCHAR(20) DEFAULT 'standard'"],
  ["estimated_weight", "DECIMAL(10,2) NULL"],
];

let ensurePromise = null;
let warned = false;

const columnExists = async (conn, table, column) => {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
};

const ensureTable = async (conn, table, allowNullProduct) => {
  // Check table exists first
  const [tables] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [table]
  );
  if (tables.length === 0) return;

  for (const [col, def] of CART_PRINT_COLUMNS) {
    try {
      if (!(await columnExists(conn, table, col))) {
        await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
      }
    } catch (e) {
      // Ignore duplicate / permission errors — app continues with fallback queries
      if (!warned) console.warn(`⚠️ Could not add ${table}.${col}:`, e.message);
    }
  }

  if (allowNullProduct) {
    try {
      // Make product_id nullable so print rows can have NULL product_id
      await conn.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`product_id\` INT NULL`);
    } catch (e) {
      if (!warned) console.warn(`⚠️ Could not modify ${table}.product_id:`, e.message);
    }
  }
};

const ensurePrintOrdersTable = async (conn) => {
  try {
    const [tables] = await conn.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'printing_orders' LIMIT 1`
    );
    if (tables.length === 0) {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS printing_orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          order_number VARCHAR(50) NOT NULL UNIQUE,
          status ENUM('pending', 'confirmed', 'reviewing', 'in_production', 'printing', 'quality_check', 'shipped', 'delivered', 'cancelled') DEFAULT 'confirmed',
          file_name VARCHAR(300) NOT NULL,
          file_url VARCHAR(500) NOT NULL,
          file_public_id VARCHAR(300) DEFAULT NULL,
          file_size DECIMAL(10,2) DEFAULT NULL,
          dimension_x DECIMAL(8,2) DEFAULT NULL,
          dimension_y DECIMAL(8,2) DEFAULT NULL,
          dimension_z DECIMAL(8,2) DEFAULT NULL,
          material_id INT NOT NULL,
          color_id INT DEFAULT NULL,
          custom_color_hex VARCHAR(7) DEFAULT NULL,
          infill_density INT DEFAULT 50,
          surface_finish ENUM('standard', 'smooth') DEFAULT 'standard',
          quantity INT DEFAULT 1,
          estimated_weight DECIMAL(8,2) DEFAULT NULL,
          material_cost DECIMAL(10,2) NOT NULL,
          color_cost DECIMAL(10,2) DEFAULT 0.00,
          finish_cost DECIMAL(10,2) DEFAULT 0.00,
          subtotal DECIMAL(10,2) NOT NULL,
          tax_amount DECIMAL(10,2) DEFAULT 0.00,
          total_amount DECIMAL(10,2) NOT NULL,
          shipping_name VARCHAR(200) DEFAULT NULL,
          shipping_phone VARCHAR(20) DEFAULT NULL,
          shipping_address1 VARCHAR(500) DEFAULT NULL,
          shipping_city VARCHAR(100) DEFAULT NULL,
          shipping_state VARCHAR(100) DEFAULT NULL,
          shipping_pincode VARCHAR(10) DEFAULT NULL,
          payment_method ENUM('upi', 'card', 'net_banking', 'wallet', 'cod') DEFAULT 'cod',
          payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
          razorpay_order_id VARCHAR(200) DEFAULT NULL,
          razorpay_payment_id VARCHAR(200) DEFAULT NULL,
          notes TEXT DEFAULT NULL,
          admin_notes TEXT DEFAULT NULL,
          estimated_delivery VARCHAR(100) DEFAULT '3-5 Working Days',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user (user_id),
          INDEX idx_status (status)
        ) ENGINE=InnoDB
      `);
      console.log("✅ printing_orders table created (self-heal)");
    } else {
      // Ensure status ENUM includes 'confirmed' (added for mixed-order flow)
      const [colRows] = await conn.query(
        `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'printing_orders' AND COLUMN_NAME = 'status'`
      );
      if (colRows.length > 0 && !colRows[0].COLUMN_TYPE.includes("'confirmed'")) {
        await conn.query(
          `ALTER TABLE printing_orders MODIFY COLUMN status ENUM('pending','confirmed','reviewing','in_production','printing','quality_check','shipped','delivered','cancelled') DEFAULT 'confirmed'`
        );
        console.log("✅ printing_orders.status ENUM updated to include 'confirmed'");
      }
      // Migrate any existing pending rows to confirmed
      await conn.query(`UPDATE printing_orders SET status = 'confirmed' WHERE status = 'pending'`);
    }
  } catch (e) {
    if (!warned) console.warn("⚠️ Could not ensure printing_orders table:", e.message);
  }
};

const ensurePrintCartSchema = async () => {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    try {
      const conn = await db.getConnection();
      try {
        await ensureTable(conn, "cart_items", true);
        await ensureTable(conn, "order_items", false);
        await ensurePrintOrdersTable(conn);
      } finally {
        conn.release();
      }
    } catch (e) {
      if (!warned) {
        warned = true;
        console.warn("⚠️ print-cart schema check skipped:", e.message);
      }
    }
  })();
  return ensurePromise;
};

// Fire-and-forget on require so fresh deploys self-heal without manual SQL.
ensurePrintCartSchema().catch(() => {});

module.exports = { ensurePrintCartSchema, CART_PRINT_COLUMNS };
