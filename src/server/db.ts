import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const isProd = process.env.NODE_ENV === 'production';
const projectRoot = _dirname.endsWith('dist') ? path.join(_dirname, '..') : path.join(_dirname, '../..');

const dbPath = process.env.DB_PATH || path.join(projectRoot, 'inventory.db');

// Ensure directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const schemaPath = isProd ? path.join(projectRoot, 'src/server/schema.sql') : path.join(_dirname, 'schema.sql');
const seedPath = isProd ? path.join(projectRoot, 'src/server/seed.sql') : path.join(_dirname, 'seed.sql');

console.log('Initializing database at:', dbPath);
export const db = new Database(dbPath);
db.exec('PRAGMA foreign_keys = ON;');

// Initialize database
console.log('Loading schema from:', schemaPath);
const schema = fs.readFileSync(schemaPath, 'utf-8');
try {
  db.exec(schema);
  console.log('Schema applied successfully.');
} catch (err: any) {
  console.error('Error applying schema:', err.message);
  // If it fails due to the CHECK constraint change, we might need to handle it
  // But for now, let's assume the new tables were created at least
}

// Check if we need to seed
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  console.log('Seeding database from:', seedPath);
  const seed = fs.readFileSync(seedPath, 'utf-8');
  db.exec(seed);
  console.log('Database seeded successfully.');
} else {
  console.log('Database already seeded. User count:', userCount.count);
}

// Ensure categories are updated to the new set
const requiredCategories = [
  { name: 'F.G', description: 'Finished Goods' },
  { name: 'Raw', description: 'Raw Materials' },
  { name: 'Veg', description: 'Vegetables' },
  { name: 'Semi', description: 'Semi-Finished Goods' },
  { name: 'Packing', description: 'Packing Materials' }
];

for (const cat of requiredCategories) {
  const exists = db.prepare('SELECT id FROM categories WHERE name = ?').get(cat.name);
  if (!exists) {
    db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(cat.name, cat.description);
    console.log(`Added category: ${cat.name}`);
  }
}

// Ensure warehouses are updated to the new set
const requiredWarehouses = [
  { name: 'Stores-01', location: 'Main Site' },
  { name: 'stores-02', location: 'Main Site' },
  { name: 'Stores-03', location: 'Main Site' },
  { name: 'Freezer-01', location: 'Main Site' },
  { name: 'Freezer-02', location: 'Main Site' },
  { name: 'Chillie Room', location: 'Main Site' }
];

for (const wh of requiredWarehouses) {
  const exists = db.prepare('SELECT id FROM warehouses WHERE name = ?').get(wh.name);
  if (!exists) {
    db.prepare('INSERT INTO warehouses (name, location) VALUES (?, ?)').run(wh.name, wh.location);
    console.log(`Added warehouse: ${wh.name}`);
  }
}

// Migrate products to include unit_of_measure
try {
  db.prepare('SELECT unit_of_measure FROM products LIMIT 1').get();
} catch (e) {
  console.log('Adding unit_of_measure to products table...');
  db.exec('ALTER TABLE products ADD COLUMN unit_of_measure TEXT DEFAULT "pcs"');
}

// Migrate sales_orders to include 'dispatched' status
const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sales_orders'").get() as any;
if (tableInfo && !tableInfo.sql.includes("'dispatched'")) {
  console.log('Migrating sales_orders table to include dispatched status...');
  db.exec(`
    PRAGMA foreign_keys=off;
    BEGIN TRANSACTION;
    CREATE TABLE IF NOT EXISTS sales_orders_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      so_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      sales_person TEXT,
      warehouse_id INTEGER,
      status TEXT NOT NULL CHECK(status IN ('pending', 'dispatched', 'completed', 'cancelled')),
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    );
    INSERT INTO sales_orders_new SELECT * FROM sales_orders;
    DROP TABLE sales_orders;
    ALTER TABLE sales_orders_new RENAME TO sales_orders;
    COMMIT;
    PRAGMA foreign_keys=on;
  `);
}

// Ensure dispatch_notes tables exist
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dispatch_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispatch_number TEXT UNIQUE NOT NULL,
      so_id INTEGER NOT NULL,
      vehicle_number TEXT NOT NULL,
      driver_name TEXT NOT NULL,
      driver_id_number TEXT NOT NULL,
      company_name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending_payment', 'payment_received', 'payment_not_received')),
      payment_type TEXT CHECK(payment_type IN ('cash', 'check') OR payment_type IS NULL),
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (so_id) REFERENCES sales_orders(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS dispatch_note_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispatch_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      FOREIGN KEY (dispatch_id) REFERENCES dispatch_notes(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);
} catch (e: any) {
  console.error('Error creating dispatch tables:', e.message);
}

// Ensure user_permissions table exists
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      module TEXT NOT NULL,
      can_view BOOLEAN DEFAULT 0,
      can_create BOOLEAN DEFAULT 0,
      can_edit BOOLEAN DEFAULT 0,
      can_delete BOOLEAN DEFAULT 0,
      UNIQUE(user_id, module),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
} catch (e: any) {
  console.error('Error creating user_permissions table:', e.message);
}

// Helper to log audit events
export function logAudit(userId: number, action: string, entity: string, entityId: number | null, details: string) {
  db.prepare(`
    INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, action, entity, entityId, details);
}
