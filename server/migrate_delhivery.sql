-- ============================================================
-- Delhivery shipping integration
-- Run once (or rely on utils/delhiverySchema.js self-heal on boot).
-- Safe to re-run: every statement is idempotent via procedures below.
-- ============================================================

-- ---------- helper: add column if missing ----------
DELIMITER $$
DROP PROCEDURE IF EXISTS dl_add_column$$
CREATE PROCEDURE dl_add_column(
  IN p_table VARCHAR(64), IN p_col VARCHAR(64), IN p_def TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_col
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_col, '` ', p_def);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL dl_add_column('orders', 'shipping_provider', "VARCHAR(30) DEFAULT NULL");
CALL dl_add_column('orders', 'delhivery_awb', "VARCHAR(50) DEFAULT NULL");
CALL dl_add_column('orders', 'shipping_status', "VARCHAR(60) DEFAULT NULL");
CALL dl_add_column('orders', 'shipment_created_at', "DATETIME NULL");
CALL dl_add_column('orders', 'pickup_request_id', "VARCHAR(100) DEFAULT NULL");
CALL dl_add_column('orders', 'shipping_error', "TEXT DEFAULT NULL");
CALL dl_add_column('orders', 'shipping_synced_at', "DATETIME NULL");

CALL dl_add_column('printing_orders', 'shipping_provider', "VARCHAR(30) DEFAULT NULL");
CALL dl_add_column('printing_orders', 'delhivery_awb', "VARCHAR(50) DEFAULT NULL");
CALL dl_add_column('printing_orders', 'shipping_status', "VARCHAR(60) DEFAULT NULL");
CALL dl_add_column('printing_orders', 'shipment_created_at', "DATETIME NULL");
CALL dl_add_column('printing_orders', 'pickup_request_id', "VARCHAR(100) DEFAULT NULL");
CALL dl_add_column('printing_orders', 'shipping_error', "TEXT DEFAULT NULL");
CALL dl_add_column('printing_orders', 'shipping_synced_at', "DATETIME NULL");

DROP PROCEDURE IF EXISTS dl_add_column;

-- ---------- AWB indexes (idempotent) ----------
DELIMITER $$
DROP PROCEDURE IF EXISTS dl_add_index$$
CREATE PROCEDURE dl_add_index(
  IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_col VARCHAR(64)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND INDEX_NAME = p_index
  ) THEN
    SET @ddl = CONCAT('CREATE INDEX `', p_index, '` ON `', p_table, '` (`', p_col, '`)');
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL dl_add_index('orders', 'idx_orders_awb', 'delhivery_awb');
CALL dl_add_index('printing_orders', 'idx_printing_awb', 'delhivery_awb');
DROP PROCEDURE IF EXISTS dl_add_index;

-- ---------- shipping events (tracking history / timeline) ----------
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
) ENGINE=InnoDB;

-- ---------- pickup requests log ----------
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
) ENGINE=InnoDB;

-- ---------- settings seeds ----------
INSERT INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
('delhivery_env', 'staging', 'string', 'Delhivery environment: staging | production'),
('delhivery_auto_create', '0', 'boolean', 'Auto-create Delhivery shipment when payment completes (1) or manual via admin (0)'),
('delhivery_default_weight_g', '500', 'number', 'Fallback package weight in grams when order weight is unknown'),
('delhivery_pickup_name', '', 'string', 'Delhivery pickup/warehouse location name'),
('delhivery_pickup_address', '', 'string', 'Pickup warehouse street address'),
('delhivery_pickup_city', '', 'string', 'Pickup warehouse city'),
('delhivery_pickup_state', '', 'string', 'Pickup warehouse state'),
('delhivery_pickup_pincode', '', 'string', 'Pickup warehouse pincode'),
('delhivery_pickup_phone', '', 'string', 'Pickup warehouse contact phone')
ON DUPLICATE KEY UPDATE setting_value = setting_value;
