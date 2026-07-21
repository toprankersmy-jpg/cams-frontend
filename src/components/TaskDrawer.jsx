import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ManagerApprovalBlock from './ManagerApprovalBlock';
import {
  getTaskById,
  getTaskComments,
  addComment,
  updateTaskStatus,
  deleteTask,
  getResolvedPermissionsMe,
  updateTaskDueDate,
  editTask,
  getTaskReviews,
  raiseTaskReview,
  addTaskReviewMessage,
  resolveTaskReview
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
  Trash2,
  Lock
} from 'lucide-react';
import { getPriorityBadge, getStatusBadge, getTaskDueDate, getTaskLocationLabel } from '../utils/taskDisplay';

export default function TaskDrawer({ selectedTaskId, onClose }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [newCommentText, setNewCommentText] = useState('');
  const [newSuggestionText, setNewSuggestionText] = useState('');
  const [submissionNote, setSubmissionNote] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [dueDateReason, setDueDateReason] = useState('');
  const [managerPriorityInput, setManagerPriorityInput] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});

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

  // Private review thread — only this task's Centre Head, Regional Manager,
  // or admin can see it exists at all, enforced server-side too.
  const canSeeReview = !!taskDetails && (
    !!user?.is_admin ||
    user?.id === taskDetails?.assigned_ch?.id ||
    user?.id === taskDetails?.assigned_rm?.id
  );

  const { data: reviews } = useQuery({
    queryKey: ['taskReviews', selectedTaskId],
    queryFn: () => getTaskReviews(selectedTaskId),
    enabled: !!selectedTaskId && canSeeReview,
    retry: 1,
  });

  const raiseReviewMutation = useMutation({
    mutationFn: (message) => raiseTaskReview(selectedTaskId, message),
    onSuccess: () => {
      setReviewMessage('');
      queryClient.invalidateQueries({ queryKey: ['taskReviews', selectedTaskId] });
      showToast('Review raised with RM.');
    },
    onError: (err) => showToast(err.response?.data?.error || 'Failed to raise review.', 'error')
  });

  const replyReviewMutation = useMutation({
    mutationFn: ({ reviewId, message }) => addTaskReviewMessage(selectedTaskId, reviewId, message),
    onSuccess: (_data, variables) => {
      setReplyDrafts((prev) => ({ ...prev, [variables.reviewId]: '' }));
      queryClient.invalidateQueries({ queryKey: ['taskReviews', selectedTaskId] });
    },
    onError: (err) => showToast(err.response?.data?.error || 'Failed to send reply.', 'error')
  });

  const resolveReviewMutation = useMutation({
    mutationFn: (reviewId) => resolveTaskReview(selectedTaskId, reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskReviews', selectedTaskId] });
      showToast('Review marked resolved.');
    },
    onError: (err) => showToast(err.response?.data?.error || 'Failed to resolve review.', 'error')
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
      showToast(!err.response ? 'Server still waking up — try again in 30 seconds.' : 'Failed to post comment.', 'error');
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
      setSubmissionNote('');
      setManagerPriorityInput('');
      showToast('Status updated successfully!');
    },
    onError: (err) => {
      showToast(!err.response ? 'Server still waking up — try again in 30 seconds.' : (err.response?.data?.error || 'Failed to update status.'), 'error');
    }
  });

  // Delete Task Mutation (admin only)
  const deleteTaskMutation = useMutation({
    mutationFn: () => deleteTask(selectedTaskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskStats'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      showToast('Task deleted.');
      onClose();
    },
    onError: (err) => {
      showToast(!err.response ? 'Server still waking up — try again in 30 seconds.' : (err.response?.data?.error || 'Failed to delete task.'), 'error');
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
      // Only prompt for a priority the user is actually allowed to set —
      // otherwise submitting it fails the whole "Start Task" action with a
      // 403 instead of just skipping the optional priority part.
      const canSetPriority = user?.is_admin || myPermissions?.['task:priority:set'];
      if (canSetPriority) {
        const fp = prompt('Please enter final priority (P1, P2, P3, or P4) or leave empty:');
        if (fp === null) return; // user cancelled
        const normalized = fp.trim().toUpperCase();
        if (normalized) {
          if (!['P1', 'P2', 'P3', 'P4'].includes(normalized)) {
            showToast('Final priority must be one of P1, P2, P3, or P4.', 'error');
            return;
          }
          payload.final_priority = normalized;
        }
      }
    } else if (status === 'in_progress' && user?.role === 'centre_head' && taskDetails?.status === 'pending_ch_review') {
      const feedback = prompt('Please explain why this is being sent back:');
      if (!feedback) return;
      payload.review_feedback = feedback;
    } else if (status === 'completed') {
      const isLeadershipOrAdmin = user?.role === 'leadership' || user?.is_admin;
      const note = prompt(isLeadershipOrAdmin ? 'Add a completion note (optional):' : 'Add a completion note (required):');
      if (note === null) return;
      if (!isLeadershipOrAdmin && !note.trim()) {
        showToast('A completion note is required to mark this task complete.', 'error');
        return;
      }
      payload.completion_note = note || undefined;
    } else if (status === 'declined') {
      const reason = prompt('Reason for declining (optional):');
      if (reason === null) return;
      payload.decline_reason = reason || undefined;
    }
    updateStatusMutation.mutate({ taskId: selectedTaskId, ...payload });
  };
  const { data: myPermissions } = useQuery({
    queryKey: ['myPermissions'],
    queryFn: getResolvedPermissionsMe,
    enabled: !!user,
  });

  const canExtendDueDate = myPermissions?.['task:due_date:extend'] || user?.is_admin;

  const handleDueDateSubmit = async (e) => {
    e.preventDefault();
    if (!newDueDate || !dueDateReason.trim()) {
      showToast('Please enter both a new due date and a reason.', 'error');
      return;
    }
    try {
      await updateTaskDueDate(selectedTaskId, newDueDate, dueDateReason.trim());
      showToast('Due date updated successfully!');
      setNewDueDate('');
      setDueDateReason('');
      queryClient.invalidateQueries({ queryKey: ['taskDetails', selectedTaskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update due date.', 'error');
    }
  };

  const editTaskMutation = useMutation({
    mutationFn: (data) => editTask(selectedTaskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskDetails', selectedTaskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      setShowEditForm(false);
      showToast('Task updated successfully!');
    },
    onError: (err) => {
      showToast(!err.response ? 'Server still waking up — try again in 30 seconds.' : (err.response?.data?.error || 'Failed to update task.'), 'error');
    }
  });

  const handleOpenEditForm = () => {
    setEditTitle(taskDetails?.title || '');
    setEditDescription(taskDetails?.description || '');
    setEditPriority(taskDetails?.proposed_priority || '');
    setEditDueDate(taskDetails?.initiator_due_date ? taskDetails.initiator_due_date.split('T')[0] : '');
    setShowEditForm(true);
  };

  const handleSubmitEdit = (e) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      showToast('Title cannot be empty.', 'error');
      return;
    }
    editTaskMutation.mutate({
      title: editTitle.trim(),
      description: editDescription,
      proposed_priority: editPriority,
      initiator_due_date: editDueDate
    });
  };

  const canEditTask = taskDetails?.status === 'pending_manager_approval' && (
    user?.is_admin ||
    user?.id === taskDetails?.initiated_by?.id ||
    (taskDetails?.assigned_manager && user?.id === taskDetails.assigned_manager)
  );

  const getCurrentOwner = (task) => {
    if (!task) return 'Unassigned';
    const { status, assigned_rm, assigned_ch, assigned_centre_executive, assigned_person, department } = task;
    
    if (status === 'pending_manager_approval') {
      return `HQ Manager (${department || 'Department'})`;
    }
    if (status === 'active_in_ch_basket') {
      return assigned_rm?.name ? `RM: ${assigned_rm.name}` : 'Regional Manager (Unassigned)';
    }
    if (['acknowledged', 'pending_ch_review'].includes(status)) {
      return assigned_ch?.name ? `CH: ${assigned_ch.name}` : 'Centre Head (Unassigned)';
    }
    if (status === 'in_progress') {
      if (task.assigned_person_id) {
        return assigned_person?.name ? `Employee: ${assigned_person.name}` : 'Employee (Assigned)';
      }
      if (assigned_centre_executive?.name) {
        return `Executive: ${assigned_centre_executive.name}`;
      }
      return assigned_ch?.name ? `CH: ${assigned_ch.name}` : 'Centre Head (Unassigned)';
    }
    if (['completed', 'closed', 'rejected'].includes(status)) {
      return `None (Task ${status.replace(/_/g, ' ')})`;
    }
    return 'Unassigned';
  };

  const ALL_ROLES = ['hq_manager', 'rm', 'centre_head', 'centre_executive', 'leadership', 'hq_executive'];

  const transitionsForRole = (status, role, isOwnCentre) => {
    const list = [];
    if (role === 'hq_manager') {
      if (status === 'pending_manager_approval') {
        // Excluded from standard buttons because HQ Manager priority recommended action is a dedicated form block
      } else if (status === 'completed' || status === 'closed') {
        list.push({ status: 'reopened', label: 'Reopen' });
      }
    } else if (role === 'rm') {
      if (isOwnCentre) {
        if (status === 'active_in_ch_basket') {
          list.push({ status: 'in_progress', label: 'Start Task' });
          list.push({ status: 'rejected', label: 'Reject' });
        } else if (status === 'completed' || status === 'closed') {
          list.push({ status: 'reopened', label: 'Reopen' });
        } else if (status === 'in_progress') {
          // Blocking is effectively declining a task mid-flight, which sits
          // with RM/Leadership rather than Centre Head.
          list.push({ status: 'blocked', label: 'Mark Blocked' });
        } else if (status === 'blocked') {
          list.push({ status: 'in_progress', label: 'Unblock (Resume)' });
        }
      }
    } else if (role === 'centre_head') {
      if (isOwnCentre) {
        if (status === 'active_in_ch_basket') {
          list.push({ status: 'acknowledged', label: 'Acknowledge' });
        } else if (status === 'acknowledged') {
          list.push({ status: 'in_progress', label: 'Start Work' });
        } else if (status === 'in_progress') {
          list.push({ status: 'completed', label: 'Mark Completed' });
        } else if (status === 'pending_ch_review') {
          list.push({ status: 'completed', label: 'Approve & Complete' });
          list.push({ status: 'in_progress', label: 'Needs Rework' });
        } else if (status === 'completed' || status === 'closed') {
          list.push({ status: 'reopened', label: 'Reopen' });
        }
      }
    } else if (role === 'centre_executive') {
      // Excluded from standard buttons because CE submission note is required and shown via custom block
    } else if (role === 'leadership' || role === 'hq_executive') {
      if (status === 'completed' || status === 'closed') {
        list.push({ status: 'reopened', label: 'Reopen' });
      } else if (role === 'leadership' && status === 'in_progress') {
        list.push({ status: 'blocked', label: 'Mark Blocked' });
      } else if (role === 'leadership' && status === 'blocked') {
        list.push({ status: 'in_progress', label: 'Unblock (Resume)' });
      }
    }
    return list;
  };

  const getTransitions = (status, role) => {
    const isOwnCentre = role === 'centre_head'
      ? taskDetails?.assigned_ch?.id === user?.id
      : taskDetails?.assigned_rm?.id === user?.id;
    
    let list = [];
    if (!user?.is_admin) {
      list = transitionsForRole(status, role, isOwnCentre);
    } else {
      const seen = new Map();
      for (const r of ALL_ROLES) {
        for (const t of transitionsForRole(status, r, true)) {
          if (!seen.has(t.status)) seen.set(t.status, t);
        }
      }
      list = Array.from(seen.values());
    }

    if (taskDetails?.assigned_person_id === user?.id && status === 'in_progress') {
      if (!list.some(t => t.status === 'completed')) {
        list.push({ status: 'completed', label: 'Mark Completed' });
      }
    }
    return list;
  };

  if (!selectedTaskId) return null;

  const currentPriority = taskDetails?.final_priority ?? taskDetails?.manager_priority ?? taskDetails?.proposed_priority;

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
            <h3 className="font-bold text-slate-900 text-base mt-0.5 truncate pr-2 flex items-center gap-2">
              <span className="truncate">{taskDetails?.title || (detailsLoading ? 'Loading details...' : 'Task View')}</span>
              {taskDetails?.is_edited && (
                <span className="shrink-0 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 uppercase tracking-wide">
                  Edited
                </span>
              )}
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
                  <span className="text-slate-400 font-semibold">Current Owner</span>
                  <span className="font-bold text-indigo-750 bg-indigo-50 border border-indigo-100 rounded px-2 py-0.5 text-[11px] uppercase">
                    {getCurrentOwner(taskDetails)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-slate-100/50 pt-2">
                  <span className="text-slate-400 font-semibold">Priority</span>
                  {getPriorityBadge(currentPriority)}
                </div>
                {(() => {
                  const pHistory = [];
                  if (taskDetails?.proposed_priority) pHistory.push(`Proposed: ${taskDetails.proposed_priority}`);
                  if (taskDetails?.manager_priority) pHistory.push(`Manager: ${taskDetails.manager_priority}`);
                  if (taskDetails?.final_priority) pHistory.push(`Final: ${taskDetails.final_priority}`);
                  if (pHistory.length > 1) {
                    return (
                      <div className="text-[10px] text-slate-400 font-medium pb-1 flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-500">History:</span>
                        <span>{pHistory.join(' → ')}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="flex items-center justify-between text-xs border-t border-slate-100/50 pt-2">
                  <span className="text-slate-400 font-semibold">Status</span>
                  {getStatusBadge(taskDetails?.status)}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Centre</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Building size={14} className="text-slate-400" />
                    {getTaskLocationLabel(taskDetails)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Due Date</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Calendar size={14} className="text-slate-400" />
                    {getTaskDueDate(taskDetails) 
                      ? getTaskDueDate(taskDetails).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) 
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
                {taskDetails?.review_feedback && (
                  <div className="bg-amber-50 rounded-lg px-3 py-2 col-span-2">
                    <div className="text-[10px] text-amber-600 mb-0.5">Needs Rework — Feedback</div>
                    <div className="text-xs font-semibold text-amber-700">{taskDetails.review_feedback}</div>
                  </div>
                )}
                {taskDetails?.submission_note && (
                  <div className="bg-indigo-50 rounded-lg px-3 py-2 col-span-2">
                    <div className="text-[10px] text-indigo-650 mb-0.5">Executive Submission Note</div>
                    <div className="text-xs font-semibold text-indigo-700">{taskDetails.submission_note}</div>
                  </div>
                )}
                {taskDetails?.completion_note && (
                  <div className="bg-emerald-50 rounded-lg px-3 py-2 col-span-2">
                    <div className="text-[10px] text-emerald-600 mb-0.5">Completion Note</div>
                    <div className="text-xs font-semibold text-emerald-700">{taskDetails.completion_note}</div>
                  </div>
                )}
              </div>

              {/* Edit Task (initiator / assigned manager / admin, pre-approval only) */}
              {canEditTask && (
                <div className="space-y-2">
                  {!showEditForm ? (
                    <button
                      type="button"
                      onClick={handleOpenEditForm}
                      className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      Edit Task
                    </button>
                  ) : (
                    <form onSubmit={handleSubmitEdit} className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Title *</label>
                        <input
                          type="text"
                          required
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none text-slate-700 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Description</label>
                        <textarea
                          rows="3"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none text-slate-700 resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Proposed Priority</label>
                          <select
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none text-slate-700 font-semibold"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Due Date</label>
                          <input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none text-slate-700 font-semibold"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={editTaskMutation.isPending}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          {editTaskMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowEditForm(false)}
                          className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg py-1.5 px-3 text-xs font-bold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Action: Update Task Status */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Operations Actions</h4>

                {/* Dedicated HQ Manager Approval Block */}
                {((user?.role === 'hq_manager' || user?.is_admin) && taskDetails?.status === 'pending_manager_approval') && (
                  <ManagerApprovalBlock
                    task={taskDetails}
                    canSuggestPriority={!!(user?.is_admin || myPermissions?.['task:priority:suggest'])}
                    onApprove={(priorityVal) => {
                      updateStatusMutation.mutate({
                        taskId: selectedTaskId,
                        status: 'active_in_ch_basket',
                        manager_priority: priorityVal
                      });
                    }}
                    onReject={() => handleStatusChange('rejected')}
                  />
                )}

                {/* Dedicated Centre Executive Submit Block */}
                {(user?.role === 'centre_executive' && taskDetails?.status === 'in_progress') && (
                  <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Submission Note *</label>
                    <textarea
                      required
                      rows="3"
                      placeholder="Describe the completion details..."
                      value={submissionNote}
                      onChange={(e) => setSubmissionNote(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none leading-relaxed"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!submissionNote.trim()) {
                          showToast('Submission note is required', 'error');
                          return;
                        }
                        updateStatusMutation.mutate({
                          taskId: selectedTaskId,
                          status: 'pending_ch_review',
                          submission_note: submissionNote.trim()
                        });
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 px-3 text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      Submit for Review
                    </button>
                  </div>
                )}

                {/* Request — stage 1: the requester's own manager reviews it
                    before the senior target ever sees it. */}
                {(taskDetails?.is_request && taskDetails?.status === 'pending_request_approval' &&
                  (user?.is_admin || user?.id === taskDetails?.requested_by?.manager_id)) && (
                  <div className="space-y-2 p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                    <p className="text-xs text-indigo-700">
                      <strong>{taskDetails?.requested_by?.name}</strong> wants to assign this task to{' '}
                      <strong>{taskDetails?.assigned_person?.name}</strong>, who is senior to them. Approve to send it
                      to {taskDetails?.assigned_person?.name} for their own Accept/Decline, or reject the request.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateStatusMutation.mutate({ taskId: selectedTaskId, status: 'pending_target_response' })}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
                      >
                        Approve Request
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange('rejected')}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Request — stage 2: the senior target Accepts or Declines. */}
                {(taskDetails?.is_request && taskDetails?.status === 'pending_target_response' &&
                  (user?.is_admin || user?.id === taskDetails?.assigned_person_id)) && (
                  <div className="space-y-2 p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                    <p className="text-xs text-indigo-700">
                      <strong>{taskDetails?.requested_by?.name}</strong> is requesting that you take on this task.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleStatusChange('in_progress')}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange('declined')}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* Standard buttons for other transitions */}
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
                  {getTransitions(taskDetails?.status, user?.role).length === 0 && 
                   !((user?.role === 'hq_manager' || user?.is_admin) && taskDetails?.status === 'pending_manager_approval') && 
                   !(user?.role === 'centre_executive' && taskDetails?.status === 'in_progress') && (
                    <span className="text-xs text-slate-400 italic">No operational actions available for your role.</span>
                  )}
                </div>
              </div>

              {/* Propose new due date block */}
              {canExtendDueDate && (
                <div className="border-t border-slate-100 pt-6 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Calendar size={14} className="text-indigo-600" />
                    <span>Propose New Due Date</span>
                  </h4>
                  <form onSubmit={handleDueDateSubmit} className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">New Due Date *</label>
                        <input
                          type="date"
                          required
                          value={newDueDate}
                          onChange={(e) => setNewDueDate(e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Reason *</label>
                        <input
                          type="text"
                          required
                          placeholder="Reason for change..."
                          value={dueDateReason}
                          onChange={(e) => setDueDateReason(e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-medium"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-black text-white rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm text-center"
                    >
                      Update Due Date
                    </button>
                  </form>
                </div>
              )}

              {/* Activity Log / Timeline */}
              {taskDetails?.activity_log && taskDetails.activity_log.length > 0 && (
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Activity size={14} className="text-slate-400" />
                    <span>Activity Log</span>
                  </h4>
                  <div className="relative pl-6 space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-150">
                    {taskDetails.activity_log.map((log, index) => {
                      let text = '';
                      let iconPrefix = '⚪';
                      if (log.type === 'status') {
                        text = log.comment || `Status updated from ${log.from_status || 'null'} to ${log.to_status}`;
                        iconPrefix = '🔄';
                      } else if (log.type === 'priority') {
                        text = `Priority updated: ${log.previous_priority || 'None'} → ${log.new_priority}`;
                        iconPrefix = '⭐';
                      } else if (log.type === 'due_date') {
                        const fieldLabel = log.field === 'initiator_due_date' ? 'Initiator' : (log.field === 'manager_due_date' ? 'Manager' : 'RM');
                        text = `Due date (${fieldLabel}): ${log.previous_due_date || 'None'} → ${log.new_due_date}`;
                        iconPrefix = '📅';
                      } else if (log.type === 'edit') {
                        iconPrefix = '✏️';
                        if (log.previous_data && log.new_data) {
                          const changes = Object.keys(log.new_data).map((k) => {
                            const prev = log.previous_data[k] ?? '—';
                            const next = log.new_data[k] ?? '—';
                            return `${k.replace(/_/g, ' ')}: "${prev}" → "${next}"`;
                          }).join('; ');
                          text = `Task edited — ${changes}`;
                        } else {
                          text = 'Task details were edited (admin can view exactly what changed)';
                        }
                      }

                      return (
                        <div key={log.id || index} className="relative group">
                          <div className="absolute -left-[20px] top-1.5 w-3 h-3 rounded-full border-2 border-indigo-500 bg-white group-hover:bg-indigo-500 transition-colors" />
                          <div className="space-y-1">
                            <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                              <span className="mr-1.5">{iconPrefix}</span>
                              {text}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                              <span className="font-bold text-slate-500 flex items-center gap-1 flex-wrap">
                                By: {log.changed_by?.name || 'System'}
                                {log.changed_by?.role && (
                                  <span className="ml-1 inline-block text-[8px] px-1 py-0.2 bg-slate-100 border border-slate-200 rounded text-slate-500 uppercase font-mono font-bold leading-none scale-90">
                                    {log.changed_by.role.replace(/_/g, ' ')}
                                  </span>
                                )}
                              </span>
                              <span>•</span>
                              <span>{new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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

              {/* Private Review (Centre Head <-> RM only — not visible to anyone else) */}
              {canSeeReview && (
                <div className="border-t border-slate-100 pt-6 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Lock size={14} className="text-slate-400" />
                    <span>Private Review (Centre Head ↔ RM)</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 -mt-2">Only visible to this task's Centre Head, Regional Manager, and admin.</p>

                  {(reviews || []).map((r) => (
                    <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-500">
                          Raised by {r.raised_by?.name || 'Unknown'} · {r.status === 'open' ? 'Open' : 'Resolved'}
                        </span>
                        {r.status === 'open' && (
                          <button
                            type="button"
                            onClick={() => resolveReviewMutation.mutate(r.id)}
                            className="text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {r.messages?.map((m) => (
                          <div key={m.id} className="text-xs">
                            <span className="font-bold text-slate-700">{m.sender?.name || 'Unknown'}: </span>
                            <span className="text-slate-600">{m.message}</span>
                          </div>
                        ))}
                      </div>
                      {r.status === 'open' && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const text = (replyDrafts[r.id] || '').trim();
                            if (!text) return;
                            replyReviewMutation.mutate({ reviewId: r.id, message: text });
                          }}
                          className="flex gap-2 pt-1"
                        >
                          <input
                            type="text"
                            placeholder="Reply privately..."
                            value={replyDrafts[r.id] || ''}
                            onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                            className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                          <button
                            type="submit"
                            disabled={replyReviewMutation.isPending}
                            className="bg-slate-900 hover:bg-black text-white rounded-lg px-3 text-xs font-bold cursor-pointer transition-all"
                          >
                            Send
                          </button>
                        </form>
                      )}
                    </div>
                  ))}

                  {!reviews?.length && (
                    <p className="text-xs text-center text-slate-400 py-2 italic">No private reviews yet.</p>
                  )}

                  {user?.id === taskDetails?.assigned_ch?.id && !reviews?.some((r) => r.status === 'open') && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!reviewMessage.trim()) return;
                        raiseReviewMutation.mutate(reviewMessage.trim());
                      }}
                      className="space-y-2"
                    >
                      <textarea
                        rows="2"
                        placeholder="Raise a private review with your RM..."
                        value={reviewMessage}
                        onChange={(e) => setReviewMessage(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none leading-relaxed"
                      />
                      <button
                        type="submit"
                        disabled={raiseReviewMutation.isPending}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2 px-3 text-xs font-bold transition-all cursor-pointer shadow-sm"
                      >
                        Raise Review with RM
                      </button>
                    </form>
                  )}
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
