import { Router } from 'express';
import { db, logAudit } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

export const inventoryRouter = Router();

inventoryRouter.use(authenticateToken as any);

inventoryRouter.get('/', (req, res) => {
  const inventory = db.prepare(`
    SELECT i.*, p.name as product_name, p.sku, p.unit_of_measure, w.name as warehouse_name, c.name as category_name
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    JOIN warehouses w ON i.warehouse_id = w.id
    LEFT JOIN categories c ON p.category_id = c.id
  `).all();
  res.json(inventory);
});

inventoryRouter.get('/warehouses', (req, res) => {
  const warehouses = db.prepare('SELECT * FROM warehouses').all();
  res.json(warehouses);
});

inventoryRouter.post('/transaction', requireRole(['admin']) as any, (req: AuthRequest, res) => {
  const { product_id, warehouse_id, type, notes } = req.body;
  const quantity = Number(req.body.quantity);
  
  if (!['in', 'out', 'adjustment'].includes(type)) {
    return res.status(400).json({ error: 'Invalid transaction type' });
  }

  try {
    const transaction = db.transaction(() => {
      // Get current inventory
      const current = db.prepare('SELECT quantity, reserved_quantity FROM inventory WHERE product_id = ? AND warehouse_id = ?').get(product_id, warehouse_id) as any;
      
      let newQuantity = quantity;
      
      if (current) {
        if (type === 'in') newQuantity = current.quantity + quantity;
        if (type === 'out') {
          if ((current.quantity - (current.reserved_quantity || 0)) < quantity) {
            throw new Error('Insufficient available stock (some items are reserved)');
          }
          newQuantity = current.quantity - quantity;
        }
        if (type === 'adjustment') newQuantity = quantity; // Absolute value
        
        if (newQuantity < 0) throw new Error('Insufficient stock');
        
        db.prepare('UPDATE inventory SET quantity = ? WHERE product_id = ? AND warehouse_id = ?')
          .run(newQuantity, product_id, warehouse_id);
      } else {
        if (type === 'out') throw new Error('Insufficient stock');
        
        db.prepare('INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES (?, ?, ?)')
          .run(product_id, warehouse_id, newQuantity);
      }

      const result = db.prepare(`
        INSERT INTO inventory_transactions (product_id, warehouse_id, type, quantity, user_id, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(product_id, warehouse_id, type, quantity, req.user!.id, notes);
      
      logAudit(req.user!.id, 'TRANSACTION', 'inventory', result.lastInsertRowid as number, `${type} ${quantity} units of product ${product_id}`);
      
      return { success: true, newQuantity };
    });

    res.json(transaction());
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

inventoryRouter.post('/transfer', requireRole(['admin']) as any, (req: AuthRequest, res) => {
  const { product_id, from_warehouse_id, to_warehouse_id, notes } = req.body;
  const quantity = Number(req.body.quantity);

  try {
    const transaction = db.transaction(() => {
      const source = db.prepare('SELECT quantity, reserved_quantity FROM inventory WHERE product_id = ? AND warehouse_id = ?').get(product_id, from_warehouse_id) as any;
      
      if (!source || (source.quantity - (source.reserved_quantity || 0)) < quantity) {
        throw new Error('Insufficient available stock in source warehouse (some items may be reserved)');
      }

      // Deduct from source
      db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?')
        .run(quantity, product_id, from_warehouse_id);
      
      // Add to destination
      const dest = db.prepare('SELECT quantity FROM inventory WHERE product_id = ? AND warehouse_id = ?').get(product_id, to_warehouse_id) as any;
      if (dest) {
        db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE product_id = ? AND warehouse_id = ?')
          .run(quantity, product_id, to_warehouse_id);
      } else {
        db.prepare('INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES (?, ?, ?)')
          .run(product_id, to_warehouse_id, quantity);
      }

      // Log transactions
      db.prepare(`INSERT INTO inventory_transactions (product_id, warehouse_id, type, quantity, user_id, notes) VALUES (?, ?, 'transfer', ?, ?, ?)`)
        .run(product_id, from_warehouse_id, -quantity, req.user!.id, `Transfer to warehouse ${to_warehouse_id}: ${notes}`);
        
      db.prepare(`INSERT INTO inventory_transactions (product_id, warehouse_id, type, quantity, user_id, notes) VALUES (?, ?, 'transfer', ?, ?, ?)`)
        .run(product_id, to_warehouse_id, quantity, req.user!.id, `Transfer from warehouse ${from_warehouse_id}: ${notes}`);

      logAudit(req.user!.id, 'TRANSFER', 'inventory', null, `Transferred ${quantity} units of product ${product_id} from ${from_warehouse_id} to ${to_warehouse_id}`);
      
      return { success: true };
    });

    res.json(transaction());
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
