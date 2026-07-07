import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAllUsers, createUser, updateUser, deactivateUser, toggleUserAdmin,
  getAllCentres, createCentre, updateCentre, deactivateCentre,
  getAllPermissions, updateRolePermission, getUserPermissions, setUserOverridePermission, deleteUserOverridePermission
} from '../api';
import { 
  Shield, Users, Building2, Key, UserCheck, UserMinus, Plus, Edit2, 
  Trash2, ToggleLeft, ToggleRight, Check, X, Search, CheckSquare, Square, RefreshCw
} from 'lucide-react';

const rolesList = ['hq_executive', 'hq_manager', 'rm', 'centre_head', 'centre_executive', 'leadership'];

const pagePermissionKeys = [
  { key: 'page:dashboard', label: 'Dashboard Overview' },
  { key: 'page:tasks_my', label: 'My Tasks Workbasket' },
  { key: 'page:tasks_all', label: 'All Centre Tasks' },
  { key: 'page:tasks_pending', label: 'Tasks Pending Approval' },
  { key: 'page:department', label: 'Department Head Dashboard' },
  { key: 'page:priority', label: 'Set Task Priority Matrix' },
  { key: 'page:region', label: 'Regional Centre Overview' },
  { key: 'page:basket', label: 'Centre Head Basket' },
  { key: 'page:assigned', label: 'Assigned Centre Tasks' },
  { key: 'page:delegate', label: 'Delegate Centre Tasks' },
  { key: 'page:centres', label: 'Centres Directory' },
  { key: 'page:notifications', label: 'Notifications Hub' },
  { key: 'page:kanban', label: 'Kanban Task Board' },
  { key: 'page:reports', label: 'Reports & Analytics' }
];

const actionPermissionKeys = [
  { key: 'task:priority:view', label: 'View Priority' },
  { key: 'task:priority:suggest', label: 'Suggest Priority' },
  { key: 'task:priority:set', label: 'Set Final Priority (RM)' },
  { key: 'task:priority:override', label: 'Override Priority (Leadership)' }
];

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('users');

  // Modals state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [centreModalOpen, setCentreModalOpen] = useState(false);
  const [editingCentre, setEditingCentre] = useState(null);

  // Search state for user override section
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [selectedOverrideUser, setSelectedOverrideUser] = useState(null);

  // Queries
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: getAllUsers,
  });

  const { data: centres, isLoading: centresLoading } = useQuery({
    queryKey: ['adminCentres'],
    queryFn: getAllCentres,
  });

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['adminPermissions'],
    queryFn: getAllPermissions,
  });

  const { data: overrideUserData, refetch: refetchOverrides } = useQuery({
    queryKey: ['userPermissionsOverrides', selectedOverrideUser?.id],
    queryFn: () => getUserPermissions(selectedOverrideUser.id),
    enabled: !!selectedOverrideUser,
  });

  // User Mutation Actions
  const saveUserMutation = useMutation({
    mutationFn: (data) => editingUser ? updateUser(editingUser.id, data) : createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setUserModalOpen(false);
      setEditingUser(null);
      alert('User saved successfully');
    },
    onError: (err) => alert(err.response?.data?.error || 'Operation failed')
  });

  const deactivateUserMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      alert('User deactivated successfully');
    },
    onError: (err) => alert(err.response?.data?.error || 'Operation failed')
  });

  const toggleAdminMutation = useMutation({
    mutationFn: ({ id, is_admin }) => toggleUserAdmin(id, is_admin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      alert('Admin privileges toggled successfully');
    },
    onError: (err) => alert(err.response?.data?.error || 'Operation failed')
  });

  // Centre Mutation Actions
  const saveCentreMutation = useMutation({
    mutationFn: (data) => editingCentre ? updateCentre(editingCentre.id, data) : createCentre(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCentres'] });
      setCentreModalOpen(false);
      setEditingCentre(null);
      alert('Centre saved successfully');
    },
    onError: (err) => alert(err.response?.data?.error || 'Operation failed')
  });

  const deactivateCentreMutation = useMutation({
    mutationFn: deactivateCentre,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCentres'] });
      alert('Centre deactivated successfully');
    },
    onError: (err) => alert(err.response?.data?.error || 'Operation failed')
  });

  // Permissions Mutation Actions
  const toggleRolePermMutation = useMutation({
    mutationFn: updateRolePermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPermissions'] });
    },
    onError: (err) => alert(err.response?.data?.error || 'Failed to update permission')
  });

  const setOverridePermMutation = useMutation({
    mutationFn: setUserOverridePermission,
    onSuccess: () => {
      refetchOverrides();
    },
    onError: (err) => alert(err.response?.data?.error || 'Failed to set override')
  });

  const deleteOverridePermMutation = useMutation({
    mutationFn: ({ userId, key }) => deleteUserOverridePermission(userId, key),
    onSuccess: () => {
      refetchOverrides();
    },
    onError: (err) => alert(err.response?.data?.error || 'Failed to delete override')
  });

  // Check if role is allowed a specific key
  const isRoleAllowed = (role, key) => {
    const row = permissions?.find(p => p.role === role && p.permission_key === key);
    return row ? row.allowed : false;
  };

  const handleRolePermToggle = (role, key) => {
    const currentlyAllowed = isRoleAllowed(role, key);
    toggleRolePermMutation.mutate({
      role,
      permission_key: key,
      allowed: !currentlyAllowed
    });
  };

  const handleAddOverride = (key, allowed) => {
    if (!selectedOverrideUser) return;
    setOverridePermMutation.mutate({
      user_id: selectedOverrideUser.id,
      permission_key: key,
      allowed
    });
  };

  const handleDeleteOverride = (key) => {
    if (!selectedOverrideUser) return;
    deleteOverridePermMutation.mutate({
      userId: selectedOverrideUser.id,
      key
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-650 shadow-inner">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CAMS Administration</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage system access, centre facilities, and user permissions matrix.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1 bg-white p-1.5 rounded-xl border">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'users' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-550 hover:bg-slate-50'
          }`}
        >
          <Users size={16} />
          <span>Users & Staff</span>
        </button>
        <button
          onClick={() => setActiveTab('centres')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'centres' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-550 hover:bg-slate-50'
          }`}
        >
          <Building2 size={16} />
          <span>Centres & Facilities</span>
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'permissions' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-550 hover:bg-slate-50'
          }`}
        >
          <Key size={16} />
          <span>System Permissions Matrix</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="transition-all duration-200">
        {activeTab === 'users' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-lg">CAMS Portal Users</h3>
              <button
                onClick={() => { setEditingUser(null); setUserModalOpen(true); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus size={14} />
                <span>Add User</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-6">Name</th>
                    <th className="py-3.5 px-6">Email</th>
                    <th className="py-3.5 px-6">Role</th>
                    <th className="py-3.5 px-6">Department</th>
                    <th className="py-3.5 px-6">Centre</th>
                    <th className="py-3.5 px-6">Admin</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {usersLoading ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">Loading user accounts...</td>
                    </tr>
                  ) : users?.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-6 font-semibold text-slate-800">{u.name}</td>
                      <td className="py-3.5 px-6 text-slate-650 font-mono text-xs">{u.email}</td>
                      <td className="py-3.5 px-6 text-slate-600 font-semibold">{u.role?.replace('_', ' ').toUpperCase()}</td>
                      <td className="py-3.5 px-6 text-slate-500">{u.department || '—'}</td>
                      <td className="py-3.5 px-6 text-slate-500">
                        {centres?.find(c => c.id === u.centre_id)?.name || '—'}
                      </td>
                      <td className="py-3.5 px-6">
                        <button
                          onClick={() => toggleAdminMutation.mutate({ id: u.id, is_admin: !u.is_admin })}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                            u.is_admin ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {u.is_admin ? 'Yes (Admin)' : 'No'}
                        </button>
                      </td>
                      <td className="py-3.5 px-6 text-right space-x-1.5">
                        <button
                          onClick={() => { setEditingUser(u); setUserModalOpen(true); }}
                          className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors inline-block"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Are you sure you want to deactivate ${u.name}?`)) deactivateUserMutation.mutate(u.id); }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors inline-block"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!usersLoading && !users?.length && (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">No active users registered.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'centres' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-lg">CAMS Centres</h3>
              <button
                onClick={() => { setEditingCentre(null); setCentreModalOpen(true); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus size={14} />
                <span>Add Centre</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-6">Name</th>
                    <th className="py-3.5 px-6">Code</th>
                    <th className="py-3.5 px-6">Region</th>
                    <th className="py-3.5 px-6">Active</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {centresLoading ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400">Loading centres...</td>
                    </tr>
                  ) : centres?.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-6 font-semibold text-slate-800">{c.name}</td>
                      <td className="py-3.5 px-6 font-mono text-xs font-semibold text-slate-650">{c.code}</td>
                      <td className="py-3.5 px-6 text-slate-500">{c.region || '—'}</td>
                      <td className="py-3.5 px-6">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          c.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-rose-50 text-rose-700 border-rose-250'
                        }`}>
                          {c.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right space-x-1.5">
                        <button
                          onClick={() => { setEditingCentre(c); setCentreModalOpen(true); }}
                          className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors inline-block"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Are you sure you want to deactivate ${c.name}?`)) deactivateCentreMutation.mutate(c.id); }}
                          className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg cursor-pointer transition-colors inline-block"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!centresLoading && !centres?.length && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400">No centres found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-6">
            {/* Role defaults Matrix Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-lg">Role-Level Defaults Matrix</h3>
                <p className="text-xs text-slate-400 mt-1">Specify default permissions granted automatically to users based on role selection.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-6 w-[250px]">Permission Key</th>
                      {rolesList.map(role => (
                        <th key={role} className="py-3.5 px-4 text-center min-w-[120px]">
                          {role.replace('_', ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {permissionsLoading ? (
                      <tr>
                        <td colSpan={rolesList.length + 1} className="py-8 text-center text-slate-400">Loading matrix...</td>
                      </tr>
                    ) : (
                      <>
                        <tr className="bg-slate-55/40 text-xs font-bold text-indigo-750 border-b border-slate-200">
                          <td colSpan={rolesList.length + 1} className="py-2.5 px-6 uppercase tracking-wider">Pages Access</td>
                        </tr>
                        {pagePermissionKeys.map(({ key, label }) => (
                          <tr key={key} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-6">
                              <span className="font-semibold text-slate-800">{label}</span>
                              <span className="block text-[10px] font-mono text-slate-400 mt-0.5">{key}</span>
                            </td>
                            {rolesList.map(role => (
                              <td key={role} className="py-3 px-4 text-center">
                                <button
                                  onClick={() => handleRolePermToggle(role, key)}
                                  disabled={toggleRolePermMutation.isPending}
                                  className="mx-auto flex items-center justify-center p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                                >
                                  {isRoleAllowed(role, key) ? (
                                    <CheckSquare className="text-indigo-600 w-5 h-5" />
                                  ) : (
                                    <Square className="text-slate-300 w-5 h-5" />
                                  )}
                                </button>
                              </td>
                            ))}
                          </tr>
                        ))}

                        <tr className="bg-slate-55/40 text-xs font-bold text-indigo-750 border-b border-slate-200">
                          <td colSpan={rolesList.length + 1} className="py-2.5 px-6 uppercase tracking-wider">Task Actions</td>
                        </tr>
                        {actionPermissionKeys.map(({ key, label }) => (
                          <tr key={key} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-6">
                              <span className="font-semibold text-slate-800">{label}</span>
                              <span className="block text-[10px] font-mono text-slate-400 mt-0.5">{key}</span>
                            </td>
                            {rolesList.map(role => (
                              <td key={role} className="py-3 px-4 text-center">
                                <button
                                  onClick={() => handleRolePermToggle(role, key)}
                                  disabled={toggleRolePermMutation.isPending}
                                  className="mx-auto flex items-center justify-center p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                                >
                                  {isRoleAllowed(role, key) ? (
                                    <CheckSquare className="text-indigo-600 w-5 h-5" />
                                  ) : (
                                    <Square className="text-slate-300 w-5 h-5" />
                                  )}
                                </button>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Per-User Override Section */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Per-User Override Configuration</h3>
                <p className="text-xs text-slate-400 mt-0.5">Search for a specific employee to view their combined permissions and define specific overrides.</p>
              </div>

              {/* User search bar */}
              <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search staff members by name or email..."
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  />
                </div>

                {searchUserQuery && (
                  <div className="absolute mt-12 bg-white border border-slate-200 rounded-xl shadow-lg w-full max-w-md z-15 overflow-hidden divide-y">
                    {users?.filter(u => u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) || u.email.toLowerCase().includes(searchUserQuery.toLowerCase()))
                      .slice(0, 5).map(u => (
                        <button
                          key={u.id}
                          onClick={() => { setSelectedOverrideUser(u); setSearchUserQuery(''); }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex justify-between items-center cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-slate-800 block">{u.name}</span>
                            <span className="text-xs text-slate-400 font-mono">{u.email}</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {u.role}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {selectedOverrideUser && (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-150 text-indigo-700 font-bold flex items-center justify-center uppercase shadow-sm">
                        {selectedOverrideUser.name.slice(0,2)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-850">{selectedOverrideUser.name} ({selectedOverrideUser.role?.replace('_', ' ').toUpperCase()})</h4>
                        <span className="text-xs text-slate-400 font-mono">{selectedOverrideUser.email}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedOverrideUser(null)}
                      className="text-xs text-slate-500 hover:text-slate-700 border bg-white px-3 py-1.5 rounded-lg cursor-pointer font-medium hover:shadow-sm"
                    >
                      Clear Selection
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Active overrides list */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400">Configured Overrides</h5>
                      <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                        {overrideUserData?.overrides?.map(ov => (
                          <div key={ov.id} className="py-2.5 flex items-center justify-between">
                            <div>
                              <span className="text-sm font-semibold font-mono text-slate-700">{ov.permission_key}</span>
                              <span className={`block text-[10px] font-bold ${ov.allowed ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {ov.allowed ? 'EXPLICITLY ALLOWED' : 'EXPLICITLY DENIED'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteOverride(ov.permission_key)}
                              className="text-xs text-red-500 hover:bg-red-50 p-1.5 rounded-lg cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        {!overrideUserData?.overrides?.length && (
                          <p className="text-xs italic text-slate-400 py-4 text-center">No specific overrides set for this user (inheriting role defaults).</p>
                        )}
                      </div>

                      {/* Add override action */}
                      <div className="pt-3 border-t border-slate-100 flex gap-2">
                        <select
                          id="new-override-key"
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        >
                          <option value="">Select Permission</option>
                          {[...pagePermissionKeys, ...actionPermissionKeys].map(k => (
                            <option key={k.key} value={k.key}>{k.label} ({k.key})</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const sel = document.getElementById('new-override-key');
                            if (sel?.value) handleAddOverride(sel.value, true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
                        >
                          Allow
                        </button>
                        <button
                          onClick={() => {
                            const sel = document.getElementById('new-override-key');
                            if (sel?.value) handleAddOverride(sel.value, false);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
                        >
                          Deny
                        </button>
                      </div>
                    </div>

                    {/* Effective resolved permissions preview */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400">Effective Resolved Permissions Preview</h5>
                      <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                        {Object.entries(overrideUserData?.resolved || {}).map(([key, allowed]) => (
                          <div key={key} className="py-2.5 flex items-center justify-between text-xs">
                            <span className="font-mono text-slate-650">{key}</span>
                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                              allowed ? 'bg-emerald-50 text-emerald-750 border border-emerald-200' : 'bg-slate-150 text-slate-500 border border-slate-200'
                            }`}>
                              {allowed ? 'ALLOWED' : 'DENIED'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User creation / edit modal */}
      {userModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden transform animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-base">{editingUser ? 'Edit CAMS User' : 'Create CAMS User'}</h3>
              <button onClick={() => setUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 p-1.5 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const role = fd.get('role');
                const name = fd.get('name');
                const email = fd.get('email');
                const department = fd.get('department') || null;
                const centre_id = fd.get('centre_id') || null;
                const manager_id = fd.get('manager_id') || null;
                saveUserMutation.mutate({ name, email, role, department, centre_id, manager_id });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  name="name"
                  defaultValue={editingUser?.name || ''}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email *</label>
                <input
                  type="email"
                  required
                  name="email"
                  defaultValue={editingUser?.email || ''}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Role *</label>
                <select
                  required
                  name="role"
                  defaultValue={editingUser?.role || 'hq_executive'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {rolesList.map(r => (
                    <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Department</label>
                <input
                  type="text"
                  name="department"
                  defaultValue={editingUser?.department || ''}
                  placeholder="e.g. Operations, IT"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Associated Centre</label>
                <select
                  name="centre_id"
                  defaultValue={editingUser?.centre_id || ''}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="">None</option>
                  {centres?.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Reporting Manager</label>
                <select
                  name="manager_id"
                  defaultValue={editingUser?.manager_id || ''}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="">None</option>
                  {users?.filter(u => u.role === 'hq_manager' || u.role === 'leadership').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setUserModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saveUserMutation.isPending} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium cursor-pointer">
                  {saveUserMutation.isPending ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Centre creation / edit modal */}
      {centreModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden transform animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-base">{editingCentre ? 'Edit Centre' : 'Create Centre'}</h3>
              <button onClick={() => setCentreModalOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 p-1.5 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const name = fd.get('name');
                const code = fd.get('code');
                const region = fd.get('region') || null;
                saveCentreMutation.mutate({ name, code, region });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Centre Name *</label>
                <input
                  type="text"
                  required
                  name="name"
                  defaultValue={editingCentre?.name || ''}
                  placeholder="e.g. New Delhi Head Office"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Centre Code *</label>
                <input
                  type="text"
                  required
                  name="code"
                  defaultValue={editingCentre?.code || ''}
                  placeholder="e.g. DEL-01"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Region</label>
                <input
                  type="text"
                  name="region"
                  defaultValue={editingCentre?.region || ''}
                  placeholder="e.g. North, South, East, West"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setCentreModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saveCentreMutation.isPending} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium cursor-pointer">
                  {saveCentreMutation.isPending ? 'Saving...' : 'Save Centre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
