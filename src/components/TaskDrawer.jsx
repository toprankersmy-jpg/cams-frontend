import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
  getTaskById,
  getTaskComments,
  addComment,
  updateTaskStatus,
  deleteTask
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
  X,
  Sparkles,
  Trash2
} from 'lucide-react';
import { getPriorityBadge, getStatusBadge, getTaskDueDate } from '../utils/taskDisplay';

export default function TaskDrawer({ selectedTaskId, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newCommentText, setNewCommentText] = useState('');
  const [newSuggestionText, setNewSuggestionText] = useState('');

  // Fetch individual task details
  const { data: taskDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['taskDetails', selectedTaskId],
    queryFn: () => getTaskById(selectedTaskId),
    enabled: !!selectedTaskId,
    retry: 1,
  });

  // Fetch comments for selected task
  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['taskComments', selectedTaskId],
    queryFn: () => getTaskComments(selectedTaskId),
    enabled: !!selectedTaskId,
    retry: 1,
  });

  // Add Comment Mutation
  const addCommentMutation = useMutation({
    mutationFn: ({ taskId, text, isSuggestion }) => addComment(taskId, text, isSuggestion),
    onSuccess: () => {
      setNewCommentText('');
      setNewSuggestionText('');
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
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskDetails', selectedTaskId] });
      alert('Status updated successfully!');
    },
    onError: (err) => {
      alert(!err.response ? 'Server still waking up — try again in 30 seconds.' : (err.response?.data?.error || 'Failed to update status.'));
    }
  });

  // Delete Task Mutation (admin only)
  const deleteTaskMutation = useMutation({
    mutationFn: () => deleteTask(selectedTaskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskStats'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      alert('Task deleted.');
      onClose();
    },
    onError: (err) => {
      alert(!err.response ? 'Server still waking up — try again in 30 seconds.' : (err.response?.data?.error || 'Failed to delete task.'));
    }
  });

  const handleDeleteTask = () => {
    if (!confirm(`Permanently delete task ${taskDetails?.task_number || ''}? This cannot be undone.`)) return;
    deleteTaskMutation.mutate();
  };

  const handlePostComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    addCommentMutation.mutate({ taskId: selectedTaskId, text: newCommentText, isSuggestion: false });
  };

  const handlePostSuggestion = (e) => {
    e.preventDefault();
    if (!newSuggestionText.trim()) return;
    addCommentMutation.mutate({ taskId: selectedTaskId, text: newSuggestionText, isSuggestion: true });
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
      const fp = prompt('Please enter final priority (P1, P2, P3, or P4) or leave empty:');
      if (fp === null) return; // user cancelled
      const normalized = fp.trim().toUpperCase();
      if (normalized) {
        if (!['P1', 'P2', 'P3', 'P4'].includes(normalized)) {
          alert('Final priority must be one of P1, P2, P3, or P4.');
          return;
        }
        payload.final_priority = normalized;
      }
    }
    updateStatusMutation.mutate({ taskId: selectedTaskId, ...payload });
  };

  const ALL_ROLES = ['hq_manager', 'rm', 'centre_head', 'centre_executive', 'leadership', 'hq_executive'];

  const transitionsForRole = (status, role, isOwnCentre) => {
    const list = [];
    if (role === 'hq_manager') {
      if (status === 'pending_manager_approval') {
        list.push({ status: 'active_in_ch_basket', label: 'Approve' });
        list.push({ status: 'rejected', label: 'Reject' });
      }
    } else if (role === 'rm') {
      // RM actions are restricted to tasks in their own assigned centres
      if (isOwnCentre) {
        if (status === 'active_in_ch_basket') {
          list.push({ status: 'in_progress', label: 'Start Task' });
          list.push({ status: 'rejected', label: 'Reject' });
        } else if (status === 'completed' || status === 'closed') {
          list.push({ status: 'reopened', label: 'Reopen' });
        }
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

  const getTransitions = (status, role) => {
    const isOwnCentre = taskDetails?.assigned_rm === user?.id;
    if (!user?.is_admin) return transitionsForRole(status, role, isOwnCentre);
    // Admin bypass: union of every role's available actions for this status
    const seen = new Map();
    for (const r of ALL_ROLES) {
      for (const t of transitionsForRole(status, r, true)) {
        if (!seen.has(t.status)) seen.set(t.status, t);
      }
    }
    return Array.from(seen.values());
  };

  if (!selectedTaskId) return null;

  const currentPriority = taskDetails?.final_priority || taskDetails?.proposed_priority;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col justify-between transform transition-transform duration-300 ease-in-out overflow-hidden">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Task Details : {taskDetails?.task_number || `#${selectedTaskId.slice(-6).toUpperCase()}`}
            </span>
            <h3 className="font-bold text-slate-900 text-base mt-0.5 truncate pr-2">
              {taskDetails?.title || (detailsLoading ? 'Loading details...' : 'Task View')}
            </h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {user?.is_admin && (
              <button
                onClick={handleDeleteTask}
                disabled={deleteTaskMutation.isPending}
                title="Delete task (admin)"
                className="text-rose-400 hover:text-rose-600 rounded-full hover:bg-rose-50 p-1.5 transition-colors cursor-pointer"
              >
                <Trash2 size={17} />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 p-1.5 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {detailsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400 font-semibold">Loading task info...</span>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Context Stats Block */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Priority</span>
                  {getPriorityBadge(currentPriority)}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Status</span>
                  {getStatusBadge(taskDetails?.status)}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Centre</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Building size={14} className="text-slate-400" />
                    {taskDetails?.target_centre?.name || 'All Centres'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Due Date</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Calendar size={14} className="text-slate-400" />
                    {getTaskDueDate(taskDetails, user?.role) 
                      ? getTaskDueDate(taskDetails, user?.role).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) 
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Task Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h4>
                <p className="text-xs text-slate-600 bg-white border border-slate-100 p-4 rounded-xl shadow-inner min-h-[60px] leading-relaxed whitespace-pre-line">
                  {taskDetails?.description || 'No description provided.'}
                </p>
              </div>

              {/* Task Meta Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-slate-400 mb-0.5">Initiated By</div>
                  <div className="text-xs font-semibold text-slate-700">{taskDetails?.initiated_by?.name || '—'}</div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-slate-400 mb-0.5">Approved By Manager</div>
                  <div className="text-xs font-semibold text-slate-700">{taskDetails?.approved_by_manager?.name || 'Pending'}</div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-slate-400 mb-0.5">Regional Manager</div>
                  <div className="text-xs font-semibold text-slate-700">{taskDetails?.assigned_rm?.name || '—'}</div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-slate-400 mb-0.5">Centre Head</div>
                  <div className="text-xs font-semibold text-slate-700">{taskDetails?.assigned_ch?.name || '—'}</div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-slate-400 mb-0.5">Requested Due Date</div>
                  <div className="text-xs font-semibold text-slate-700">
                    {taskDetails?.initiator_due_date ? new Date(taskDetails.initiator_due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-slate-400 mb-0.5">Manager Approved Due</div>
                  <div className="text-xs font-semibold text-slate-700">
                    {taskDetails?.manager_due_date ? new Date(taskDetails.manager_due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </div>
                </div>
                {taskDetails?.assigned_centre_executive?.name && (
                  <div className="bg-slate-50 rounded-lg px-3 py-2 col-span-2">
                    <div className="text-[10px] text-slate-400 mb-0.5">Delegated To (Centre Executive)</div>
                    <div className="text-xs font-semibold text-slate-700">{taskDetails.assigned_centre_executive.name}</div>
                  </div>
                )}
                {taskDetails?.rejection_reason && (
                  <div className="bg-rose-50 rounded-lg px-3 py-2 col-span-2">
                    <div className="text-[10px] text-rose-500 mb-0.5">Rejection Reason</div>
                    <div className="text-xs font-semibold text-rose-700">{taskDetails.rejection_reason}</div>
                  </div>
                )}
              </div>

              {/* Action: Update Task Status */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Operations Actions</h4>
                <div className="flex flex-wrap gap-2">
                  {getTransitions(taskDetails?.status, user?.role).map((t) => (
                    <button
                      key={t.status}
                      onClick={() => handleStatusChange(t.status)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 rounded-lg text-xs font-semibold cursor-pointer text-center transition-all hover:border-indigo-500 hover:text-indigo-650 shadow-sm"
                    >
                      {t.label}
                    </button>
                  ))}
                  {getTransitions(taskDetails?.status, user?.role).length === 0 && (
                    <span className="text-xs text-slate-400 italic">No operational actions available for your role.</span>
                  )}
                </div>
              </div>

              {/* Activity Log / Timeline */}
              {taskDetails?.status_history && taskDetails.status_history.length > 0 && (
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Activity size={14} className="text-slate-400" />
                    <span>Activity Log</span>
                  </h4>
                  <div className="relative pl-6 space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-150">
                    {taskDetails.status_history.map((log) => (
                      <div key={log.id} className="relative group">
                        <div className="absolute -left-[20px] top-1.5 w-3 h-3 rounded-full border-2 border-indigo-500 bg-white group-hover:bg-indigo-500 transition-colors" />
                        <div className="space-y-1">
                          <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                            {log.comment || `Status updated from ${log.from_status || 'null'} to ${log.to_status}`}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                            <span className="font-bold text-slate-500">By: {log.changed_by?.name || 'System'}</span>
                            <span>•</span>
                            <span>{new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leadership Suggestion Box */}
              {user?.role === 'leadership' && (
                <div className="border-t border-slate-100 pt-6 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Leadership Suggestion</span>
                  </h4>
                  <form onSubmit={handlePostSuggestion} className="space-y-2">
                    <textarea
                      rows="2"
                      placeholder="Share your insight or instruction suggestion..."
                      value={newSuggestionText}
                      onChange={(e) => setNewSuggestionText(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none leading-relaxed"
                    />
                    <button
                      type="submit"
                      disabled={addCommentMutation.isPending}
                      className="w-full bg-slate-900 hover:bg-black text-white rounded-lg py-2 px-3 text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow"
                    >
                      Post Labeled Suggestion
                    </button>
                  </form>
                </div>
              )}

              {/* Comments Stream */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <MessageSquare size={14} className="text-slate-400" />
                  <span>Comments Stream ({comments?.length || 0})</span>
                </h4>

                <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                  {comments?.map((comment) => (
                    <div key={comment._id || comment.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <User size={12} className="text-slate-400" />
                          {comment.commented_by?.name || 'System User'}
                          <span className="text-[10px] text-slate-400 font-medium">({comment.commented_by?.role || 'Staff'})</span>
                        </span>
                        <div className="flex items-center gap-2">
                          {comment.is_suggestion && (
                            <span className="text-[9px] bg-amber-50 text-amber-700 font-bold border border-amber-200 rounded px-1 flex items-center gap-0.5">
                              <span>💡</span> Suggestion
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {comment.created_at ? new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-650 leading-relaxed whitespace-pre-line">{comment.comment}</p>
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
          )}
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
    </>
  );
}
