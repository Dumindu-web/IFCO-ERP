import { Router } from 'express';
import { db, logAudit } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

export const salesOrdersRouter = Router();

salesOrdersRouter.use(authenticateToken as any);

salesOrdersRouter.get('/', (req, res) => {
  const sos = db.prepare(`
    SELECT so.*, u.username as created_by_name, w.name as warehouse_name
    FROM sales_orders so
    JOIN users u ON so.created_by = u.id
    LEFT JOIN warehouses w ON so.warehouse_id = w.id
    ORDER BY so.created_at DESC
  `).all();
  res.json(sos);
});

salesOrdersRouter.get('/check-pending', (req, res) => {
  const { customer_name, sales_person } = req.query;
  
  try {
    const pending = db.prepare(`
      SELECT d.dispatch_number, s.so_number
      FROM dispatch_notes d
      JOIN sales_orders s ON d.so_id = s.id
      WHERE (s.customer_name = ? OR s.sales_person = ?)
      AND d.status IN ('pending_payment', 'payment_not_received')
      LIMIT 1
    `).get(customer_name, sales_person);
    
    res.json({ hasPending: !!pending });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

salesOrdersRouter.get('/:id', (req, res) => {
  const { id } = req.params;
  const so = db.prepare(`
    SELECT so.*, u.username as created_by_name
    FROM sales_orders so
    JOIN users u ON so.created_by = u.id
    WHERE so.id = ?
  `).get(id);
  
  if (!so) return res.status(404).json({ error: 'Sales order not found' });
  
  const items = db.prepare(`
    SELECT soi.*, p.name as product_name, p.sku
    FROM sales_order_items soi
    JOIN products p ON soi.product_id = p.id
    WHERE soi.so_id = ?
  `).all(id);
  
  res.json({ ...so, items });
});

salesOrdersRouter.post('/', (req: AuthRequest, res) => {
  const { so_number, customer_name, sales_person, warehouse_id, items } = req.body; // items: { product_id, quantity, unit_price }[]
  
  try {
    const transaction = db.transaction(() => {
      // 0. Check if SO number already exists
      const existing = db.prepare('SELECT id FROM sales_orders WHERE so_number = ?').get(so_number);
      if (existing) throw new Error('Sales Order Number already exists');

      // 1. Check inventory availability
      for (const item of items) {
        const itemQuantity = Number(item.quantity) || 0;
        const inv = db.prepare('SELECT quantity, reserved_quantity FROM inventory WHERE product_id = ? AND warehouse_id = ?').get(item.product_id, warehouse_id) as any;
        if (!inv || (inv.quantity - inv.reserved_quantity) < itemQuantity) {
          throw new Error(`Insufficient available stock for product ${item.product_id}`);
        }
      }
      
      // 2. Create Sales Order
      const result = db.prepare(`
        INSERT INTO sales_orders (so_number, customer_name, sales_person, warehouse_id, status, created_by)
        VALUES (?, ?, ?, ?, 'pending', ?)
      `).run(so_number, customer_name, sales_person, warehouse_id, req.user!.id);
      
      const soId = result.lastInsertRowid;
      
      // 3. Add items and reserve inventory
      const insertItem = db.prepare(`
        INSERT INTO sales_order_items (so_id, product_id, quantity, unit_price)
        VALUES (?, ?, ?, ?)
      `);
      
      const reserveInventory = db.prepare(`
        UPDATE inventory SET reserved_quantity = reserved_quantity + ?
        WHERE product_id = ? AND warehouse_id = ?
      `);
      
      for (const item of items) {
        const itemQuantity = Number(item.quantity) || 0;
        const itemUnitPrice = Number(item.unit_price) || 0;
        insertItem.run(soId, item.product_id, itemQuantity, itemUnitPrice);
        reserveInventory.run(itemQuantity, item.product_id, warehouse_id);
      }
      
      logAudit(req.user!.id, 'CREATE', 'sales_order', soId as number, `Created SO for ${customer_name}`);
      return { id: soId };
    });
    
    res.status(201).json(transaction());
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

salesOrdersRouter.delete('/:id', requireRole(['admin']) as any, (req: AuthRequest, res) => {
  const { id } = req.params;
  
  try {
    const transaction = db.transaction(() => {
      const so = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id) as any;
      if (!so) throw new Error('Sales order not found');
      
      const items = db.prepare('SELECT * FROM sales_order_items WHERE so_id = ?').all(id) as any[];
      
      for (const item of items) {
        const itemQuantity = Number(item.quantity) || 0;
        
        if (so.status === 'pending') {
          // If pending, it was only reserved. Remove the reservation.
          db.prepare(`
            UPDATE inventory 
            SET reserved_quantity = reserved_quantity - ? 
            WHERE product_id = ? AND warehouse_id = ?
          `).run(itemQuantity, item.product_id, so.warehouse_id);
        } else if (so.status === 'completed' || so.status === 'dispatched') {
          // If completed or dispatched, it was deducted. Add it back to inventory.
          db.prepare(`
            UPDATE inventory 
            SET quantity = quantity + ? 
            WHERE product_id = ? AND warehouse_id = ?
          `).run(itemQuantity, item.product_id, so.warehouse_id);
          
          // Log the return transaction
          db.prepare(`INSERT INTO inventory_transactions (product_id, warehouse_id, type, quantity, user_id, notes) VALUES (?, ?, 'in', ?, ?, ?)`)
            .run(item.product_id, so.warehouse_id, itemQuantity, req.user!.id, `Reverted deleted SO #${so.so_number}`);
        }
      }
      
      // Also try to delete associated GIN if it exists
      const ginNumber = `GIN-SO-${so.so_number}`;
      const gin = db.prepare('SELECT id FROM gin WHERE gin_number = ?').get(ginNumber) as any;
      if (gin) {
        db.prepare('DELETE FROM gin_items WHERE gin_id = ?').run(gin.id);
        db.prepare('DELETE FROM gin WHERE id = ?').run(gin.id);
      }
      
      db.prepare('DELETE FROM sales_order_items WHERE so_id = ?').run(id);
      db.prepare('DELETE FROM sales_orders WHERE id = ?').run(id);
      
      logAudit(req.user!.id, 'DELETE', 'sales_order', Number(id), `Deleted SO #${so.so_number}`);
      
      return { success: true };
    });
    
    res.json(transaction());
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

salesOrdersRouter.put('/:id', (req: AuthRequest, res) => {
  const { id } = req.params;
  const { so_number, customer_name, sales_person, warehouse_id, items } = req.body;
  
  try {
    const transaction = db.transaction(() => {
      const so = db.prepare('SELECT status, warehouse_id FROM sales_orders WHERE id = ?').get(id) as any;
      if (!so) throw new Error('Sales order not found');
      if (so.status !== 'pending') throw new Error('Only pending sales orders can be edited');

      // 0. Check if SO number already exists for a different order
      const existing = db.prepare('SELECT id FROM sales_orders WHERE so_number = ? AND id != ?').get(so_number, id);
      if (existing) throw new Error('Sales Order Number already exists');

      // 1. Revert previous reservations
      const oldItems = db.prepare('SELECT * FROM sales_order_items WHERE so_id = ?').all(id) as any[];
      for (const item of oldItems) {
        db.prepare(`
          UPDATE inventory 
          SET reserved_quantity = reserved_quantity - ? 
          WHERE product_id = ? AND warehouse_id = ?
        `).run(item.quantity, item.product_id, so.warehouse_id);
      }

      // 2. Check new inventory availability
      for (const item of items) {
        const itemQuantity = Number(item.quantity) || 0;
        const inv = db.prepare('SELECT quantity, reserved_quantity FROM inventory WHERE product_id = ? AND warehouse_id = ?').get(item.product_id, warehouse_id) as any;
        if (!inv || (inv.quantity - inv.reserved_quantity) < itemQuantity) {
          throw new Error(`Insufficient available stock for product ${item.product_id}`);
        }
      }

      // 3. Update Sales Order
      db.prepare(`
        UPDATE sales_orders 
        SET so_number = ?, customer_name = ?, sales_person = ?, warehouse_id = ?
        WHERE id = ?
      `).run(so_number, customer_name, sales_person, warehouse_id, id);

      // 4. Delete old items and insert new items
      db.prepare('DELETE FROM sales_order_items WHERE so_id = ?').run(id);
      
      const insertItem = db.prepare(`
        INSERT INTO sales_order_items (so_id, product_id, quantity, unit_price)
        VALUES (?, ?, ?, ?)
      `);
      
      const reserveInventory = db.prepare(`
        UPDATE inventory SET reserved_quantity = reserved_quantity + ?
        WHERE product_id = ? AND warehouse_id = ?
      `);

      for (const item of items) {
        const itemQuantity = Number(item.quantity) || 0;
        const itemUnitPrice = Number(item.unit_price) || 0;
        insertItem.run(id, item.product_id, itemQuantity, itemUnitPrice);
        reserveInventory.run(itemQuantity, item.product_id, warehouse_id);
      }

      logAudit(req.user!.id, 'UPDATE', 'sales_order', Number(id), `Updated SO #${id}`);
      return { success: true };
    });
    
    res.json(transaction());
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

salesOrdersRouter.post('/:id/dispatch', requireRole(['admin']) as any, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { warehouse_id } = req.body;
  
  try {
    const transaction = db.transaction(() => {
      const so = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id) as any;
      if (!so || so.status !== 'pending') throw new Error('Invalid SO or not in pending state');
      
      const items = db.prepare('SELECT * FROM sales_order_items WHERE so_id = ?').all(id) as any[];
      
      // 1. Create GIN record
      const ginNumber = `GIN-SO-${so.so_number}`;
      const ginResult = db.prepare(`
        INSERT INTO gin (gin_number, warehouse_id, issued_to, created_by, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(ginNumber, warehouse_id, so.customer_name, req.user!.id, `Auto-generated from SO #${so.so_number}`);
      
      const ginId = ginResult.lastInsertRowid;
      
      const insertGinItem = db.prepare(`
        INSERT INTO gin_items (gin_id, product_id, quantity)
        VALUES (?, ?, ?)
      `);

      for (const item of items) {
        const itemQuantity = Number(item.quantity) || 0;
        
        // 2. Create GIN items
        insertGinItem.run(ginId, item.product_id, itemQuantity);

        // 3. Update inventory
        if (so.warehouse_id != warehouse_id) {
          // Check if new warehouse has enough stock
          const inv = db.prepare('SELECT quantity, reserved_quantity FROM inventory WHERE product_id = ? AND warehouse_id = ?').get(item.product_id, warehouse_id) as any;
          if (!inv || (inv.quantity - inv.reserved_quantity) < itemQuantity) {
            throw new Error(`Insufficient available stock for product ${item.product_id} in selected warehouse`);
          }
          
          // Remove reservation from old warehouse
          db.prepare(`
            UPDATE inventory 
            SET reserved_quantity = reserved_quantity - ? 
            WHERE product_id = ? AND warehouse_id = ?
          `).run(itemQuantity, item.product_id, so.warehouse_id);
          
          // Deduct from actual quantity in new warehouse
          db.prepare(`
            UPDATE inventory 
            SET quantity = quantity - ?
            WHERE product_id = ? AND warehouse_id = ?
          `).run(itemQuantity, item.product_id, warehouse_id);
        } else {
          // Deduct from actual quantity and remove reservation from the same warehouse
          db.prepare(`
            UPDATE inventory 
            SET quantity = quantity - ?, reserved_quantity = reserved_quantity - ? 
            WHERE product_id = ? AND warehouse_id = ?
          `).run(itemQuantity, itemQuantity, item.product_id, warehouse_id);
        }
        
        // 4. Log transaction as 'gin' type
        db.prepare(`INSERT INTO inventory_transactions (product_id, warehouse_id, type, quantity, user_id, notes) VALUES (?, ?, 'gin', ?, ?, ?)`)
          .run(item.product_id, warehouse_id, itemQuantity, req.user!.id, `Dispatched SO #${so.so_number} (GIN #${ginNumber})`);
      }
      
      // 5. Update SO status
      db.prepare('UPDATE sales_orders SET status = ?, warehouse_id = ? WHERE id = ?').run('dispatched', warehouse_id, id);
      logAudit(req.user!.id, 'DISPATCH', 'sales_order', Number(id), `Dispatched SO #${so.so_number} and created GIN #${ginNumber}`);
      
      return { success: true, ginId };
    });
    
    res.json(transaction());
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'GIN for this Sales Order already exists' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

salesOrdersRouter.post('/:id/complete', requireRole(['admin']) as any, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { warehouse_id } = req.body;
  
  try {
    const transaction = db.transaction(() => {
      const so = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id) as any;
      if (!so || (so.status !== 'pending' && so.status !== 'dispatched')) throw new Error('Invalid SO or already completed');
      
      if (so.status === 'dispatched') {
        // If it's already dispatched, inventory was already deducted and GIN created. Just mark as completed.
        db.prepare('UPDATE sales_orders SET status = ? WHERE id = ?').run('completed', id);
        logAudit(req.user!.id, 'COMPLETE', 'sales_order', Number(id), `Completed SO #${so.so_number}`);
        return { success: true };
      }

      // Otherwise, it's pending, so we need to deduct inventory and create GIN
      const items = db.prepare('SELECT * FROM sales_order_items WHERE so_id = ?').all(id) as any[];
      
      // 1. Create GIN record
      const ginNumber = `GIN-SO-${so.so_number}`;
      const ginResult = db.prepare(`
        INSERT INTO gin (gin_number, warehouse_id, issued_to, created_by, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(ginNumber, warehouse_id, so.customer_name, req.user!.id, `Auto-generated from SO #${so.so_number} (Direct Complete)`);
      
      const ginId = ginResult.lastInsertRowid;
      
      const insertGinItem = db.prepare(`
        INSERT INTO gin_items (gin_id, product_id, quantity)
        VALUES (?, ?, ?)
      `);

      for (const item of items) {
        const itemQuantity = Number(item.quantity) || 0;
        
        // 2. Create GIN items
        insertGinItem.run(ginId, item.product_id, itemQuantity);

        // 3. Update inventory
        if (so.warehouse_id != warehouse_id) {
          // Check if new warehouse has enough stock
          const inv = db.prepare('SELECT quantity, reserved_quantity FROM inventory WHERE product_id = ? AND warehouse_id = ?').get(item.product_id, warehouse_id) as any;
          if (!inv || (inv.quantity - inv.reserved_quantity) < itemQuantity) {
            throw new Error(`Insufficient available stock for product ${item.product_id} in selected warehouse`);
          }
          
          // Remove reservation from old warehouse
          db.prepare(`
            UPDATE inventory 
            SET reserved_quantity = reserved_quantity - ? 
            WHERE product_id = ? AND warehouse_id = ?
          `).run(itemQuantity, item.product_id, so.warehouse_id);
          
          // Deduct from actual quantity in new warehouse
          db.prepare(`
            UPDATE inventory 
            SET quantity = quantity - ?
            WHERE product_id = ? AND warehouse_id = ?
          `).run(itemQuantity, item.product_id, warehouse_id);
        } else {
          // Deduct from actual quantity and remove reservation from the same warehouse
          db.prepare(`
            UPDATE inventory 
            SET quantity = quantity - ?, reserved_quantity = reserved_quantity - ? 
            WHERE product_id = ? AND warehouse_id = ?
          `).run(itemQuantity, itemQuantity, item.product_id, warehouse_id);
        }
        
        // 4. Log transaction as 'gin' type
        db.prepare(`INSERT INTO inventory_transactions (product_id, warehouse_id, type, quantity, user_id, notes) VALUES (?, ?, 'gin', ?, ?, ?)`)
          .run(item.product_id, warehouse_id, itemQuantity, req.user!.id, `Completed SO #${so.so_number} (GIN #${ginNumber})`);
      }
      
      db.prepare('UPDATE sales_orders SET status = ?, warehouse_id = ? WHERE id = ?').run('completed', warehouse_id, id);
      logAudit(req.user!.id, 'COMPLETE', 'sales_order', Number(id), `Completed SO #${so.so_number} and created GIN #${ginNumber}`);
      
      return { success: true, ginId };
    });
    
    res.json(transaction());
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'GIN for this Sales Order already exists' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});
