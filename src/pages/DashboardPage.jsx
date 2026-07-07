import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { 
  getTaskStats, 
  getMyTasks, 
  getTaskById, 
  getTaskComments, 
  addComment, 
  updateTaskStatus 
} from '../api';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  MessageSquare,
  Send,
  User,
  Calendar,
  Building,
  Activity,
  Layers,
  ChevronRight,
  X
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Fetch stats and tasks
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['taskStats'],
    queryFn: getTaskStats,
    retry: 1,
  });

  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ['myTasks'],
    queryFn: getMyTasks,
    retry: 1,
  });

  // Fetch individual task details for drawer
  const { data: taskDetails } = useQuery({
    queryKey: ['taskDetails', selectedTaskId],
    queryFn: () => getTaskById(selectedTaskId),
    enabled: !!selectedTaskId,
  });

  // Fetch comments for selected task
  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['taskComments', selectedTaskId],
    queryFn: () => getTaskComments(selectedTaskId),
    enabled: !!selectedTaskId,
  });

  // Add Comment Mutation
  const addCommentMutation = useMutation({
    mutationFn: ({ taskId, text }) => addComment(taskId, text),
    onSuccess: () => {
      setNewCommentText('');
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['taskDetails', selectedTaskId] });
    },
    onError: (err) => {
      alert(!err.response ? 'Server still waking up — try again in 30 seconds.' : 'Failed to post comment.');
    }
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, ...data }) => updateTaskStatus(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskStats'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskDetails', selectedTaskId] });
      alert('Status updated successfully!');
    },
    onError: (err) => {
      alert(!err.response ? 'Server still waking up — try again in 30 seconds.' : (err.response?.data?.error || 'Failed to update status.'));
    }
  });

  const handlePostComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    addCommentMutation.mutate({ taskId: selectedTaskId, text: newCommentText });
  };

  const handleStatusChange = (status) => {
    let payload = { status };
    if (status === 'reopened') {
      const reason = prompt('Please enter a reopen reason:');
      if (!reason) return;
      payload.reopen_reason = reason;
    } else if (status === 'rejected') {
      const reason = prompt('Please enter a rejection reason (optional):');
      if (reason === null) return;
      payload.rejection_reason = reason || undefined;
    } else if (status === 'in_progress' && user?.role === 'rm' && taskDetails?.status === 'active_in_ch_basket') {
      const fp = prompt('Please enter final priority (Low, Medium, High, Critical) or leave empty:', taskDetails?.priority || '');
      if (fp === null) return; // user cancelled
      if (fp) payload.final_priority = fp;
    }
    updateStatusMutation.mutate({ taskId: selectedTaskId, ...payload });
  };

  // Mock fallbacks if server isn't reachable
  const mockStats = {
    open: 12,
    overdue: 3,
    completed: 45,
    pendingApproval: 6,
  };

  const mockTasks = [
    {
      _id: 'task-101',
      id: 'task-101',
      title: 'Review inventory reconciliation logs',
      centre: { name: 'New Delhi Hub', code: 'DEL-01' },
      priority: 'High',
      status: 'Open',
      dueDate: '2026-06-30T00:00:00.000Z',
    },
    {
      _id: 'task-102',
      id: 'task-102',
      title: 'Sanitize student entry counters',
      centre: { name: 'Mumbai Express', code: 'MUM-02' },
      priority: 'Medium',
      status: 'Pending Approval',
      dueDate: '2026-06-25T00:00:00.000Z', // Overdue relative to 2026-06-26
    },
    {
      _id: 'task-103',
      id: 'task-103',
      title: 'Broadband connection configuration audit',
      centre: { name: 'Bengaluru Plaza', code: 'BLR-03' },
      priority: 'Critical',
      status: 'Overdue',
      dueDate: '2026-06-24T00:00:00.000Z',
    },
    {
      _id: 'task-104',
      id: 'task-104',
      title: 'Register local marketing posters',
      centre: { name: 'Chennai Central', code: 'CHN-04' },
      priority: 'Low',
      status: 'Completed',
      dueDate: '2026-06-28T00:00:00.000Z',
    }
  ];

  const isBackendDown = !!(statsError || tasksError);
  const activeStats = stats ? {
    open: (stats.active_in_ch_basket || 0) + (stats.acknowledged || 0) + (stats.in_progress || 0) + (stats.blocked || 0),
    overdue: stats.overdue || 0,
    completed: stats.completed || 0,
    pendingApproval: stats.pending_manager_approval || 0
  } : mockStats;
  const rawTasks = tasks;
  const activeTasks = Array.isArray(rawTasks) ? rawTasks : (rawTasks?.tasks || rawTasks?.data || mockTasks);

  // Render role headings
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

  // Status Badge UI
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
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
        {label}
      </span>
    );
  };

  // Priority Badge UI
  const getPriorityBadge = (priority) => {
    const styles = {
      'Low': 'bg-slate-100 text-slate-800',
      'Medium': 'bg-blue-100 text-blue-800',
      'High': 'bg-amber-100 text-amber-800',
      'Critical': 'bg-red-100 text-red-800 font-bold',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${styles[priority] || 'bg-slate-100 text-slate-800'}`}>
        {priority}
      </span>
    );
  };

  const getTaskDueDate = (t) => {
    if (!t) return null;
    const role = user?.role;
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

  const getTransitions = (status, role) => {
    const list = [];
    if (role === 'hq_manager') {
      if (status === 'pending_manager_approval') {
        list.push({ status: 'active_in_ch_basket', label: 'Approve' });
        list.push({ status: 'rejected', label: 'Reject' });
      }
    } else if (role === 'rm') {
      if (status === 'active_in_ch_basket') {
        list.push({ status: 'in_progress', label: 'Start Task' });
        list.push({ status: 'rejected', label: 'Reject' });
      } else if (status === 'completed' || status === 'closed') {
        list.push({ status: 'reopened', label: 'Reopen' });
      }
    } else if (role === 'centre_head') {
      if (status === 'active_in_ch_basket') {
        list.push({ status: 'acknowledged', label: 'Acknowledge' });
      } else if (status === 'acknowledged') {
        list.push({ status: 'in_progress', label: 'Start Work' });
      } else if (status === 'in_progress') {
        list.push({ status: 'completed', label: 'Mark Completed' });
        list.push({ status: 'blocked', label: 'Mark Blocked' });
      }
    } else if (role === 'centre_executive') {
      if (status === 'in_progress') {
        list.push({ status: 'completed', label: 'Mark Completed' });
      }
    } else if (role === 'leadership' || role === 'hq_executive') {
      if (status === 'completed' || status === 'closed') {
        list.push({ status: 'reopened', label: 'Reopen' });
      }
    }
    return list;
  };

  return (
    <div className="space-y-8 relative">
      {/* Title */}
      {renderHeading()}

      {isBackendDown && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl flex items-center gap-3">
          <span className="text-lg">⏳</span>
          <span>
            <strong>Backend is waking up</strong> — Render free tier sleeps after inactivity. First load may take up to 30 seconds. Showing demo data in the meantime.{' '}
            <button onClick={() => queryClient.invalidateQueries()} className="underline font-semibold cursor-pointer">Retry now</button>
          </span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Open Tasks */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Open Tasks</span>
            <h4 className="text-3xl font-extrabold text-slate-900">{activeStats.open}</h4>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Activity size={24} />
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overdue Tasks</span>
            <h4 className="text-3xl font-extrabold text-rose-600">{activeStats.overdue}</h4>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertCircle size={24} />
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed Tasks</span>
            <h4 className="text-3xl font-extrabold text-emerald-600">{activeStats.completed}</h4>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Approval</span>
            <h4 className="text-3xl font-extrabold text-amber-600">
              {activeStats.pending_approval ?? activeStats.pendingApproval ?? 0}
            </h4>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={24} />
          </div>
        </div>
      </div>

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
                <th className="py-3 px-6">Centre</th>
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
                  <td className="py-3.5 px-6 text-slate-600 font-medium">
                    {t.centre?.name || 'Unassigned Centre'}
                  </td>
                  <td className="py-3.5 px-6">
                    {getPriorityBadge(t.priority)}
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
        <div className="fixed inset-y-0 right-0 w-[450px] bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col justify-between transform transition-transform duration-300 ease-in-out overflow-hidden">
          {/* Drawer Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Task Detail: #{selectedTaskId.slice(-6).toUpperCase()}
              </span>
              <h3 className="font-bold text-slate-900 text-base mt-0.5 truncate max-w-[280px]">
                {taskDetails?.title || 'Loading details...'}
              </h3>
            </div>
            <button
              onClick={() => setSelectedTaskId(null)}
              className="text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 p-1.5 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Drawer Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Context Stats Block */}
            <div className="space-y-4">
              {/* Task Details */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Priority</span>
                  {getPriorityBadge(taskDetails?.priority || 'Medium')}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Status</span>
                  {getStatusBadge(taskDetails?.status || 'Open')}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Centre</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Building size={14} className="text-slate-400" />
                    {taskDetails?.centre?.name || 'Loading Centre...'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Due Date</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Calendar size={14} className="text-slate-400" />
                    {getTaskDueDate(taskDetails) ? getTaskDueDate(taskDetails).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Task Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h4>
                <p className="text-sm text-slate-600 bg-white border border-slate-100 p-4 rounded-xl shadow-inner min-h-[60px] leading-relaxed">
                  {taskDetails?.description || 'No detailed logs provided.'}
                </p>
              </div>

              {/* Action: Update Task Status */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modify Operations Status</h4>
                <div className="flex flex-wrap gap-2">
                  {getTransitions(taskDetails?.status, user?.role).map((t) => (
                    <button
                      key={t.status}
                      onClick={() => handleStatusChange(t.status)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer text-center transition-all hover:border-indigo-500 hover:text-indigo-650"
                    >
                      {t.label}
                    </button>
                  ))}
                  {getTransitions(taskDetails?.status, user?.role).length === 0 && (
                    <span className="text-xs text-slate-400 italic">No actions available for your role.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Comments Stream */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare size={14} />
                <span>Comments Stream ({comments?.length || 0})</span>
              </h4>

              {/* List Comments */}
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                 {comments?.map((comment) => (
                  <div key={comment._id || comment.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <User size={12} className="text-slate-400" />
                        {comment.commented_by?.name || 'Centre Officer'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {comment.created_at ? new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-normal">{comment.comment}</p>
                  </div>
                ))}

                {!comments?.length && (
                  <p className="text-xs text-center text-slate-400 py-4 italic">
                    No comments found. Start the discussion below.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Comment input footer */}
          <form onSubmit={handlePostComment} className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
            <input
              type="text"
              placeholder="Type comments to post..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={addCommentMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-2 transition-all cursor-pointer shadow-sm flex items-center justify-center shrink-0"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
