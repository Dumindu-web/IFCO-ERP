import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import { fuzzySearch } from '../utils/search.js';

export default function OrderPaymentConfirmation() {
  const { token } = useAuth();
  const [dispatchNotes, setDispatchNotes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [paymentData, setPaymentData] = useState({
    status: 'payment_received',
    payment_type: 'cash'
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dispatch', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const notes = await res.json();
        // Only show pending payment
        setDispatchNotes(notes.filter((n: any) => n.status === 'pending_payment'));
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

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNote) return;

    try {
      const res = await fetch(`/api/dispatch/${selectedNote.id}/payment`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          status: paymentData.status,
          payment_type: paymentData.status === 'payment_received' ? paymentData.payment_type : null
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
        setSelectedNote(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update payment status');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    }
  };

  const filteredNotes = fuzzySearch<any>(
    dispatchNotes,
    searchTerm,
    ['dispatch_number', 'so_number', 'company_name']
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
              placeholder="Search pending payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispatch #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SO #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : filteredNotes.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No pending payments found.</td></tr>
              ) : (
                filteredNotes.map((note) => (
                  <tr key={note.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{note.dispatch_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{note.so_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{note.company_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(note.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedNote(note);
                          setPaymentData({ status: 'payment_received', payment_type: 'cash' });
                          setIsModalOpen(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 font-semibold"
                      >
                        Confirm Payment
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedNote && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <form onSubmit={handlePayment}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Payment Confirmation - {selectedNote.dispatch_number}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Payment Status</label>
                      <select 
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border" 
                        value={paymentData.status} 
                        onChange={e => setPaymentData({...paymentData, status: e.target.value})}
                      >
                        <option value="payment_received">Payment Received</option>
                        <option value="payment_not_received">Payment Not Received</option>
                      </select>
                    </div>

                    {paymentData.status === 'payment_received' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Payment Type</label>
                        <select 
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border" 
                          value={paymentData.payment_type} 
                          onChange={e => setPaymentData({...paymentData, payment_type: e.target.value})}
                        >
                          <option value="cash">Cash</option>
                          <option value="check">Check</option>
                        </select>
                      </div>
                    )}
                    
                    {paymentData.status === 'payment_received' && (
                      <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700 mt-4">
                        <p><strong>Note:</strong> Marking as "Payment Received" will automatically deduct the dispatched items from inventory.</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${paymentData.status === 'payment_received' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'}`}>
                    Submit
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
