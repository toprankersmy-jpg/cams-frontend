import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getMyTasks, getUsersByRole, getUserDirectory, getAllCentres, getOrgHubEmployees, assignTask } from '../api';
import { UserPlus, Send, Loader2, Users } from 'lucide-react';
import EmployeePicker from '../components/EmployeePicker';

// Mirrors tasksController.js's ROLE_TIER — for a client-side "heads up, this
// will be a Request" hint only. The server is the actual authority; this is
// just so nobody is surprised after they hit submit.
const ROLE_TIER = { centre_executive: 1, hq_executive: 1, centre_head: 2, rm: 3, hq_manager: 4, leadership: 5 };
const isSeniorTarget = (assignerRole, targetRole) => (ROLE_TIER[targetRole] || 0) > (ROLE_TIER[assignerRole] || 0);

export default function DelegatePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [instructions, setInstructions] = useState('');
  const [scope, setScope] = useState('reports'); // 'reports' | 'all' — which pool the picker searches

  // Every role can assign a task directly to any active employee. Centre
  // Head additionally keeps the narrower "delegate to my centre's executive"
  // flow — the only mode that isn't a universal person-to-person assignment.
  const isCentreHead = user?.role === 'centre_head';
  const [mode, setMode] = useState('person'); // 'person' | 'executive' (centre_head only)

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['myTasks'],
    queryFn: getMyTasks,
    retry: 1,
  });

  const { data: userDirectory, isLoading: directoryLoading } = useQuery({
    queryKey: ['userDirectory'],
    queryFn: getUserDirectory,
    retry: 1,
  });

  // Org Hub's reporting hierarchy (employees.manager_id) lets the picker
  // default to "people who actually report to me" instead of a flat
  // 500-employee search — full directory search is still one click away.
  const { data: orgHubEmployees, isLoading: orgHubLoading } = useQuery({
    queryKey: ['orgHubEmployees'],
    queryFn: getOrgHubEmployees,
    retry: 1,
  });

  const { data: executives, isLoading: execsLoading } = useQuery({
    queryKey: ['executives'],
    queryFn: () => getUsersByRole('centre_executive'),
    enabled: isCentreHead,
    retry: 1,
  });

  const { data: centres, isLoading: centresLoading } = useQuery({
    queryKey: ['centres'],
    queryFn: getAllCentres,
    enabled: isCentreHead,
    retry: 1,
  });

  const taskList = Array.isArray(tasks) ? tasks : (tasks?.tasks || tasks?.data || []);
  const directoryList = Array.isArray(userDirectory) ? userDirectory : (userDirectory?.users || userDirectory?.data || []);
  const allExecList = Array.isArray(executives) ? executives : (executives?.users || executives?.data || []);
  const centreList = Array.isArray(centres) ? centres : (centres?.centres || centres?.data || []);
  const employeeList = Array.isArray(orgHubEmployees) ? orgHubEmployees : (orgHubEmployees?.employees || orgHubEmployees?.data || []);

  // Include self in the pool — sometimes a person wants to just keep a task
  // and work on it themselves rather than hand it off to someone else.
  const personDirectory = directoryList;

  // Resolve "my reports": find my own Org Hub employee record (linked via
  // user_id), then everyone whose manager_id points back to it, then map
  // those employee rows to real CAMS logins via their own user_id — an
  // Org Hub employee with no linked login can't be picked here regardless.
  const myEmployeeRecord = employeeList.find((e) => e.user_id === user?.id);
  const myReportUserIds = new Set(
    employeeList
      .filter((e) => myEmployeeRecord && e.manager_id === myEmployeeRecord.id && e.user_id)
      .map((e) => e.user_id)
  );
  const myReports = personDirectory.filter((emp) => myReportUserIds.has(emp.id));

  const myCentreIds = new Set(centreList.filter((c) => c.ch_id === user?.id).map((c) => c.id));
  const execList = allExecList.filter((exec) => exec.centre_id && myCentreIds.has(exec.centre_id));

  const isExecMode = isCentreHead && mode === 'executive';
  const personPool = scope === 'reports' && myReports.length > 0 ? myReports : personDirectory;

  const selectedAssignee = personDirectory.find((emp) => emp.id === selectedAssigneeId);
  const willBeRequest = !isExecMode && selectedAssignee && isSeniorTarget(user?.role, selectedAssignee.role);

  // Any of the user's own tasks not already delegated to a specific person
  // can be assigned directly to someone. The Centre Executive sub-flow keeps
  // its existing, narrower basket-status filter.
  const delegateableTasks = taskList.filter((t) => {
    if (isExecMode) {
      return ['active_in_ch_basket', 'acknowledged', 'in_progress'].includes(t.status);
    }
    return !t.assigned_person_id;
  });

  const delegateMutation = useMutation({
    mutationFn: async ({ taskId, assigneeId, instructionsText }) => {
      const payload = isExecMode
        ? { assigned_centre_executive: assigneeId, instructions: instructionsText.trim() }
        : { assigned_person_id: assigneeId, instructions: instructionsText.trim() };
      return assignTask(taskId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTaskId('');
      setSelectedAssigneeId('');
      setInstructions('');
      showToast(isExecMode ? 'Task successfully delegated to Centre Executive!' : 'Task successfully assigned to employee!');
    },
    onError: (err) => {
      showToast(!err.response ? 'Server still waking up — try again in 30 seconds.' : (err.response?.data?.error || 'Failed to delegate task.'), 'error');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedTaskId || !selectedAssigneeId) {
      showToast('Please select both a task and an assignee.', 'error');
      return;
    }
    delegateMutation.mutate({
      taskId: selectedTaskId,
      assigneeId: selectedAssigneeId,
      instructionsText: instructions
    });
  };

  const handleModeChange = (next) => {
    setMode(next);
    setSelectedTaskId('');
    setSelectedAssigneeId('');
  };

  const isLoading = tasksLoading || directoryLoading || orgHubLoading || (isExecMode && (execsLoading || centresLoading));
  const assigneeList = isExecMode ? execList : personPool;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <UserPlus className="text-indigo-650" />
          <span>Delegate Task</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isExecMode ? 'Assign active tasks in your basket to a centre executive' : 'Assign any of your tasks directly to any active employee'}
        </p>
      </div>

      {isCentreHead && (
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => handleModeChange('person')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'person' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-500'}`}
          >
            Assign to Employee
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('executive')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'executive' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-500'}`}
          >
            Delegate to Centre Executive
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="animate-spin mx-auto text-indigo-600 mb-2" size={24} />
            <span className="text-xs font-semibold">Loading options...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Task Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Select Task *</label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-semibold"
              >
                <option value="" disabled>{isExecMode ? '-- Select a task from your basket --' : '-- Select one of your tasks --'}</option>
                {delegateableTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.task_number || t.id.slice(-6).toUpperCase()} — {t.title} ({t.status.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
              {delegateableTasks.length === 0 && (
                <p className="text-[11px] text-amber-600 italic">
                  {isExecMode ? 'No active tasks in your basket to delegate.' : 'No tasks available to assign directly.'}
                </p>
              )}
            </div>

            {/* Assignee Picker */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {isExecMode ? 'Assign to Centre Executive *' : 'Assign to Employee *'}
                </label>
                <div className="flex items-center gap-2">
                  {!isExecMode && (
                    <button
                      type="button"
                      onClick={() => setSelectedAssigneeId(user?.id)}
                      className={`text-[11px] font-bold px-2 py-1 rounded-full transition-all ${selectedAssigneeId === user?.id ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-650 hover:bg-indigo-100'}`}
                    >
                      Assign to Myself
                    </button>
                  )}
                  {!isExecMode && myReports.length > 0 && (
                    <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setScope('reports')}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${scope === 'reports' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-500'}`}
                      >
                        <Users size={11} /> My Reports
                      </button>
                      <button
                        type="button"
                        onClick={() => setScope('all')}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${scope === 'all' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-500'}`}
                      >
                        Everyone
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {isExecMode ? (
                <select
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-semibold"
                >
                  <option value="" disabled>-- Select an assignee --</option>
                  {assigneeList.map((exec) => (
                    <option key={exec.id} value={exec.id}>
                      {exec.name} ({exec.email})
                    </option>
                  ))}
                </select>
              ) : (
                <EmployeePicker
                  users={assigneeList}
                  value={selectedAssigneeId}
                  onChange={setSelectedAssigneeId}
                />
              )}
              {assigneeList.length === 0 && (
                <p className="text-[11px] text-amber-600 italic">
                  {isExecMode ? 'No centre executives are assigned to your centre yet.' : 'No matching active users found.'}
                </p>
              )}
            </div>

            {willBeRequest && (
              <div className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                <strong>{selectedAssignee?.name}</strong> is senior to you — this will be sent as a <strong>Request</strong> for
                your manager to approve first, not an immediate assignment. {selectedAssignee?.name} won't see it until
                your manager approves it forward.
              </div>
            )}

            {/* Instructions */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Instructions *</label>
              <textarea
                required
                rows="4"
                placeholder={isExecMode ? "Specify details, steps, or checklist items for the executive..." : "Specify details, steps, or checklist items for the employee..."}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none leading-relaxed"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={delegateMutation.isPending || delegateableTasks.length === 0 || assigneeList.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl py-3 font-bold text-sm transition-all cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {delegateMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Delegating...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Delegate Task</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
