import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOrgHubEmployees, getOrgHubDepartments } from '../api';
import { Search, ChevronRight, Mail, Users2, Network } from 'lucide-react';

const EMPTY_FILTERS = { department: '', manager: '', city: '' };

function initialsOf(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function OrgHubPage() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedCities, setExpandedCities] = useState({});
  const [selection, setSelection] = useState({ type: null, id: null });

  const { data: employees, isLoading: employeesLoading, error: employeesError } = useQuery({
    queryKey: ['org-hub-employees'],
    queryFn: getOrgHubEmployees,
    retry: 1,
  });
  const { data: departments, isLoading: departmentsLoading } = useQuery({
    queryKey: ['org-hub-departments'],
    queryFn: getOrgHubDepartments,
    retry: 1,
  });

  const emps = useMemo(() => (Array.isArray(employees) ? employees : []), [employees]);
  const depts = useMemo(() => (Array.isArray(departments) ? departments : []), [departments]);

  const byId = useMemo(() => {
    const m = {};
    emps.forEach((e) => { m[e.id] = e; });
    return m;
  }, [emps]);

  const directReportsOf = useMemo(() => {
    const m = {};
    emps.forEach((e) => {
      if (e.manager_id) {
        if (!m[e.manager_id]) m[e.manager_id] = [];
        m[e.manager_id].push(e.id);
      }
    });
    return m;
  }, [emps]);

  const depthOf = useMemo(() => {
    const cache = {};
    const compute = (id, seen) => {
      if (cache[id] !== undefined) return cache[id];
      if (seen.has(id)) return 0;
      const emp = byId[id];
      if (!emp || !emp.manager_id || !byId[emp.manager_id]) {
        cache[id] = 0;
        return 0;
      }
      seen.add(id);
      const d = 1 + compute(emp.manager_id, seen);
      cache[id] = d;
      return d;
    };
    return (id) => compute(id, new Set());
  }, [byId]);

  const managerOptions = useMemo(
    () => Array.from(new Set(emps.filter((e) => e.manager_name).map((e) => e.manager_name))).sort(),
    [emps]
  );
  const cityOptions = useMemo(
    () => Array.from(new Set(emps.filter((e) => e.city).map((e) => e.city))).sort(),
    [emps]
  );
  const groupOptions = useMemo(
    () => Array.from(new Set(emps.map((e) => e.group_name).filter(Boolean))).sort(),
    [emps]
  );
  const deptByName = useMemo(() => {
    const m = {};
    depts.forEach((d) => { m[d.name] = d; });
    return m;
  }, [depts]);

  const filtersActive = !!(search.trim() || filters.department || filters.manager || filters.city);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    const passesFilters = (e) => {
      if (filters.department && e.group_name !== filters.department) return false;
      if (filters.manager && e.manager_name !== filters.manager) return false;
      if (filters.city && e.city !== filters.city) return false;
      return true;
    };
    const matchesSearch = (e) =>
      (e.full_name || '').toLowerCase().includes(q) ||
      (e.department_name || '').toLowerCase().includes(q) ||
      (e.designation || '').toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q) ||
      (e.manager_name || '').toLowerCase().includes(q);
    return emps.filter((e) => passesFilters(e) && (!q || matchesSearch(e)));
  }, [emps, search, filters]);

  const matchedIds = useMemo(() => new Set(filteredEmployees.map((e) => e.id)), [filteredEmployees]);

  const tree = useMemo(() => {
    const rows = [];
    const groups = {};
    emps.forEach((e) => {
      const g = e.group_name || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(e.id);
    });

    Object.keys(groups).sort().forEach((groupName) => {
      let ids = groups[groupName];
      if (filtersActive) ids = ids.filter((id) => matchedIds.has(id));
      if (filtersActive && ids.length === 0) return;

      const expanded = filtersActive || !!expandedGroups[groupName];
      const matchedDept = deptByName[groupName];
      rows.push({
        kind: 'group',
        key: `g:${groupName}`,
        name: groupName,
        count: ids.length,
        expanded,
        onToggle: () => {
          setExpandedGroups((s) => ({ ...s, [groupName]: !s[groupName] }));
          if (matchedDept) setSelection({ type: 'department', id: matchedDept.id });
        },
      });
      if (!expanded) return;

      if (groupName === 'Regional Centers') {
        const cities = {};
        ids.forEach((id) => {
          const city = byId[id]?.city || 'Unspecified';
          if (!cities[city]) cities[city] = [];
          cities[city].push(id);
        });
        Object.keys(cities).sort((a, b) => cities[b].length - cities[a].length).forEach((city) => {
          const cityIds = cities[city];
          const cityExpanded = filtersActive || !!expandedCities[city];
          rows.push({
            kind: 'city',
            key: `c:${city}`,
            name: city,
            count: cityIds.length,
            expanded: cityExpanded,
            onToggle: () => setExpandedCities((s) => ({ ...s, [city]: !s[city] })),
          });
          if (!cityExpanded) return;
          cityIds
            .sort((a, b) => (byId[a]?.full_name || '').localeCompare(byId[b]?.full_name || ''))
            .forEach((id) => rows.push({ kind: 'employee', key: `e:${id}`, emp: byId[id], indent: 44 }));
        });
      } else {
        ids
          .sort((a, b) => depthOf(a) - depthOf(b) || (byId[a]?.full_name || '').localeCompare(byId[b]?.full_name || ''))
          .forEach((id) => rows.push({ kind: 'employee', key: `e:${id}`, emp: byId[id], indent: 28 }));
      }
    });
    return rows;
  }, [emps, byId, depthOf, filtersActive, matchedIds, expandedGroups, expandedCities, deptByName]);

  const selectedEmployee = selection.type === 'employee' ? byId[selection.id] : null;
  const selectedDepartment = selection.type === 'department' ? depts.find((d) => d.id === selection.id) : null;

  const chain = useMemo(() => {
    if (!selectedEmployee) return [];
    const nodes = [];
    let cur = selectedEmployee;
    const seen = new Set();
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      nodes.unshift(cur);
      cur = cur.manager_id ? byId[cur.manager_id] : null;
    }
    return nodes;
  }, [selectedEmployee, byId]);

  const directReports = useMemo(() => {
    if (!selectedEmployee) return [];
    return (directReportsOf[selectedEmployee.id] || [])
      .map((id) => byId[id])
      .filter(Boolean)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [selectedEmployee, directReportsOf, byId]);

  const focusEmployee = (id) => {
    const emp = byId[id];
    if (!emp) return;
    if (emp.group_name) setExpandedGroups((s) => ({ ...s, [emp.group_name]: true }));
    if (emp.city) setExpandedCities((s) => ({ ...s, [emp.city]: true }));
    setSelection({ type: 'employee', id });
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearch('');
  };

  const isLoading = employeesLoading || departmentsLoading;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Network size={22} className="text-indigo-600" /> Organization Hub
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Discover teams, reporting hierarchy, departments and ownership across TopRankers.
        </p>
      </div>

      {employeesError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl flex items-center gap-3">
          <span className="text-lg">⏳</span>
          <span><strong>Backend is waking up</strong> — Render free tier sleeps after inactivity. First load may take up to 30 seconds. Please wait or refresh.</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee, department, designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>
          <select
            value={filters.department}
            onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-650 font-semibold"
          >
            <option value="">Department</option>
            {groupOptions.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select
            value={filters.manager}
            onChange={(e) => setFilters((f) => ({ ...f, manager: e.target.value }))}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-650 font-semibold"
          >
            <option value="">Reporting Manager</option>
            {managerOptions.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={filters.city}
            onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-650 font-semibold"
          >
            <option value="">Location</option>
            {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={resetFilters}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-all"
          >
            Reset Filters
          </button>
          <div className="text-xs text-slate-400 font-medium ml-auto">
            <span className="text-slate-700 font-bold">{filteredEmployees.length}</span> of{' '}
            <span className="text-slate-700 font-bold">{emps.length}</span> employees
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm grid grid-cols-1 lg:grid-cols-[26%_1fr_28%] min-h-[600px] overflow-hidden">
        {/* Tree */}
        <div className="border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col min-h-0">
          <div className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-200">
            Organization Tree
          </div>
          <div className="flex-1 overflow-y-auto max-h-[600px]">
            {isLoading && (
              <div className="p-3 space-y-2">
                {[...Array(10)].map((_, i) => <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />)}
              </div>
            )}
            {!isLoading && tree.map((row) => {
              if (row.kind === 'group' || row.kind === 'city') {
                return (
                  <div
                    key={row.key}
                    onClick={row.onToggle}
                    className={`flex items-center gap-2 h-8 px-2.5 cursor-pointer hover:bg-slate-50 transition-colors ${row.kind === 'group' ? 'font-semibold' : ''}`}
                    style={{ paddingLeft: row.kind === 'city' ? 28 : 10 }}
                  >
                    <ChevronRight size={12} className={`text-slate-400 shrink-0 transition-transform ${row.expanded ? 'rotate-90' : ''}`} />
                    <span className="flex-1 text-sm truncate">{row.name}</span>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{row.count}</span>
                  </div>
                );
              }
              const isSelected = selection.type === 'employee' && selection.id === row.emp.id;
              return (
                <div
                  key={row.key}
                  onClick={() => setSelection({ type: 'employee', id: row.emp.id })}
                  style={{ paddingLeft: row.indent }}
                  className={`flex items-center gap-2 h-8 pr-2.5 cursor-pointer transition-colors border-l-2 ${
                    isSelected ? 'bg-indigo-50 border-indigo-500' : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {initialsOf(row.emp.full_name)}
                  </span>
                  <span className="text-xs truncate">{row.emp.full_name}</span>
                </div>
              );
            })}
            {!isLoading && tree.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400">No employees match these filters.</div>
            )}
          </div>
        </div>

        {/* Chain + direct reports */}
        <div className="flex flex-col items-center p-6 overflow-y-auto max-h-[600px]">
          {!selectedEmployee && (
            <div className="flex flex-col items-center gap-3 mt-24 text-slate-400">
              <Users2 size={48} className="text-slate-300" />
              <span className="text-sm text-center max-w-[240px]">
                Select an employee to explore reporting hierarchy and team ownership.
              </span>
            </div>
          )}
          {selectedEmployee && (
            <div className="w-full max-w-md flex flex-col items-center gap-2">
              {chain.map((node, i) => (
                <React.Fragment key={node.id}>
                  <div
                    onClick={() => focusEmployee(node.id)}
                    className={`w-full bg-white border rounded-xl px-3.5 py-2.5 flex items-center gap-3 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      node.id === selectedEmployee.id ? 'border-indigo-500 shadow-md ring-2 ring-indigo-100' : 'border-slate-200 shadow-sm'
                    }`}
                  >
                    <span className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 text-[13px] font-bold flex items-center justify-center shrink-0">
                      {initialsOf(node.full_name)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{node.full_name}</div>
                      <div className="text-xs text-slate-500 truncate">{node.designation}</div>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full shrink-0">
                      {node.group_name}
                    </span>
                  </div>
                  {i < chain.length - 1 && <div className="w-0.5 h-5 bg-slate-200" />}
                </React.Fragment>
              ))}

              {directReports.length > 0 && (
                <div className="w-full mt-6">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 text-center mb-2.5">
                    Direct Reports ({directReports.length})
                  </div>
                  <div className="flex flex-wrap gap-2.5 justify-center">
                    {directReports.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => focusEmployee(r.id)}
                        className="w-[180px] bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-2.5 cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all"
                      >
                        <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {initialsOf(r.full_name)}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{r.full_name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{r.designation}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="border-t lg:border-t-0 lg:border-l border-slate-200 p-5 overflow-y-auto max-h-[600px]">
          {!selectedEmployee && !selectedDepartment && (
            <div className="text-xs text-slate-400 text-center mt-10">Select an employee or department to see details.</div>
          )}
          {selectedDepartment && (
            <div className="space-y-3.5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Department</div>
              <div className="text-lg font-extrabold text-slate-900">{selectedDepartment.name}</div>
              <div className="text-xs text-slate-500">Head: <span className="font-semibold text-slate-700">{selectedDepartment.head_name || '—'}</span></div>
              <div className="h-px bg-slate-100" />
              <div className="text-xs flex justify-between"><span className="text-slate-500">Total Employees</span><strong>{selectedDepartment.headcount}</strong></div>
              {selectedDepartment.head_id && (
                <button
                  onClick={() => focusEmployee(selectedDepartment.head_id)}
                  className="w-full text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg py-2 transition-all"
                >
                  View Department Head
                </button>
              )}
            </div>
          )}
          {selectedEmployee && (
            <div className="space-y-3.5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Employee</div>
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-full bg-slate-200 text-slate-700 text-base font-bold flex items-center justify-center shrink-0">
                  {initialsOf(selectedEmployee.full_name)}
                </span>
                <div className="min-w-0">
                  <div className="text-base font-bold truncate">{selectedEmployee.full_name}</div>
                  <div className="text-xs text-slate-500 truncate">{selectedEmployee.designation}</div>
                </div>
              </div>
              {selectedEmployee.department_name && (
                <span className="inline-block text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full w-fit">
                  {selectedEmployee.department_name}
                </span>
              )}
              {selectedEmployee.manager_id && (
                <div className="text-xs text-slate-500">
                  Reports to{' '}
                  <button
                    onClick={() => focusEmployee(selectedEmployee.manager_id)}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    {selectedEmployee.manager_name}
                  </button>
                </div>
              )}
              {selectedEmployee.email && (
                <a
                  href={`mailto:${selectedEmployee.email}`}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:underline w-fit"
                >
                  <Mail size={12} /> {selectedEmployee.email}
                </a>
              )}
              <div className="h-px bg-slate-100" />
              <div className="text-xs flex justify-between"><span className="text-slate-500">Direct Reports</span><strong>{directReports.length}</strong></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
