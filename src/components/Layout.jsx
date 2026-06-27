import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUnreadCount, createTask, getAllCentres, getUsersByRole } from '../api';
import { 
  LayoutDashboard, 
  CheckSquare, 
  ListTodo, 
  Building2, 
  Clock, 
  FolderLock, 
  Target, 
  MapPin, 
  Inbox, 
  UserPlus, 
  UserCheck, 
  BarChart3, 
  Bell, 
  Plus, 
  LogOut, 
  User, 
  X,
  PlusCircle,
  Briefcase
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Task creation state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskCentre, setTaskCentre] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');

  // Fetch unread notifications count
  const { data: unreadData } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: getUnreadCount,
    refetchInterval: 15000, // Poll every 15 seconds
    enabled: !!user,
  });

  // Fetch centres and executives for the creation modal
  const { data: centres } = useQuery({
    queryKey: ['centres'],
    queryFn: getAllCentres,
    enabled: isTaskModalOpen,
  });

  const { data: executives } = useQuery({
    queryKey: ['executives'],
    queryFn: () => getUsersByRole('centre_executive'),
    enabled: isTaskModalOpen,
  });

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsTaskModalOpen(false);
      // Reset form
      setTaskTitle('');
      setTaskDesc('');
      setTaskCentre('');
      setTaskPriority('Medium');
      setTaskDueDate('');
      setTaskAssignedTo('');
      alert('Task created successfully!');
    },
    onError: (err) => {
      const isOffline = !err.response;
      alert(isOffline
        ? 'Server is still waking up — please wait 30 seconds then try again.'
        : (err.response?.data?.message || 'Failed to create task'));
    }
  });

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskTitle || !taskCentre || !taskDueDate) {
      alert('Please fill out all required fields');
      return;
    }
    createTaskMutation.mutate({
      title: taskTitle,
      description: taskDesc,
      centre_id: taskCentre,
      priority: taskPriority,
      due_date: taskDueDate,
      assigned_to: taskAssignedTo || undefined,
      target_type: 'centre',
    });
  };

  const role = user?.role || 'hq_executive';

  // Navigation mapping per role
  const navConfig = {
    hq_executive: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'My Tasks', path: '/tasks/my', icon: CheckSquare },
      { label: 'All Tasks', path: '/tasks/all', icon: ListTodo },
      { label: 'Centres', path: '/centres', icon: Building2 },
    ],
    hq_manager: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Pending Approval', path: '/tasks/pending', icon: Clock },
      { label: 'My Department', path: '/department', icon: FolderLock },
      { label: 'Centres', path: '/centres', icon: Building2 },
    ],
    rm: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Set Priority', path: '/priority', icon: Target },
      { label: 'My Region', path: '/region', icon: MapPin },
      { label: 'Centres', path: '/centres', icon: Building2 },
    ],
    centre_head: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'My Basket', path: '/basket', icon: Inbox },
      { label: 'Kanban Board', path: '/kanban', icon: LayoutDashboard },
      { label: 'Delegate Task', path: '/delegate', icon: UserPlus },
    ],
    centre_executive: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'My Assigned', path: '/assigned', icon: UserCheck },
      { label: 'Kanban Board', path: '/kanban', icon: LayoutDashboard },
    ],
    leadership: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'All Centres', path: '/centres', icon: Building2 },
      { label: 'All Tasks', path: '/tasks/all', icon: ListTodo },
      { label: 'Reports', path: '/reports', icon: BarChart3 },
    ]
  };

  const navItems = navConfig[role] || navConfig.hq_executive;

  // Resolve dynamic header titles
  const pathTitles = {
    '/dashboard': 'Dashboard Overview',
    '/tasks/my': 'My Workbasket',
    '/tasks/all': 'All Center Tasks',
    '/centres': 'Centres & Facilities',
    '/tasks/pending': 'Tasks Pending Approval',
    '/department': 'Department Head Dashboard',
    '/priority': 'Set Task Priority Matrix',
    '/region': 'Regional Centre Overview',
    '/basket': 'Center Head Basket',
    '/kanban': 'Kanban Task Board',
    '/delegate': 'Delegate Centre Tasks',
    '/assigned': 'Assigned Centre Tasks',
    '/reports': 'Performance & Analytical Reports'
  };

  const pageTitle = pathTitles[location.pathname] || 'Centre Activity Management';

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[220px] bg-white border-r border-slate-200 flex flex-col justify-between h-full z-10">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Briefcase size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-slate-900 leading-none">CAMS</h1>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Rankers Portal</span>
            </div>
          </div>

          {/* User Profile */}
          {user && (
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-semibold uppercase shadow-sm">
                  {user.name ? user.name.slice(0, 2) : 'US'}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-semibold text-sm text-slate-800 truncate leading-tight">{user.name || 'User Profile'}</h3>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700 tracking-wide uppercase border border-indigo-200">
                    {role.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Nav List */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 font-semibold border-l-4 border-indigo-600 pl-2 rounded-l-none'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <IconComponent size={18} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer (Notifications & Logout) */}
        <div className="p-4 border-t border-slate-100 space-y-2">
          {/* Notifications Bell */}
          <Link
            to="/notifications"
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell size={18} className="text-slate-500" />
                {unreadData?.count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold border border-white animate-pulse">
                    {unreadData.count}
                  </span>
                )}
              </div>
              <span>Notifications</span>
            </div>
            {unreadData?.count > 0 && (
              <span className="bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded-full font-bold">
                {unreadData.count} new
              </span>
            )}
          </Link>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header bar */}
        <header className="h-[64px] bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10 shadow-sm shadow-slate-100/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{pageTitle}</h2>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-850 text-white font-medium text-sm px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2 hover:shadow cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>New Task</span>
            </button>
          </div>
        </header>

        {/* Dynamic page contents */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>

      {/* New Task Overlay Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden transform animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <PlusCircle className="text-indigo-600" size={20} />
                <h3 className="font-bold text-slate-800 text-base">Create Centre Task</h3>
              </div>
              <button 
                onClick={() => setIsTaskModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 p-1.5 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clean up inventory logs"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  rows="3"
                  placeholder="Provide context and notes for the centre staff..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Centre *</label>
                  <select
                    required
                    value={taskCentre}
                    onChange={(e) => setTaskCentre(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    <option value="">Select Centre</option>
                    {centres?.map((c) => (
                      <option key={c._id || c.id} value={c._id || c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                    {!centres?.length && (
                      <option value="" disabled>Loading centres... (backend waking up)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Assignee</label>
                  <select
                    value={taskAssignedTo}
                    onChange={(e) => setTaskAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    <option value="">Unassigned (Open Pool)</option>
                    {executives?.map((exe) => (
                      <option key={exe._id || exe.id} value={exe._id || exe.id}>
                        {exe.name} ({exe.email})
                      </option>
                    ))}
                    {!executives?.length && (
                      <option value="">No assignees loaded yet</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Submit / Cancel Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-medium transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {createTaskMutation.isPending ? 'Saving...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
