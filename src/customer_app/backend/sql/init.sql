CREATE DATABASE IF NOT EXISTS ccd_store;
USE ccd_store;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(150) NOT NULL,
  role ENUM('customer', 'admin') DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(120) NOT NULL,
  description TEXT,
  hero_image VARCHAR(255),
  rating DECIMAL(3,2) DEFAULT 4.5,
  review_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  color VARCHAR(80),
  size VARCHAR(50),
  price DECIMAL(10,2) NOT NULL,
  inventory INT DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  status ENUM('pending','preparing','ready','completed','cancelled') DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_variant_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_variant_id) REFERENCES product_variants(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_id INT,
  customer_name VARCHAR(150) NOT NULL,
  rating INT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO users (email, password_hash, name, role)
VALUES
  ('admin@cafecoffeeday.com', '$2a$10$RKVDt0ewsGQKzBSSMSmc5O1s5n2xe50Tzw9uQWGWpZJYG1ChcxrG', 'Cafe Admin', 'admin')
ON DUPLICATE KEY UPDATE email=email;

INSERT INTO users (email, password_hash, name)
VALUES
  ('customer@cafecoffeeday.com', '$2a$10$RKVDt0ewsGQKzBSSMSmc5O1s5n2xe50Tzw9uQWGWpZJYG1ChcxrG', 'Loyal Customer')
ON DUPLICATE KEY UPDATE email=email;

INSERT INTO products (slug, name, category, description, hero_image)
VALUES
  ('signature-latte', 'Signature Latte', 'Beverages', 'Silky espresso with signature caramel drizzle.', '/images/latte.jpg'),
  ('cold-brew-delight', 'Cold Brew Delight', 'Beverages', 'Cold-steeped blend with citrus notes.', '/images/coldbrew.jpg'),
  ('vegan-brownie', 'Vegan Brownie', 'Desserts', 'Decadent chocolate brownie made vegan-friendly.', '/images/brownie.jpg')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

INSERT INTO product_variants (product_id, color, size, price, inventory)
VALUES
  (1, 'Caramel', 'Tall', 4.50, 120),
  (1, 'Mocha', 'Grande', 5.25, 90),
  (2, 'Original', 'Bottle', 6.50, 150),
  (2, 'Vanilla', 'Bottle', 6.75, 150),
  (3, 'Classic', 'Slice', 3.95, 200),
  (3, 'Hazelnut', 'Slice', 4.25, 180)
ON DUPLICATE KEY UPDATE price=VALUES(price), inventory=VALUES(inventory);

INSERT INTO reviews (product_id, user_id, customer_name, rating, comment)
VALUES
  (1, 2, 'Loyal Customer', 5, 'Perfectly balanced latte with amazing aroma!'),
  (1, 2, 'Loyal Customer', 4, 'Loved it chilled with oat milk.'),
  (2, 2, 'Loyal Customer', 5, 'My go-to cold brew every morning.')
ON DUPLICATE KEY UPDATE comment=VALUES(comment);
