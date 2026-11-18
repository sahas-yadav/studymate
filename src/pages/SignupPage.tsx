import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, BookOpen, Check, Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { FIREBASE_PROJECT_ID, mapAuthErrorMessage } from '../services/firebase';
import { evaluatePasswordStrength } from '../utils/matching';

export function SignupPage() {
  const { signupWithEmail, loginWithGoogle, enterDemoMode } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const strength = evaluatePasswordStrength(password);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (fullName.trim().length < 2) errs.fullName = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters long.';
    }
    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    if (!acceptedTerms) {
      errs.terms = 'Please accept the Terms of Service and Honor Code.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await signupWithEmail(fullName, email, password);
      showToast('Account created', 'success', 'Complete your 3-step academic profile.');
      navigate('/onboarding');
    } catch (err) {
      setError(mapAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const { isNewProfile } = await loginWithGoogle();
      showToast('Signed in with Google', 'success');
      navigate(isNewProfile ? '/onboarding' : '/dashboard');
    } catch (err) {
      setError(mapAuthErrorMessage(err));
    } finally {
      setGoogleLoading(false);
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

  const barColors = [
    'bg-slate-200 dark:bg-slate-700',
    'bg-rose-500',
    'bg-amber-500',
    'bg-teal-500',
    'bg-emerald-600',
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Form Pane */}
        <div className="lg:col-span-7 p-6 sm:p-10">
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
              to="/login"
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Already have an account?
            </Link>
          </div>

          <div className="mt-8">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Create your StudyMate account
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
              Join peers in your courses, chat in real time, and stay on track together.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-sm text-rose-800 dark:text-rose-200 flex items-start gap-2.5"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p>{error}</p>
                {error.includes('Authorized domains') && (
                  <a
                    href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-xs font-semibold underline"
                  >
                    Open Firebase Authorized Domains Settings →
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/70 transition-colors disabled:opacity-60"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
              )}
              Sign up with Google
            </button>

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
              Instant Demo Enter
            </button>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span>or create account with email</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="signup-name" className="block text-sm font-medium mb-1.5">
                Full name
              </label>
              <input
                id="signup-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jordan Taylor"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {fieldErrors.fullName && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.fullName}</p>
              )}
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium mb-1.5">
                University or personal email
              </label>
              <input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jordan@university.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
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
              {/* Strength Meter */}
              <div className="mt-2">
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-1.5 rounded-full transition-colors ${
                        strength.score >= step ? barColors[strength.score] : barColors[0]
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Strength: {strength.label}</span>
                  <span>8+ chars · Uppercase · Number · Symbol</span>
                </div>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="signup-confirm" className="block text-sm font-medium mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="signup-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  I agree to the StudyMate Terms of Service and Academic Integrity Guidelines.
                </span>
              </label>
              {fieldErrors.terms && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.terms}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Account & Start Onboarding
            </button>
          </form>
        </div>

        {/* Right Highlight Panel */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between bg-indigo-950 text-white p-8 relative overflow-hidden">
          <img
            src="/src/assets/images/auth_study_workspace_1795013373305.jpg"
            alt="Organized student study workspace by natural daylight"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-950 via-indigo-950/75 to-indigo-950/50" />
          <div className="relative z-10">
            <p className="text-xs font-semibold tracking-wide text-teal-300">
              3-Step Onboarding
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold leading-snug">
              Tailored matches based on how and when you actually study.
            </h2>
          </div>

          <ul className="relative z-10 space-y-4 text-sm text-indigo-100">
            {[
              'Share your subjects, strengths, and exam priorities',
              'Pick your open weekly morning, afternoon, or evening slots',
              'Start chatting with compatible partners immediately',
            ].map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
