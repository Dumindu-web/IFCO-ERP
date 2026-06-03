import { Router } from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

export const reportsRouter = Router();

reportsRouter.use(authenticateToken as any);
reportsRouter.use(requireRole(['admin', 'manager']) as any);

reportsRouter.get('/current-inventory', (req, res) => {
  const data = db.prepare(`
    SELECT p.sku, p.name, c.name as category, w.name as warehouse, i.quantity, i.reserved_quantity, (i.quantity - i.reserved_quantity) as available, p.unit_of_measure, p.min_stock_level
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    JOIN warehouses w ON i.warehouse_id = w.id
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.name ASC
  `).all();
  res.json(data);
});

reportsRouter.get('/monthly-transaction', (req, res) => {
  const data = db.prepare(`
    SELECT 
      it.id,
      p.name as item_name,
      p.sku,
      it.type as transaction_type,
      it.quantity as quantity_change,
      it.timestamp,
      u.username as user,
      w.name as warehouse_name,
      it.notes
    FROM inventory_transactions it
    JOIN products p ON it.product_id = p.id
    JOIN users u ON it.user_id = u.id
    LEFT JOIN warehouses w ON it.warehouse_id = w.id
    ORDER BY it.timestamp DESC
  `).all();
  res.json(data);
});

reportsRouter.get('/monthly-inventory', (req, res) => {
  // To calculate opening and closing stock per month per product
  // This is a bit complex in SQLite without window functions if not available, but we can do a simplified version
  // Actually, let's just return the current stock as closing stock for the current month, and calculate backwards.
  // A simpler approach for the report is to get the net change per product per month.
  const data = db.prepare(`
    WITH RECURSIVE
    months AS (
      SELECT DISTINCT strftime('%Y-%m', timestamp) as month FROM inventory_transactions
    ),
    product_months AS (
      SELECT p.id as product_id, p.name, p.sku, c.name as category, m.month
      FROM products p
      CROSS JOIN months m
      LEFT JOIN categories c ON p.category_id = c.id
    ),
    monthly_changes AS (
      SELECT product_id, strftime('%Y-%m', timestamp) as month,
             SUM(CASE WHEN type IN ('in', 'grn') THEN quantity 
                      WHEN type IN ('out', 'gin') THEN -quantity 
                      WHEN type = 'transfer' THEN 0 
                      WHEN type = 'adjustment' THEN quantity 
                      ELSE 0 END) as net_change
      FROM inventory_transactions
      GROUP BY product_id, month
    ),
    current_stock AS (
      SELECT product_id, SUM(quantity) as total_qty
      FROM inventory
      GROUP BY product_id
    )
    SELECT pm.month, pm.product_id, pm.name, pm.sku, pm.category,
           COALESCE(mc.net_change, 0) as net_change
    FROM product_months pm
    LEFT JOIN monthly_changes mc ON pm.product_id = mc.product_id AND pm.month = mc.month
    ORDER BY pm.month DESC, pm.name ASC
  `).all();
  
  // We need to calculate opening and closing stock in JS since SQLite recursive CTEs for running totals can be tricky
  // We have current stock, and we have net changes per month.
  // Closing stock of month M = Closing stock of month M+1 - Net change of month M+1
  // Let's fetch current stock
  const currentStockData = db.prepare(`SELECT product_id, SUM(quantity) as total_qty FROM inventory GROUP BY product_id`).all() as any[];
  const currentStockMap = new Map(currentStockData.map(row => [row.product_id, row.total_qty]));
  
  // Group by product
  const productsMap = new Map();
  for (const row of data as any[]) {
    if (!productsMap.has(row.product_id)) {
      productsMap.set(row.product_id, []);
    }
    productsMap.get(row.product_id).push(row);
  }
  
  const result = [];
  for (const [productId, months] of productsMap.entries()) {
    // months are ordered DESC
    let currentQty = currentStockMap.get(productId) || 0;
    for (let i = 0; i < months.length; i++) {
      const row = months[i];
      row.closing_stock = currentQty;
      row.opening_stock = currentQty - row.net_change;
      currentQty = row.opening_stock; // for the previous month
      result.push(row);
    }
  }
  
  // Sort result by month DESC, then product name
  result.sort((a, b) => {
    if (a.month !== b.month) return b.month.localeCompare(a.month);
    return a.name.localeCompare(b.name);
  });
  
  res.json(result);
});

reportsRouter.get('/inventory-valuation', (req, res) => {
  const data = db.prepare(`
    SELECT p.sku, p.name, w.name as warehouse, i.quantity,
    COALESCE((SELECT unit_price FROM purchase_order_items poi WHERE poi.product_id = p.id ORDER BY id DESC LIMIT 1), 0) as last_cost,
    (i.quantity * COALESCE((SELECT unit_price FROM purchase_order_items poi WHERE poi.product_id = p.id ORDER BY id DESC LIMIT 1), 0)) as total_value
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    JOIN warehouses w ON i.warehouse_id = w.id
    ORDER BY total_value DESC
  `).all();
  res.json(data);
});

reportsRouter.get('/low-stock', (req, res) => {
  const data = db.prepare(`
    SELECT p.id as product_id, p.sku, p.name, w.name as warehouse, i.quantity, p.min_stock_level,
           p.supplier_id, s.name as supplier_name
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    JOIN warehouses w ON i.warehouse_id = w.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE i.quantity <= p.min_stock_level
    ORDER BY s.name, p.name ASC
  `).all();
  res.json(data);
});

reportsRouter.get('/audit-logs', (req, res) => {
  const data = db.prepare(`
    SELECT a.*, u.username 
    FROM audit_logs a
    JOIN users u ON a.user_id = u.id
    ORDER BY a.timestamp DESC
    LIMIT 100
  `).all();
  res.json(data);
});

reportsRouter.get('/monthly-item-transactions', (req, res) => {
  const data = db.prepare(`
    SELECT 
      strftime('%Y-%m', it.timestamp) as month,
      p.sku,
      p.name as product_name,
      c.name as category_name,
      w.name as warehouse_name,
      it.type,
      it.quantity,
      u.username,
      it.notes
    FROM inventory_transactions it
    JOIN products p ON it.product_id = p.id
    JOIN users u ON it.user_id = u.id
    LEFT JOIN warehouses w ON it.warehouse_id = w.id
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY it.timestamp DESC
  `).all();
  res.json(data);
});
