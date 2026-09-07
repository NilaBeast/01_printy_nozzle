-- ============================================================
-- ElectroLab / PrintyNozzle — Complete MySQL Database Schema
-- Run this file in phpMyAdmin to create all tables & seed data
-- ============================================================

CREATE DATABASE IF NOT EXISTS printynozzle;
USE printynozzle;

-- ===================== USERS =====================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer', 'admin') DEFAULT 'customer',
  is_active TINYINT(1) DEFAULT 1,
  is_verified TINYINT(1) DEFAULT 1,
  avatar_url VARCHAR(500) DEFAULT NULL,
  dob DATE DEFAULT NULL,
  gender ENUM('Male', 'Female', 'Other') DEFAULT NULL,
  email_notifications TINYINT(1) DEFAULT 1,
  marketing_updates TINYINT(1) DEFAULT 0,
  order_updates TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ===================== ADDRESSES =====================
CREATE TABLE IF NOT EXISTS addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('Home', 'Office', 'Other') DEFAULT 'Home',
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) DEFAULT NULL,
  address_line1 VARCHAR(500) NOT NULL,
  address_line2 VARCHAR(500) DEFAULT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  country VARCHAR(100) DEFAULT 'India',
  is_default TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ===================== CATEGORIES =====================
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  description TEXT DEFAULT NULL,
  image_url VARCHAR(500) DEFAULT NULL,
  parent_id INT DEFAULT NULL,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ===================== BRANDS =====================
CREATE TABLE IF NOT EXISTS brands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  logo_url VARCHAR(500) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  website_url VARCHAR(300) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ===================== PRODUCTS =====================
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(300) NOT NULL,
  slug VARCHAR(300) NOT NULL UNIQUE,
  tagline VARCHAR(300) DEFAULT NULL,
  badge VARCHAR(100) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  short_description VARCHAR(500) DEFAULT NULL,
  sku VARCHAR(100) DEFAULT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  compare_price DECIMAL(10,2) DEFAULT NULL,
  cost_price DECIMAL(10,2) DEFAULT NULL,
  category_id INT DEFAULT NULL,
  brand_id INT DEFAULT NULL,
  stock INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 5,
  weight DECIMAL(8,2) DEFAULT NULL,
  dimensions VARCHAR(100) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  is_featured TINYINT(1) DEFAULT 0,
  is_bestseller TINYINT(1) DEFAULT 0,
  is_new TINYINT(1) DEFAULT 0,
  tags VARCHAR(500) DEFAULT NULL,
  meta_title VARCHAR(300) DEFAULT NULL,
  meta_description VARCHAR(500) DEFAULT NULL,
  total_sold INT DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0.00,
  review_count INT DEFAULT 0,
  
  -- Rich Product Details (Overview, Specs, Pinout, Resources, FAQs, Applications)
  highlights JSON DEFAULT NULL,
  key_features JSON DEFAULT NULL,
  specifications JSON DEFAULT NULL,
  pinout_image VARCHAR(500) DEFAULT NULL,
  pinout_description TEXT DEFAULT NULL,
  resources JSON DEFAULT NULL,
  faqs JSON DEFAULT NULL,
  applications JSON DEFAULT NULL,
  trust_badges JSON DEFAULT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
  INDEX idx_category (category_id),
  INDEX idx_brand (brand_id),
  INDEX idx_price (price),
  INDEX idx_featured (is_featured),
  FULLTEXT INDEX idx_search (name, description, tags)
) ENGINE=InnoDB;

-- ===================== PRODUCT IMAGES =====================
CREATE TABLE IF NOT EXISTS product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  public_id VARCHAR(300) DEFAULT NULL,
  alt_text VARCHAR(300) DEFAULT NULL,
  sort_order INT DEFAULT 0,
  is_primary TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ===================== PRODUCT VARIANTS =====================
CREATE TABLE IF NOT EXISTS product_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  variant_name VARCHAR(200) NOT NULL,
  variant_value VARCHAR(200) NOT NULL,
  price_adjustment DECIMAL(10,2) DEFAULT 0.00,
  stock INT DEFAULT 0,
  sku VARCHAR(100) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ===================== REVIEWS =====================
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(300) DEFAULT NULL,
  comment TEXT DEFAULT NULL,
  is_verified_purchase TINYINT(1) DEFAULT 1,
  is_approved TINYINT(1) DEFAULT 1,
  is_visible TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_review (product_id, user_id)
) ENGINE=InnoDB;

-- ===================== WISHLIST =====================
CREATE TABLE IF NOT EXISTS wishlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_wishlist (user_id, product_id)
) ENGINE=InnoDB;

-- ===================== CART =====================
CREATE TABLE IF NOT EXISTS cart (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  coupon_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ===================== CART ITEMS =====================
CREATE TABLE IF NOT EXISTS cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cart_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT DEFAULT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cart_id) REFERENCES cart(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ===================== COUPONS =====================
CREATE TABLE IF NOT EXISTS coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(300) DEFAULT NULL,
  discount_type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0.00,
  max_discount DECIMAL(10,2) DEFAULT NULL,
  usage_limit INT DEFAULT NULL,
  used_count INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  valid_from DATETIME DEFAULT NULL,
  valid_until DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ===================== ORDERS =====================
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned') DEFAULT 'pending',
  
  -- Shipping Address
  shipping_name VARCHAR(200) NOT NULL,
  shipping_phone VARCHAR(20) NOT NULL,
  shipping_email VARCHAR(255) DEFAULT NULL,
  shipping_address1 VARCHAR(500) NOT NULL,
  shipping_address2 VARCHAR(500) DEFAULT NULL,
  shipping_city VARCHAR(100) NOT NULL,
  shipping_state VARCHAR(100) NOT NULL,
  shipping_pincode VARCHAR(10) NOT NULL,
  shipping_country VARCHAR(100) DEFAULT 'India',

  -- Billing Address
  billing_name VARCHAR(200) DEFAULT NULL,
  billing_phone VARCHAR(20) DEFAULT NULL,
  billing_address1 VARCHAR(500) DEFAULT NULL,
  billing_address2 VARCHAR(500) DEFAULT NULL,
  billing_city VARCHAR(100) DEFAULT NULL,
  billing_state VARCHAR(100) DEFAULT NULL,
  billing_pincode VARCHAR(10) DEFAULT NULL,
  billing_country VARCHAR(100) DEFAULT 'India',

  -- Delivery & Carrier
  delivery_option ENUM('standard', 'express', 'same_day') DEFAULT 'standard',
  shipping_cost DECIMAL(10,2) DEFAULT 0.00,
  tracking_number VARCHAR(100) DEFAULT NULL,
  shipping_carrier VARCHAR(100) DEFAULT 'BlueDart Express',
  
  -- Timeline Timestamps
  packed_at DATETIME DEFAULT NULL,
  shipped_at DATETIME DEFAULT NULL,
  out_for_delivery_at DATETIME DEFAULT NULL,
  delivered_at DATETIME DEFAULT NULL,
  cancelled_at DATETIME DEFAULT NULL,

  -- Payment
  payment_method ENUM('upi', 'card', 'net_banking', 'wallet', 'cod') DEFAULT 'cod',
  payment_method_label VARCHAR(100) DEFAULT 'Cash on Delivery',
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  razorpay_order_id VARCHAR(200) DEFAULT NULL,
  razorpay_payment_id VARCHAR(200) DEFAULT NULL,
  razorpay_signature VARCHAR(500) DEFAULT NULL,
  
  -- Totals
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0.00,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  
  coupon_id INT DEFAULT NULL,
  coupon_code VARCHAR(50) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_order_number (order_number)
) ENGINE=InnoDB;

-- ===================== ORDER ITEMS =====================
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT DEFAULT NULL,
  product_name VARCHAR(300) NOT NULL,
  product_image VARCHAR(500) DEFAULT NULL,
  category_name VARCHAR(200) DEFAULT NULL,
  variant_name VARCHAR(200) DEFAULT NULL,
  variant_value VARCHAR(200) DEFAULT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ===================== 3D PRINTING MATERIALS =====================
CREATE TABLE IF NOT EXISTS printing_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(50) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  price_per_gram DECIMAL(8,2) NOT NULL,
  density_g_cm3 DECIMAL(5,2) DEFAULT 1.24,
  best_for VARCHAR(500) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ===================== 3D PRINTING COLORS =====================
CREATE TABLE IF NOT EXISTS printing_colors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  hex_code VARCHAR(7) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  price_adjustment DECIMAL(8,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ===================== 3D PRINTING ORDERS =====================
CREATE TABLE IF NOT EXISTS printing_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  status ENUM('pending', 'reviewing', 'in_production', 'printing', 'quality_check', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  
  -- File Info
  file_name VARCHAR(300) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_public_id VARCHAR(300) DEFAULT NULL,
  file_size DECIMAL(10,2) DEFAULT NULL,
  
  -- Dimensions (mm)
  dimension_x DECIMAL(8,2) DEFAULT NULL,
  dimension_y DECIMAL(8,2) DEFAULT NULL,
  dimension_z DECIMAL(8,2) DEFAULT NULL,
  
  -- Print Settings
  material_id INT NOT NULL,
  color_id INT DEFAULT NULL,
  custom_color_hex VARCHAR(7) DEFAULT NULL,
  infill_density INT DEFAULT 50,
  surface_finish ENUM('standard', 'smooth') DEFAULT 'standard',
  quantity INT DEFAULT 1,
  
  -- Pricing
  estimated_weight DECIMAL(8,2) DEFAULT NULL,
  material_cost DECIMAL(10,2) NOT NULL,
  color_cost DECIMAL(10,2) DEFAULT 0.00,
  finish_cost DECIMAL(10,2) DEFAULT 0.00,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Shipping
  shipping_name VARCHAR(200) DEFAULT NULL,
  shipping_phone VARCHAR(20) DEFAULT NULL,
  shipping_address1 VARCHAR(500) DEFAULT NULL,
  shipping_city VARCHAR(100) DEFAULT NULL,
  shipping_state VARCHAR(100) DEFAULT NULL,
  shipping_pincode VARCHAR(10) DEFAULT NULL,
  
  -- Payment
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
  FOREIGN KEY (material_id) REFERENCES printing_materials(id),
  FOREIGN KEY (color_id) REFERENCES printing_colors(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ===================== NEWSLETTER SUBSCRIBERS =====================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  is_active TINYINT(1) DEFAULT 1,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMP DEFAULT NULL
) ENGINE=InnoDB;

-- ===================== HERO BANNERS =====================
CREATE TABLE IF NOT EXISTS hero_banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(300) DEFAULT NULL,
  subtitle VARCHAR(500) DEFAULT NULL,
  image_url VARCHAR(500) DEFAULT NULL,
  public_id VARCHAR(300) DEFAULT NULL,
  link_url VARCHAR(500) DEFAULT NULL,
  button_text VARCHAR(100) DEFAULT NULL,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ===================== SITE SETTINGS =====================
CREATE TABLE IF NOT EXISTS site_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT DEFAULT NULL,
  setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  description VARCHAR(300) DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ===================== CONTACT MESSAGES =====================
CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  subject VARCHAR(300) DEFAULT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  status ENUM('pending', 'read', 'replied', 'archived') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ===================== FAQS =====================
CREATE TABLE IF NOT EXISTS faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(100) DEFAULT 'general',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ===================== PINCODES (DELIVERY SERVICE) =====================
CREATE TABLE IF NOT EXISTS serviceable_pincodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pincode VARCHAR(10) NOT NULL UNIQUE,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  estimated_days VARCHAR(50) DEFAULT '3 - 5 working days',
  cod_available TINYINT(1) DEFAULT 1,
  express_available TINYINT(1) DEFAULT 1,
  is_serviceable TINYINT(1) DEFAULT 1
) ENGINE=InnoDB;


-- ============================================================
-- SEED DATA & SAMPLE RECORDS
-- ============================================================

-- Site Settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
('free_shipping_threshold', '999', 'number', 'Minimum order amount for free shipping (in INR)'),
('gst_rate', '18', 'number', 'GST percentage rate'),
('standard_shipping_cost', '0', 'number', 'Standard delivery cost (free above threshold)'),
('express_shipping_cost', '99', 'number', 'Express delivery cost'),
('same_day_shipping_cost', '149', 'number', 'Same day delivery cost'),
('site_name', 'ElectroLab', 'string', 'Website name'),
('site_tagline', 'Electronics & 3D Printing', 'string', 'Website tagline'),
('support_email', 'support@electrolab.in', 'string', 'Support email address'),
('support_phone', '+91 98765 43210', 'string', 'Support phone number'),
('whatsapp_number', '+919876543210', 'string', 'WhatsApp Support Number'),
('company_address', '123, Maker Street, Koramangala, Bengaluru, Karnataka 560034, India', 'string', 'Office Address'),
('business_hours', 'Mon - Sat: 10:00 AM - 7:00 PM | Sunday: Closed', 'string', 'Working Hours'),
('smooth_finish_per_gram', '3', 'number', 'Extra cost per gram for smooth finish')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Default Categories
INSERT INTO categories (name, slug, description, sort_order) VALUES
('Microcontrollers', 'microcontrollers', 'Arduino, ESP32, Raspberry Pi Pico and more', 1),
('Modules & Sensors', 'modules-sensors', 'Temperature, humidity, ultrasonic, and other sensors', 2),
('Power Supplies', 'power-supplies', 'Voltage regulators, adapters, battery modules', 3),
('Tools & Accessories', 'tools-accessories', 'Screwdrivers, soldering irons, breadboards', 4),
('Additive & 3D Parts', 'additive-3d-parts', '3D printer filaments, nozzles, and parts', 5),
('3D Printer Parts', '3d-printer-parts', 'Stepper motors, nozzles, heated beds', 6),
('Cables & Wires', 'cables-wires', 'Jumper wires, USB cables, connectors', 7),
('Displays', 'displays', 'LCD, OLED, TFT displays', 8),
('Robotics', 'robotics', 'Motors, wheels, chassis, robot kits', 9),
('IoT & Communication', 'iot-communication', 'WiFi, Bluetooth, LoRa, GSM modules', 10)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Default Brands
INSERT INTO brands (name, slug) VALUES
('ESPRESSIF', 'espressif'),
('Arduino', 'arduino'),
('Raspberry Pi', 'raspberry-pi'),
('HiLetgo', 'hiletgo'),
('DFRobot', 'dfrobot'),
('Seeed Studio', 'seeed-studio'),
('Adafruit', 'adafruit'),
('SparkFun', 'sparkfun')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 3D Printing Materials
INSERT INTO printing_materials (name, slug, code, description, price_per_gram, density_g_cm3, best_for, sort_order) VALUES
('PLA', 'pla', 'PLA', 'Easy to print, eco-friendly and great for everyday use.', 12.00, 1.24, 'Prototypes, Decor, Toys', 1),
('PETG', 'petg', 'PETG', 'Strong, durable and resistant to moisture and chemicals.', 15.00, 1.27, 'Functional parts, Enclosures', 2),
('ABS', 'abs', 'ABS', 'Tough and heat resistant, ideal for functional applications.', 14.00, 1.04, 'Mechanical parts, Tools', 3),
('TPU', 'tpu', 'TPU', 'Flexible, rubber-like material with great durability.', 18.00, 1.21, 'Wearables, Gaskets, Flexible parts', 4)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 3D Printing Colors
INSERT INTO printing_colors (name, hex_code, sort_order) VALUES
('Black', '#000000', 1),
('White', '#FFFFFF', 2),
('Grey', '#808080', 3),
('Red', '#FF0000', 4),
('Orange', '#FF8C00', 5),
('Yellow', '#FFD700', 6),
('Green', '#00C853', 7),
('Teal', '#009688', 8),
('Blue', '#0047FF', 9),
('Purple', '#9C27B0', 10),
('Pink', '#FF69B4', 11),
('Magenta', '#E040FB', 12)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- General / Contact FAQs
INSERT INTO faqs (category, question, answer, sort_order) VALUES
('contact', 'How can I track my order?', 'Once your order is shipped, you will receive an SMS and email with the tracking ID and link. You can also track it anytime directly under My Orders in your profile.', 1),
('contact', 'How does the 3D printing service work?', 'Simply upload your 3D model file (STL, OBJ, or 3MF), choose your preferred material (PLA, PETG, ABS, TPU), select infill density and surface finish. Our automated calculator gives you an instant quote to place your order!', 2),
('contact', 'What payment methods do you accept?', 'We accept UPI (Google Pay, PhonePe, Paytm), Credit & Debit Cards (Visa, MasterCard, RuPay), Net Banking, and Cash on Delivery (COD) on eligible pin codes.', 3),
('contact', 'What file formats are accepted for 3D printing?', 'We accept standard .STL, .OBJ, and .3MF files up to 100MB in size.', 4),
('contact', 'Do you offer bulk discounts?', 'Yes! For large volume component orders or bulk 3D printing batches, please contact our support team via the form above or email us at support@electrolab.in.', 5),
('contact', 'What is your return policy?', 'We provide a 7-day hassle-free replacement or return warranty on all electronic components in case of manufacturing defects.', 6);

-- Sample Serviceable Pincodes
INSERT INTO serviceable_pincodes (pincode, city, state, estimated_days, cod_available, express_available) VALUES
('560001', 'Bengaluru', 'Karnataka', '2 - 3 working days', 1, 1),
('560034', 'Bengaluru', 'Karnataka', '2 - 3 working days', 1, 1),
('110001', 'New Delhi', 'Delhi', '3 - 5 working days', 1, 1),
('400001', 'Mumbai', 'Maharashtra', '3 - 4 working days', 1, 1),
('700001', 'Kolkata', 'West Bengal', '3 - 5 working days', 1, 1),
('600001', 'Chennai', 'Tamil Nadu', '3 - 4 working days', 1, 1),
('500001', 'Hyderabad', 'Telangana', '3 - 4 working days', 1, 1)
ON DUPLICATE KEY UPDATE city = VALUES(city);

-- Admin User (admin@electrolab.in / Admin@123)
INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, is_verified) VALUES
(1, 'Admin', 'ElectroLab', 'admin@electrolab.in', '9876543210', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1)
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- Customer User (Diprati Das - diprati@example.com / User@1234)
INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, is_verified, dob, gender, email_notifications, marketing_updates, order_updates, created_at) VALUES
(2, 'Diprati', 'Das', 'diprati@example.com', '+91 98765 43210', '$2b$10$7R96bK6z6s1.W15gXj6GzeU8sI7bK/Q49vM9/W0PzY.pXq4j1V3sO', 'customer', 1, '2002-11-03', 'Male', 1, 0, 1, '2024-08-01 10:00:00')
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- Saved Addresses for Diprati Das
INSERT INTO addresses (id, user_id, type, full_name, phone, address_line1, address_line2, city, state, pincode, country, is_default) VALUES
(1, 2, 'Home', 'Diprati Das', '+91 98765 43210', '123, Maker Street', 'Koramangala', 'Bengaluru', 'Karnataka', '560034', 'India', 1),
(2, 2, 'Office', 'Diprati Das', '+91 98765 43210', 'XYZ Tech Park, 5th Floor', 'Outer Ring Road, Bellandur', 'Bengaluru', 'Karnataka', '560103', 'India', 0)
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

-- Rich ESP32 Product (Matches Screenshot 1)
INSERT INTO products (
  id, name, slug, tagline, badge, description, short_description, sku, price, compare_price, 
  category_id, brand_id, stock, is_active, is_featured, is_bestseller, is_new, tags, 
  avg_rating, review_count, total_sold,
  highlights, key_features, specifications, pinout_image, pinout_description, resources, faqs, applications, trust_badges
) VALUES (
  1,
  'ESP32 DevKit V1',
  'esp32-devkit-v1',
  'Wi-Fi + Bluetooth Development Board',
  'Bestseller',
  'The ESP32 DevKit V1 is a feature-rich development board based on the ESP-WROOM-32 module. It combines high performance, low power consumption, and wireless connectivity making it perfect for IoT and embedded applications. With support for both Wi-Fi and Bluetooth (Classic + BLE), it is widely used by hobbyists, students, and professionals.',
  'Wi-Fi + Bluetooth Development Board with Dual Core Tensilica LX6 Microcontroller',
  'ESP32-DK-V1',
  499.00,
  599.00,
  1,
  1,
  150,
  1,
  1,
  1,
  0,
  'esp32,wifi,bluetooth,iot,microcontroller,arduino,espressif',
  4.80,
  128,
  850,
  JSON_ARRAY(
    JSON_OBJECT('title', 'Dual Core', 'subtitle', '240 MHz', 'icon', 'cpu'),
    JSON_OBJECT('title', 'Wi-Fi', 'subtitle', '802.11 b/g/n', 'icon', 'wifi'),
    JSON_OBJECT('title', 'Bluetooth', 'subtitle', 'v4.2 (BLE)', 'icon', 'bluetooth'),
    JSON_OBJECT('title', 'Arduino /', 'subtitle', 'MicroPython', 'icon', 'code'),
    JSON_OBJECT('title', 'Wide', 'subtitle', 'Community Support', 'icon', 'community')
  ),
  JSON_ARRAY(
    'Powered by ESP-WROOM-32 (Dual-core Tensilica LX6)',
    'Wi-Fi 802.11 b/g/n and Bluetooth v4.2 (BLE + Classic)',
    '30+ GPIO pins with multiple peripheral support',
    'Supports Arduino IDE, ESP-IDF, MicroPython',
    'On-board USB to Serial (CH340 / CP2102)',
    'Compact and breadboard friendly design'
  ),
  JSON_OBJECT(
    'Microcontroller', 'ESP-WROOM-32 (Tensilica 32-bit LX6)',
    'Clock Frequency', 'Up to 240 MHz',
    'Flash Memory', '4 MB (32 MBit) SPI Flash',
    'SRAM', '520 KB SRAM',
    'Operating Voltage', '3.3V DC',
    'Input Voltage', '5V via Micro-USB or 5V-12V Vin pin',
    'Wi-Fi Protocol', '802.11 b/g/n (up to 150 Mbps)',
    'Bluetooth', 'Bluetooth v4.2 BR/EDR and BLE specification',
    'GPIO Pins', '30 Digital I/O pins with PWM, ADC, DAC',
    'Interfaces', '3x UART, 2x SPI, 2x I2C, 12-bit ADC, 8-bit DAC',
    'Dimensions', '51.5 mm x 28.5 mm x 12.0 mm',
    'Weight', '10.5 grams'
  ),
  'https://res.cloudinary.com/demo/image/upload/v1/esp32_pinout.png',
  'Pinout diagram featuring all 30 pins including 5V, 3V3, GND, EN, Touch, ADC, DAC, and SPI channels.',
  JSON_ARRAY(
    JSON_OBJECT('title', 'ESP32 Technical Datasheet (PDF)', 'type', 'PDF', 'url', 'https://espressif.com/esp32_datasheet.pdf'),
    JSON_OBJECT('title', 'ESP32 DevKit V1 Schematic & Pinout', 'type', 'Schematic', 'url', 'https://espressif.com/schematic.pdf'),
    JSON_OBJECT('title', 'Arduino IDE Setup & IoT Guide', 'type', 'Tutorial', 'url', 'https://docs.espressif.com/projects/arduino-esp32'),
    JSON_OBJECT('title', 'CP210x / CH340 USB Drivers (Windows & Mac)', 'type', 'Driver', 'url', 'https://silabs.com/drivers')
  ),
  JSON_ARRAY(
    JSON_OBJECT('question', 'Can I power the ESP32 directly via 5V?', 'answer', 'Yes, you can supply 5V through the micro-USB port or via the VIN pin. The on-board voltage regulator drops it to 3.3V.'),
    JSON_OBJECT('question', 'Is this compatible with the Arduino IDE?', 'answer', 'Yes, simply install the ESP32 board package in the Arduino IDE Boards Manager.'),
    JSON_OBJECT('question', 'Does it support Bluetooth Low Energy (BLE)?', 'answer', 'Yes, it supports both classic Bluetooth 4.2 and Bluetooth Low Energy (BLE).')
  ),
  JSON_ARRAY(
    'IoT Projects',
    'Home Automation',
    'Wireless Sensor Networks',
    'Robotics',
    'DIY Electronics',
    'Smart Wearables'
  ),
  JSON_ARRAY(
    'Original & High Quality',
    'Tested Before Shipping',
    '7 Days Easy Returns',
    'Fast Delivery Across India'
  )
) ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Product Images for ESP32 DevKit V1
INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary) VALUES
(1, 'https://res.cloudinary.com/demo/image/upload/v1/esp32_top.png', 'ESP32 DevKit V1 Top View', 0, 1),
(1, 'https://res.cloudinary.com/demo/image/upload/v1/esp32_angle.png', 'ESP32 DevKit V1 Angle View', 1, 0),
(1, 'https://res.cloudinary.com/demo/image/upload/v1/esp32_side.png', 'ESP32 DevKit V1 Side View', 2, 0),
(1, 'https://res.cloudinary.com/demo/image/upload/v1/esp32_box.png', 'ESP32 DevKit V1 Packaging Box', 3, 0),
(1, 'https://res.cloudinary.com/demo/image/upload/v1/esp32_bottom.png', 'ESP32 DevKit V1 Bottom View', 4, 0)
ON DUPLICATE KEY UPDATE image_url = VALUES(image_url);

-- Sample Reviews for ESP32
INSERT INTO reviews (product_id, user_id, rating, title, comment, is_verified_purchase, is_approved) VALUES
(1, 2, 5, 'Exceptional board for IoT projects!', 'Works right out of the box with Arduino IDE. Bluetooth and Wi-Fi range is phenomenal. Fast delivery too!', 1, 1)
ON DUPLICATE KEY UPDATE rating = VALUES(rating);

-- Sample Related Products (Arduino UNO, Raspberry Pi 4, DHT11, HC-SR04, NodeMCU, 0.96 OLED)
INSERT INTO products (id, name, slug, tagline, sku, price, compare_price, category_id, brand_id, stock, is_active, avg_rating, review_count, total_sold) VALUES
(2, 'Arduino UNO R3', 'arduino-uno-r3', 'ATmega328P Development Board', 'ARD-UNO-R3', 649.00, 799.00, 1, 2, 100, 1, 4.90, 93, 400),
(3, 'Raspberry Pi 4 (4GB)', 'raspberry-pi-4-4gb', 'Single Board Computer 4GB RAM', 'RPI-4-4GB', 4499.00, 5299.00, 1, 3, 45, 1, 4.95, 57, 180),
(4, 'DHT11 Temperature Sensor', 'dht11-sensor', 'Digital Temp & Humidity Sensor', 'DHT11', 49.00, 79.00, 2, NULL, 500, 1, 4.70, 312, 1200),
(5, 'HC-SR04 Ultrasonic Sensor', 'hc-sr04-ultrasonic', 'Ultrasonic Distance Measuring Module', 'HC-SR04', 149.00, 199.00, 2, NULL, 300, 1, 4.80, 214, 950),
(6, 'NodeMCU ESP8266', 'nodemcu-esp8266', 'WiFi IoT Development Board', 'ESP8266-NODEMCU', 299.00, 399.00, 1, 1, 220, 1, 4.75, 575, 1100),
(7, '0.96" OLED Display', '0-96-oled-display', '128x64 I2C OLED Module Blue', 'OLED-096', 199.00, 299.00, 8, NULL, 160, 1, 4.60, 88, 620),
(8, 'PLA 3D Printer Filament (Red)', 'pla-filament-red', '1.75mm 1kg Premium Spool', 'PLA-175-RED', 899.00, 1099.00, 5, NULL, 40, 1, 4.85, 45, 120),
(9, 'Precision Screwdriver Set', 'precision-screwdriver-set', '25-in-1 Repair Tool Kit', 'SCREW-25', 299.00, 399.00, 4, NULL, 80, 1, 4.80, 34, 150)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Sample Wishlist for Diprati Das
INSERT INTO wishlist (user_id, product_id) VALUES
(2, 3),
(2, 6)
ON DUPLICATE KEY UPDATE user_id = VALUES(user_id);

-- Sample Order #EL12456 (Matches Screenshots 3 & 4)
INSERT INTO orders (
  id, user_id, order_number, status, 
  shipping_name, shipping_phone, shipping_email, shipping_address1, shipping_address2, shipping_city, shipping_state, shipping_pincode, shipping_country,
  billing_name, billing_phone, billing_address1, billing_address2, billing_city, billing_state, billing_pincode, billing_country,
  delivery_option, shipping_cost, tracking_number, shipping_carrier,
  packed_at, shipped_at, out_for_delivery_at, delivered_at,
  payment_method, payment_method_label, payment_status,
  subtotal, discount, tax_amount, total_amount, created_at
) VALUES (
  1,
  2,
  'EL12456',
  'delivered',
  'Diprati Das',
  '+91 98765 43210',
  'diprati@example.com',
  '123, Maker Street',
  'Koramangala',
  'Bengaluru',
  'Karnataka',
  '560034',
  'India',
  'Diprati Das',
  '+91 98765 43210',
  '123, Maker Street',
  'Koramangala',
  'Bengaluru',
  'Karnataka',
  '560034',
  'India',
  'standard',
  0.00,
  'BLUEDART-882391024',
  'BlueDart Express',
  '2024-08-13 14:15:00',
  '2024-08-14 11:32:00',
  '2024-08-15 09:10:00',
  '2024-08-16 16:32:00',
  'upi',
  'UPI (GPay)',
  'paid',
  2745.00,
  0.00,
  494.10,
  3239.10,
  '2024-08-12 10:24:00'
) ON DUPLICATE KEY UPDATE order_number = VALUES(order_number);

-- Order Items for Order #EL12456
INSERT INTO order_items (order_id, product_id, product_name, category_name, variant_value, price, quantity, total) VALUES
(1, 1, 'ESP32 DevKit V1', 'Microcontrollers', 'Black', 499.00, 1, 499.00),
(1, 8, 'PLA 3D Printer Filament', 'Additive & 3D Parts', 'Blue | 1kg', 899.00, 2, 1798.00),
(1, 9, 'Precision Screwdriver Set', 'Tools & Accessories', '25 in 1', 299.00, 1, 299.00),
(1, 5, 'HC-SR04 Ultrasonic Sensor', 'Modules & Sensors', 'Standard', 149.00, 1, 149.00)
ON DUPLICATE KEY UPDATE product_name = VALUES(product_name);

-- Sample 3D Print Order #EL12412 (In Production)
INSERT INTO printing_orders (
  id, user_id, order_number, status, file_name, file_url, material_id, color_id, quantity,
  material_cost, subtotal, tax_amount, total_amount, payment_method, payment_status, created_at
) VALUES (
  1,
  2,
  'EL12412',
  'in_production',
  'Custom 3D Print (STL File)',
  'https://res.cloudinary.com/demo/raw/upload/v1/custom_model.stl',
  1,
  2,
  2,
  677.12,
  677.12,
  121.88,
  799.00,
  'upi',
  'paid',
  '2024-08-03 15:30:00'
) ON DUPLICATE KEY UPDATE order_number = VALUES(order_number);

-- Sample Order #EL12378 (Shipped)
INSERT INTO orders (
  id, user_id, order_number, status, 
  shipping_name, shipping_phone, shipping_address1, shipping_city, shipping_state, shipping_pincode,
  delivery_option, shipping_cost, tracking_number, shipping_carrier,
  shipped_at, payment_method, payment_method_label, payment_status,
  subtotal, discount, tax_amount, total_amount, created_at
) VALUES (
  2,
  2,
  'EL12378',
  'shipped',
  'Diprati Das',
  '+91 98765 43210',
  '123, Maker Street, Koramangala',
  'Bengaluru',
  'Karnataka',
  '560034',
  'standard',
  0.00,
  'DTDC-9921441',
  'DTDC',
  '2024-07-29 10:00:00',
  'card',
  'Credit Card',
  'paid',
  931.35,
  0.00,
  167.65,
  1099.00,
  '2024-07-28 11:20:00'
) ON DUPLICATE KEY UPDATE order_number = VALUES(order_number);

INSERT INTO order_items (order_id, product_id, product_name, category_name, price, quantity, total) VALUES
(2, 2, 'Arduino UNO R3', 'Microcontrollers', 649.00, 1, 649.00),
(2, 5, 'HC-SR04 Ultrasonic Sensor', 'Modules & Sensors', 149.00, 1, 149.00),
(2, 4, 'DHT11 Temperature Sensor', 'Modules & Sensors', 49.00, 1, 49.00)
ON DUPLICATE KEY UPDATE product_name = VALUES(product_name);

-- Sample 3D Print Order #EL12310 (Delivered)
INSERT INTO printing_orders (
  id, user_id, order_number, status, file_name, file_url, material_id, color_id, quantity,
  material_cost, subtotal, tax_amount, total_amount, payment_method, payment_status, created_at
) VALUES (
  2,
  2,
  'EL12310',
  'delivered',
  'Custom 3D Print (STL File)',
  'https://res.cloudinary.com/demo/raw/upload/v1/bracket.stl',
  2,
  1,
  1,
  550.85,
  550.85,
  99.15,
  650.00,
  'upi',
  'paid',
  '2024-07-12 09:15:00'
) ON DUPLICATE KEY UPDATE order_number = VALUES(order_number);

-- Sample Order #EL12298 (Cancelled)
INSERT INTO orders (
  id, user_id, order_number, status, 
  shipping_name, shipping_phone, shipping_address1, shipping_city, shipping_state, shipping_pincode,
  payment_method, payment_method_label, payment_status,
  subtotal, discount, tax_amount, total_amount, cancelled_at, created_at
) VALUES (
  3,
  2,
  'EL12298',
  'cancelled',
  'Diprati Das',
  '+91 98765 43210',
  '123, Maker Street, Koramangala',
  'Bengaluru',
  'Karnataka',
  '560034',
  'cod',
  'Cash on Delivery',
  'pending',
  355.93,
  0.00,
  64.07,
  420.00,
  '2024-07-06 14:00:00',
  '2024-07-05 16:45:00'
) ON DUPLICATE KEY UPDATE order_number = VALUES(order_number);
