import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getMyTasks, getUsersByRole, getUserDirectory, getAllCentres, assignTask, addComment } from '../api';
import { UserPlus, ClipboardList, Send, Loader2 } from 'lucide-react';

export default function DelegatePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedExecId, setSelectedExecId] = useState('');
  const [instructions, setInstructions] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');

  const isManager = user?.role === 'hq_manager';

  // Fetch relevant tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['myTasks'],
    queryFn: getMyTasks,
    retry: 1,
  });

  // Fetch all centre executives (for CH users)
  const { data: executives, isLoading: execsLoading } = useQuery({
    queryKey: ['executives'],
    queryFn: () => getUsersByRole('centre_executive'),
    enabled: !isManager,
    retry: 1,
  });

  // Fetch full active-user directory (for Manager users, any role/department)
  const { data: userDirectory, isLoading: hqLoading } = useQuery({
    queryKey: ['userDirectory'],
    queryFn: getUserDirectory,
    enabled: isManager,
    retry: 1,
  });

  // Fetch centres (for CH users)
  const { data: centres, isLoading: centresLoading } = useQuery({
    queryKey: ['centres'],
    queryFn: getAllCentres,
    enabled: !isManager,
    retry: 1,
  });

  const taskList = Array.isArray(tasks) ? tasks : (tasks?.tasks || tasks?.data || []);
  const allExecList = Array.isArray(executives) ? executives : (executives?.users || executives?.data || []);
  const centreList = Array.isArray(centres) ? centres : (centres?.centres || centres?.data || []);

  let execList = [];
  if (isManager) {
    const allActiveUsers = Array.isArray(userDirectory) ? userDirectory : (userDirectory?.users || userDirectory?.data || []);
    execList = allActiveUsers.filter((emp) => {
      if (emp.id === user?.id) return false;
      if (!employeeSearch.trim()) return true;
      const q = employeeSearch.toLowerCase();
      return emp.name?.toLowerCase().includes(q) || emp.email?.toLowerCase().includes(q);
    });
  } else {
    const myCentreIds = new Set(centreList.filter((c) => c.ch_id === user?.id).map((c) => c.id));
    execList = allExecList.filter((exec) => exec.centre_id && myCentreIds.has(exec.centre_id));
  }

  // Filter delegateable tasks
  const delegateableTasks = taskList.filter((t) => {
    if (isManager) {
      return t.department === user?.department && !t.assigned_person_id;
    } else {
      return ['active_in_ch_basket', 'acknowledged', 'in_progress'].includes(t.status);
    }
  });

  const delegateMutation = useMutation({
    mutationFn: async ({ taskId, execId, instructionsText }) => {
      const payload = isManager
        ? { assigned_person_id: execId, instructions: instructionsText.trim() }
        : { assigned_centre_executive: execId, instructions: instructionsText.trim() };
      const assignment = await assignTask(taskId, payload);
      return assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTaskId('');
      setSelectedExecId('');
      setInstructions('');
      setEmployeeSearch('');
      showToast(isManager ? 'Task successfully delegated to department employee!' : 'Task successfully delegated to Centre Executive!');
    },
    onError: (err) => {
      showToast(!err.response ? 'Server still waking up — try again in 30 seconds.' : (err.response?.data?.error || 'Failed to delegate task.'), 'error');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedTaskId || !selectedExecId) {
      showToast('Please select both a task and an assignee.', 'error');
      return;
    }
    delegateMutation.mutate({
      taskId: selectedTaskId,
      execId: selectedExecId,
      instructionsText: instructions
    });
  };

  const isLoading = tasksLoading || (isManager ? hqLoading : (execsLoading || centresLoading));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <UserPlus className="text-indigo-650" />
          <span>Delegate Task</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isManager ? 'Assign department tasks to team members' : 'Assign active tasks in your basket to centre executives'}
        </p>
      </div>

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
                <option value="" disabled>{isManager ? '-- Select a department task --' : '-- Select a task from your basket --'}</option>
                {delegateableTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.task_number || t.id.slice(-6).toUpperCase()} — {t.title} ({t.status.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
              {delegateableTasks.length === 0 && (
                <p className="text-[11px] text-amber-600 italic">
                  {isManager ? 'No department tasks to delegate.' : 'No active tasks in your basket to delegate.'}
                </p>
              )}
            </div>

            {/* Executive Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                {isManager ? 'Assign to Employee *' : 'Assign to Centre Executive *'}
              </label>
              {isManager && (
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 mb-1.5"
                />
              )}
              <select
                value={selectedExecId}
                onChange={(e) => setSelectedExecId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-semibold"
              >
                <option value="" disabled>-- Select an assignee --</option>
                {execList.map((exec) => (
                  <option key={exec.id} value={exec.id}>
                    {exec.name} {isManager && exec.role ? `(${exec.role.replace(/_/g, ' ')}) ` : ''}({exec.email})
                  </option>
                ))}
              </select>
              {execList.length === 0 && (
                <p className="text-[11px] text-amber-600 italic">
                  {isManager ? 'No matching active users found.' : 'No centre executives are assigned to your centre yet.'}
                </p>
              )}
            </div>

            {/* Instructions */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Instructions *</label>
              <textarea
                required
                rows="4"
                placeholder={isManager ? "Specify details, steps, or checklist items for the employee..." : "Specify details, steps, or checklist items for the executive..."}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none leading-relaxed"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={delegateMutation.isPending || delegateableTasks.length === 0 || execList.length === 0}
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

