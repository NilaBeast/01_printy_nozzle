const db = require("../config/db");

/**
 * Self-healing schema for the Delhivery shipping integration.
 *
 * Adds AWB / shipping-status columns to `orders` + `printing_orders`,
 * creates `shipping_events` (tracking history) + `pickup_requests` (log),
 * and seeds Delhivery `site_settings` keys.
 *
 * Idempotent — safe to run on every boot. Failures are logged, never thrown.
 */

const SHIPPING_COLUMNS = [
  ["shipping_provider", "VARCHAR(30) DEFAULT NULL"],
  ["delhivery_awb", "VARCHAR(50) DEFAULT NULL"],
  ["shipping_status", "VARCHAR(60) DEFAULT NULL"],
  ["shipment_created_at", "DATETIME NULL"],
  ["pickup_request_id", "VARCHAR(100) DEFAULT NULL"],
  ["shipping_error", "TEXT DEFAULT NULL"],
  ["shipping_synced_at", "DATETIME NULL"],
];

const DELHIVERY_SETTING_SEEDS = [
  ["delhivery_env", "staging", "string", "Delhivery environment: staging | production"],
  ["delhivery_auto_create", "0", "boolean", "Auto-create Delhivery shipment when payment completes (1) or manual via admin (0)"],
  ["delhivery_default_weight_g", "500", "number", "Fallback package weight in grams when order weight is unknown"],
  ["delhivery_pickup_name", "", "string", "Delhivery pickup/warehouse location name"],
  ["delhivery_pickup_address", "", "string", "Pickup warehouse street address"],
  ["delhivery_pickup_city", "", "string", "Pickup warehouse city"],
  ["delhivery_pickup_state", "", "string", "Pickup warehouse state"],
  ["delhivery_pickup_pincode", "", "string", "Pickup warehouse pincode"],
  ["delhivery_pickup_phone", "", "string", "Pickup warehouse contact phone"],
];

let ensurePromise = null;
let warned = false;
const warnOnce = (msg) => {
  if (!warned) console.warn(msg);
};

const columnExists = async (conn, table, column) => {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
};

const indexExists = async (conn, table, index) => {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [table, index]
  );
  return rows.length > 0;
};

const ensureShippingColumns = async (conn, table) => {
  const [tables] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [table]
  );
  if (tables.length === 0) return;
  for (const [col, def] of SHIPPING_COLUMNS) {
    try {
      if (!(await columnExists(conn, table, col))) {
        await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
      }
    } catch (e) {
      warnOnce(`⚠️ Could not add ${table}.${col}: ${e.message}`);
    }
  }
};

const ensureDelhiverySchema = async () => {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    try {
      const conn = await db.getConnection();
      try {
        await ensureShippingColumns(conn, "orders");
        await ensureShippingColumns(conn, "printing_orders");

        try {
          if (!(await indexExists(conn, "orders", "idx_orders_awb"))) {
            await conn.query("CREATE INDEX `idx_orders_awb` ON `orders` (`delhivery_awb`)");
          }
          if (!(await indexExists(conn, "printing_orders", "idx_printing_awb"))) {
            await conn.query("CREATE INDEX `idx_printing_awb` ON `printing_orders` (`delhivery_awb`)");
          }
        } catch (e) {
          warnOnce(`⚠️ Could not add Delhivery AWB indexes: ${e.message}`);
        }

        try {
          await conn.query(`
            CREATE TABLE IF NOT EXISTS shipping_events (
              id INT AUTO_INCREMENT PRIMARY KEY,
              order_type ENUM('order', 'print') NOT NULL DEFAULT 'order',
              order_id INT NOT NULL,
              awb VARCHAR(50) DEFAULT NULL,
              status VARCHAR(60) DEFAULT NULL,
              message TEXT DEFAULT NULL,
              raw JSON DEFAULT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_shipping_events_order (order_type, order_id),
              INDEX idx_shipping_events_awb (awb)
            ) ENGINE=InnoDB
          `);
          await conn.query(`
            CREATE TABLE IF NOT EXISTS pickup_requests (
              id INT AUTO_INCREMENT PRIMARY KEY,
              provider VARCHAR(30) DEFAULT 'delhivery',
              pickup_location VARCHAR(200) DEFAULT NULL,
              pickup_date DATE DEFAULT NULL,
              slot VARCHAR(50) DEFAULT NULL,
              awbs JSON DEFAULT NULL,
              request_id VARCHAR(100) DEFAULT NULL,
              status VARCHAR(50) DEFAULT 'requested',
              raw JSON DEFAULT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
          `);
        } catch (e) {
          warnOnce(`⚠️ Could not create shipping tables: ${e.message}`);
        }

        try {
          for (const [key, value, type, desc] of DELHIVERY_SETTING_SEEDS) {
            await conn.query(
              `INSERT INTO site_settings (setting_key, setting_value, setting_type, description)
               VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = setting_value`,
              [key, value, type, desc]
            );
          }
        } catch (e) {
          warnOnce(`⚠️ Could not seed Delhivery settings: ${e.message}`);
        }
      } finally {
        conn.release();
      }
    } catch (e) {
      warnOnce(`⚠️ delhivery schema check skipped: ${e.message}`);
    }
  })();
  return ensurePromise;
};

// Fire-and-forget on require so fresh deploys self-heal without manual SQL.
ensureDelhiverySchema().catch(() => {});

module.exports = { ensureDelhiverySchema };
