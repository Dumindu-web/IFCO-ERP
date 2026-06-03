import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { FileText, Download, Printer } from 'lucide-react';

export default function AuditLogs() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('system');
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [monthlyTransactions, setMonthlyTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (activeTab === 'system') {
          const res = await fetch('/api/reports/audit-logs', { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) setSystemLogs(await res.json());
        } else {
          // Fetch monthly item transactions
          const res = await fetch('/api/reports/monthly-item-transactions', { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) setMonthlyTransactions(await res.json());
        }
      } catch (err) {
        console.error('Failed to fetch logs:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [activeTab, token]);

  const exportToCSV = () => {
    let data = [];
    let headers = [];
    let filename = '';

    if (activeTab === 'system') {
      headers = ['Timestamp', 'User', 'Action', 'Entity', 'Entity ID', 'Details'];
      data = systemLogs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.username,
        log.action,
        log.entity,
        log.entity_id || '',
        log.details || ''
      ]);
      filename = 'system_audit_logs.csv';
    } else {
      headers = ['Month', 'SKU', 'Product Name', 'Category', 'Warehouse', 'Type', 'Quantity', 'User', 'Notes'];
      data = monthlyTransactions.map(tx => [
        tx.month,
        tx.sku,
        tx.product_name,
        tx.category_name || '',
        tx.warehouse_name,
        tx.type,
        tx.quantity,
        tx.username,
        tx.notes || ''
      ]);
      filename = 'monthly_item_transactions.csv';
    }

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 relative">
      <div className="hidden print:block mb-8 text-center">
        <h1 className="text-3xl font-bold uppercase tracking-wider">
          {activeTab === 'system' ? 'System Audit Logs' : 'Monthly Item Transactions'}
        </h1>
        <p className="text-gray-600 mt-2">Generated on: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <div className="flex space-x-3">
          <button
            onClick={printReport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Printer className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
            Print PDF
          </button>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Download className="-ml-1 mr-2 h-5 w-5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="border-b border-gray-200 print:hidden">
          <nav className="-mb-px flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('system')}
              className={`${
                activeTab === 'system'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm`}
            >
              System Actions
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`${
                activeTab === 'monthly'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm`}
            >
              Monthly Item Transactions
            </button>
          </nav>
        </div>

        <div className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">Loading logs...</div>
          ) : activeTab === 'system' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {systemLogs.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No system logs found.</td></tr>
                  ) : (
                    systemLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                            log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.entity} {log.entity_id ? `#${log.entity_id}` : ''}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {monthlyTransactions.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">No monthly transactions found.</td></tr>
                  ) : (
                    monthlyTransactions.map((tx, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.month}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {tx.product_name} <span className="text-gray-500 text-xs">({tx.sku})</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.category_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.warehouse_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            ['in', 'grn'].includes(tx.type) ? 'bg-green-100 text-green-800' :
                            ['out', 'gin'].includes(tx.type) ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {tx.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tx.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.username}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
