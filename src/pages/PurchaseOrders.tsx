import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { Printer, CheckCircle, Clock, Plus, X, Trash2, Search } from 'lucide-react';
import { fuzzySearch } from '../utils/search.js';

interface POItem {
  id: number;
  po_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  product_name: string;
  sku: string;
}

interface PurchaseOrder {
  id: number;
  supplier_id: number;
  status: string;
  created_by: number;
  created_at: string;
  supplier_name: string;
  created_by_name: string;
  items?: POItem[];
}

export default function PurchaseOrders() {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [poToDelete, setPoToDelete] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    supplier_id: '',
    items: [{ product_id: '', quantity: 1, unit_price: 0 }]
  });

  const [receiveData, setReceiveData] = useState({
    warehouse_id: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [poRes, prodRes, supRes, whRes] = await Promise.all([
        fetch('/api/purchase-orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/suppliers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/inventory/warehouses', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (poRes.ok) setOrders(await poRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (supRes.ok) setSuppliers(await supRes.json());
      if (whRes.ok) setWarehouses(await whRes.json());
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
        setFormData({ supplier_id: '', items: [{ product_id: '', quantity: 1, unit_price: 0 }] });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create PO');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = async (po: PurchaseOrder) => {
    try {
      const res = await fetch(`/api/purchase-orders/${po.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to fetch PO details');
      
      const fullPo: PurchaseOrder = await res.json();
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print');
        return;
      }

      const tableRows = (fullPo.items || []).map(item => `
        <tr>
          <td>${item.sku}</td>
          <td>${item.product_name}</td>
          <td>${item.quantity}</td>
          <td>$${Number(item.unit_price).toFixed(2)}</td>
          <td>$${(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}</td>
        </tr>
      `).join('');

      const totalAmount = (fullPo.items || []).reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Purchase Order - PO-${fullPo.id.toString().padStart(6, '0')}</title>
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
              .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
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
                ${fullPo.supplier_name}
              </div>
              <div style="text-align: right;">
                <strong>PO Number:</strong> PO-${fullPo.id.toString().padStart(6, '0')}<br>
                <strong>Date:</strong> ${new Date(fullPo.created_at).toLocaleDateString()}<br>
                <strong>Status:</strong> ${fullPo.status.toUpperCase()}
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
            <div class="total">
              Total Amount: $${totalAmount.toFixed(2)}
            </div>
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
    } catch (err) {
      console.error('Error generating print layout:', err);
      alert('Failed to generate print layout');
    }
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoId || !receiveData.warehouse_id) return;
    
    try {
      const res = await fetch(`/api/purchase-orders/${selectedPoId}/receive`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ warehouse_id: parseInt(receiveData.warehouse_id) })
      });
      
      if (res.ok) {
        setIsReceiveModalOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to receive purchase order');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 1, unit_price: 0 }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleDelete = async (poId: number) => {
    setDeleteError(null);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        fetchData();
        setPoToDelete(null);
      } else {
        const data = await res.json();
        setDeleteError(data.error || 'Failed to delete purchase order');
      }
    } catch (err) {
      console.error(err);
      setDeleteError('An error occurred while deleting');
    }
  };

  const filteredOrders = fuzzySearch<PurchaseOrder>(
    orders,
    searchTerm,
    ['supplier_name', 'id']
  );

  if (isLoading) return <div className="flex justify-center items-center h-64">Loading purchase orders...</div>;

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
              placeholder="Search POs by supplier or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Create Purchase Order
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => (
                  <tr key={po.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      PO-{po.id.toString().padStart(6, '0')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {po.supplier_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(po.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        po.status === 'received' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {po.status === 'received' ? (
                          <CheckCircle className="w-4 h-4 mr-1 inline" />
                        ) : (
                          <Clock className="w-4 h-4 mr-1 inline" />
                        )}
                        {po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        {po.status === 'pending' && user?.role === 'admin' && (
                          <>
                            <button
                              onClick={() => { setSelectedPoId(po.id); setIsReceiveModalOpen(true); }}
                              className="text-green-600 hover:text-green-900 flex items-center"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" /> Receive
                            </button>
                            <button
                              onClick={() => setPoToDelete(po.id)}
                              className="text-red-600 hover:text-red-900 flex items-center"
                            >
                              <Trash2 className="h-4 w-4 mr-1" /> Delete
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handlePrint(po)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center"
                        >
                          <Printer className="h-4 w-4 mr-1" /> Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleCreate}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Create Purchase Order</h3>
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Supplier</label>
                      <select required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border" value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})}>
                        <option value="">Select supplier</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-900">Order Items</h4>
                      <button type="button" onClick={addItem} className="text-sm text-indigo-600 hover:text-indigo-900 flex items-center">
                        <Plus className="h-4 w-4 mr-1" /> Add Item
                      </button>
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {formData.items.map((item, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                          <div className="flex-1">
                            <select required className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border" value={item.product_id} onChange={e => updateItem(index, 'product_id', e.target.value)}>
                              <option value="">Select product</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                            </select>
                          </div>
                          <div className="w-24">
                            <input type="number" required min="0" step="any" placeholder="Qty" className="focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} />
                          </div>
                          <div className="w-32">
                            <input type="number" required min="0" step="0.01" placeholder="Price" className="focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" value={item.unit_price} onChange={e => updateItem(index, 'unit_price', e.target.value)} />
                          </div>
                          {formData.items.length > 1 && (
                            <button type="button" onClick={() => removeItem(index)} className="text-red-600 hover:text-red-900">
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm">
                    Create PO
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isReceiveModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={() => setIsReceiveModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleReceive}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Receive Purchase Order</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Warehouse</label>
                      <select required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border" value={receiveData.warehouse_id} onChange={e => setReceiveData({...receiveData, warehouse_id: e.target.value})}>
                        <option value="">Select warehouse</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm">
                    Confirm Receipt
                  </button>
                  <button type="button" onClick={() => setIsReceiveModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {poToDelete && (
        <div className="fixed z-20 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={() => { setPoToDelete(null); setDeleteError(null); }}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">Delete Purchase Order</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">Are you sure you want to delete purchase order #{poToDelete}? This action cannot be undone.</p>
                      {deleteError && (
                        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                          {deleteError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm" onClick={() => handleDelete(poToDelete)}>
                  Delete
                </button>
                <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onClick={() => { setPoToDelete(null); setDeleteError(null); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
