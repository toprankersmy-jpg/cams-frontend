import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  getTaskStats, 
  getMyTasks, 
  updateTaskStatus 
} from '../api';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Activity,
  ChevronRight,
  User,
  Calendar,
  Building,
  Check,
  X,
  Plus
} from 'lucide-react';
import { getPriorityBadge, getStatusBadge, getTaskDueDate, getTaskLocationLabel } from '../utils/taskDisplay';
import TaskDrawer from '../components/TaskDrawer';
import ManagerApprovalBlock from '../components/ManagerApprovalBlock';

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [managerPriorities, setManagerPriorities] = useState({});

  // Fetch stats and tasks
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['taskStats'],
    queryFn: getTaskStats,
    retry: 1,
    refetchInterval: 4000, // keep dashboard counts live without a manual refresh
  });

  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ['myTasks'],
    queryFn: getMyTasks,
    retry: 1,
    refetchInterval: 4000,
  });

  // Update Status Mutation (reused for approval cards)
  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, ...data }) => updateTaskStatus(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskStats'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast('Status updated successfully!');
    },
    onError: (err) => {
      showToast(!err.response ? 'Server still waking up — try again in 30 seconds.' : (err.response?.data?.error || 'Failed to update status.'), 'error');
    }
  });

  const handleApprove = (taskId, proposedPriority) => {
    const priorityVal = managerPriorities[taskId] || proposedPriority || 'medium';
    updateStatusMutation.mutate({ taskId, status: 'active_in_ch_basket', manager_priority: priorityVal });
  };

  const handleReject = (taskId) => {
    const reason = prompt('Please enter a rejection reason (optional):');
    if (reason === null) return; // cancelled
    updateStatusMutation.mutate({ taskId, status: 'rejected', rejection_reason: reason || undefined });
  };

  const handleSetPriority = (taskId, priority) => {
    updateStatusMutation.mutate({ taskId, status: 'in_progress', final_priority: priority });
  };

  const mockStats = {
    open: 0,
    overdue: 0,
    completed: 0,
    pendingApproval: 0,
  };

  const isBackendDown = !!(statsError || tasksError);
  
  const activeStats = stats ? {
    open: (stats.active_in_ch_basket || 0) + (stats.acknowledged || 0) + (stats.in_progress || 0) + (stats.blocked || 0) + (stats.reopened || 0),
    overdue: stats.overdue || 0,
    completed: stats.completed || 0,
    pendingApproval: stats.pending_manager_approval || 0
  } : mockStats;

  const activeTasks = Array.isArray(tasks) ? tasks : (tasks?.tasks || tasks?.data || []);

  const renderHeading = () => {
    const role = user?.role || 'hq_executive';
    const roleLabels = {
      hq_executive: 'HQ Executive Dashboard',
      hq_manager: 'HQ Manager Approvals Portal',
      rm: 'Regional Operations Hub',
      centre_head: 'Centre Head Management Portal',
      centre_executive: 'My Assigned Workstation',
      leadership: 'Executive Leadership Cockpit',
    };
    return (
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {roleLabels[role] || 'CAMS Dashboard'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Welcome back, <span className="font-bold text-indigo-600">{user?.name || 'Operations Agent'}</span>. Here is your operational briefing.
        </p>
      </div>
    );
  };

  // Filter pending approvals for HQ Manager
  const pendingApprovals = activeTasks.filter(t => t.status === 'pending_manager_approval');
  
  // Filter active in basket for RM priority setting
  const pendingRMPriority = activeTasks.filter(t => t.status === 'active_in_ch_basket');

  // RM-wise summary for Leadership dashboard
  const rmSummary = (() => {
    const map = {};
    activeTasks.forEach((t) => {
      const rmName = t.assigned_rm?.name || 'Unassigned';
      if (!map[rmName]) map[rmName] = { name: rmName, centres: new Set(), open: 0, overdue: 0, completed: 0 };
      const entry = map[rmName];
      if (t.target_centre?.name) entry.centres.add(t.target_centre.name);
      const isFinished = ['completed', 'closed', 'rejected'].includes(t.status);
      if (isFinished) {
        if (['completed', 'closed'].includes(t.status)) entry.completed += 1;
      } else {
        entry.open += 1;
        if (t.is_overdue) entry.overdue += 1;
      }
    });
    return Object.values(map)
      .map((e) => ({ ...e, centres: Array.from(e.centres) }))
      .sort((a, b) => b.open - a.open);
  })();

  return (
    <div className="space-y-8 relative">
      {/* Title */}
      {renderHeading()}

      {isBackendDown && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl flex items-center gap-3">
          <span className="text-lg">⏳</span>
          <span>
            <strong>Backend is waking up</strong> — Render free tier sleeps after inactivity. First load may take up to 30 seconds.
          </span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Open Tasks</span>
            <h4 className="text-3xl font-extrabold text-slate-900">{activeStats.open}</h4>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Activity size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overdue Tasks</span>
            <h4 className="text-3xl font-extrabold text-rose-600">{activeStats.overdue}</h4>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed Tasks</span>
            <h4 className="text-3xl font-extrabold text-emerald-600">{activeStats.completed}</h4>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Approval</span>
            <h4 className="text-3xl font-extrabold text-amber-600">
              {activeStats.pendingApproval}
            </h4>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* RM-wise Summary (Leadership) */}
      {user?.role === 'leadership' && rmSummary.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900 text-lg">RM-wise Summary</h3>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-6">Regional Manager</th>
                  <th className="py-3 px-6">Centres</th>
                  <th className="py-3 px-6">Open</th>
                  <th className="py-3 px-6">Overdue</th>
                  <th className="py-3 px-6">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {rmSummary.map((rm) => (
                  <tr key={rm.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-slate-800">{rm.name}</td>
                    <td className="py-3.5 px-6 text-slate-500">{rm.centres.length ? rm.centres.join(', ') : '—'}</td>
                    <td className="py-3.5 px-6 font-semibold text-slate-700">{rm.open}</td>
                    <td className={`py-3.5 px-6 font-bold ${rm.overdue ? 'text-rose-600' : 'text-emerald-600'}`}>{rm.overdue}</td>
                    <td className="py-3.5 px-6 font-bold text-emerald-600">{rm.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Prominent Approval Cards (HQ Manager) */}
      {user?.role === 'hq_manager' && pendingApprovals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Clock className="text-amber-500" size={18} />
              <span>Waiting for your approval ({pendingApprovals.length})</span>
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingApprovals.map((t) => (
              <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-mono text-slate-450 uppercase">#{t.id.slice(-6).toUpperCase()}</span>
                    {getPriorityBadge(t.proposed_priority)}
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm leading-tight">{t.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2">{t.description || 'No description provided.'}</p>
                </div>
                
                <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1"><User size={13} /> Initiator:</span>
                    <span className="font-bold text-slate-700">{t.initiated_by?.name || 'HQ Executive'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1"><Calendar size={13} /> Due Date:</span>
                    <span className="font-bold text-slate-700">
                      {getTaskDueDate(t) 
                        ? getTaskDueDate(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) 
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1"><Building size={13} /> Centre:</span>
                    <span className="font-bold text-slate-700">{getTaskLocationLabel(t)}</span>
                  </div>
                </div>

                <ManagerApprovalBlock
                  task={t}
                  onApprove={(priorityVal) => {
                    updateStatusMutation.mutate({ taskId: t.id, status: 'active_in_ch_basket', manager_priority: priorityVal });
                  }}
                  onReject={() => handleReject(t.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prominent Approval Cards (RM Priority Setting) */}
      {user?.role === 'rm' && pendingRMPriority.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Clock className="text-indigo-600" size={18} />
              <span>Awaiting your priority decision ({pendingRMPriority.length})</span>
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRMPriority.map((t) => (
              <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-mono text-slate-450 uppercase">#{t.id.slice(-6).toUpperCase()}</span>
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 border border-amber-200 rounded">
                      Manager proposed: {t.proposed_priority}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm leading-tight">{t.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2">{t.description || 'No description provided.'}</p>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1"><User size={13} /> Initiator:</span>
                    <span className="font-bold text-slate-700">{t.initiated_by?.name || 'HQ Executive'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1"><Calendar size={13} /> Due Date:</span>
                    <span className="font-bold text-slate-700">
                      {getTaskDueDate(t) 
                        ? getTaskDueDate(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) 
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1"><Building size={13} /> Centre:</span>
                    <span className="font-bold text-slate-700">{getTaskLocationLabel(t)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Set Final Priority Matrix</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {['P1', 'P2', 'P3', 'P4'].map((p) => {
                      const colors = {
                        P1: 'hover:bg-red-50 text-red-650 border-red-200 hover:border-red-500',
                        P2: 'hover:bg-amber-50 text-amber-650 border-amber-200 hover:border-amber-500',
                        P3: 'hover:bg-blue-50 text-blue-650 border-blue-200 hover:border-blue-500',
                        P4: 'hover:bg-emerald-50 text-emerald-650 border-emerald-200 hover:border-emerald-500'
                      };
                      return (
                        <button
                          key={p}
                          onClick={() => handleSetPriority(t.id, p)}
                          className={`bg-white border rounded-lg py-1.5 text-xs font-bold text-center cursor-pointer transition-all shadow-sm ${colors[p]}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => handleReject(t.id)}
                      className="bg-white border border-slate-200 hover:bg-rose-50 text-rose-650 rounded-lg py-1.5 text-xs font-bold text-center cursor-pointer transition-all hover:border-rose-500 shadow-sm"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task List Section */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-base">Recent Tasks</h3>
          <span className="text-xs text-slate-400 font-medium">Showing latest active work items</span>
        </div>

        {/* Tasks Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-6">ID</th>
                <th className="py-3 px-6">Task Title</th>
                <th className="py-3 px-6">Location</th>
                <th className="py-3 px-6">Priority</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6">Due Date</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {activeTasks.map((t) => (
                <tr key={t._id || t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-6 font-mono text-xs text-slate-400">
                    {(t._id || t.id).slice(-6).toUpperCase()}
                  </td>
                  <td className="py-3.5 px-6 font-semibold text-slate-800">
                    {t.title}
                  </td>
                  <td className="py-3.5 px-6 text-slate-650 flex items-center gap-1.5 mt-2">
                    <Building size={13} className="text-slate-400" />
                    <span>{getTaskLocationLabel(t)}</span>
                  </td>
                  <td className="py-3.5 px-6">
                    {getPriorityBadge(t.final_priority ?? t.manager_priority ?? t.proposed_priority)}
                  </td>
                  <td className="py-3.5 px-6">
                    {getStatusBadge(t.status)}
                  </td>
                  <td className="py-3.5 px-6 text-slate-500 font-medium">
                    {getTaskDueDate(t) ? getTaskDueDate(t).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : '—'}
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <button
                      onClick={() => setSelectedTaskId(t._id || t.id)}
                      className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    >
                      <span>View</span>
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {!activeTasks.length && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No recent tasks found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task detail drawer (Slide Over Overlay) */}
      {selectedTaskId && (
        <TaskDrawer 
          selectedTaskId={selectedTaskId} 
          onClose={() => setSelectedTaskId(null)} 
        />
      )}
    </div>
  );
}
