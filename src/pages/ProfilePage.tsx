import React, { useEffect, useState } from 'react';
import { Check, Loader2, Star, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import {
  createOrUpdateUserProfile,
  subscribeUserReviews,
  uploadMediaFile,
} from '../services/firestoreService';
import { PartnerReview, StudyMode, StudyStyle } from '../types';
import {
  DAYS_OF_WEEK,
  STUDY_GOALS,
  SUBJECT_CATALOG,
  TIME_BLOCKS,
  YEAR_OPTIONS,
  formatRelativeTime,
} from '../utils/matching';
import { Avatar } from '../components/common/Avatar';
import { AppShell } from '../components/layout/AppShell';

export function ProfilePage() {
  const { currentUid, userProfile } = useAuth();
  const { showToast } = useToast();
  const { notifications, totalUnreadMessages, unreadNotificationsCount } = useWorkspaceData();

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [university, setUniversity] = useState('');
  const [course, setCourse] = useState('');
  const [year, setYear] = useState(YEAR_OPTIONS[0]);
  const [bio, setBio] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<string[]>([]);
  const [studyStyle, setStudyStyle] = useState<StudyStyle>('collaborative');
  const [studyMode, setStudyMode] = useState<StudyMode>('hybrid');
  const [goals, setGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [reviews, setReviews] = useState<PartnerReview[]>([]);

  useEffect(() => {
    if (!userProfile) return;
    setFullName(userProfile.fullName || '');
    setAvatarUrl(userProfile.avatarUrl || '');
    setUniversity(userProfile.university || '');
    setCourse(userProfile.course || '');
    setYear(userProfile.year || YEAR_OPTIONS[0]);
    setBio(userProfile.bio || '');
    setSubjects(userProfile.subjects || []);
    setStrengths(userProfile.strengths || []);
    setWeaknesses(userProfile.weaknesses || []);
    setAvailabilitySlots(userProfile.availabilitySlots || []);
    setStudyStyle(userProfile.studyStyle || 'collaborative');
    setStudyMode(userProfile.studyMode || 'hybrid');
    setGoals(userProfile.goals || []);

    const unsub = subscribeUserReviews(userProfile.uid, setReviews);
    return () => unsub();
  }, [userProfile]);

  const toggleItem = (arr: string[], setter: (v: string[]) => void, item: string) => {
    setter(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUid) return;
    try {
      const uploaded = await uploadMediaFile(file, `avatars/${currentUid}_${Date.now()}`);
      setAvatarUrl(uploaded.url);
      showToast('Avatar updated — click Save Changes to apply', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid) return;
    setSaving(true);
    try {
      await createOrUpdateUserProfile(currentUid, {
        fullName,
        avatarUrl,
        university,
        course,
        year,
        bio,
        subjects,
        strengths,
        weaknesses,
        availabilitySlots,
        studyStyle,
        studyMode,
        goals,
      });
      showToast('Profile saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      pageTitle="My Profile"
      unreadMessages={totalUnreadMessages}
      unreadNotifications={unreadNotificationsCount}
      notifications={notifications}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleSave}
          className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <Avatar src={avatarUrl} name={fullName || 'Student'} size="xl" />
              <div>
                <h2 className="font-display text-xl font-bold">{fullName || 'Your Profile'}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {course} · {university}
                </p>
                <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Upload className="h-3.5 w-3.5" />
                  Change photo
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 inline-flex items-center gap-2 self-start sm:self-center"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">University</label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Course / Major</label>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Academic year</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Subjects</label>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set([...SUBJECT_CATALOG, ...subjects])).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleItem(subjects, setSubjects, s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    subjects.includes(s)
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Study style</label>
              <select
                value={studyStyle}
                onChange={(e) => setStudyStyle(e.target.value as StudyStyle)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              >
                <option value="collaborative">Collaborative</option>
                <option value="quiet">Quiet Co-working</option>
                <option value="discussion">Active Discussion</option>
                <option value="pomodoro">Pomodoro Sprints</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Study mode</label>
              <select
                value={studyMode}
                onChange={(e) => setStudyMode(e.target.value as StudyMode)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              >
                <option value="hybrid">Hybrid</option>
                <option value="online">Online</option>
                <option value="in-person">In-person</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Goals</label>
            <div className="flex flex-wrap gap-2">
              {STUDY_GOALS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleItem(goals, setGoals, g)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                    goals.includes(g)
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Weekly availability</label>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-slate-500">Time</th>
                    {DAYS_OF_WEEK.map((d) => (
                      <th key={d} className="p-2 text-center font-semibold">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_BLOCKS.map((block) => (
                    <tr key={block.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="p-2 font-medium text-slate-500">{block.id}</td>
                      {DAYS_OF_WEEK.map((day) => {
                        const key = `${day}-${block.id}`;
                        const active = availabilitySlots.includes(key);
                        return (
                          <td key={key} className="p-1 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                toggleItem(availabilitySlots, setAvailabilitySlots, key)
                              }
                              className={`w-full h-8 rounded-lg border flex items-center justify-center ${
                                active
                                  ? 'border-indigo-600 bg-indigo-600 text-white'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-400'
                              }`}
                            >
                              {active ? <Check className="h-3.5 w-3.5" /> : '—'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </form>

        {/* Partner Reviews Column */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">Partner Reviews</h3>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {(userProfile?.ratingAvg || 5.0).toFixed(1)}
              </span>
            </div>

            {reviews.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No reviews received yet. Complete sessions with partners to build your reputation.
              </p>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{rev.authorName}</span>
                      <span className="text-xs font-semibold text-amber-600 tabular-nums">
                        {rev.rating}.0 ★
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {rev.subject} · {formatRelativeTime(rev.createdAt?.toDate())}
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
                      {rev.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
