import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { msalInstance, loginRequest } from '../auth/msalConfig';
import { Briefcase, LogIn, AlertCircle, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMicrosoftSignIn = async () => {
    setError('');
    setLoading(true);
    let idToken = null;

    try {
      const loginResult = await msalInstance.loginPopup(loginRequest);
      idToken = loginResult.idToken;
    } catch (err) {
      console.error('MSAL login error:', err);
      setError('Microsoft login failed or was cancelled.');
      setLoading(false);
      return;
    }

    try {
      await login(idToken);
      navigate('/dashboard');
    } catch (err) {
      console.error('CAMS profile registration check error:', err);
      const serverError = err.response?.data?.error;
      if (serverError) {
        setError(serverError);
      } else {
        setError('Your Microsoft account is not registered in CAMS. Please contact your administrator.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill credentials helper for development & demonstration
  const handleQuickLogin = async (presetRole) => {
    setLoading(true);
    setError('');
    const fakeToken = `mock-token-${presetRole}`;
    try {
      await login(fakeToken);
      navigate('/dashboard');
    } catch (err) {
      setError('Mock login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex bg-indigo-600 p-3 rounded-2xl text-white shadow-lg mb-3">
            <Briefcase size={28} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Centre Activity Management System</h2>
          <p className="text-sm text-slate-500 mt-1">CAMS Admin Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
          <div className="space-y-1 text-center">
            <h3 className="text-lg font-bold text-slate-800">Sign in</h3>
            <p className="text-xs text-slate-400">Single Sign-On Authentication</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleMicrosoftSignIn}
              disabled={loading}
              className="w-full bg-[#4F46E5] hover:bg-indigo-700 active:bg-indigo-850 disabled:bg-indigo-400 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow cursor-pointer flex items-center justify-center gap-2 text-sm"
            >
              <LogIn size={18} />
              <span>{loading ? 'Connecting...' : 'Sign in with Microsoft'}</span>
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-400 font-medium leading-relaxed block">
              Access restricted to TopRankers organisation accounts only
            </span>
          </div>
        </div>

        {/* Developer Sandbox Panel */}
        <div className="mt-6 bg-slate-100 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-700">
            <ShieldAlert size={16} className="text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Developer Preset Bypass</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Select a CAMS role to mock login immediately, simulating the view permissions and menu setups.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {[
              'admin',
              'hq_executive',
              'hq_manager',
              'rm',
              'centre_head',
              'centre_executive',
              'leadership',
            ].map((rolePreset) => (
              <button
                key={rolePreset}
                type="button"
                onClick={() => handleQuickLogin(rolePreset)}
                className="px-2 py-1.5 bg-white border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 rounded-lg text-[10px] font-bold text-slate-600 transition-all text-left uppercase truncate cursor-pointer"
              >
                {rolePreset.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-[11px] text-slate-400 mb-2 leading-normal">
              First visit today? The server may be sleeping. Wake it first:
            </p>
            <a
              href="https://cams-backend-t529.onrender.com/api/health"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer"
            >
              <span>🚀</span>
              <span>Ping Backend to Wake It Up</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
