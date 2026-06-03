import { Router } from 'express';
import { db, logAudit } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

export const dispatchRouter = Router();

dispatchRouter.use(authenticateToken as any);

// Get all dispatch notes
dispatchRouter.get('/', (req, res) => {
  try {
    const notes = db.prepare(`
      SELECT d.*, s.so_number, s.customer_name as so_customer_name, u.username as created_by_name
      FROM dispatch_notes d
      JOIN sales_orders s ON d.so_id = s.id
      JOIN users u ON d.created_by = u.id
      ORDER BY d.created_at DESC
    `).all();
    res.json(notes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single dispatch note with items
dispatchRouter.get('/:id', (req, res) => {
  try {
    const note = db.prepare(`
      SELECT d.*, s.so_number, s.customer_name as so_customer_name, u.username as created_by_name
      FROM dispatch_notes d
      JOIN sales_orders s ON d.so_id = s.id
      JOIN users u ON d.created_by = u.id
      WHERE d.id = ?
    `).get(req.params.id) as any;

    if (!note) {
      return res.status(404).json({ error: 'Dispatch note not found' });
    }

    const items = db.prepare(`
      SELECT di.*, p.name as product_name, p.sku
      FROM dispatch_note_items di
      JOIN products p ON di.product_id = p.id
      WHERE di.dispatch_id = ?
    `).all(req.params.id);

    note.items = items;
    res.json(note);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new dispatch note
dispatchRouter.post('/', (req: any, res) => {
  const { so_id, vehicle_number, driver_name, driver_id_number, company_name, items } = req.body;
  const userId = req.user.id;

  if (!so_id || !vehicle_number || !driver_name || !driver_id_number || !company_name || !items || !items.length) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = db.transaction(() => {
      // Generate Dispatch Number
      const count = db.prepare('SELECT COUNT(*) as count FROM dispatch_notes').get() as { count: number };
      const dispatchNumber = `DN-${(count.count + 1).toString().padStart(6, '0')}`;

      // Insert Dispatch Note
      const insertNote = db.prepare(`
        INSERT INTO dispatch_notes (dispatch_number, so_id, vehicle_number, driver_name, driver_id_number, company_name, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, 'pending_payment', ?)
      `);
      const noteResult = insertNote.run(dispatchNumber, so_id, vehicle_number, driver_name, driver_id_number, company_name, userId);
      const dispatchId = noteResult.lastInsertRowid;

      // Insert Items
      const insertItem = db.prepare(`
        INSERT INTO dispatch_note_items (dispatch_id, product_id, quantity, unit_price)
        VALUES (?, ?, ?, ?)
      `);

      for (const item of items) {
        insertItem.run(dispatchId, item.product_id, item.quantity, item.unit_price);
      }

      // Update Sales Order Status to dispatched
      db.prepare('UPDATE sales_orders SET status = ? WHERE id = ?').run('dispatched', so_id);

      logAudit(userId, 'CREATE_DISPATCH_NOTE', 'dispatch_notes', dispatchId as number, `Created Dispatch Note ${dispatchNumber}`);

      return { id: dispatchId, dispatch_number: dispatchNumber };
    })();

    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update payment status
dispatchRouter.put('/:id/payment', (req: any, res) => {
  const { status, payment_type } = req.body;
  const userId = req.user.id;
  const dispatchId = req.params.id;

  if (!status || !['payment_received', 'payment_not_received'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    db.transaction(() => {
      const note = db.prepare('SELECT * FROM dispatch_notes WHERE id = ?').get(dispatchId) as any;
      if (!note) throw new Error('Dispatch note not found');
      if (note.status === 'payment_received') throw new Error('Payment already received');

      db.prepare(`
        UPDATE dispatch_notes 
        SET status = ?, payment_type = ?
        WHERE id = ?
      `).run(status, payment_type || null, dispatchId);

      if (status === 'payment_received') {
        // Check if inventory was already deducted (e.g. via GIN dispatch)
        const so = db.prepare('SELECT status, so_number, warehouse_id FROM sales_orders WHERE id = ?').get(note.so_id) as any;
        const ginNumber = `GIN-SO-${so.so_number}`;
        const ginExists = db.prepare('SELECT id FROM gin WHERE gin_number = ?').get(ginNumber);

        if (!ginExists) {
          // Deduct inventory only if it wasn't already deducted via GIN
          const items = db.prepare('SELECT * FROM dispatch_note_items WHERE dispatch_id = ?').all(dispatchId) as any[];
          const warehouseId = so.warehouse_id;

          if (!warehouseId) throw new Error('Sales order has no warehouse assigned');

          const updateInventory = db.prepare(`
            UPDATE inventory 
            SET quantity = quantity - ?, reserved_quantity = reserved_quantity - ?
            WHERE product_id = ? AND warehouse_id = ?
          `);

          const insertTransaction = db.prepare(`
            INSERT INTO inventory_transactions (product_id, warehouse_id, type, quantity, user_id, notes)
            VALUES (?, ?, 'out', ?, ?, ?)
          `);

          for (const item of items) {
            updateInventory.run(item.quantity, item.quantity, item.product_id, warehouseId);
            insertTransaction.run(item.product_id, warehouseId, item.quantity, userId, `Dispatch Note ${note.dispatch_number} Payment Received`);
          }
        }
      }

      logAudit(userId, 'UPDATE_DISPATCH_PAYMENT', 'dispatch_notes', dispatchId as number, `Updated payment status to ${status}`);
    })();

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
