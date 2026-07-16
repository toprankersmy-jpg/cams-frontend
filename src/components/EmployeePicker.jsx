import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

/**
 * Single-field searchable combobox: type to filter, click a result to select.
 * Replaces the old pattern of a separate search box + a plain <select> —
 * that required typing, then a second click into an unrelated dropdown.
 */
export default function EmployeePicker({ users, value, onChange, placeholder = 'Search by name or email...', excludeUserId = null }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = (users || []).find((u) => u.id === value) || null;

  const candidates = (users || []).filter((u) => u.id !== excludeUserId);
  const q = query.trim().toLowerCase();
  const matches = q
    ? candidates.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
    : candidates;
  const visibleMatches = matches.slice(0, 8);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayValue = selected && !isOpen ? `${selected.name} (${selected.email})` : query;

  const handleSelect = (user) => {
    onChange(user.id);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setQuery('');
    setIsOpen(true);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={displayValue}
          onFocus={() => { setQuery(''); setIsOpen(true); }}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-semibold"
        />
        {selected && !isOpen && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 cursor-pointer"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-50">
          {visibleMatches.map((u) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(u); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 cursor-pointer flex items-center justify-between gap-2"
            >
              <span className="font-semibold text-slate-800 truncate">{u.name}</span>
              <span className="text-slate-400 font-mono text-[10px] shrink-0">{u.email}</span>
            </button>
          ))}
          {!visibleMatches.length && (
            <div className="px-3 py-3 text-xs text-slate-400 italic text-center">No matching users</div>
          )}
          {matches.length > visibleMatches.length && (
            <div className="px-3 py-1.5 text-[10px] text-slate-400 text-center bg-slate-50">
              +{matches.length - visibleMatches.length} more — keep typing to narrow down
            </div>
          )}
        </div>
      )}
    </div>
  );
}
