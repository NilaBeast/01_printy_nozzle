-- Printynozzle material-specific colors migration
-- Run in phpMyAdmin for existing DBs (new installs get this via query.sql + self-heal).
-- Semantics: rows link a material to the colors it offers.
-- A material with NO linked rows offers every active color (backward compatible).

CREATE TABLE IF NOT EXISTS material_colors (
  material_id INT NOT NULL,
  color_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (material_id, color_id),
  FOREIGN KEY (material_id) REFERENCES printing_materials(id) ON DELETE CASCADE,
  FOREIGN KEY (color_id) REFERENCES printing_colors(id) ON DELETE CASCADE
) ENGINE=InnoDB;
