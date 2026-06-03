import { Router } from 'express';
import { db, logAudit } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

export const ginRouter = Router();

ginRouter.use(authenticateToken as any);

// Get all GINs
ginRouter.get('/', (req, res) => {
  const gins = db.prepare(`
    SELECT g.*, w.name as warehouse_name, u.username as created_by_name
    FROM gin g
    JOIN warehouses w ON g.warehouse_id = w.id
    JOIN users u ON g.created_by = u.id
    ORDER BY g.issued_date DESC
  `).all();
  res.json(gins);
});

// Get GIN by ID
ginRouter.get('/:id', (req, res) => {
  const { id } = req.params;
  const gin = db.prepare(`
    SELECT g.*, w.name as warehouse_name, u.username as created_by_name
    FROM gin g
    JOIN warehouses w ON g.warehouse_id = w.id
    JOIN users u ON g.created_by = u.id
    WHERE g.id = ?
  `).get(id);
  
  if (!gin) return res.status(404).json({ error: 'GIN not found' });
  
  const items = db.prepare(`
    SELECT gi.*, p.name as product_name, p.sku
    FROM gin_items gi
    JOIN products p ON gi.product_id = p.id
    WHERE gi.gin_id = ?
  `).all(id);
  
  res.json({ ...gin, items });
});

// Create GIN
ginRouter.post('/', requireRole(['admin']) as any, (req: AuthRequest, res) => {
  const { gin_number, warehouse_id, issued_to, notes, items } = req.body; // items: { product_id, quantity }[]
  
  try {
    const transaction = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO gin (gin_number, warehouse_id, issued_to, created_by, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(gin_number, warehouse_id, issued_to || null, req.user!.id, notes);
      
      const ginId = result.lastInsertRowid;
      
      const insertItem = db.prepare(`
        INSERT INTO gin_items (gin_id, product_id, quantity)
        VALUES (?, ?, ?)
      `);
      
      for (const item of items) {
        const qty = Number(item.quantity);
        
        // Check inventory
        const current = db.prepare('SELECT quantity, reserved_quantity FROM inventory WHERE product_id = ? AND warehouse_id = ?').get(item.product_id, warehouse_id) as any;
        if (!current || (current.quantity - current.reserved_quantity) < qty) {
          throw new Error(`Insufficient available stock for product ID ${item.product_id} in warehouse ID ${warehouse_id}`);
        }
        
        insertItem.run(ginId, item.product_id, qty);
        
        // Update inventory
        db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?')
          .run(qty, item.product_id, warehouse_id);
        
        // Log transaction
        db.prepare(`INSERT INTO inventory_transactions (product_id, warehouse_id, type, quantity, user_id, notes) VALUES (?, ?, 'gin', ?, ?, ?)`)
          .run(item.product_id, warehouse_id, qty, req.user!.id, `GIN #${gin_number}`);
      }
      
      logAudit(req.user!.id, 'CREATE', 'gin', ginId as number, `Created GIN ${gin_number}`);
      return { id: ginId };
    });
    
    res.status(201).json(transaction());
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'GIN number already exists' });
    }
    res.status(400).json({ error: error.message });
  }
});
