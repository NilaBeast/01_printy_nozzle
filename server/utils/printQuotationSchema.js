const db = require("../config/db");

/**
 * Self-healing schema for 3D-print WhatsApp quotations.
 *
 * Guests send a quote request (details + model file) from the 3D printing
 * page. The request is stored in `print_quotations` so the admin can review
 * it under 3D Printing → 3D Print Quotations and generate a manual invoice
 * from it (which auto-creates a `printing_orders` row).
 *
 * Also relaxes `printing_orders.user_id` to NULL so guest (no-account)
 * quotation orders can live in the print queue alongside user orders.
 * All admin print-order reads use LEFT JOIN users, so NULL is display-safe.
 */

let ensurePromise = null;
let warned = false;

const columnExists = async (conn, table, column) => {
  const [rows] = await conn.query(
    "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1",
    [table, column]
  );
  return rows.length > 0;
};

const ensureQuotationTable = async (conn) => {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS print_quotations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(200) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      customer_email VARCHAR(255) DEFAULT NULL,
      customer_address TEXT NOT NULL,
      customer_address1 VARCHAR(500) DEFAULT NULL,
      customer_address2 VARCHAR(500) DEFAULT NULL,
      customer_city VARCHAR(100) DEFAULT NULL,
      customer_state VARCHAR(100) DEFAULT NULL,
      customer_pincode VARCHAR(10) DEFAULT NULL,
      customer_country VARCHAR(100) DEFAULT 'India',
      file_name VARCHAR(300) NOT NULL,
      file_url VARCHAR(500) NOT NULL,
      file_public_id VARCHAR(300) DEFAULT NULL,
      file_size DECIMAL(10,2) DEFAULT NULL,
      dimension_x DECIMAL(8,2) DEFAULT NULL,
      dimension_y DECIMAL(8,2) DEFAULT NULL,
      dimension_z DECIMAL(8,2) DEFAULT NULL,
      material_id INT DEFAULT NULL,
      material_name VARCHAR(100) DEFAULT NULL,
      color_id INT DEFAULT NULL,
      color_name VARCHAR(100) DEFAULT NULL,
      custom_color_hex VARCHAR(7) DEFAULT NULL,
      quantity INT DEFAULT 1,
      status ENUM('new','quoted','invoiced','cancelled') DEFAULT 'new',
      manual_invoice_id INT DEFAULT NULL,
      printing_order_id INT DEFAULT NULL,
      admin_notes TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB
  `);

  // Links back to the invoice / print order created from this quotation.
  const extraCols = [
    ["manual_invoice_id", "INT DEFAULT NULL"],
    ["printing_order_id", "INT DEFAULT NULL"],
    ["customer_address1", "VARCHAR(500) DEFAULT NULL"],
    ["customer_address2", "VARCHAR(500) DEFAULT NULL"],
    ["customer_city", "VARCHAR(100) DEFAULT NULL"],
    ["customer_state", "VARCHAR(100) DEFAULT NULL"],
    ["customer_pincode", "VARCHAR(10) DEFAULT NULL"],
    ["customer_country", "VARCHAR(100) DEFAULT 'India'"],
  ];
  for (const [col, def] of extraCols) {
    try {
      if (!(await columnExists(conn, "print_quotations", col))) {
        await conn.query(`ALTER TABLE \`print_quotations\` ADD COLUMN \`${col}\` ${def}`);
      }
    } catch (e) {
      if (!warned) console.warn(`Could not add print_quotations.${col}:`, e.message);
    }
  }
};

const ensureGuestPrintOrders = async (conn) => {
  try {
    const [tables] = await conn.query(
      "SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'printing_orders' LIMIT 1"
    );
    if (tables.length === 0) return;
    // Guest quotation orders have no user account — allow NULL user_id.
    // The existing FK permits NULLs; admin reads already LEFT JOIN users.
    await conn.query("ALTER TABLE `printing_orders` MODIFY COLUMN `user_id` INT NULL");
  } catch (e) {
    if (!warned) console.warn("Could not relax printing_orders.user_id:", e.message);
  }
};

const ensurePrintQuotationSchema = async () => {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    try {
      const conn = await db.getConnection();
      try {
        await ensureQuotationTable(conn);
        await ensureGuestPrintOrders(conn);
      } finally {
        conn.release();
      }
    } catch (e) {
      if (!warned) {
        warned = true;
        console.warn("print-quotation schema check skipped:", e.message);
      }
    }
  })();
  return ensurePromise;
};

// Fire-and-forget on require so fresh deploys self-heal without manual SQL.
ensurePrintQuotationSchema().catch(() => {});

module.exports = { ensurePrintQuotationSchema };
