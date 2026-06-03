import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { Plus, Search, CheckCircle, XCircle, Trash2, Edit, Truck, Printer, AlertTriangle } from 'lucide-react';
import { fuzzySearch } from '../utils/search.js';
import PrintableDocument from '../components/PrintableDocument.js';
import PrintSettingsModal from '../components/PrintSettingsModal.js';

export default function SalesOrders() {
  const { token, user } = useAuth();
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [soToDelete, setSoToDelete] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showPendingWarning, setShowPendingWarning] = useState(false);
  const [printData, setPrintData] = useState<any | null>(null);
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);
  const [printSettings, setPrintSettings] = useState({
    showBranding: true,
    companyName: 'Your Company Name',
    companyAddress: '123 Business Street, City, Country',
    visibleColumns: ['sku', 'product_name', 'quantity', 'unit_price', 'total']
  });

  const [formData, setFormData] = useState({
    so_number: '',
    customer_name: '',
    sales_person: '',
    warehouse_id: '',
    items: [{ product_id: '', quantity: 1, unit_price: 0 }]
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [soRes, prodRes, whRes] = await Promise.all([
        fetch('/api/sales-orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/inventory/warehouses', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (soRes.ok) setSalesOrders(await soRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (whRes.ok) setWarehouses(await whRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingId) {
      // Check for pending payments
      try {
        const checkRes = await fetch(`/api/sales-orders/check-pending?customer_name=${encodeURIComponent(formData.customer_name)}&sales_person=${encodeURIComponent(formData.sales_person)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (checkRes.ok) {
          const { hasPending } = await checkRes.json();
          if (hasPending) {
            setShowPendingWarning(true);
            return; // Stop and wait for user confirmation
          }
        }
      } catch (err) {
        console.error('Error checking pending payments:', err);
      }
    }
    
    await submitForm();
  };

  const submitForm = async () => {
    try {
      const url = editingId ? `/api/sales-orders/${editingId}` : '/api/sales-orders';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingId(null);
        fetchData();
        setFormData({ so_number: '', customer_name: '', sales_person: '', warehouse_id: '', items: [{ product_id: '', quantity: 1, unit_price: 0 }] });
        setShowPendingWarning(false);
      } else {
        const data = await res.json();
        alert(data.error || `Failed to ${editingId ? 'update' : 'create'} sales order`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = async (order: any) => {
    try {
      const res = await fetch(`/api/sales-orders/${order.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const fullOrder = await res.json();
        setFormData({
          so_number: fullOrder.so_number,
          customer_name: fullOrder.customer_name,
          sales_person: fullOrder.sales_person || '',
          warehouse_id: fullOrder.warehouse_id?.toString() || '',
          items: fullOrder.items.map((i: any) => ({
            product_id: i.product_id.toString(),
            quantity: i.quantity,
            unit_price: i.unit_price
          }))
        });
        setEditingId(order.id);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to fetch order details');
    }
  };

  const handleDispatch = async (id: number, warehouseId: number) => {
    if (!warehouseId) {
      alert('Warehouse ID is required to dispatch the order.');
      return;
    }
    try {
      const res = await fetch(`/api/sales-orders/${id}/dispatch`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ warehouse_id: warehouseId })
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to dispatch sales order');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = async (order: any) => {
    try {
      const res = await fetch(`/api/sales-orders/${order.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch order details');
      const fullOrder = await res.json();
      setPrintData(fullOrder);
      setIsPrintSettingsOpen(true);
    } catch (err) {
      console.error('Error fetching order details for printing:', err);
      alert('Failed to fetch order details');
    }
  };

  const handleComplete = async (id: number, warehouseId: number) => {
    if (!warehouseId) {
      alert('Warehouse ID is required to complete the order.');
      return;
    }
    try {
      const res = await fetch(`/api/sales-orders/${id}/complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ warehouse_id: warehouseId })
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to complete sales order');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleteError(null);
    try {
      const res = await fetch(`/api/sales-orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
        setSoToDelete(null);
      } else {
        const data = await res.json();
        setDeleteError(data.error || 'Failed to delete sales order');
      }
    } catch (err) {
      console.error(err);
      setDeleteError('An error occurred while deleting');
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

  const filteredOrders = fuzzySearch<any>(
    salesOrders,
    searchTerm,
    ['customer_name', 'so_number', 'id']
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative rounded-md shadow-sm max-w-sm w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
            <input
              type="text"
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
              placeholder="Search by SO#, customer or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ so_number: '', customer_name: '', sales_person: '', warehouse_id: '', items: [{ product_id: '', quantity: 1, unit_price: 0 }] });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          Create Sales Order
        </button>
      </div>

      <div className="flex flex-col">
        {isLoading ? (
          <div className="text-center py-10">Loading sales orders...</div>
        ) : salesOrders.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg shadow border border-gray-200">
            <p className="text-gray-500">No sales orders found.</p>
            {warehouses.length === 0 && (
              <p className="text-sm text-orange-600 mt-2">Warning: No warehouses found. You cannot create orders without a warehouse.</p>
            )}
          </div>
        ) : (
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SO Number</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Person</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.so_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customer_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.sales_person || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          order.status === 'dispatched' ? 'bg-blue-100 text-blue-800' : 
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-3">
                          {order.status === 'pending' && (
                            <button 
                              onClick={() => handleEdit(order)} 
                              className="text-indigo-600 hover:text-indigo-900 flex items-center"
                              title="Edit Sales Order"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                          )}
                          {order.status === 'pending' && user?.role === 'admin' && (
                            <button 
                              onClick={() => {
                                if (window.confirm(`Dispatch SO #${order.so_number} from warehouse ${order.warehouse_name || order.warehouse_id}?`)) {
                                  handleDispatch(order.id, order.warehouse_id);
                                }
                              }} 
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                              title="Dispatch Sales Order"
                            >
                              <Truck className="h-5 w-5 mr-1" /> Dispatch
                            </button>
                          )}
                          {(order.status === 'pending' || order.status === 'dispatched') && user?.role === 'admin' && (
                            <button 
                              onClick={() => {
                                if (window.confirm(`Complete SO #${order.so_number}?`)) {
                                  handleComplete(order.id, order.warehouse_id);
                                }
                              }} 
                              className="text-green-600 hover:text-green-900 flex items-center"
                              title="Complete Sales Order"
                            >
                              <CheckCircle className="h-5 w-5 mr-1" /> Complete
                            </button>
                          )}
                          <button 
                            onClick={() => handlePrint(order)} 
                            className="text-gray-600 hover:text-gray-900 flex items-center"
                            title="Print Sales Order"
                          >
                            <Printer className="h-5 w-5 mr-1" /> Print
                          </button>
                          {user?.role === 'admin' && (
                            <button 
                              onClick={() => setSoToDelete(order)} 
                              className="text-red-600 hover:text-red-900 flex items-center"
                              title="Delete Sales Order"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}
      </div>

      {isPrintSettingsOpen && (
        <PrintSettingsModal
          title="Sales Order"
          onCancel={() => setIsPrintSettingsOpen(false)}
          onConfirm={(settings) => {
            setPrintSettings({
              showBranding: settings.showBranding,
              companyName: settings.companyName,
              companyAddress: settings.companyAddress,
              visibleColumns: settings.columns.filter(c => c.enabled).map(c => c.key)
            });
            setIsPrintSettingsOpen(false);
          }}
          availableColumns={[
            { header: 'SKU', key: 'sku' },
            { header: 'Product', key: 'product_name' },
            { header: 'Quantity', key: 'quantity' },
            { header: 'Unit Price', key: 'unit_price', isCurrency: true },
            { header: 'Total', key: 'total', isTotal: true }
          ]}
        />
      )}

      {printData && !isPrintSettingsOpen && (
        <PrintableDocument
          title="Sales Order"
          documentNo={printData.so_number}
          date={printData.created_at}
          entityLabel="Customer"
          entityName={printData.customer_name}
          status={printData.status}
          items={printData.items || []}
          columns={[
            { header: 'SKU', key: 'sku' },
            { header: 'Product', key: 'product_name' },
            { header: 'Quantity', key: 'quantity' },
            { header: 'Unit Price', key: 'unit_price', isCurrency: true },
            { header: 'Total', key: 'total', isTotal: true }
          ].filter(col => printSettings.visibleColumns.includes(col.key))}
          totalAmount={(printData.items || []).reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unit_price)), 0)}
          onClose={() => setPrintData(null)}
          branding={{
            show: printSettings.showBranding,
            companyName: printSettings.companyName,
            companyAddress: printSettings.companyAddress
          }}
        />
      )}

      {isModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full" onClick={(e) => e.stopPropagation()}>
              <form onSubmit={handleCreateOrUpdate}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{editingId ? 'Edit Sales Order' : 'Create Sales Order'}</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">SO Number</label>
                        <input type="text" required placeholder="e.g. SO-001" className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" value={formData.so_number} onChange={e => setFormData({...formData, so_number: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Customer</label>
                        <input type="text" required className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Sales Person</label>
                        <input type="text" className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" value={formData.sales_person} onChange={e => setFormData({...formData, sales_person: e.target.value})} />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fulfill from Warehouse</label>
                      <select required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border" value={formData.warehouse_id} onChange={e => setFormData({...formData, warehouse_id: e.target.value})}>
                        <option value="">Select a warehouse</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
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
                                {products.filter(p => p.category_name === 'F.G').map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                              </select>
                            </div>
                            <div className="w-24">
                              <label className="block text-[10px] text-gray-500 uppercase">Qty</label>
                              <input type="number" required min="0" step="any" className="focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-1 px-2 border" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} />
                            </div>
                            <div className="w-32">
                              <label className="block text-[10px] text-gray-500 uppercase">Unit Price</label>
                              <input type="number" required min="0" step="0.01" className="focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-1 px-2 border" value={item.unit_price} onChange={e => updateItem(index, 'unit_price', e.target.value)} />
                            </div>
                            {formData.items.length > 1 && (
                              <button type="button" onClick={() => removeItem(index)} className="mt-4 text-red-600 hover:text-red-900">
                                <XCircle className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm">
                    {editingId ? 'Update Order' : 'Create Order'}
                  </button>
                  <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {soToDelete && (
        <div className="fixed z-20 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={() => { setSoToDelete(null); setDeleteError(null); }}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">Delete Sales Order</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">Are you sure you want to delete sales order "{soToDelete.so_number}"? Related inventory items will be restored. This action cannot be undone.</p>
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
                <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm" onClick={() => handleDelete(soToDelete.id)}>
                  Delete
                </button>
                <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onClick={() => { setSoToDelete(null); setDeleteError(null); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPendingWarning && (
        <div className="fixed z-30 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={() => setShowPendingWarning(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">Pending Payment Warning</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">Warning: This customer/sales person has pending payments from previous Sales Orders.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm" onClick={() => submitForm()}>
                  Proceed Anyway
                </button>
                <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onClick={() => setShowPendingWarning(false)}>
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
