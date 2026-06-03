import { Router } from 'express';
import { db, logAudit } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

export const purchaseOrdersRouter = Router();

purchaseOrdersRouter.use(authenticateToken as any);

purchaseOrdersRouter.get('/', (req, res) => {
  const pos = db.prepare(`
    SELECT po.*, s.name as supplier_name, u.username as created_by_name
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    JOIN users u ON po.created_by = u.id
    ORDER BY po.created_at DESC
  `).all();
  res.json(pos);
});

purchaseOrdersRouter.get('/:id', (req, res) => {
  const { id } = req.params;
  const po = db.prepare(`
    SELECT po.*, s.name as supplier_name, u.username as created_by_name
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    JOIN users u ON po.created_by = u.id
    WHERE po.id = ?
  `).get(id);
  
  if (!po) return res.status(404).json({ error: 'Purchase order not found' });
  
  const items = db.prepare(`
    SELECT poi.*, p.name as product_name, p.sku
    FROM purchase_order_items poi
    JOIN products p ON poi.product_id = p.id
    WHERE poi.po_id = ?
  `).all(id);
  
  res.json({ ...po, items });
});

purchaseOrdersRouter.post('/', requireRole(['admin']) as any, (req: AuthRequest, res) => {
  const { supplier_id, items } = req.body; // items: { product_id, quantity, unit_price }[]
  
  try {
    const transaction = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO purchase_orders (supplier_id, status, created_by)
        VALUES (?, 'pending', ?)
      `).run(supplier_id, req.user!.id);
      
      const poId = result.lastInsertRowid;
      
      const insertItem = db.prepare(`
        INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_price)
        VALUES (?, ?, ?, ?)
      `);
      
      for (const item of items) {
        insertItem.run(poId, item.product_id, Number(item.quantity) || 0, Number(item.unit_price) || 0);
      }
      
      logAudit(req.user!.id, 'CREATE', 'purchase_order', poId as number, `Created PO for supplier ${supplier_id}`);
      return { id: poId };
    });
    
    res.status(201).json(transaction());
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

purchaseOrdersRouter.post('/:id/receive', requireRole(['admin']) as any, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { warehouse_id } = req.body;
  
  try {
    const transaction = db.transaction(() => {
      const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as any;
      if (!po || po.status !== 'pending') throw new Error('Invalid PO or already received');
      
      const items = db.prepare('SELECT * FROM purchase_order_items WHERE po_id = ?').all(id) as any[];
      
      // 1. Create GRN record
      const grnNumber = `GRN-PO-${id}`;
      const grnResult = db.prepare(`
        INSERT INTO grn (grn_number, supplier_id, warehouse_id, created_by, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(grnNumber, po.supplier_id, warehouse_id, req.user!.id, `Auto-generated from PO #${id}`);
      
      const grnId = grnResult.lastInsertRowid;
      
      const insertGrnItem = db.prepare(`
        INSERT INTO grn_items (grn_id, product_id, quantity)
        VALUES (?, ?, ?)
      `);

      for (const item of items) {
        const itemQuantity = Number(item.quantity) || 0;
        
        // 2. Create GRN items
        insertGrnItem.run(grnId, item.product_id, itemQuantity);

        // 3. Update inventory
        const current = db.prepare('SELECT quantity FROM inventory WHERE product_id = ? AND warehouse_id = ?').get(item.product_id, warehouse_id) as any;
        if (current) {
          db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE product_id = ? AND warehouse_id = ?')
            .run(itemQuantity, item.product_id, warehouse_id);
        } else {
          db.prepare('INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES (?, ?, ?)')
            .run(item.product_id, warehouse_id, itemQuantity);
        }
        
        // 4. Log transaction as 'grn' type
        db.prepare(`INSERT INTO inventory_transactions (product_id, warehouse_id, type, quantity, user_id, notes) VALUES (?, ?, 'grn', ?, ?, ?)`)
          .run(item.product_id, warehouse_id, itemQuantity, req.user!.id, `Received PO #${id} (GRN #${grnNumber})`);
      }
      
      db.prepare('UPDATE purchase_orders SET status = ? WHERE id = ?').run('received', id);
      logAudit(req.user!.id, 'RECEIVE', 'purchase_order', Number(id), `Received PO #${id} and created GRN #${grnNumber}`);
      
      return { success: true, grnId };
    });
    
    res.json(transaction());
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'GRN for this Purchase Order already exists' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

purchaseOrdersRouter.delete('/:id', requireRole(['admin']) as any, (req: AuthRequest, res) => {
  const { id } = req.params;
  
  try {
    const transaction = db.transaction(() => {
      const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as any;
      if (!po) throw new Error('Purchase order not found');
      if (po.status !== 'pending') throw new Error('Only pending purchase orders can be deleted');
      
      db.prepare('DELETE FROM purchase_order_items WHERE po_id = ?').run(id);
      db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(id);
      
      logAudit(req.user!.id, 'DELETE', 'purchase_order', Number(id), `Deleted PO #${id}`);
      return { success: true };
    });
    
    res.json(transaction());
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
