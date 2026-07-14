import React from 'react';

/**
 * Renders a priority badge with styling based on CAMS.HTML definitions.
 * proposed_priority values are low/medium/high/critical.
 * final_priority values are P1/P2/P3/P4.
 */
export const getPriorityBadge = (priority) => {
  const styles = {
    // Proposed Priority
    low: 'bg-slate-100 text-slate-700 border-slate-200',
    Low: 'bg-slate-100 text-slate-700 border-slate-200',
    medium: 'bg-blue-100 text-blue-700 border-blue-200',
    Medium: 'bg-blue-100 text-blue-700 border-blue-200',
    high: 'bg-amber-100 text-amber-700 border-amber-200',
    High: 'bg-amber-100 text-amber-700 border-amber-200',
    critical: 'bg-red-100 text-red-700 font-bold border-red-200',
    Critical: 'bg-red-100 text-red-700 font-bold border-red-200',
    
    // Final Priority (P1-P4)
    P1: 'bg-red-100 text-red-800 font-bold border-red-200',
    p1: 'bg-red-100 text-red-800 font-bold border-red-200',
    P2: 'bg-amber-100 text-amber-850 border-amber-200',
    p2: 'bg-amber-100 text-amber-850 border-amber-200',
    P3: 'bg-blue-100 text-blue-800 border-blue-200',
    p3: 'bg-blue-100 text-blue-800 border-blue-200',
    P4: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    p4: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${styles[priority] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {priority || 'Unknown'}
    </span>
  );
};

/**
 * Renders a status badge with dynamic styling matching the reference mockup.
 */
export const getStatusBadge = (status) => {
  const styles = {
    pending_manager_approval: 'bg-amber-50 text-amber-700 border-amber-200',
    active_in_ch_basket: 'bg-blue-50 text-blue-700 border-blue-200',
    acknowledged: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    in_progress: 'bg-violet-50 text-violet-700 border-violet-200',
    pending_ch_review: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    closed: 'bg-gray-50 text-gray-600 border-gray-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    blocked: 'bg-orange-50 text-orange-700 border-orange-200',
    reopened: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  };
  const labelOverrides = { pending_ch_review: 'Pending CH Review' };
  const label = status ? (labelOverrides[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())) : 'Unknown';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || 'bg-slate-50 text-slate-650 border-slate-200'}`}>
      {label}
    </span>
  );
};

export const getTaskDueDate = (t) => {
  if (!t || !t.effective_due_date) return null;
  return new Date(t.effective_due_date);
};

/**
 * A task with no target_centre isn't necessarily an "All Centres" task —
 * it could be routed to a specific person or a department instead. Picks
 * the right label instead of defaulting every no-centre task to "All Centres".
 */
export const getTaskLocationLabel = (t) => {
  if (!t) return '—';
  if (t.target_centre?.name) return t.target_centre.name;
  if (t.target_type === 'specific_person') {
    return t.assigned_person?.name ? `Direct: ${t.assigned_person.name}` : 'Direct Assignment';
  }
  if (t.target_type === 'team_department') {
    return `Dept: ${t.target_department || t.department || '—'}`;
  }
  return 'All Centres';
};

