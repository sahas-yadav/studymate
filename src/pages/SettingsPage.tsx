import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2, Moon, Sun, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import { mapAuthErrorMessage } from '../services/firebase';
import { createOrUpdateUserProfile, savePrivateUserInfo } from '../services/firestoreService';
import { NotificationPrefs, PrivacyPrefs, ProfileVisibility } from '../types';
import { AppShell } from '../components/layout/AppShell';

export function SettingsPage() {
  const { firebaseUser, currentUid, userProfile, privateInfo, changePassword, deleteAccount } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const { notifications, totalUnreadMessages, unreadNotificationsCount } = useWorkspaceData();

  const [visibility, setVisibility] = useState<ProfileVisibility>(
    userProfile?.visibility || 'public'
  );
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    sessionReminders: true,
    messageAlerts: true,
    connectionRequests: true,
    emailDigest: false,
  });
  const [privacyPrefs, setPrivacyPrefs] = useState<PrivacyPrefs>({
    showOnlineStatus: true,
    allowGroupInvites: true,
  });

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (userProfile) setVisibility(userProfile.visibility);
  }, [userProfile?.visibility]);

  useEffect(() => {
    if (privateInfo) {
      setNotifPrefs(privateInfo.notificationPrefs);
      setPrivacyPrefs(privateInfo.privacyPrefs);
    }
  }, [privateInfo]);

  const handleSavePrefs = async () => {
    if (!currentUid) return;
    try {
      await createOrUpdateUserProfile(currentUid, { visibility });
      await savePrivateUserInfo(
        currentUid,
        firebaseUser?.email || privateInfo?.email || '',
        notifPrefs,
        privacyPrefs
      );
      showToast('Settings updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save settings', 'error');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) {
      showToast('New password must be at least 8 characters', 'error');
      return;
    }
    setPwLoading(true);
    try {
      await changePassword(currentPw, newPw);
      setCurrentPw('');
      setNewPw('');
      showToast('Password changed successfully', 'success');
    } catch (err) {
      showToast(mapAuthErrorMessage(err), 'error');
    } finally {
      setPwLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount(deletePw || undefined);
      showToast('Account deleted', 'info');
      navigate('/');
    } catch (err) {
      showToast(mapAuthErrorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const isPasswordUser =
    !firebaseUser || firebaseUser.providerData.some((p) => p.providerId === 'password');

  return (
    <AppShell
      pageTitle="Settings"
      unreadMessages={totalUnreadMessages}
      unreadNotifications={unreadNotificationsCount}
      notifications={notifications}
    >
      <div className="max-w-3xl space-y-6">
        {/* Appearance */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="font-display text-lg font-bold">Appearance</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Switch between light and dark workspace themes.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 max-w-sm">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-colors ${
                theme === 'light'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Sun className="h-4 w-4" />
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-colors ${
                theme === 'dark'
                  ? 'border-indigo-500 bg-indigo-950/60 text-indigo-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Moon className="h-4 w-4" />
              Dark
            </button>
          </div>
        </section>

        {/* Privacy & Notifications */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold">Privacy & Notifications</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Control who can discover your academic profile and which alerts you receive.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Profile visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as ProfileVisibility)}
              className="w-full max-w-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            >
              <option value="public">Public (appear in Find Partners search)</option>
              <option value="connections">Connections only</option>
              <option value="private">Private (hidden from discovery)</option>
            </select>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {(
              [
                { key: 'sessionReminders', label: '30-minute study session reminders' },
                { key: 'messageAlerts', label: 'Real-time message notifications' },
                { key: 'connectionRequests', label: 'New partner connection requests' },
                { key: 'emailDigest', label: 'Weekly study summary digest' },
              ] as const
            ).map((item) => (
              <label key={item.key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                <input
                  type="checkbox"
                  checked={notifPrefs[item.key]}
                  onChange={(e) =>
                    setNotifPrefs((prev) => ({ ...prev, [item.key]: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            ))}

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Show online presence status to partners
              </span>
              <input
                type="checkbox"
                checked={privacyPrefs.showOnlineStatus}
                onChange={(e) =>
                  setPrivacyPrefs((prev) => ({ ...prev, showOnlineStatus: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleSavePrefs}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Save Preferences
          </button>
        </section>

        {/* Change Password (Email/Password users) */}
        {isPasswordUser && (
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="font-display text-lg font-bold">Change Password</h2>
            <form onSubmit={handlePasswordChange} className="mt-4 space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium mb-1">Current password</label>
                <input
                  type="password"
                  required
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">New password</label>
                <input
                  type="password"
                  required
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={pwLoading}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-2"
              >
                {pwLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Password
              </button>
            </form>
          </section>
        )}

        {/* Danger Zone: Delete Account */}
        <section className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 p-6">
          <h2 className="font-display text-lg font-bold text-rose-600 dark:text-rose-400">
            Delete Account
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Permanently remove your StudyMate profile and account credentials. This cannot be undone.
          </p>

          {!confirmDeleteOpen ? (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700"
            >
              <Trash2 className="h-4 w-4" />
              Delete My Account
            </button>
          ) : (
            <div className="mt-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-4 space-y-3">
              <div className="flex items-start gap-2 text-xs text-rose-800 dark:text-rose-200">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Are you sure? Your profile and private preferences will be erased.</span>
              </div>
              {isPasswordUser && (
                <input
                  type="password"
                  value={deletePw}
                  onChange={(e) => setDeletePw(e.target.value)}
                  placeholder="Enter password to confirm"
                  className="w-full max-w-xs px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-sm"
                />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-60"
                >
                  {deleting ? 'Deleting...' : 'Confirm Permanent Deletion'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
