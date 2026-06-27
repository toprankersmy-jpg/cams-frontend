import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getAllCentres } from '../api';
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
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');

  const { data: centres, isLoading, error } = useQuery({
    queryKey: ['centres'],
    queryFn: getAllCentres,
    retry: 1,
  });

  const centreList = Array.isArray(centres) ? centres : (centres?.centres || centres?.data || []);

  const filtered = centreList.filter((c) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q);
  });

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

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
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
              <div className="flex items-start gap-3">
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
              {(c.city || c.location) && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span>{c.city || c.location}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-400 font-medium">Active Tasks: <span className="text-slate-600 font-bold">—</span></span>
                <button
                  onClick={() => navigate('/tasks/all')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
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
