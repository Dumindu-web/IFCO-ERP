import { Router } from 'express';
import { db, logAudit } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

export const grnRouter = Router();

grnRouter.use(authenticateToken as any);

// Get all GRNs
grnRouter.get('/', (req, res) => {
  const grns = db.prepare(`
    SELECT g.*, s.name as supplier_name, w.name as warehouse_name, u.username as created_by_name
    FROM grn g
    LEFT JOIN suppliers s ON g.supplier_id = s.id
    JOIN warehouses w ON g.warehouse_id = w.id
    JOIN users u ON g.created_by = u.id
    ORDER BY g.received_date DESC
  `).all();
  res.json(grns);
});

// Get GRN by ID
grnRouter.get('/:id', (req, res) => {
  const { id } = req.params;
  const grn = db.prepare(`
    SELECT g.*, s.name as supplier_name, w.name as warehouse_name, u.username as created_by_name
    FROM grn g
    LEFT JOIN suppliers s ON g.supplier_id = s.id
    JOIN warehouses w ON g.warehouse_id = w.id
    JOIN users u ON g.created_by = u.id
    WHERE g.id = ?
  `).get(id);
  
  if (!grn) return res.status(404).json({ error: 'GRN not found' });
  
  const items = db.prepare(`
    SELECT gi.*, p.name as product_name, p.sku
    FROM grn_items gi
    JOIN products p ON gi.product_id = p.id
    WHERE gi.grn_id = ?
  `).all(id);
  
  res.json({ ...grn, items });
});

// Create GRN
grnRouter.post('/', requireRole(['admin']) as any, (req: AuthRequest, res) => {
  const { grn_number, supplier_id, warehouse_id, notes, items } = req.body; // items: { product_id, quantity }[]
  
  try {
    const transaction = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO grn (grn_number, supplier_id, warehouse_id, created_by, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(grn_number, supplier_id || null, warehouse_id, req.user!.id, notes);
      
      const grnId = result.lastInsertRowid;
      
      const insertItem = db.prepare(`
        INSERT INTO grn_items (grn_id, product_id, quantity)
        VALUES (?, ?, ?)
      `);
      
      for (const item of items) {
        const qty = Number(item.quantity);
        insertItem.run(grnId, item.product_id, qty);
        
        // Update inventory
        const current = db.prepare('SELECT quantity FROM inventory WHERE product_id = ? AND warehouse_id = ?').get(item.product_id, warehouse_id) as any;
        if (current) {
          db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE product_id = ? AND warehouse_id = ?')
            .run(qty, item.product_id, warehouse_id);
        } else {
          db.prepare('INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES (?, ?, ?)')
            .run(item.product_id, warehouse_id, qty);
        }
        
        // Log transaction
        db.prepare(`INSERT INTO inventory_transactions (product_id, warehouse_id, type, quantity, user_id, notes) VALUES (?, ?, 'grn', ?, ?, ?)`)
          .run(item.product_id, warehouse_id, qty, req.user!.id, `GRN #${grn_number}`);
      }
      
      logAudit(req.user!.id, 'CREATE', 'grn', grnId as number, `Created GRN ${grn_number}`);
      return { id: grnId };
    });
    
    res.status(201).json(transaction());
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'GRN number already exists' });
    }
    res.status(400).json({ error: error.message });
  }
});
