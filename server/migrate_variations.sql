-- Printynozzle product Variations migration (product families like ESP32)
-- Run in phpMyAdmin for existing DBs (new installs get this via query.sql + self-heal).

CREATE TABLE IF NOT EXISTS variations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `variation_id` INT NULL AFTER `brand_id`;
