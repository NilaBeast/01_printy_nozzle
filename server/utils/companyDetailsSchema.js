const db = require("../config/db");

/**
 * Self-healing migration for optional company / GST details on orders.
 *
 * - orders / printing_orders / manual_invoices gain:
 *     company_name, company_address, company_gstin (all NULL = B2C order)
 * - Shown on the GST invoice customer block when present.
 *
 * Idempotent — safe to call on every request / startup.
 */

const COMPANY_COLUMNS = [
  ["company_name", "VARCHAR(200) NULL"],
  ["company_address", "VARCHAR(500) NULL"],
  ["company_gstin", "VARCHAR(20) NULL"],
];

let warned = false;

const columnExists = async (conn, table, column) => {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
};

const ensureCompanyDetailsSchema = async () => {
  try {
    const conn = await db.getConnection();
    try {
      for (const table of ["orders", "printing_orders", "manual_invoices"]) {
        try {
          const [tables] = await conn.query(
            `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
            [table]
          );
          if (!tables.length) continue;
          for (const [col, def] of COMPANY_COLUMNS) {
            try {
              if (!(await columnExists(conn, table, col))) {
                await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
                console.log(`✅ ${table}.${col} column added`);
              }
            } catch (e) {
              if (!warned) console.warn(`⚠️ Could not add ${table}.${col}:`, e.message);
            }
          }
        } catch (e) {
          if (!warned) console.warn(`⚠️ Company schema check skipped for ${table}:`, e.message);
        }
      }
    } finally {
      conn.release();
    }
  } catch (e) {
    if (!warned) {
      warned = true;
      console.warn("⚠️ company details schema check skipped:", e.message);
    }
  }
};

// Fire-and-forget on require so fresh deploys self-heal without manual SQL.
ensureCompanyDetailsSchema().catch(() => {});

module.exports = { ensureCompanyDetailsSchema, COMPANY_COLUMNS };
