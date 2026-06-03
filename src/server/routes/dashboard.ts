import { Router } from 'express';
import { db } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

export const dashboardRouter = Router();

dashboardRouter.use(authenticateToken as any);

dashboardRouter.get('/stats', (req, res) => {
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  const totalSuppliers = db.prepare('SELECT COUNT(*) as count FROM suppliers').get() as { count: number };
  const totalSales = db.prepare("SELECT COUNT(*) as count FROM sales_orders WHERE status IN ('completed', 'dispatched')").get() as { count: number };
  
  const lowStockItems = db.prepare(`
    SELECT COUNT(*) as count 
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    WHERE i.quantity <= p.min_stock_level
  `).get() as { count: number };

  const inventoryValue = db.prepare(`
    SELECT SUM(i.quantity * COALESCE((
      SELECT unit_price FROM purchase_order_items poi 
      WHERE poi.product_id = i.product_id 
      ORDER BY id DESC LIMIT 1
    ), 0)) as value
    FROM inventory i
  `).get() as { value: number };

  const recentTransactions = db.prepare(`
    SELECT it.*, p.name as product_name, w.name as warehouse_name, u.username
    FROM inventory_transactions it
    JOIN products p ON it.product_id = p.id
    JOIN warehouses w ON it.warehouse_id = w.id
    JOIN users u ON it.user_id = u.id
    ORDER BY it.timestamp DESC
    LIMIT 10
  `).all();

  const salesVsPurchases = db.prepare(`
    SELECT 
      'Sale' as type,
      so.so_number as reference,
      so.created_at as date,
      p.name as product_name,
      soi.quantity as quantity
    FROM sales_orders so
    JOIN sales_order_items soi ON so.id = soi.so_id
    JOIN products p ON soi.product_id = p.id
    WHERE so.status IN ('dispatched', 'completed')
    
    UNION ALL
    
    SELECT 
      'Purchase' as type,
      g.grn_number as reference,
      g.received_date as date,
      p.name as product_name,
      gi.quantity as quantity
    FROM grn g
    JOIN grn_items gi ON g.id = gi.grn_id
    JOIN products p ON gi.product_id = p.id
    
    ORDER BY date DESC
    LIMIT 50
  `).all();

  const chartData = db.prepare(`
    SELECT 
      date(date) as day,
      SUM(CASE WHEN type = 'Sale' THEN quantity ELSE 0 END) as sales,
      SUM(CASE WHEN type = 'Purchase' THEN quantity ELSE 0 END) as purchases
    FROM (
        SELECT 
          'Sale' as type,
          so.created_at as date,
          soi.quantity as quantity
        FROM sales_orders so
        JOIN sales_order_items soi ON so.id = soi.so_id
        WHERE so.status IN ('dispatched', 'completed')
        
        UNION ALL
        
        SELECT 
          'Purchase' as type,
          g.received_date as date,
          gi.quantity as quantity
        FROM grn g
        JOIN grn_items gi ON g.id = gi.grn_id
    )
    WHERE date >= date('now', '-30 days')
    GROUP BY day
    ORDER BY day ASC
  `).all();

  res.json({
    totalProducts: totalProducts.count,
    totalSuppliers: totalSuppliers.count,
    totalSales: totalSales.count,
    lowStockItems: lowStockItems.count,
    inventoryValue: inventoryValue.value || 0,
    recentTransactions,
    salesVsPurchases,
    chartData
  });
});
