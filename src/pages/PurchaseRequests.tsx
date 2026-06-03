import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { ShoppingCart, Printer, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { fuzzySearch } from '../utils/search.js';

interface LowStockItem {
  product_id: number;
  sku: string;
  name: string;
  warehouse: string;
  quantity: number;
  min_stock_level: number;
  supplier_id: number;
  supplier_name: string;
}

export default function PurchaseRequests() {
  const { token } = useAuth();
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchLowStock = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/reports/low-stock', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setLowStockItems(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch low stock:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLowStock();
  }, [token]);

  const generatePDF = (supplierName: string, items: LowStockItem[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }

    const tableRows = items.map(item => `
      <tr>
        <td>${item.sku}</td>
        <td>${item.name}</td>
        <td>${item.min_stock_level * 2}</td>
        <td>$0.00</td>
        <td>$0.00</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order - ${supplierName}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
            .header h1 { margin: 0; color: #4f46e5; font-size: 24px; text-transform: uppercase; }
            .details { margin-bottom: 30px; display: flex; justify-content: space-between; }
            .details div { flex: 1; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #e5e7eb; padding: 12px 8px; text-align: left; }
            th { background-color: #f9fafb; font-weight: bold; color: #374151; }
            .signature { margin-top: 60px; width: 300px; border-top: 1px solid #000; padding-top: 10px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Purchase Order</h1>
          </div>
          <div class="details">
            <div>
              <strong>Supplier:</strong><br>
              ${supplierName}
            </div>
            <div style="text-align: right;">
              <strong>PO Number:</strong> PO-AUTO-${Date.now().toString().slice(-6)}<br>
              <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="signature">
            Authorized Signature
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const createPurchaseOrders = async () => {
    if (lowStockItems.length === 0) return;
    
    setIsGenerating(true);
    setMessage(null);
    
    // Group by supplier
    const grouped = lowStockItems.reduce((acc, item) => {
      if (!item.supplier_id) return acc;
      if (!acc[item.supplier_id]) {
        acc[item.supplier_id] = {
          supplier_name: item.supplier_name,
          items: []
        };
      }
      acc[item.supplier_id].items.push(item);
      return acc;
    }, {} as Record<number, { supplier_name: string, items: LowStockItem[] }>);

    try {
      let successCount = 0;
      for (const supplierId in grouped) {
        const { items } = grouped[supplierId];
        
        const res = await fetch('/api/purchase-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            supplier_id: parseInt(supplierId),
            items: items.map(i => ({
              product_id: i.product_id,
              quantity: i.min_stock_level * 2, // Default order quantity
              unit_price: 0 // Default price
            }))
          })
        });

        if (res.ok) {
          successCount++;
        }
      }

      setMessage({ 
        type: 'success', 
        text: `Successfully generated ${successCount} Purchase Orders from low stock items.` 
      });
      fetchLowStock();
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred while generating purchase orders.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const groupedBySupplier = fuzzySearch<LowStockItem>(
    lowStockItems,
    searchTerm,
    ['name', 'sku', 'supplier_name', 'warehouse']
  ).reduce((acc, item) => {
    const key = item.supplier_name || 'No Supplier';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, LowStockItem[]>);

  if (isLoading) return <div className="flex justify-center items-center h-64">Loading low stock data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-sm">
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
              placeholder="Search low stock items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={createPurchaseOrders}
          disabled={isGenerating || lowStockItems.length === 0}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isGenerating ? 'Generating...' : 'Generate Purchase Orders'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} flex items-center`}>
          {message.type === 'success' ? <CheckCircle2 className="mr-2 h-5 w-5" /> : <AlertTriangle className="mr-2 h-5 w-5" />}
          {message.text}
        </div>
      )}

      {lowStockItems.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">All stock levels are healthy</h3>
          <p className="text-gray-500">No items are currently below their minimum stock level.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {(Object.entries(groupedBySupplier) as [string, LowStockItem[]][]).map(([supplierName, items]) => (
            <div key={supplierName} className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">{supplierName}</h3>
                <button
                  onClick={() => generatePDF(supplierName, items)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Printer className="mr-2 h-3.5 w-3.5" />
                  Print PO
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suggested Order</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.sku}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.warehouse}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">{item.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.min_stock_level}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-semibold">{item.min_stock_level * 2}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
