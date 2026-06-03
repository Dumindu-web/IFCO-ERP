import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { Truck, Plus, Search, CheckCircle, Clock, Printer } from 'lucide-react';
import { fuzzySearch } from '../utils/search.js';
import PrintableDocument from '../components/PrintableDocument.js';
import PrintSettingsModal from '../components/PrintSettingsModal.js';

export default function Dispatch() {
  const { token } = useAuth();
  const [dispatchNotes, setDispatchNotes] = useState<any[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [printData, setPrintData] = useState<any | null>(null);
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);
  const [printSettings, setPrintSettings] = useState({
    showBranding: true,
    companyName: 'Your Company Name',
    companyAddress: '123 Business Street, City, Country',
    visibleColumns: ['product_name', 'sku', 'quantity', 'unit_price', 'total']
  });

  const [formData, setFormData] = useState({
    so_id: '',
    vehicle_number: '',
    driver_name: '',
    driver_id_number: '',
    company_name: '',
    items: [] as any[]
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dispatchRes, soRes] = await Promise.all([
        fetch('/api/dispatch', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/sales-orders', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (dispatchRes.ok) setDispatchNotes(await dispatchRes.json());
      if (soRes.ok) {
        const sos = await soRes.json();
        // Only show pending or completed SOs that haven't been dispatched yet
        setSalesOrders(sos.filter((so: any) => so.status === 'pending'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSOChange = async (soId: string) => {
    setFormData({ ...formData, so_id: soId, items: [] });
    if (!soId) return;

    try {
      const res = await fetch(`/api/sales-orders/${soId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const so = await res.json();
        setFormData(prev => ({
          ...prev,
          items: so.items.map((item: any) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            sku: item.sku,
            quantity: item.quantity,
            unit_price: item.unit_price
          }))
        }));
      }
    } catch (err) {
      console.error('Failed to fetch SO details:', err);
    }
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.so_id || !formData.items.length) {
      alert('Please select a valid Sales Order with items.');
      return;
    }

    try {
      const res = await fetch('/api/dispatch', {
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
        setFormData({
          so_id: '',
          vehicle_number: '',
          driver_name: '',
          driver_id_number: '',
          company_name: '',
          items: []
        });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create Dispatch Note');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    }
  };

  const handlePrint = async (note: any) => {
    try {
      const res = await fetch(`/api/dispatch/${note.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const fullNote = await res.json();
        setPrintData(fullNote);
        setIsPrintSettingsOpen(true);
      } else {
        alert('Failed to fetch dispatch details for printing');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to fetch dispatch details for printing');
    }
  };

  const filteredNotes = fuzzySearch<any>(
    dispatchNotes,
    searchTerm,
    ['dispatch_number', 'so_number', 'company_name', 'driver_name']
  );

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
              placeholder="Search dispatch notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          Create Dispatch Note
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispatch #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SO #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : filteredNotes.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">No dispatch notes found.</td></tr>
              ) : (
                filteredNotes.map((note) => (
                  <tr key={note.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{note.dispatch_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{note.so_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{note.company_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{note.vehicle_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        note.status === 'payment_received' ? 'bg-green-100 text-green-800' : 
                        note.status === 'payment_not_received' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {note.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(note.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handlePrint(note)} 
                        className="text-gray-600 hover:text-gray-900 flex items-center justify-end w-full"
                        title="Print Dispatch Note"
                      >
                        <Printer className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isPrintSettingsOpen && (
        <PrintSettingsModal
          title="Dispatch Note"
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
            { header: 'Product', key: 'product_name' },
            { header: 'SKU', key: 'sku' },
            { header: 'Quantity', key: 'quantity' },
            { header: 'Unit Price', key: 'unit_price', isCurrency: true },
            { header: 'Total', key: 'total', isTotal: true }
          ]}
        />
      )}

      {printData && !isPrintSettingsOpen && (
        <PrintableDocument
          title="Dispatch Note"
          documentNo={printData.dispatch_number}
          date={printData.created_at}
          entityLabel="Customer"
          entityName={printData.so_customer_name}
          status={printData.status}
          items={printData.items || []}
          columns={[
            { header: 'Product', key: 'product_name' },
            { header: 'SKU', key: 'sku' },
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
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Create Dispatch Note</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Sales Order</label>
                      <select required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border" value={formData.so_id} onChange={e => handleSOChange(e.target.value)}>
                        <option value="">Select Sales Order</option>
                        {salesOrders.map(so => <option key={so.id} value={so.id}>{so.so_number} - {so.customer_name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700">Company Name</label>
                      <input type="text" required className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700">Vehicle Number</label>
                      <input type="text" required className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" value={formData.vehicle_number} onChange={e => setFormData({...formData, vehicle_number: e.target.value})} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700">Driver Name</label>
                      <input type="text" required className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" value={formData.driver_name} onChange={e => setFormData({...formData, driver_name: e.target.value})} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700">Driver ID Number</label>
                      <input type="text" required className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" value={formData.driver_id_number} onChange={e => setFormData({...formData, driver_id_number: e.target.value})} />
                    </div>
                  </div>

                  {formData.items.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Order Items (Auto-loaded)</h4>
                      <div className="bg-gray-50 p-4 rounded-md max-h-60 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {formData.items.map((item, idx) => (
                              <tr key={idx}>
                                <td className="py-2 text-sm text-gray-900">{item.product_name} ({item.sku})</td>
                                <td className="py-2 text-sm text-gray-500">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="w-20 focus:ring-indigo-500 focus:border-indigo-500 block shadow-sm sm:text-sm border-gray-300 rounded-md py-1 px-2 border"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                                  />
                                </td>
                                <td className="py-2 text-sm text-gray-500">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="w-24 focus:ring-indigo-500 focus:border-indigo-500 block shadow-sm sm:text-sm border-gray-300 rounded-md py-1 px-2 border"
                                    value={item.unit_price}
                                    onChange={(e) => handleItemChange(idx, 'unit_price', Number(e.target.value))}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" disabled={!formData.items.length} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400">
                    Submit Dispatch
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
