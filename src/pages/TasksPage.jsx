import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { getMyTasks, getAllTasks, getAllCentres } from '../api';
import { Search, ChevronRight, Loader2, Building } from 'lucide-react';
import { getPriorityBadge, getStatusBadge, getTaskDueDate } from '../utils/taskDisplay';
import TaskDrawer from '../components/TaskDrawer';

const SkeletonRow = () => (
  <tr>
    {[...Array(7)].map((_, i) => (
      <td key={i} className="py-3.5 px-6">
        <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
      </td>
    ))}
  </tr>
);

// Default status filter per role so people still land on their relevant
// queue (e.g. HQ Manager on pending approvals) without needing a separate
// nav tab per queue — still just a starting point, fully overridable below.
const defaultStatusForRole = (role) => {
  if (role === 'hq_manager') return 'pending_manager_approval';
  if (role === 'rm') return 'active_in_ch_basket';
  return 'all';
};

export default function TasksPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState(defaultStatusForRole(user?.role));
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [centreFilter, setCentreFilter] = useState(location.state?.filterCentreId || 'all');
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Only leadership gets the fully unscoped task list. HQ Manager/RM's nav
  // pages ("My Department"/"My Region") must use the role-scoped getMyTasks
  // — not everyone else's tasks too.
  const canSeeAll = user?.role === 'leadership';

  // Fetch tasks
  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['tasks', canSeeAll ? 'all' : 'my'],
    queryFn: canSeeAll ? getAllTasks : getMyTasks,
    retry: 1,
  });

  // Fetch all centres for filtering
  const { data: centres } = useQuery({
    queryKey: ['centres'],
    queryFn: getAllCentres,
    retry: 1,
  });

  const taskList = Array.isArray(tasks) ? tasks : (tasks?.tasks || tasks?.data || []);
  const centreList = Array.isArray(centres) ? centres : (centres?.centres || centres?.data || []);

  const filtered = taskList.filter((t) => {
    const matchSearch = !searchText || t.title?.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    
    // Support proposed and final priorities in filter check
    const taskPriorityVal = t.final_priority || t.proposed_priority || '';
    const matchPriority = priorityFilter === 'all' || taskPriorityVal.toLowerCase() === priorityFilter.toLowerCase();
    
    // Filter by centre
    const matchCentre = centreFilter === 'all' || t.target_centre_id === centreFilter;
    
    return matchSearch && matchStatus && matchPriority && matchCentre;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Tasks</h1>
        <p className="text-sm text-slate-500 mt-1">
          {canSeeAll ? 'Viewing all centre tasks across the system' : 'Viewing tasks assigned to you'}
        </p>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl flex items-center gap-3">
          <span className="text-lg">⏳</span>
          <span>
            <strong>Backend is waking up</strong> — Render free tier sleeps after inactivity. First load may take up to 30 seconds. Please wait or refresh.
          </span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks by title..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
        </div>
        
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-600"
        >
          <option value="all">All Statuses</option>
          <option value="pending_manager_approval">Pending Manager Approval</option>
          <option value="active_in_ch_basket">Active in CH Basket</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="closed">Closed</option>
          <option value="rejected">Rejected</option>
          <option value="blocked">Blocked</option>
          <option value="reopened">Reopened</option>
        </select>
        
        {/* Centre Filter */}
        <select
          value={centreFilter}
          onChange={(e) => setCentreFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-600"
        >
          <option value="all">All Centres</option>
          {centreList.map((c) => (
            <option key={c.id || c._id} value={c.id || c._id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-600"
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="P1">P1 (Critical)</option>
          <option value="P2">P2 (High)</option>
          <option value="P3">P3 (Medium)</option>
          <option value="P4">P4 (Low)</option>
        </select>
      </div>

      <div className="text-xs text-slate-400 font-medium px-1">
        Showing <span className="text-slate-700 font-bold">{filtered.length}</span> of <span className="text-slate-700 font-bold">{taskList.length}</span> tasks
      </div>

      {/* Tasks Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-6">#</th>
                <th className="py-3 px-6">Task Title</th>
                <th className="py-3 px-6">Centre</th>
                <th className="py-3 px-6">Priority</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6">Due Date</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading && [...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
              {!isLoading && filtered.map((t) => {
                const id = t._id || t.id || '';
                const currentPriority = t.final_priority || t.proposed_priority;
                return (
                  <tr key={id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-xs text-slate-400">{id.slice(-6).toUpperCase()}</td>
                    <td className="py-3.5 px-6 font-semibold text-slate-800">{t.title}</td>
                    <td className="py-3.5 px-6 text-slate-650 flex items-center gap-1.5 mt-2">
                      <Building size={13} className="text-slate-400" />
                      <span>{t.target_centre?.name || 'All Centres'}</span>
                    </td>
                    <td className="py-3.5 px-6">{getPriorityBadge(currentPriority)}</td>
                    <td className="py-3.5 px-6">{getStatusBadge(t.status)}</td>
                    <td className="py-3.5 px-6 text-slate-500">
                      {getTaskDueDate(t, user?.role) 
                        ? getTaskDueDate(t, user?.role).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) 
                        : '—'}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => setSelectedTaskId(id)}
                        className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                      >
                        View <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={28} className="text-slate-300" />
                      <span className="text-sm font-medium">No tasks match your filters</span>
                      <span className="text-xs">Try adjusting your search or filter criteria</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task detail drawer */}
      {selectedTaskId && (
        <TaskDrawer 
          selectedTaskId={selectedTaskId} 
          onClose={() => setSelectedTaskId(null)} 
        />
      )}
    </div>
  );
}
