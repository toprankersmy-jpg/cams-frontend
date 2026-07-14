import React, { useState } from 'react';

export default function ManagerApprovalBlock({ task, onApprove, onReject }) {
  const [managerPriority, setManagerPriority] = useState(task.proposed_priority || '');

  return (
    <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left">
      <div className="text-xs font-bold text-slate-650 flex items-center justify-between">
        <span>Proposed Priority:</span>
        <span className="font-semibold text-slate-800 uppercase">{task.proposed_priority || 'None'}</span>
      </div>
      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Recommended Priority</label>
        <select
          value={managerPriority}
          onChange={(e) => setManagerPriority(e.target.value)}
          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none text-slate-700 font-semibold"
        >
          <option value="">No recommendation</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onApprove(managerPriority || undefined)}
          className="flex-1 bg-indigo-650 hover:bg-indigo-750 text-white rounded-lg py-1.5 px-3 text-xs font-bold transition-all cursor-pointer shadow-sm text-center"
        >
          Approve & Route
        </button>
        <button
          type="button"
          onClick={onReject}
          className="bg-white hover:bg-slate-50 text-rose-650 border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-bold transition-all cursor-pointer shadow-sm text-center"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
