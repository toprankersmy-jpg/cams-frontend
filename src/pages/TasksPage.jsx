import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getMyTasks, getAllTasks } from '../api';
import { Search, ChevronRight, Loader2 } from 'lucide-react';

const getPriorityBadge = (priority) => {
  const styles = {
    Low: 'bg-slate-100 text-slate-700',
    Medium: 'bg-blue-100 text-blue-700',
    High: 'bg-amber-100 text-amber-700',
    Critical: 'bg-red-100 text-red-700 font-bold',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${styles[priority] || 'bg-slate-100 text-slate-700'}`}>
      {priority || 'Unknown'}
    </span>
  );
};

const getStatusBadge = (status) => {
  const styles = {
    pending_manager_approval: 'bg-amber-50 text-amber-700 border-amber-200',
    active_in_ch_basket: 'bg-blue-50 text-blue-700 border-blue-200',
    acknowledged: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    in_progress: 'bg-violet-50 text-violet-700 border-violet-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    closed: 'bg-gray-50 text-gray-600 border-gray-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    blocked: 'bg-orange-50 text-orange-700 border-orange-200',
    reopened: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  };
  const label = status ? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || 'bg-slate-50 text-slate-650 border-slate-200'}`}>
      {label}
    </span>
  );
};

const getTaskDueDate = (t, role) => {
  if (!t) return null;
  let rawDate;
  if (role === 'rm' || role === 'centre_head' || role === 'centre_executive') {
    rawDate = t.rm_due_date || t.manager_due_date || t.initiator_due_date || t.due_date || t.dueDate;
  } else if (role === 'hq_manager') {
    rawDate = t.manager_due_date || t.initiator_due_date || t.due_date || t.dueDate;
  } else if (role === 'hq_executive') {
    rawDate = t.initiator_due_date || t.due_date || t.dueDate;
  } else {
    rawDate = t.rm_due_date || t.manager_due_date || t.initiator_due_date || t.due_date || t.dueDate;
  }
  return rawDate ? new Date(rawDate) : null;
};

const SkeletonRow = () => (
  <tr>
    {[...Array(7)].map((_, i) => (
      <td key={i} className="py-3.5 px-6">
        <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
      </td>
    ))}
  </tr>
);

export default function TasksPage() {
  const { user } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const canSeeAll = ['leadership', 'hq_manager', 'rm'].includes(user?.role);

  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['tasks', canSeeAll ? 'all' : 'my'],
    queryFn: canSeeAll ? getAllTasks : getMyTasks,
    retry: 1,
  });

  const taskList = Array.isArray(tasks) ? tasks : (tasks?.tasks || tasks?.data || []);

  const filtered = taskList.filter((t) => {
    const matchSearch = !searchText || t.title?.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
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
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-600"
        >
          <option value="all">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
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
                return (
                  <tr key={id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-xs text-slate-400">{id.slice(-6).toUpperCase()}</td>
                    <td className="py-3.5 px-6 font-semibold text-slate-800">{t.title}</td>
                    <td className="py-3.5 px-6 text-slate-600">{t.centre?.name || '—'}</td>
                    <td className="py-3.5 px-6">{getPriorityBadge(t.priority)}</td>
                    <td className="py-3.5 px-6">{getStatusBadge(t.status)}</td>
                    <td className="py-3.5 px-6 text-slate-500">
                      {getTaskDueDate(t, user?.role) ? getTaskDueDate(t, user?.role).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => console.log('View task:', id)}
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
    </div>
  );
}
