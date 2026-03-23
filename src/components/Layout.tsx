import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { 
  LayoutDashboard, 
  Package, 
  Boxes, 
  Truck, 
  ShoppingCart, 
  FileText, 
  LogOut,
  ShieldAlert,
  Users,
  Plus,
  Minus,
  CreditCard,
  Clock,
  Bot
} from 'lucide-react';
import { cn } from '../lib/utils.js';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showAIModal, setShowAIModal] = React.useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Inventory', path: '/inventory', icon: Boxes },
    { name: 'GRN (Stock In)', path: '/grn', icon: Plus },
    { name: 'GIN (Stock Out)', path: '/gin', icon: Minus },
    { name: 'Suppliers', path: '/suppliers', icon: Truck },
    { name: 'Purchase Requests', path: '/purchase-requests', icon: ShoppingCart, roles: ['admin'] },
    { name: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingCart },
    { name: 'Sales Orders', path: '/sales-orders', icon: ShoppingCart },
    { name: 'Dispatch', path: '/dispatch', icon: Truck },
    { name: 'Order Payment Confirmation', path: '/order-payment-confirmation', icon: CreditCard },
    { name: 'Payment Pending', path: '/payment-pending', icon: Clock },
    { name: 'Manage Items', path: '/admin-items', icon: Package, roles: ['admin'] },
    { name: 'Accounts', path: '/accounts', icon: Users, roles: ['admin'] },
    { name: 'Reports', path: '/reports', icon: FileText, roles: ['admin', 'manager'] },
    { name: 'Audit Logs', path: '/audit-logs', icon: ShieldAlert, roles: ['admin'] },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col print:hidden">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Boxes className="h-6 w-6 text-indigo-600 mr-2" />
          <span className="text-lg font-bold text-gray-900">IFCO Systems</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              if (item.roles && !item.roles.includes(user?.role || '')) return null;
              
              const isActive = location.pathname === item.path;
              return (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                      isActive 
                        ? "bg-indigo-50 text-indigo-600" 
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-indigo-600" : "text-gray-400")} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center mb-4">
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 print:hidden">
          <h1 className="text-xl font-semibold text-gray-800 capitalize">
            {location.pathname === '/' ? 'Dashboard' : location.pathname.substring(1).replace(/-/g, ' ')}
          </h1>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowAIModal(true)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Bot className="mr-2 h-4 w-4" />
              AI Support
            </button>
          )}
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>

      {/* AI Support Modal */}
      {showAIModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={() => setShowAIModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                  <Bot className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    AI Support
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      To request changes to the program, please use the AI Studio chat interface on your screen. Tell the AI what you need, and it will make the changes for you!
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                  onClick={() => setShowAIModal(false)}
                >
                  Got it, thanks!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
