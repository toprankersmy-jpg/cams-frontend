import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllCentres, getResolvedPermissionsMe } from '../api';
import { Search, Building2, MapPin, ArrowRight } from 'lucide-react';

const SkeletonCard = () => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-slate-100 rounded-xl" />
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/3" />
      </div>
    </div>
    <div className="h-3 bg-slate-100 rounded w-1/2" />
    <div className="h-8 bg-slate-100 rounded-xl w-full" />
  </div>
);

export default function CentresPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [rmFilter, setRmFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');

  // Fetch centres list
  const { data: centres, isLoading, error } = useQuery({
    queryKey: ['centres'],
    queryFn: getAllCentres,
    retry: 1,
  });

  // Fetch current user permissions to resolve correct tasks route path
  const { data: myPermissions } = useQuery({
    queryKey: ['myPermissions'],
    queryFn: getResolvedPermissionsMe,
    enabled: !!user,
  });

  const allCentreList = Array.isArray(centres) ? centres : (centres?.centres || centres?.data || []);

  // RM/Centre Head only see the centres they're actually assigned to, not
  // the whole directory
  const centreList = allCentreList.filter((c) => {
    if (user?.role === 'rm') return c.rm_id === user.id;
    if (user?.role === 'centre_head') return c.ch_id === user.id;
    return true;
  });

  const rmOptions = Array.from(new Set(centreList.map((c) => c.rm?.name).filter(Boolean)));

  const filtered = centreList.filter((c) => {
    if (searchText) {
      const q = searchText.toLowerCase();
      if (!c.name?.toLowerCase().includes(q) && !c.code?.toLowerCase().includes(q)) return false;
    }
    if (rmFilter !== 'all' && c.rm?.name !== rmFilter) return false;
    if (modelFilter !== 'all' && c.model !== modelFilter) return false;
    return true;
  });

  const getRoleTasksPath = () => {
    if (user?.is_admin) return '/tasks/all';
    
    // Explicit role-correct mapping from briefing spec
    const roleMap = {
      hq_executive: '/tasks/all',
      hq_manager: '/department',
      rm: '/region',
      centre_head: '/basket',
      centre_executive: '/assigned',
      leadership: '/tasks/all'
    };

    const mappedPath = roleMap[user?.role];
    if (mappedPath) return mappedPath;

    // Permissions check fallback
    if (!myPermissions) return '/dashboard';
    if (myPermissions['page:tasks_all']) return '/tasks/all';
    if (myPermissions['page:tasks_my']) return '/tasks/my';
    if (myPermissions['page:region']) return '/region';
    if (myPermissions['page:department']) return '/department';
    if (myPermissions['page:basket']) return '/basket';
    if (myPermissions['page:assigned']) return '/assigned';
    
    return '/dashboard';
  };

  const handleViewTasks = (centreId) => {
    const targetPath = getRoleTasksPath();
    navigate(targetPath, { state: { filterCentreId: centreId } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Centres & Facilities</h1>
        <p className="text-sm text-slate-500 mt-1">All registered TopRankers offline centres</p>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl flex items-center gap-3">
          <span className="text-lg">⏳</span>
          <span><strong>Backend is waking up</strong> — Render free tier sleeps after inactivity. First load may take up to 30 seconds. Please wait or refresh.</span>
        </div>
      )}

      {/* Search + Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by centre name or code..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={rmFilter}
            onChange={(e) => setRmFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-650 font-semibold"
          >
            <option value="all">All RMs</option>
            {rmOptions.map((rm) => <option key={rm} value={rm}>{rm}</option>)}
          </select>
          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-650 font-semibold"
          >
            <option value="all">All Models</option>
            <option value="COCO">COCO</option>
            <option value="FOFO">FOFO</option>
          </select>
        </div>
      </div>

      <div className="text-xs text-slate-400 font-medium px-1">
        Showing <span className="text-slate-700 font-bold">{filtered.length}</span> of <span className="text-slate-700 font-bold">{centreList.length}</span> centres
      </div>

      {/* Centre Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading && [...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        {!isLoading && filtered.map((c) => {
          const id = c._id || c.id || '';
          return (
            <div key={id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="bg-indigo-50 p-2.5 rounded-xl shrink-0">
                    <Building2 size={20} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">{c.name}</h3>
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700 tracking-wide uppercase border border-indigo-200">
                      {c.code}
                    </span>
                  </div>
                </div>
                {c.model && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    {c.model}
                  </span>
                )}
              </div>
              {(c.city || c.location) && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span>{c.city || c.location}</span>
                </div>
              )}
              <div className="text-xs text-slate-500 space-y-0.5">
                <div>RM: <span className="font-semibold text-slate-700">{c.rm?.name || '—'}</span></div>
                <div>CH: <span className="font-semibold text-slate-700">{c.ch?.name || '—'}</span></div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500">
                    <span className="font-bold text-indigo-600">{c.open_tasks ?? 0}</span> open
                  </span>
                  <span className="text-slate-500">
                    <span className={`font-bold ${c.overdue_tasks ? 'text-rose-600' : 'text-emerald-600'}`}>{c.overdue_tasks ?? 0}</span> overdue
                  </span>
                </div>
                <button
                  onClick={() => handleViewTasks(id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all cursor-pointer border border-transparent hover:border-indigo-200"
                >
                  View Tasks <ArrowRight size={13} />
                </button>
              </div>
            </div>
          );
        })}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-3 py-16 flex flex-col items-center gap-3 text-slate-400">
            <Building2 size={36} className="text-slate-300" />
            <span className="text-sm font-medium">No centres found</span>
            <span className="text-xs">Try adjusting your search</span>
          </div>
        )}
      </div>
    </div>
  );
}
