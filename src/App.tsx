import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.js';
import Layout from './components/Layout.js';
import Login from './pages/Login.js';
import Dashboard from './pages/Dashboard.js';
import Products from './pages/Products.js';
import Inventory from './pages/Inventory.js';
import SalesOrders from './pages/SalesOrders.js';
import Suppliers from './pages/Suppliers.js';
import GRN from './pages/GRN.js';
import GIN from './pages/GIN.js';
import AdminItems from './pages/AdminItems.js';
import Reports from './pages/Reports.js';
import PurchaseRequests from './pages/PurchaseRequests.js';
import AccountControlPanel from './pages/AccountControlPanel.js';
import AuditLogs from './pages/AuditLogs.js';

import PurchaseOrders from './pages/PurchaseOrders.js';
import Dispatch from './pages/Dispatch.js';
import OrderPaymentConfirmation from './pages/OrderPaymentConfirmation.js';
import PaymentPending from './pages/PaymentPending.js';

function ProtectedRoute({ children, roles }: { children: React.ReactNode, roles?: string[] }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="grn" element={<GRN />} />
            <Route path="gin" element={<GIN />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="purchase-requests" element={<ProtectedRoute roles={['admin']}><PurchaseRequests /></ProtectedRoute>} />
            <Route path="sales-orders" element={<SalesOrders />} />
            <Route path="dispatch" element={<Dispatch />} />
            <Route path="order-payment-confirmation" element={<OrderPaymentConfirmation />} />
            <Route path="payment-pending" element={<PaymentPending />} />
            <Route path="admin-items" element={<ProtectedRoute roles={['admin']}><AdminItems /></ProtectedRoute>} />
            <Route path="accounts" element={<ProtectedRoute roles={['admin']}><AccountControlPanel /></ProtectedRoute>} />
            <Route path="reports" element={<ProtectedRoute roles={['admin', 'manager']}><Reports /></ProtectedRoute>} />
            <Route path="audit-logs" element={<ProtectedRoute roles={['admin']}><AuditLogs /></ProtectedRoute>} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
