import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import { LogOut, Package, Users, BarChart3, Settings, Menu, X } from 'lucide-react';

function AppContent() {
  const { user, logout, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'suppliers' | 'settings'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'products', label: 'Inventory', icon: Package },
    { id: 'suppliers', label: 'Suppliers', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Mobile Header */}
      <header className="lg:hidden bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Package className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">IFCO ERP</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-zinc-400 hover:text-white">
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col z-40 transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="hidden lg:flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <Package className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight">IFCO ERP</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === item.id 
                  ? 'bg-emerald-500/10 text-emerald-500' 
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-zinc-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold">
              {user?.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
              <p className="text-[10px] font-bold uppercase tracking-tighter text-emerald-500">
                Cloud Sync Active
              </p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-10">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'products' && <Products />}
        {activeTab === 'suppliers' && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500">
            <Users className="w-16 h-16 mb-4 opacity-20" />
            <h2 className="text-xl font-semibold">Suppliers Module</h2>
            <p>Coming soon to the cloud portal.</p>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500">
            <Settings className="w-16 h-16 mb-4 opacity-20" />
            <h2 className="text-xl font-semibold">Settings Module</h2>
            <p>Coming soon to the cloud portal.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
