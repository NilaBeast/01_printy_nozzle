-- ============================================================
-- Migration: allow custom 3D prints inside cart + orders
-- Run this in phpMyAdmin if your DB was created before this update.
-- (New installs already get these columns via query.sql, and the
--  server also self-heals on startup via utils/printCartSchema.js)
-- ============================================================

-- printing_orders: add 'confirmed' to status ENUM and default to 'confirmed'
ALTER TABLE `printing_orders` MODIFY COLUMN `status` ENUM('pending', 'confirmed', 'reviewing', 'in_production', 'printing', 'quality_check', 'shipped', 'delivered', 'cancelled') DEFAULT 'confirmed';

-- Migrate existing pending print orders to confirmed
UPDATE `printing_orders` SET `status` = 'confirmed' WHERE `status` = 'pending';

-- cart_items: allow NULL product (prints have no product_id)
-- MySQL 8: MODIFY is idempotent, safe to re-run.
ALTER TABLE `cart_items` MODIFY COLUMN `product_id` INT NULL;

-- cart_items print columns (run each; ignore "Duplicate column" errors)
ALTER TABLE `cart_items` ADD COLUMN `item_type` VARCHAR(20) DEFAULT 'product';
ALTER TABLE `cart_items` ADD COLUMN `unit_price` DECIMAL(10,2) NULL;
ALTER TABLE `cart_items` ADD COLUMN `file_name` VARCHAR(300) NULL;
ALTER TABLE `cart_items` ADD COLUMN `file_url` VARCHAR(500) NULL;
ALTER TABLE `cart_items` ADD COLUMN `file_public_id` VARCHAR(300) NULL;
ALTER TABLE `cart_items` ADD COLUMN `file_size` DECIMAL(10,2) NULL;
ALTER TABLE `cart_items` ADD COLUMN `dimension_x` DECIMAL(8,2) NULL;
ALTER TABLE `cart_items` ADD COLUMN `dimension_y` DECIMAL(8,2) NULL;
ALTER TABLE `cart_items` ADD COLUMN `dimension_z` DECIMAL(8,2) NULL;
ALTER TABLE `cart_items` ADD COLUMN `material_id` INT NULL;
ALTER TABLE `cart_items` ADD COLUMN `color_id` INT NULL;
ALTER TABLE `cart_items` ADD COLUMN `custom_color_hex` VARCHAR(7) NULL;
ALTER TABLE `cart_items` ADD COLUMN `infill_density` INT DEFAULT 50;
ALTER TABLE `cart_items` ADD COLUMN `surface_finish` VARCHAR(20) DEFAULT 'standard';
ALTER TABLE `cart_items` ADD COLUMN `estimated_weight` DECIMAL(10,2) NULL;

-- order_items print columns (run each; ignore "Duplicate column" errors)
ALTER TABLE `order_items` ADD COLUMN `item_type` VARCHAR(20) DEFAULT 'product';
ALTER TABLE `order_items` ADD COLUMN `unit_price` DECIMAL(10,2) NULL;
ALTER TABLE `order_items` ADD COLUMN `file_name` VARCHAR(300) NULL;
ALTER TABLE `order_items` ADD COLUMN `file_url` VARCHAR(500) NULL;
ALTER TABLE `order_items` ADD COLUMN `file_public_id` VARCHAR(300) NULL;
ALTER TABLE `order_items` ADD COLUMN `file_size` DECIMAL(10,2) NULL;
ALTER TABLE `order_items` ADD COLUMN `dimension_x` DECIMAL(8,2) NULL;
ALTER TABLE `order_items` ADD COLUMN `dimension_y` DECIMAL(8,2) NULL;
ALTER TABLE `order_items` ADD COLUMN `dimension_z` DECIMAL(8,2) NULL;
ALTER TABLE `order_items` ADD COLUMN `material_id` INT NULL;
ALTER TABLE `order_items` ADD COLUMN `color_id` INT NULL;
ALTER TABLE `order_items` ADD COLUMN `custom_color_hex` VARCHAR(7) NULL;
ALTER TABLE `order_items` ADD COLUMN `infill_density` INT DEFAULT 50;
ALTER TABLE `order_items` ADD COLUMN `surface_finish` VARCHAR(20) DEFAULT 'standard';
ALTER TABLE `order_items` ADD COLUMN `estimated_weight` DECIMAL(10,2) NULL;
