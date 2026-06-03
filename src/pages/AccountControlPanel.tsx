import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { UserPlus, Trash2, Shield, User, AlertCircle, CheckCircle2, KeyRound, Edit } from 'lucide-react';

interface Permission {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface UserData {
  id: number;
  username: string;
  role: 'admin' | 'manager' | 'staff';
  created_at: string;
  permissions: Permission[];
}

const AVAILABLE_MODULES = [
  'products', 'inventory', 'grn', 'gin', 'suppliers', 
  'purchase_orders', 'purchase_requests', 'sales_orders', 
  'dispatch', 'reports', 'admin_items'
];

export default function AccountControlPanel() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'staff' as 'admin' | 'manager' | 'staff',
    permissions: AVAILABLE_MODULES.map(m => ({
      module: m,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false
    }))
  });

  const [passwordData, setPasswordData] = useState({
    password: ''
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `User ${formData.username} created successfully.` });
        setIsModalOpen(false);
        resetFormData();
        fetchUsers();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create user.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred.' });
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          role: formData.role,
          permissions: formData.permissions
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `User ${selectedUser.username} updated successfully.` });
        setIsEditModalOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update user.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred.' });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: passwordData.password })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Password for ${selectedUser.username} reset successfully.` });
        setIsPasswordModalOpen(false);
        setSelectedUser(null);
        setPasswordData({ password: '' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to reset password.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred.' });
    }
  };

  const handleClearAllData = async () => {
    setMessage(null);
    try {
      const res = await fetch('/api/admin/clear-all-data', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'All inventory data has been cleared successfully.' });
        setIsClearDataModalOpen(false);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to clear data.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred while clearing data.' });
    }
  };

  const handleDeleteUser = async (id: number) => {
    setDeleteError(null);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        // setMessage({ type: 'success', text: 'Record deleted successfully' });
        fetchUsers();
        setUserToDelete(null);
      } else {
        const data = await res.json();
        setDeleteError(data.error || 'Failed to delete user.');
      }
    } catch (err) {
      console.error(err);
      setDeleteError('An error occurred.');
    }
  };

  const resetFormData = () => {
    setFormData({
      username: '',
      password: '',
      role: 'staff',
      permissions: AVAILABLE_MODULES.map(m => ({
        module: m,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false
      }))
    });
  };

  const openEditModal = (user: UserData) => {
    setSelectedUser(user);
    
    // Merge existing permissions with available modules
    const mergedPermissions = AVAILABLE_MODULES.map(m => {
      const existing = user.permissions?.find(p => p.module === m);
      return existing ? { ...existing } : {
        module: m,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false
      };
    });

    setFormData({
      username: user.username,
      password: '',
      role: user.role,
      permissions: mergedPermissions
    });
    setIsEditModalOpen(true);
  };

  const openPasswordModal = (user: UserData) => {
    setSelectedUser(user);
    setPasswordData({ password: '' });
    setIsPasswordModalOpen(true);
  };

  const togglePermission = (moduleIndex: number, field: keyof Permission) => {
    const newPermissions = [...formData.permissions];
    newPermissions[moduleIndex] = {
      ...newPermissions[moduleIndex],
      [field]: !newPermissions[moduleIndex][field]
    };
    setFormData({ ...formData, permissions: newPermissions });
  };

  const setFullAccess = (moduleIndex: number) => {
    const newPermissions = [...formData.permissions];
    newPermissions[moduleIndex] = {
      ...newPermissions[moduleIndex],
      can_view: true,
      can_create: true,
      can_edit: true,
      can_delete: true
    };
    setFormData({ ...formData, permissions: newPermissions });
  };

  if (isLoading) return <div className="flex justify-center items-center h-64">Loading accounts...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Account Control Panel</h2>
          <p className="text-gray-500">Manage user accounts and their permissions.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsClearDataModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All Inventory Data
          </button>
          <button
            onClick={() => { resetFormData(); setIsModalOpen(true); }}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add New Account
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} flex items-center`}>
          {message.type === 'success' ? <CheckCircle2 className="mr-2 h-5 w-5" /> : <AlertCircle className="mr-2 h-5 w-5" />}
          {message.text}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden border border-gray-200 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {u.username} {u.id === currentUser?.id && <span className="text-xs text-indigo-600 font-normal">(You)</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    u.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <button
                    onClick={() => openPasswordModal(u)}
                    className="text-yellow-600 hover:text-yellow-900"
                    title="Reset Password"
                  >
                    <KeyRound className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => openEditModal(u)}
                    disabled={u.id === currentUser?.id}
                    className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-300"
                    title="Edit Permissions"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setUserToDelete(u)}
                    disabled={u.id === currentUser?.id}
                    className="text-red-600 hover:text-red-900 disabled:text-gray-300"
                    title="Delete User"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit User Modal */}
      {(isModalOpen || isEditModalOpen) && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <form onSubmit={isEditModalOpen ? handleEditUser : handleCreateUser}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {isEditModalOpen ? `Edit User: ${formData.username}` : 'Add New Account'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4 col-span-1">
                      {!isEditModalOpen && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Username</label>
                            <input
                              type="text"
                              required
                              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                              value={formData.username}
                              onChange={e => setFormData({...formData, username: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input
                              type="password"
                              required
                              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                              value={formData.password}
                              onChange={e => setFormData({...formData, password: e.target.value})}
                            />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <select
                          required
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                          value={formData.role}
                          onChange={e => setFormData({...formData, role: e.target.value as any})}
                        >
                          <option value="staff">Staff</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Module Permissions</h4>
                      <div className="bg-gray-50 rounded-md border border-gray-200 overflow-hidden max-h-96 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">View</th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Create</th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Edit</th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Delete</th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">All</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {formData.permissions.map((perm, idx) => (
                              <tr key={perm.module}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                                  {perm.module.replace(/_/g, ' ')}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input type="checkbox" checked={perm.can_view} onChange={() => togglePermission(idx, 'can_view')} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input type="checkbox" checked={perm.can_create} onChange={() => togglePermission(idx, 'can_create')} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input type="checkbox" checked={perm.can_edit} onChange={() => togglePermission(idx, 'can_edit')} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input type="checkbox" checked={perm.can_delete} onChange={() => togglePermission(idx, 'can_delete')} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <button type="button" onClick={() => setFullAccess(idx)} className="text-xs text-indigo-600 hover:text-indigo-900">Full</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {isEditModalOpen ? 'Save Changes' : 'Create Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed z-20 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={() => setIsPasswordModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <form onSubmit={handleResetPassword}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Reset Password for {selectedUser.username}
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">New Password</label>
                    <input
                      type="password"
                      required
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                      value={passwordData.password}
                      onChange={e => setPasswordData({ password: e.target.value })}
                    />
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-600 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Reset Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {userToDelete && (
        <div className="fixed z-20 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={() => { setUserToDelete(null); setDeleteError(null); }}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">Delete User</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">Are you sure you want to delete user "{userToDelete.username}"? This action cannot be undone.</p>
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
                <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm" onClick={() => handleDeleteUser(userToDelete.id)}>
                  Delete
                </button>
                <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onClick={() => { setUserToDelete(null); setDeleteError(null); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Data Confirmation Modal */}
      {isClearDataModalOpen && (
        <div className="fixed z-20 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={() => setIsClearDataModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">Clear All Inventory Data</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        WARNING: This will delete ALL inventory, products, suppliers, and transaction data. 
                        This action cannot be undone. Are you sure you want to proceed?
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm" 
                  onClick={handleClearAllData}
                >
                  Clear All Data
                </button>
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" 
                  onClick={() => setIsClearDataModalOpen(false)}
                >
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
