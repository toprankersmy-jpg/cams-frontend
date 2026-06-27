import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyNotifications, markAllRead, markNotificationRead } from '../api';
import { Bell, CheckCheck, Check } from 'lucide-react';

const groupByDate = (notifications) => {
  const groups = {};
  notifications.forEach((n) => {
    const d = new Date(n.created_at || n.createdAt);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    let label;
    if (d.toDateString() === today.toDateString()) label = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else label = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });
  return groups;
};

const SkeletonRow = () => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4 animate-pulse">
    <div className="w-3 h-3 rounded-full bg-slate-100 mt-1 shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-slate-100 rounded w-3/4" />
      <div className="h-3 bg-slate-100 rounded w-1/4" />
    </div>
  </div>
);

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: getMyNotifications,
    retry: 1,
  });

  const notifList = Array.isArray(notifications) ? notifications : (notifications?.notifications || notifications?.data || []);
  const hasUnread = notifList.some((n) => !n.is_read && !n.isRead);

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    },
  });

  const grouped = groupByDate(notifList);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">Your activity updates and task alerts</p>
        </div>
        {hasUnread && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            <CheckCheck size={16} />
            {markAllMutation.isPending ? 'Marking...' : 'Mark all as read'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl flex items-center gap-3">
          <span className="text-lg">⏳</span>
          <span><strong>Backend is waking up</strong> — Render free tier sleeps after inactivity. First load may take up to 30 seconds. Please wait or refresh.</span>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

      {!isLoading && notifList.length === 0 && (
        <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
          <Bell size={40} className="text-slate-300" />
          <span className="text-sm font-medium">You're all caught up</span>
          <span className="text-xs">No notifications yet</span>
        </div>
      )}

      {!isLoading && Object.entries(grouped).map(([dateLabel, items]) => (
        <div key={dateLabel} className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{dateLabel}</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          {items.map((n) => {
            const id = n._id || n.id || '';
            const isRead = n.is_read || n.isRead;
            return (
              <div
                key={id}
                className={`bg-white border rounded-xl p-4 flex items-start gap-4 shadow-sm transition-all ${isRead ? 'border-slate-100 opacity-70' : 'border-slate-200'}`}
              >
                <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${isRead ? 'bg-slate-200' : 'bg-indigo-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-relaxed ${isRead ? 'text-slate-500 font-normal' : 'text-slate-800 font-semibold'}`}>
                    {n.message}
                  </p>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {new Date(n.created_at || n.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {!isRead && (
                  <button
                    onClick={() => markOneMutation.mutate(id)}
                    disabled={markOneMutation.isPending}
                    className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    <Check size={12} /> Mark read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
