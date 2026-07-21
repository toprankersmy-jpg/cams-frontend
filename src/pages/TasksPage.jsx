import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLocation } from 'react-router-dom';
import { getMyTasks, getAllTasks, getAllCentres, batchApproveRm } from '../api';
import { Search, ChevronRight, Loader2, Building, Users } from 'lucide-react';
import { getPriorityBadge, getStatusBadge, getTaskDueDate, getTaskLocationLabel } from '../utils/taskDisplay';
import TaskDrawer from '../components/TaskDrawer';

// RM-only panel: groups pending_rm_approval tasks (spawned from an
// All-Centres task once HQ Manager approves it) by batch so the RM can
// review the whole broadcast once and approve for all their centres, or
// pick a subset. Not shown to any other role — Centre Heads can't see these
// rows at all until the RM approves (enforced server-side, not just here).
function RmBundlesPanel({ tasks }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState({});

  const pending = tasks.filter((t) => t.status === 'pending_rm_approval' && t.batch_id);

  const approveMutation = useMutation({
    mutationFn: ({ batchId, centreIds }) => batchApproveRm(batchId, centreIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast(`Approved ${data.approved} centre${data.approved === 1 ? '' : 's'}.`);
    },
    onError: (err) => {
      showToast(err.response?.data?.error || 'Failed to approve batch.', 'error');
    }
  });

  if (pending.length === 0) return null;

  const batches = {};
  pending.forEach((t) => {
    if (!batches[t.batch_id]) batches[t.batch_id] = { title: t.title, items: [] };
    batches[t.batch_id].items.push(t);
  });

  const toggleCentre = (batchId, centreId) => {
    setSelected((prev) => {
      const set = new Set(prev[batchId] || []);
      if (set.has(centreId)) set.delete(centreId); else set.add(centreId);
      return { ...prev, [batchId]: set };
    });
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
        <Users size={15} className="text-teal-600" />
        All-Centres Bundles Awaiting Your Review
      </h2>
      {Object.entries(batches).map(([batchId, batch]) => {
        const selectedSet = selected[batchId] || new Set();
        return (
          <div key={batchId} className="bg-white border border-teal-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-bold text-slate-800 text-sm">{batch.title}</div>
                <div className="text-xs text-slate-400">{batch.items.length} centre{batch.items.length === 1 ? '' : 's'} in your region</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={selectedSet.size === 0 || approveMutation.isPending}
                  onClick={() => approveMutation.mutate({ batchId, centreIds: Array.from(selectedSet) })}
                  className="px-3 py-1.5 bg-white border border-teal-300 text-teal-700 rounded-lg text-xs font-semibold hover:bg-teal-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Approve Selected
                </button>
                <button
                  type="button"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate({ batchId })}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  Approve All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {batch.items.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSet.has(t.target_centre_id)}
                    onChange={() => toggleCentre(batchId, t.target_centre_id)}
                  />
                  <span className="font-semibold text-slate-700">{t.target_centre?.name || 'Centre'}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const SkeletonRow = () => (
  <tr>
    {[...Array(7)].map((_, i) => (
      <td key={i} className="py-3.5 px-6">
        <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
      </td>
    ))}
  </tr>
);

function TaskRow({ t, onView }) {
  const id = t._id || t.id || '';
  const currentPriority = t.final_priority || t.proposed_priority;
  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="py-3.5 px-6 font-mono text-xs text-slate-400">{id.slice(-6).toUpperCase()}</td>
      <td className="py-3.5 px-6 font-semibold text-slate-800">{t.title}</td>
      <td className="py-3.5 px-6 text-slate-650 flex items-center gap-1.5 mt-2">
        <Building size={13} className="text-slate-400" />
        <span>{getTaskLocationLabel(t)}</span>
      </td>
      <td className="py-3.5 px-6">{getPriorityBadge(currentPriority)}</td>
      <td className="py-3.5 px-6">{getStatusBadge(t.status)}</td>
      <td className="py-3.5 px-6 text-slate-500">
        {getTaskDueDate(t)
          ? getTaskDueDate(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
          : '—'}
      </td>
      <td className="py-3.5 px-6 text-right">
        <button
          onClick={() => onView(id)}
          className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-sm"
        >
          View <ChevronRight size={14} />
        </button>
      </td>
    </tr>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchText, setSearchText] = useState('');
  // Everyone starts on "All Statuses" — a per-role default used to narrow
  // this to just one status (e.g. RM landing on Active in CH Basket only),
  // which silently hid every other task until the filter was changed by hand.
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [centreFilter, setCentreFilter] = useState(location.state?.filterCentreId || 'all');
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Only leadership gets the fully unscoped task list. HQ Manager/RM's nav
  // pages ("My Department"/"My Region") must use the role-scoped getMyTasks
  // — not everyone else's tasks too.
  const canSeeAll = user?.role === 'leadership';
  // Leadership's list is otherwise the whole company in one flat table —
  // easy for their own work to get lost in it. Default to "My Tasks" (things
  // they personally initiated, are assigned, or manage) with one click to
  // "Everyone", which groups by department instead of staying one long list.
  const [scope, setScope] = useState('mine');

  // Fetch tasks
  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['tasks', canSeeAll ? 'all' : 'my'],
    queryFn: canSeeAll ? getAllTasks : getMyTasks,
    retry: 1,
    refetchInterval: 4000, // keep the task list live without a manual refresh
  });

  // Fetch all centres for filtering
  const { data: centres } = useQuery({
    queryKey: ['centres'],
    queryFn: getAllCentres,
    retry: 1,
  });

  const allTaskList = Array.isArray(tasks) ? tasks : (tasks?.tasks || tasks?.data || []);
  const centreList = Array.isArray(centres) ? centres : (centres?.centres || centres?.data || []);

  // For leadership in "My Tasks" scope: only tasks they personally initiated,
  // are the direct assignee of, or manage as the assigned_manager — not the
  // whole company.
  const taskList = (canSeeAll && scope === 'mine')
    ? allTaskList.filter((t) =>
        t.initiated_by?.id === user?.id ||
        t.assigned_person_id === user?.id ||
        t.assigned_manager === user?.id ||
        t.approved_by_manager?.id === user?.id
      )
    : allTaskList;

  const filtered = taskList.filter((t) => {
    // RM already sees pending_rm_approval rows in the dedicated bundle panel
    // above — don't also list them here, or the same task shows up twice
    // with no link between the two views.
    if (user?.role === 'rm' && t.status === 'pending_rm_approval') return false;

    const matchSearch = !searchText || t.title?.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;

    // Support proposed and final priorities in filter check
    const taskPriorityVal = t.final_priority || t.proposed_priority || '';
    const matchPriority = priorityFilter === 'all' || taskPriorityVal.toLowerCase() === priorityFilter.toLowerCase();

    // Filter by centre
    const matchCentre = centreFilter === 'all' || t.target_centre_id === centreFilter;

    return matchSearch && matchStatus && matchPriority && matchCentre;
  });

  // Leadership's "Everyone" view groups by department instead of staying one
  // long flat list — a lightweight stand-in for real org-hierarchy grouping
  // until Org Hub's fuller design lands.
  const groupByDepartment = canSeeAll && scope === 'all';
  const groupedRows = [];
  if (groupByDepartment) {
    const groups = {};
    filtered.forEach((t) => {
      const key = t.department || 'Unassigned';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    Object.keys(groups).sort((a, b) => a.localeCompare(b)).forEach((key) => {
      groupedRows.push({ type: 'group', key });
      groups[key].forEach((t) => groupedRows.push({ type: 'task', task: t }));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Tasks</h1>
          <p className="text-sm text-slate-500 mt-1">
            {canSeeAll
              ? (scope === 'mine' ? 'Tasks you initiated, manage, or are directly assigned' : 'Every task across the company, grouped by department')
              : 'Viewing tasks assigned to you'}
          </p>
        </div>
        {canSeeAll && (
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setScope('mine')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${scope === 'mine' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-500'}`}
            >
              My Tasks
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${scope === 'all' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-500'}`}
            >
              Everyone
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl flex items-center gap-3">
          <span className="text-lg">⏳</span>
          <span>
            <strong>Backend is waking up</strong> — Render free tier sleeps after inactivity. First load may take up to 30 seconds. Please wait or refresh.
          </span>
        </div>
      )}

      {user?.role === 'rm' && <RmBundlesPanel tasks={taskList} />}

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
          <option value="pending_rm_approval">Pending RM Review</option>
          <option value="active_in_ch_basket">Active in CH Basket</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="in_progress">In Progress</option>
          <option value="pending_ch_review">Pending CH Review</option>
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
                <th className="py-3 px-6">Location</th>
                <th className="py-3 px-6">Priority</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6">Due Date</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading && [...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
              {!isLoading && groupByDepartment && groupedRows.map((row) =>
                row.type === 'group' ? (
                  <tr key={`group-${row.key}`} className="bg-slate-50">
                    <td colSpan="7" className="py-2 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {row.key}
                    </td>
                  </tr>
                ) : (
                  <TaskRow key={row.task._id || row.task.id} t={row.task} onView={setSelectedTaskId} />
                )
              )}
              {!isLoading && !groupByDepartment && filtered.map((t) => (
                <TaskRow key={t._id || t.id} t={t} onView={setSelectedTaskId} />
              ))}
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
