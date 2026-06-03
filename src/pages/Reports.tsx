import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { FileText, Download, Table as TableIcon, BarChart3, Printer } from 'lucide-react';

export default function Reports() {
  const { token } = useAuth();
  const [currentInventory, setCurrentInventory] = useState<any[]>([]);
  const [monthlyTransaction, setMonthlyTransaction] = useState<any[]>([]);
  const [monthlyInventory, setMonthlyInventory] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'current' | 'monthly_inv' | 'monthly_trans' | 'audit_logs'>('current');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [currRes, monthTransRes, monthInvRes, auditRes] = await Promise.all([
          fetch('/api/reports/current-inventory', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/reports/monthly-transaction', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/reports/monthly-inventory', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/reports/audit-logs', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (currRes.ok) setCurrentInventory(await currRes.json());
        if (monthTransRes.ok) setMonthlyTransaction(await monthTransRes.json());
        if (monthInvRes.ok) setMonthlyInventory(await monthInvRes.json());
        if (auditRes.ok) setAuditLogs(await auditRes.json());
      } catch (err) {
        console.error('Failed to fetch reports:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) return <div className="flex justify-center items-center h-64">Loading reports...</div>;

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="flex justify-between items-center print:hidden">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === 'current' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <TableIcon className="inline-block w-4 h-4 mr-2" />
            Current Inventory
          </button>
          <button
            onClick={() => setActiveTab('monthly_inv')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === 'monthly_inv' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <TableIcon className="inline-block w-4 h-4 mr-2" />
            Monthly Inventory
          </button>
          <button
            onClick={() => setActiveTab('monthly_trans')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === 'monthly_trans' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="inline-block w-4 h-4 mr-2" />
            Monthly Transaction
          </button>
          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === 'audit_logs' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <FileText className="inline-block w-4 h-4 mr-2" />
            Audit Logs
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </button>
          <button
            onClick={() => exportToCSV(
              activeTab === 'current' ? currentInventory : 
              activeTab === 'monthly_inv' ? monthlyInventory : 
              activeTab === 'monthly_trans' ? monthlyTransaction : auditLogs, 
              `${activeTab}-report.csv`
            )}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {activeTab === 'current' && (
        <div className="bg-white shadow rounded-lg overflow-hidden print:shadow-none print:border-none">
          <div className="px-6 py-4 border-b border-gray-200 print:border-b-2 print:border-black">
            <h3 className="text-lg font-medium text-gray-900 print:text-2xl print:font-bold">Current Inventory Report</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 print:divide-black">
              <thead className="bg-gray-50 print:bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Product Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Warehouse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">UoM</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Total Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Reserved</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Available</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 print:divide-black">
                {currentInventory.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black">{item.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 print:text-black">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black">{item.category || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black">{item.warehouse}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black">{item.unit_of_measure}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 print:text-black">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-500 print:text-black">{item.reserved_quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 print:text-black">{item.available}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'monthly_inv' && (
        <div className="bg-white shadow rounded-lg overflow-hidden print:shadow-none print:border-none">
          <div className="px-6 py-4 border-b border-gray-200 print:border-b-2 print:border-black">
            <h3 className="text-lg font-medium text-gray-900 print:text-2xl print:font-bold">Monthly Inventory Report</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 print:divide-black">
              <thead className="bg-gray-50 print:bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Product Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Opening Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Net Change</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Closing Stock</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 print:divide-black">
                {monthlyInventory.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black">{item.month}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black">{item.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 print:text-black">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black">{item.category || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 print:text-black">{item.opening_stock}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${item.net_change >= 0 ? 'text-green-600 print:text-black' : 'text-red-600 print:text-black'}`}>
                      {item.net_change > 0 ? '+' : ''}{item.net_change}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 print:text-black">{item.closing_stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'monthly_trans' && (
        <div className="space-y-6 print:space-y-0">
          <div className="bg-white shadow rounded-lg overflow-hidden print:shadow-none print:border-none">
            <div className="px-6 py-4 border-b border-gray-200 print:border-b-2 print:border-black">
              <h3 className="text-lg font-medium text-gray-900 print:text-2xl print:font-bold">Monthly Transaction Audit Log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 print:divide-black">
                <thead className="bg-gray-50 print:bg-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Item Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Qty Change</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Warehouse</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 print:divide-black">
                  {monthlyTransaction.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black">{new Date(item.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 print:text-black">{item.item_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black">{item.sku}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black capitalize">{item.transaction_type}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${['in', 'grn', 'adjustment'].includes(item.transaction_type) && item.quantity_change > 0 ? 'text-green-600 print:text-black' : 'text-red-600 print:text-black'}`}>
                        {['in', 'grn', 'adjustment'].includes(item.transaction_type) && item.quantity_change > 0 ? '+' : ''}{item.quantity_change}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black">{item.warehouse_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black">{item.user}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 print:text-black">{item.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit_logs' && (
        <div className="bg-white shadow rounded-lg overflow-hidden print:shadow-none print:border-none">
          <div className="px-6 py-4 border-b border-gray-200 print:border-b-2 print:border-black">
            <h3 className="text-lg font-medium text-gray-900 print:text-2xl print:font-bold">System Audit Logs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 print:divide-black">
              <thead className="bg-gray-50 print:bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Entity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Entity ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:text-black print:font-bold">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 print:divide-black">
                {auditLogs.map((log, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black">{log.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 print:text-black">{log.action}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black capitalize">{log.entity.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black">{log.entity_id || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 print:text-black">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
