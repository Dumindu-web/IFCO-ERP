-- Default password for all users is 'password123'
-- Hash generated via bcrypt.hashSync('password123', 10)
INSERT INTO users (username, password_hash, role) VALUES 
('admin', '$2b$10$RNUoDwFRCgyaRBStKRmtwe5tEiUHj/fZZrUw0PpywiemYDgL5BGpi', 'admin'),
('manager', '$2b$10$RNUoDwFRCgyaRBStKRmtwe5tEiUHj/fZZrUw0PpywiemYDgL5BGpi', 'manager'),
('staff', '$2b$10$RNUoDwFRCgyaRBStKRmtwe5tEiUHj/fZZrUw0PpywiemYDgL5BGpi', 'staff');

INSERT INTO categories (name, description) VALUES 
('F.G', 'Finished Goods'),
('Raw', 'Raw Materials'),
('Veg', 'Vegetables'),
('Semi', 'Semi-Finished Goods'),
('Packing', 'Packing Materials');

INSERT INTO warehouses (name, location) VALUES 
('Stores-01', 'Main Site'),
('stores-02', 'Main Site'),
('Stores-03', 'Main Site'),
('Freezer-01', 'Main Site'),
('Freezer-02', 'Main Site'),
('Chillie Room', 'Main Site');

INSERT INTO suppliers (name, contact_name, email, phone, address) VALUES 
('TechCorp', 'John Doe', 'john@techcorp.com', '555-0100', '123 Tech St'),
('OfficeDepot', 'Jane Smith', 'jane@officedepot.com', '555-0200', '456 Office Blvd');

INSERT INTO products (name, category_id, sku, min_stock_level, supplier_id) VALUES 
('Laptop Pro', 1, 'LAP-001', 10, 1),
('Wireless Mouse', 1, 'MOU-001', 50, 1),
('Printer Paper', 2, 'PAP-001', 100, 2),
('Ergonomic Chair', 3, 'CHR-001', 5, 2);

INSERT INTO inventory (product_id, warehouse_id, quantity, reserved_quantity) VALUES 
(1, 1, 50, 0),
(2, 1, 200, 0),
(3, 1, 500, 0),
(4, 1, 20, 0),
(1, 2, 10, 0),
(2, 2, 50, 0);

INSERT INTO inventory_transactions (product_id, warehouse_id, type, quantity, user_id, notes) VALUES 
(1, 1, 'in', 50, 1, 'Initial stock'),
(2, 1, 'in', 200, 1, 'Initial stock'),
(3, 1, 'in', 500, 1, 'Initial stock'),
(4, 1, 'in', 20, 1, 'Initial stock'),
(1, 2, 'in', 10, 1, 'Initial stock'),
(2, 2, 'in', 50, 1, 'Initial stock');
