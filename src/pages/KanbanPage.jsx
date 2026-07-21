import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getMyTasks, getAllTasks } from '../api';
import { getPriorityBadge, getStatusBadge } from '../utils/taskDisplay';
import TaskDrawer from '../components/TaskDrawer';
import { Search, ListTodo, Filter, Building } from 'lucide-react';

export default function KanbanPage() {
  const { user } = useAuth();
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // 'rm' used to be on this list too, which meant an RM's Kanban board
  // showed every task in the system rather than their own — an accidental
  // over-scope. Now that getMyTasks correctly includes an RM's own basket
  // plus any task directly assigned to them, rm no longer needs the
  // unscoped fetch.
  const canSeeAll = ['leadership', 'hq_manager'].includes(user?.role);

  // Fetch tasks
  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['tasks', canSeeAll ? 'all' : 'my'],
    queryFn: canSeeAll ? getAllTasks : getMyTasks,
    retry: 1,
    refetchInterval: 4000, // keep the board live without a manual refresh
  });

  const taskList = Array.isArray(tasks) ? tasks : (tasks?.tasks || tasks?.data || []);

  // Filter tasks client-side
  const filteredTasks = taskList.filter((t) => {
    // Priority filter
    const taskPriorityVal = t.final_priority || t.proposed_priority || '';
    const matchPriority = priorityFilter === 'all' || taskPriorityVal.toLowerCase() === priorityFilter.toLowerCase();
    
    // Department filter
    const matchDept = deptFilter === 'all' || t.department?.toLowerCase() === deptFilter.toLowerCase();
    
    return matchPriority && matchDept;
  });

  // Kanban status columns definition
  const columns = [
    { key: 'active_in_ch_basket', label: 'In Basket', color: 'border-blue-500 text-blue-700 bg-blue-50/50' },
    { key: 'acknowledged', label: 'Acknowledged', color: 'border-indigo-500 text-indigo-700 bg-indigo-50/50' },
    { key: 'in_progress', label: 'In Progress', color: 'border-amber-500 text-amber-700 bg-amber-50/50' },
    { key: 'pending_ch_review', label: 'Pending Review', color: 'border-fuchsia-500 text-fuchsia-700 bg-fuchsia-50/50' },
    { key: 'blocked', label: 'Blocked', color: 'border-rose-500 text-rose-700 bg-rose-50/50' },
    { key: 'completed', label: 'Done', color: 'border-emerald-500 text-emerald-700 bg-emerald-50/50' }
  ];

  // Get departments present in tasks for filter dropdown
  const departments = Array.from(new Set(taskList.map(t => t.department).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Kanban Board</h1>
          <p className="text-sm text-slate-500 mt-1">Track tasks and status workflow visually</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-1 text-slate-400 text-xs px-2 font-semibold font-mono uppercase">
            <Filter size={13} />
            <span>Filters</span>
          </div>
          
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-650 font-semibold"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
            <option value="P4">P4</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-650 font-semibold"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
          ⏳ Backend is waking up — please wait or refresh.
        </div>
      )}

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start">
        {isLoading ? (
          <div className="col-span-6 py-24 text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <span className="text-xs text-slate-400 font-semibold mt-2 block">Loading board...</span>
          </div>
        ) : (
          columns.map((col) => {
            const columnTasks = filteredTasks.filter(t => t.status === col.key);
            return (
              <div key={col.key} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3 min-h-[480px]">
                {/* Column Header */}
                <div className={`border-b-2 pb-2 flex items-center justify-between font-bold text-xs uppercase tracking-wider ${col.color.split(' ')[0]}`}>
                  <span className={col.color.split(' ')[1]}>{col.label}</span>
                  <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono font-bold text-[10px]">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[640px] pr-1">
                  {columnTasks.map((t) => {
                    const currentPriority = t.final_priority || t.proposed_priority;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTaskId(t.id)}
                        className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2.5 group hover:border-indigo-300"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono font-bold">
                          <span>#{t.id.slice(-6).toUpperCase()}</span>
                          <span>{t.department}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-xs leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {t.title}
                        </h4>
                        <div className="border-t border-slate-100/80 pt-2 flex items-center justify-between gap-1 text-[10px] text-slate-500">
                          {getPriorityBadge(currentPriority)}
                          <span className="truncate max-w-[80px] font-bold text-slate-600 flex items-center gap-0.5">
                            <Building size={10} className="text-slate-400 shrink-0" />
                            {t.target_centre?.name || 'All'}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {columnTasks.length === 0 && (
                    <div className="py-12 text-center text-slate-400 text-[11px] italic">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
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
