import { Router } from 'express';
import { db, logAudit } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

export const adminRouter = Router();

adminRouter.use(authenticateToken as any);
adminRouter.use(requireRole(['admin']) as any);

adminRouter.post('/clear-all-data', (req: AuthRequest, res) => {
  try {
    const tablesToClear = [
      'dispatch_note_items',
      'dispatch_notes',
      'sales_order_items',
      'sales_orders',
      'purchase_order_items',
      'purchase_orders',
      'grn_items',
      'grn',
      'gin_items',
      'gin',
      'inventory_transactions',
      'inventory',
      'products',
      'suppliers',
      'audit_logs'
    ];

    db.transaction(() => {
      for (const table of tablesToClear) {
        db.prepare(`DELETE FROM ${table}`).run();
        // Reset autoincrement
        db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table);
      }
    })();

    logAudit(req.user!.id, 'CLEAR_ALL_DATA', 'system', null, 'Cleared all inventory and transaction data');
    
    res.json({ success: true, message: 'All inventory data has been cleared.' });
  } catch (error: any) {
    console.error('Error clearing data:', error);
    res.status(500).json({ error: error.message });
  }
});
