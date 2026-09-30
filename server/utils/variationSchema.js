const db = require("../config/db");

/**
 * Self-healing schema for product Variations (product families like ESP32).
 *
 * - variations: id, name, slug (unique), is_active, sort_order, timestamps
 * - products.variation_id: nullable FK → variations(id) ON DELETE SET NULL
 *
 * The storefront product page lists every product under the same variation
 * (name-only pills) for instant switching.
 *
 * Idempotent — safe to require on every boot.
 */

let ensurePromise = null;
let warned = false;

const ensureVariationSchema = async () => {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    try {
      const conn = await db.getConnection();
      try {
        await conn.query(`
          CREATE TABLE IF NOT EXISTS variations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            slug VARCHAR(200) NOT NULL UNIQUE,
            is_active TINYINT(1) DEFAULT 1,
            sort_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB;
        `);

        const [cols] = await conn.query(
          `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'variation_id' LIMIT 1`
        );
        if (!cols.length) {
          await conn.query("ALTER TABLE `products` ADD COLUMN `variation_id` INT NULL AFTER `brand_id`");
          console.log("✅ products.variation_id column added");
        }

        // Foreign key (best-effort — skips if the constraint already exists
        // or the DB user lacks permission; the app nulls references manually).
        try {
          const [fks] = await conn.query(
            `SELECT 1 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND CONSTRAINT_NAME = 'fk_products_variation' LIMIT 1`
          );
          if (!fks.length) {
            await conn.query(
              "ALTER TABLE `products` ADD CONSTRAINT `fk_products_variation` FOREIGN KEY (`variation_id`) REFERENCES `variations` (`id`) ON DELETE SET NULL"
            );
            console.log("✅ products.variation_id foreign key added");
          }
        } catch (e) {
          if (!warned) console.warn("⚠️ products.variation_id FK skipped:", e.message);
        }

        console.log("🧩 Variations tables ready");
      } finally {
        conn.release();
      }
    } catch (e) {
      if (!warned) {
        warned = true;
        console.warn(`⚠️ variation schema check skipped: ${e.message}`);
      }
    }
  })();
  return ensurePromise;
};

// Fire-and-forget on require so fresh deploys self-heal without manual SQL.
ensureVariationSchema().catch(() => {});

module.exports = { ensureVariationSchema };
