import { Router } from 'express';
import { db, logAudit } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

export const suppliersRouter = Router();

suppliersRouter.use(authenticateToken as any);

suppliersRouter.get('/', (req, res) => {
  const suppliers = db.prepare('SELECT * FROM suppliers').all();
  res.json(suppliers);
});

suppliersRouter.post('/', requireRole(['admin', 'manager']) as any, (req: AuthRequest, res) => {
  const { name, contact_name, email, phone, address } = req.body;
  
  try {
    const result = db.prepare(`
      INSERT INTO suppliers (name, contact_name, email, phone, address)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, contact_name, email, phone, address);
    
    logAudit(req.user!.id, 'CREATE', 'supplier', result.lastInsertRowid as number, `Created supplier ${name}`);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

suppliersRouter.put('/:id', requireRole(['admin', 'manager']) as any, (req: AuthRequest, res) => {
  const { name, contact_name, email, phone, address } = req.body;
  const { id } = req.params;
  
  try {
    db.prepare(`
      UPDATE suppliers 
      SET name = ?, contact_name = ?, email = ?, phone = ?, address = ?
      WHERE id = ?
    `).run(name, contact_name, email, phone, address, id);
    
    logAudit(req.user!.id, 'UPDATE', 'supplier', Number(id), `Updated supplier ${name}`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

suppliersRouter.delete('/:id', requireRole(['admin']) as any, (req: AuthRequest, res) => {
  const { id } = req.params;
  
  try {
    const supplier = db.prepare('SELECT name FROM suppliers WHERE id = ?').get(id) as any;
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    db.transaction(() => {
      // 1. Handle Purchase Orders
      const pos = db.prepare('SELECT id FROM purchase_orders WHERE supplier_id = ?').all(id) as any[];
      for (const po of pos) {
        db.prepare('DELETE FROM purchase_order_items WHERE po_id = ?').run(po.id);
      }
      db.prepare('DELETE FROM purchase_orders WHERE supplier_id = ?').run(id);

      // 2. Handle GRNs
      const grns = db.prepare('SELECT id FROM grn WHERE supplier_id = ?').all(id) as any[];
      for (const grn of grns) {
        db.prepare('DELETE FROM grn_items WHERE grn_id = ?').run(grn.id);
      }
      db.prepare('DELETE FROM grn WHERE supplier_id = ?').run(id);

      // 3. Handle Products
      const products = db.prepare('SELECT id FROM products WHERE supplier_id = ?').all(id) as any[];
      for (const product of products) {
        const prodId = product.id;
        db.prepare('DELETE FROM dispatch_note_items WHERE product_id = ?').run(prodId);
        db.prepare('DELETE FROM sales_order_items WHERE product_id = ?').run(prodId);
        db.prepare('DELETE FROM purchase_order_items WHERE product_id = ?').run(prodId);
        db.prepare('DELETE FROM gin_items WHERE product_id = ?').run(prodId);
        db.prepare('DELETE FROM grn_items WHERE product_id = ?').run(prodId);
        db.prepare('DELETE FROM inventory_transactions WHERE product_id = ?').run(prodId);
        db.prepare('DELETE FROM inventory WHERE product_id = ?').run(prodId);
        db.prepare('DELETE FROM products WHERE id = ?').run(prodId);
      }

      // 4. Delete Supplier
      db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
    })();

    logAudit(req.user!.id, 'DELETE', 'supplier', Number(id), `Deleted supplier ${supplier.name} and all its references`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
