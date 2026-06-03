import { Router } from 'express';
import { db, logAudit } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

export const productsRouter = Router();

productsRouter.use(authenticateToken as any);

productsRouter.get('/', (req, res) => {
  const products = db.prepare(`
    SELECT p.*, c.name as category_name, s.name as supplier_name 
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
  `).all();
  res.json(products);
});

productsRouter.get('/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories').all();
  res.json(categories);
});

productsRouter.post('/', requireRole(['admin', 'manager']) as any, (req: AuthRequest, res) => {
  const { name, category_id, min_stock_level, supplier_id, image_url, unit_of_measure } = req.body;
  let { sku } = req.body;
  
  if (!sku || sku.trim() === '') {
    sku = `ITEM-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
  }

  try {
    const result = db.prepare(`
      INSERT INTO products (name, category_id, sku, min_stock_level, supplier_id, image_url, unit_of_measure)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, category_id, sku, Number(min_stock_level) || 0, supplier_id, image_url, unit_of_measure || 'pcs');
    
    logAudit(req.user!.id, 'CREATE', 'product', result.lastInsertRowid as number, `Created product ${name}`);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

productsRouter.put('/:id', requireRole(['admin', 'manager']) as any, (req: AuthRequest, res) => {
  const { name, category_id, min_stock_level, supplier_id, image_url, unit_of_measure } = req.body;
  const { id } = req.params;
  let { sku } = req.body;
  
  if (!sku || sku.trim() === '') {
    // If updating and they cleared the SKU, generate a new one or keep the old one?
    // Usually we generate a new one if it's empty, but let's just generate a new one.
    sku = `ITEM-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
  }
  
  try {
    db.prepare(`
      UPDATE products 
      SET name = ?, category_id = ?, sku = ?, min_stock_level = ?, supplier_id = ?, image_url = ?, unit_of_measure = ?
      WHERE id = ?
    `).run(name, category_id, sku, Number(min_stock_level) || 0, supplier_id, image_url, unit_of_measure || 'pcs', id);
    
    logAudit(req.user!.id, 'UPDATE', 'product', Number(id), `Updated product ${name}`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

productsRouter.delete('/:id', requireRole(['admin']) as any, (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    const product = db.prepare('SELECT name FROM products WHERE id = ?').get(id) as any;
    if (!product) return res.status(404).json({ error: 'Product not found' });

    db.transaction(() => {
      // Delete from all referencing tables
      db.prepare('DELETE FROM dispatch_note_items WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM sales_order_items WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM purchase_order_items WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM gin_items WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM grn_items WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM inventory_transactions WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM inventory WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM products WHERE id = ?').run(id);
    })();

    logAudit(req.user!.id, 'DELETE', 'product', Number(id), `Deleted product ${product.name} and all its references`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
