import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getMyTasks, getUsersByRole, getAllCentres, assignTask, addComment } from '../api';
import { UserPlus, ClipboardList, Send, Loader2 } from 'lucide-react';

export default function DelegatePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedExecId, setSelectedExecId] = useState('');
  const [instructions, setInstructions] = useState('');

  // Fetch Centre Head's tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['myTasks'],
    queryFn: getMyTasks,
    retry: 1,
  });

  // Fetch all centre executives
  const { data: executives, isLoading: execsLoading } = useQuery({
    queryKey: ['executives'],
    queryFn: () => getUsersByRole('centre_executive'),
    retry: 1,
  });

  // Fetch centres to determine which one(s) this Centre Head actually runs
  const { data: centres, isLoading: centresLoading } = useQuery({
    queryKey: ['centres'],
    queryFn: getAllCentres,
    retry: 1,
  });

  const taskList = Array.isArray(tasks) ? tasks : (tasks?.tasks || tasks?.data || []);
  const allExecList = Array.isArray(executives) ? executives : (executives?.users || executives?.data || []);
  const centreList = Array.isArray(centres) ? centres : (centres?.centres || centres?.data || []);

  // Only offer Centre Executives who actually belong to a centre this CH runs
  const myCentreIds = new Set(centreList.filter((c) => c.ch_id === user?.id).map((c) => c.id));
  const execList = allExecList.filter((exec) => exec.centre_id && myCentreIds.has(exec.centre_id));

  // Filter tasks to active_in_ch_basket, acknowledged, or in_progress
  const delegateableTasks = taskList.filter((t) => 
    ['active_in_ch_basket', 'acknowledged', 'in_progress'].includes(t.status)
  );

  const delegateMutation = useMutation({
    mutationFn: async ({ taskId, execId, instructionsText }) => {
      // 1. Call assign endpoint
      const assignment = await assignTask(taskId, { assigned_centre_executive: execId });
      // 2. Add comment if instructions are provided
      if (instructionsText.trim()) {
        await addComment(taskId, `Delegation Instructions: ${instructionsText.trim()}`);
      }
      return assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTaskId('');
      setSelectedExecId('');
      setInstructions('');
      alert('Task successfully delegated to Centre Executive!');
    },
    onError: (err) => {
      alert(!err.response ? 'Server still waking up — try again in 30 seconds.' : (err.response?.data?.error || 'Failed to delegate task.'));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedTaskId || !selectedExecId) {
      alert('Please select both a task and an executive.');
      return;
    }
    delegateMutation.mutate({
      taskId: selectedTaskId,
      execId: selectedExecId,
      instructionsText: instructions
    });
  };

  const isLoading = tasksLoading || execsLoading || centresLoading;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <UserPlus className="text-indigo-650" />
          <span>Delegate Task</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">Assign active tasks in your basket to centre executives</p>
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
                <option value="" disabled>-- Select a task from your basket --</option>
                {delegateableTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.task_number || t.id.slice(-6).toUpperCase()} — {t.title} ({t.status.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
              {delegateableTasks.length === 0 && (
                <p className="text-[11px] text-amber-600 italic">No active tasks in your basket to delegate.</p>
              )}
            </div>

            {/* Executive Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Assign to Centre Executive *</label>
              <select
                value={selectedExecId}
                onChange={(e) => setSelectedExecId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-semibold"
              >
                <option value="" disabled>-- Select an executive --</option>
                {execList.map((exec) => (
                  <option key={exec.id} value={exec.id}>
                    {exec.name} ({exec.email})
                  </option>
                ))}
              </select>
              {execList.length === 0 && (
                <p className="text-[11px] text-amber-600 italic">No centre executives are assigned to your centre yet.</p>
              )}
            </div>

            {/* Instructions */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Instructions</label>
              <textarea
                rows="4"
                placeholder="Specify details, steps, or checklist items for the executive..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none leading-relaxed"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={delegateMutation.isPending || delegateableTasks.length === 0 || execList.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-bold text-sm transition-all cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-1.5"
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
