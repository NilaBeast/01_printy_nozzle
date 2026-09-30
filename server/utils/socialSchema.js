const db = require("../config/db");

/**
 * Self-healing seeds for footer social-media links.
 *
 * Per platform: social_<key>_url + social_<key>_enabled ("1" = show).
 * Edited from Admin → Settings → Social Media; read publicly for the footer.
 *
 * Idempotent — existing values are never overwritten.
 */

const SOCIAL_PLATFORMS = ["facebook", "instagram", "youtube", "x", "linkedin", "whatsapp"];

let ensurePromise = null;

const ensureSocialSchema = async () => {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    try {
      const conn = await db.getConnection();
      try {
        for (const key of SOCIAL_PLATFORMS) {
          for (const [skey, svalue, stype, sdesc] of [
            [`social_${key}_url`, "", "string", `${key} profile URL shown in the footer`],
            [`social_${key}_enabled`, "0", "boolean", `Show ${key} in the footer (1 = on)`],
          ]) {
            try {
              await conn.query(
                `INSERT INTO site_settings (setting_key, setting_value, setting_type, description)
                 VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = setting_value`,
                [skey, svalue, stype, sdesc]
              );
            } catch (e) {
              console.warn(`⚠️ Could not seed social setting ${skey}: ${e.message}`);
            }
          }
        }
      } finally {
        conn.release();
      }
    } catch (e) {
      console.warn(`⚠️ social schema check skipped: ${e.message}`);
    }
  })();
  return ensurePromise;
};

// Fire-and-forget on require so fresh deploys self-heal without manual SQL.
ensureSocialSchema().catch(() => {});

module.exports = { ensureSocialSchema, SOCIAL_PLATFORMS };
