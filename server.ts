import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/server/db.js';
import { authRouter } from './src/server/routes/auth.js';
import { productsRouter } from './src/server/routes/products.js';
import { inventoryRouter } from './src/server/routes/inventory.js';
import { suppliersRouter } from './src/server/routes/suppliers.js';
import { purchaseOrdersRouter } from './src/server/routes/purchaseOrders.js';
import { salesOrdersRouter } from './src/server/routes/salesOrders.js';
import { dashboardRouter } from './src/server/routes/dashboard.js';
import { reportsRouter } from './src/server/routes/reports.js';
import { usersRouter } from './src/server/routes/users.js';
import { grnRouter } from './src/server/routes/grn.js';
import { ginRouter } from './src/server/routes/gin.js';
import { dispatchRouter } from './src/server/routes/dispatch.js';
import { adminRouter } from './src/server/routes/admin.js';

const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const isProd = process.env.NODE_ENV === 'production';
const distPath = _dirname.endsWith('dist') ? _dirname : path.join(_dirname, 'dist');

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/suppliers', suppliersRouter);
  app.use('/api/purchase-orders', purchaseOrdersRouter);
  app.use('/api/sales-orders', salesOrdersRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/grn', grnRouter);
  app.use('/api/gin', ginRouter);
  app.use('/api/dispatch', dispatchRouter);
  app.use('/api/admin', adminRouter);

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
