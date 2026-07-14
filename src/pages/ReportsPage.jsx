import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllTasks, getAllCentres } from '../api';
import { BarChart3, Clock, CheckCircle2, AlertCircle, ShieldAlert, Building } from 'lucide-react';

export default function ReportsPage() {
  // Query all tasks
  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: getAllTasks,
    retry: 1,
  });

  // Query all centres
  const { data: centres, isLoading: centresLoading, error: centresError } = useQuery({
    queryKey: ['centres'],
    queryFn: getAllCentres,
    retry: 1,
  });

  const taskList = Array.isArray(tasks) ? tasks : (tasks?.tasks || tasks?.data || []);
  const centreList = Array.isArray(centres) ? centres : (centres?.centres || centres?.data || []);

  const isLoading = tasksLoading || centresLoading;
  const isError = tasksError || centresError;

  // Resolve the task's due date
  const getResolvedDueDate = (t) => {
    return t.effective_due_date ? new Date(t.effective_due_date) : null;
  };

  // Check if a task is overdue
  const isOverdue = (t) => {
    return !!t.is_overdue;
  };


  // Calculate aggregates
  const totalTasks = taskList.length;
  
  const completedCount = taskList.filter(t => ['completed', 'closed'].includes(t.status)).length;
  const completionRate = totalTasks > 0 ? ((completedCount / totalTasks) * 100).toFixed(0) : 0;

  const overdueCount = taskList.filter(t => isOverdue(t)).length;
  const overdueRate = totalTasks > 0 ? ((overdueCount / totalTasks) * 100).toFixed(0) : 0;

  // Average resolution time (days from created_at to updated_at for completed/closed tasks)
  const resolvedTasks = taskList.filter(t => ['completed', 'closed'].includes(t.status) && t.created_at && t.updated_at);
  let avgResolutionDays = 0;
  if (resolvedTasks.length > 0) {
    const totalDays = resolvedTasks.reduce((sum, t) => {
      const start = new Date(t.created_at);
      const end = new Date(t.updated_at);
      const diffTime = Math.abs(end - start);
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return sum + diffDays;
    }, 0);
    avgResolutionDays = (totalDays / resolvedTasks.length).toFixed(1);
  } else {
    avgResolutionDays = '—';
  }

  // Tasks by department aggregation
  const deptMap = {};
  taskList.forEach((t) => {
    const d = t.department || 'Other';
    deptMap[d] = (deptMap[d] || 0) + 1;
  });
  const deptData = Object.entries(deptMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const maxDeptCount = deptData.length > 0 ? Math.max(...deptData.map(d => d.count)) : 1;

  // Tasks by centre aggregation
  const centreMap = {};
  taskList.forEach((t) => {
    const c = t.target_centre?.name || 'All Centres';
    centreMap[c] = (centreMap[c] || 0) + 1;
  });
  const centreData = Object.entries(centreMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6); // Top 6 centres

  const maxCentreCount = centreData.length > 0 ? Math.max(...centreData.map(c => c.count)) : 1;

  // Top delayed centres table calculation
  const delayedCentreMap = {};
  taskList.forEach((t) => {
    if (isOverdue(t)) {
      const cName = t.target_centre?.name || 'All Centres';
      const cId = t.target_centre_id || 'all';
      const rmName = t.assigned_rm?.name || 'Unassigned';
      const dueDate = getResolvedDueDate(t);

      if (!delayedCentreMap[cId]) {
        delayedCentreMap[cId] = {
          name: cName,
          rm: rmName,
          overdueCount: 0,
          oldestDueDate: dueDate
        };
      }
      
      delayedCentreMap[cId].overdueCount += 1;
      if (dueDate && dueDate < delayedCentreMap[cId].oldestDueDate) {
        delayedCentreMap[cId].oldestDueDate = dueDate;
      }
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const delayedCentres = Object.values(delayedCentreMap)
    .map((c) => {
      const diffTime = Math.abs(today - c.oldestDueDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...c,
        ageDays: diffDays
      };
    })
    .sort((a, b) => b.overdueCount - a.overdueCount);

  // Department color palette mappings
  const deptColors = {
    Finance: 'bg-indigo-600',
    Operations: 'bg-cyan-600',
    Compliance: 'bg-amber-600',
    HR: 'bg-emerald-600',
    Marketing: 'bg-violet-600',
    Academics: 'bg-rose-600',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reports & Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Operational summary metrics across TopRankers offline network</p>
      </div>

      {isError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
          ⏳ Backend is waking up — please wait or refresh.
        </div>
      )}

      {isLoading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <span className="text-xs text-slate-400 font-semibold mt-2 block">Calculating report analytics...</span>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tasks</span>
                <h4 className="text-3xl font-extrabold text-slate-900">{totalTasks}</h4>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <BarChart3 size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completion Rate</span>
                <h4 className="text-3xl font-extrabold text-emerald-600">{completionRate}%</h4>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overdue Rate</span>
                <h4 className="text-3xl font-extrabold text-rose-600">{overdueRate}%</h4>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <AlertCircle size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg. Resolution</span>
                <h4 className="text-3xl font-extrabold text-amber-600">{avgResolutionDays === '—' ? '—' : `${avgResolutionDays}d`}</h4>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Clock size={24} />
              </div>
            </div>
          </div>

          {/* Breakdown Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Tasks by Department */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-1.5">
                <BarChart3 size={16} className="text-slate-400" />
                <span>Tasks by Department</span>
              </h3>
              <div className="space-y-3.5">
                {deptData.map((d) => {
                  const widthPercent = ((d.count / maxDeptCount) * 100).toFixed(0);
                  const colorClass = deptColors[d.name] || 'bg-slate-500';
                  return (
                    <div key={d.name} className="flex items-center gap-4 text-xs">
                      <div className="w-24 text-slate-550 font-bold truncate text-right pr-2">{d.name}</div>
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${colorClass}`} 
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                      <div className="w-6 font-bold text-slate-700 text-left">{d.count}</div>
                    </div>
                  );
                })}
                {deptData.length === 0 && (
                  <div className="text-center py-8 text-slate-400 italic">No department data found.</div>
                )}
              </div>
            </div>

            {/* Tasks by Centre */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-1.5">
                <Building size={16} className="text-slate-400" />
                <span>Tasks by Centre</span>
              </h3>
              <div className="space-y-3.5">
                {centreData.map((c) => {
                  const widthPercent = ((c.count / maxCentreCount) * 100).toFixed(0);
                  return (
                    <div key={c.name} className="flex items-center gap-4 text-xs">
                      <div className="w-24 text-slate-550 font-bold truncate text-right pr-2">{c.name}</div>
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-indigo-600 transition-all duration-500" 
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                      <div className="w-6 font-bold text-slate-700 text-left">{c.count}</div>
                    </div>
                  );
                })}
                {centreData.length === 0 && (
                  <div className="text-center py-8 text-slate-400 italic">No centre data found.</div>
                )}
              </div>
            </div>

          </div>

          {/* Top Delayed Centres Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShieldAlert size={17} className="text-rose-500" />
              <span>Top Delayed Centres</span>
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-4">Centre</th>
                    <th className="py-2.5 px-4">RM</th>
                    <th className="py-2.5 px-4">Overdue Tasks</th>
                    <th className="py-2.5 px-4">Oldest Delayed Age</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-700">
                  {delayedCentres.map((c) => (
                    <tr key={c.name} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-800">{c.name}</td>
                      <td className="py-3 px-4 text-slate-550">{c.rm}</td>
                      <td className="py-3 px-4 text-rose-600 font-bold">{c.overdueCount}</td>
                      <td className="py-3 px-4 font-semibold text-amber-600">
                        {c.ageDays === 1 ? '1 day' : `${c.ageDays} days`}
                      </td>
                    </tr>
                  ))}
                  {delayedCentres.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-400 italic">
                        No delayed centres found. All tasks are currently on track!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
