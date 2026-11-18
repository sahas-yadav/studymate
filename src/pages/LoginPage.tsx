import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { mapAuthErrorMessage } from '../services/firebase';

export function LoginPage() {
  const { loginWithEmail, enterDemoMode, sendResetEmail } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (resetMode) {
        await sendResetEmail(email);
        setResetSent(true);
        showToast('Password reset email sent', 'success');
      } else {
        await loginWithEmail(email, password, rememberMe);
        showToast('Welcome back!', 'success');
        navigate('/dashboard');
      }
    } catch (err) {
      setError(mapAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setError('');
    setDemoLoading(true);
    try {
      await enterDemoMode();
      showToast('Entered StudyMate workspace', 'success', 'Signed in as Alex Rivera (Demo Student).');
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enter workspace');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Form Left */}
        <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              <span className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <BookOpen className="h-4 w-4" />
              </span>
              StudyMate
            </Link>
            <Link
              to="/signup"
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Create account
            </Link>
          </div>

          <div className="mt-8">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {resetMode ? 'Reset your password' : 'Welcome back'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
              {resetMode
                ? 'Enter your email and we will send you a password reset link.'
                : 'Sign in to check your upcoming sessions, messages, and partner matches.'}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-sm text-rose-800 dark:text-rose-200 flex items-start gap-2.5"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {resetSent && resetMode && (
            <div className="mt-5 rounded-xl border border-teal-200 dark:border-teal-900/70 bg-teal-50 dark:bg-teal-950/40 p-3.5 text-sm text-teal-800 dark:text-teal-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Reset email dispatched! Check your inbox.
            </div>
          )}

          {!resetMode && (
            <div className="mt-6 space-y-2.5">

              <button
                type="button"
                onClick={handleDemo}
                disabled={demoLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-60"
              >
                {demoLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Instant Demo Login (1-Click Enter)
              </button>

              <div className="pt-2 pb-1 flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <span>or log in with email</span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-3">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium mb-1.5">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {!resetMode && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block text-sm font-medium">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetMode(true);
                      setError('');
                    }}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {!resetMode && (
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Remember me on this device
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {resetMode ? 'Send Reset Link' : 'Log in to Dashboard'}
            </button>

            {resetMode && (
              <button
                type="button"
                onClick={() => {
                  setResetMode(false);
                  setResetSent(false);
                  setError('');
                }}
                className="w-full text-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:underline"
              >
                Back to login
              </button>
            )}
          </form>
        </div>

        {/* Right Illustration & Benefits */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between bg-slate-900 text-white p-10 relative overflow-hidden">
          <img
            src="/src/assets/images/auth_study_workspace_1795013373305.jpg"
            alt="Bright study desk workspace"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-indigo-950/50" />

          <div className="relative z-10">
            <p className="text-xs font-semibold text-teal-300">Stay consistent all semester</p>
            <h2 className="mt-2 font-display text-2xl font-bold leading-snug">
              Your peers, notes, and study calendar in one calm workspace.
            </h2>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4 flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-teal-300 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Real-time subject chat</p>
                <p className="text-xs text-slate-200 mt-0.5">
                  Share diagrams, typing status, and propose sessions inline.
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4 flex items-start gap-3">
              <Calendar className="h-5 w-5 text-indigo-300 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Overlap-first scheduling</p>
                <p className="text-xs text-slate-200 mt-0.5">
                  Automatically highlights free blocks shared by both study partners.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
