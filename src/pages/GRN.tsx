import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { Plus, Search, FileText, Package, Warehouse, User, XCircle } from 'lucide-react';
import { fuzzySearch } from '../utils/search.js';

export default function GRN() {
  const { token, user } = useAuth();
  const [grns, setGrns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    grn_number: '',
    supplier_id: '',
    warehouse_id: '',
    notes: '',
    items: [{ product_id: '', quantity: 1 }]
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [grnRes, prodRes, whRes, supRes] = await Promise.all([
        fetch('/api/grn', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/inventory/warehouses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/suppliers', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (grnRes.ok) setGrns(await grnRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (whRes.ok) setWarehouses(await whRes.json());
      if (supRes.ok) setSuppliers(await supRes.json());
    } catch (err) {
      console.error(err);
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
      const res = await fetch('/api/grn', {
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
        setFormData({ grn_number: '', supplier_id: '', warehouse_id: '', notes: '', items: [{ product_id: '', quantity: 1 }] });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create GRN');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 1 }]
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

  const filteredGrns = fuzzySearch<any>(
    grns,
    searchTerm,
    ['grn_number', 'supplier_name', 'warehouse_name']
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
            placeholder="Search GRNs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {user?.role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            New GRN (Goods Received)
          </button>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden border border-gray-200 sm:rounded-lg">
        {isLoading ? (
          <div className="text-center py-10">Loading GRNs...</div>
        ) : filteredGrns.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No GRNs found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GRN #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGrns.map((g) => (
                <tr key={g.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{g.grn_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{g.supplier_name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{g.warehouse_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(g.received_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{g.created_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleCreate}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">New Goods Received Note (GRN)</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">GRN Number</label>
                      <input type="text" required placeholder="e.g. GRN-2024-001" className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" value={formData.grn_number} onChange={e => setFormData({...formData, grn_number: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Warehouse</label>
                      <select required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border" value={formData.warehouse_id} onChange={e => setFormData({...formData, warehouse_id: e.target.value})}>
                        <option value="">Select warehouse</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Supplier (Optional)</label>
                      <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border" value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})}>
                        <option value="">Select supplier</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Notes</label>
                      <input type="text" className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-900">Received Items</h4>
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
                              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) - {p.unit_of_measure || 'pcs'}</option>)}
                            </select>
                          </div>
                          <div className="w-32">
                            <input type="number" required min="0" step="any" placeholder="Qty" className="focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} />
                          </div>
                          {formData.items.length > 1 && (
                            <button type="button" onClick={() => removeItem(index)} className="text-red-600 hover:text-red-900">
                              <XCircle className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm">
                    Confirm Receipt
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
    </div>
  );
}
