import React, { useState, useEffect } from 'react';

const BACKEND_URL = import.meta.env.VITE_API_URL;

export default function BackendWakeup({ onReady }) {
  const [status, setStatus] = useState('checking');
  const [dots, setDots] = useState('');
  const [attempt, setAttempt] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let timer;
    const ping = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/health`, {
          signal: AbortSignal.timeout(8000),
        });
        if (res.status < 500) {
          setStatus('ready');
          onReady();
          return;
        }
      } catch {
        // still sleeping
      }
      setStatus('sleeping');
      setAttempt((a) => a + 1);
      timer = setTimeout(ping, 5000);
    };
    ping();
    return () => clearTimeout(timer);
  }, [onReady]);

  if (status === 'ready') return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-8 text-center space-y-5">
        <div className="inline-flex bg-amber-50 p-4 rounded-2xl border border-amber-100">
          <span className="text-4xl">⏳</span>
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Waking up the server{dots}
          </h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            CAMS runs on Render's free tier which sleeps after inactivity.
            This takes <strong className="text-slate-700">20–40 seconds</strong> on first load.
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 space-y-2 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Server status</span>
            <span className="font-bold text-amber-600">
              {status === 'checking' ? 'Connecting...' : 'Starting up...'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Ping attempt</span>
            <span className="font-bold text-slate-700">#{attempt}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min((attempt / 12) * 100, 88)}%` }}
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          This overlay disappears automatically when the server responds.
          You don't need to refresh.
        </p>
      </div>
    </div>
  );
}
