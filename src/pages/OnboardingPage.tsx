import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, Loader2, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { createOrUpdateUserProfile, uploadMediaFile } from '../services/firestoreService';
import { seedUserStarterWorkspace } from '../services/seedData';
import { StudyMode, StudyStyle } from '../types';
import {
  DAYS_OF_WEEK,
  STUDY_GOALS,
  SUBJECT_CATALOG,
  TIME_BLOCKS,
  YEAR_OPTIONS,
} from '../utils/matching';
import { Avatar } from '../components/common/Avatar';

export function OnboardingPage() {
  const { firebaseUser, currentUid, userProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [fullName, setFullName] = useState(
    userProfile?.fullName || firebaseUser?.displayName || ''
  );
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatarUrl || firebaseUser?.photoURL || '');
  const [university, setUniversity] = useState(userProfile?.university || '');
  const [course, setCourse] = useState(userProfile?.course || '');
  const [year, setYear] = useState(userProfile?.year || YEAR_OPTIONS[1]);
  const [bio, setBio] = useState(userProfile?.bio || '');

  // Step 2
  const [subjects, setSubjects] = useState<string[]>(
    userProfile?.subjects?.length ? userProfile.subjects : ['Data Structures & Algorithms']
  );
  const [strengths, setStrengths] = useState<string[]>(userProfile?.strengths || []);
  const [weaknesses, setWeaknesses] = useState<string[]>(userProfile?.weaknesses || []);
  const [customSubject, setCustomSubject] = useState('');

  // Step 3
  const [availabilitySlots, setAvailabilitySlots] = useState<string[]>(
    userProfile?.availabilitySlots?.length
      ? userProfile.availabilitySlots
      : ['Mon-Evening', 'Wed-Evening', 'Sat-Morning']
  );
  const [studyStyle, setStudyStyle] = useState<StudyStyle>(
    userProfile?.studyStyle || 'collaborative'
  );
  const [studyMode, setStudyMode] = useState<StudyMode>(userProfile?.studyMode || 'hybrid');
  const [goals, setGoals] = useState<string[]>(
    userProfile?.goals?.length ? userProfile.goals : ['Exam Prep', 'Weekly Problem Sets']
  );

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUid) return;
    try {
      const uploaded = await uploadMediaFile(file, `avatars/${currentUid}_${Date.now()}`);
      setAvatarUrl(uploaded.url);
      showToast('Profile photo ready', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load image', 'error');
    }
  };

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const addCustomSubject = () => {
    const trimmed = customSubject.trim();
    if (!trimmed) return;
    if (!subjects.includes(trimmed)) setSubjects([...subjects, trimmed]);
    setCustomSubject('');
  };

  const handleFinish = async () => {
    if (!currentUid) return;
    setSaving(true);
    try {
      await createOrUpdateUserProfile(currentUid, {
        fullName: fullName.trim() || 'Student',
        avatarUrl,
        university: university.trim() || 'State University',
        course: course.trim() || 'General Studies',
        year,
        bio: bio.trim(),
        subjects,
        strengths,
        weaknesses,
        availabilitySlots,
        studyStyle,
        studyMode,
        goals,
        visibility: 'public',
        onboardingCompleted: true,
      });

      await seedUserStarterWorkspace(currentUid, fullName.trim() || 'Student');
      showToast('Welcome to StudyMate!', 'success', 'Your matches and starter workspace are ready.');
      navigate('/dashboard');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5 font-display text-xl font-bold">
            <span className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </span>
            StudyMate Setup
          </div>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 tabular-nums">
            Step {step} of 3
          </span>
        </div>

        {/* Stepper Bar */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          {[
            { num: 1, label: 'Academic Profile' },
            { num: 2, label: 'Subjects & Focus' },
            { num: 3, label: 'Schedule & Style' },
          ].map((item) => (
            <div key={item.num} className="space-y-1.5">
              <div
                className={`h-2 rounded-full transition-colors ${
                  step >= item.num ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
              <p
                className={`text-xs font-medium ${
                  step >= item.num
                    ? 'text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {item.num}. {item.label}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-2xl font-bold">Tell peers about your studies</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  This appears on your StudyMate partner card.
                </p>
              </div>

              <div className="flex items-center gap-5">
                <Avatar src={avatarUrl} name={fullName || 'Student'} size="xl" />
                <div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <Upload className="h-4 w-4" />
                    Upload photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    Optional · JPG or PNG
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Full name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jordan Taylor"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">University / School</label>
                  <input
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="e.g. UC Berkeley"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Course / Major</label>
                  <input
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Academic year</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <label className="block text-sm font-medium mb-1.5">Short study bio</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share what you're focusing on this semester and what makes a great session for you..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold">Pick your subjects & strengths</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  We pair students studying the same courses and balance strengths with weak areas.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Subjects I am studying</label>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set([...SUBJECT_CATALOG, ...subjects])).map((subj) => {
                    const active = subjects.includes(subj);
                    return (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => toggleItem(subjects, setSubjects, subj)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                          active
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                        }`}
                      >
                        {subj}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSubject())}
                    placeholder="Add another course or subject..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={addCustomSubject}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  My strong subjects (can help peers with)
                </label>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((subj) => {
                    const active = strengths.includes(subj);
                    return (
                      <button
                        key={`str_${subj}`}
                        type="button"
                        onClick={() => toggleItem(strengths, setStrengths, subj)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                          active
                            ? 'border-teal-600 bg-teal-600 text-white'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {subj}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Areas I want extra help with
                </label>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((subj) => {
                    const active = weaknesses.includes(subj);
                    return (
                      <button
                        key={`weak_${subj}`}
                        type="button"
                        onClick={() => toggleItem(weaknesses, setWeaknesses, subj)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                          active
                            ? 'border-amber-600 bg-amber-600 text-white'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {subj}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold">Availability & study style</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Select when you are typically free so partners can book overlapping sessions.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Weekly availability grid</label>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 text-left text-slate-500 font-medium">Time</th>
                        {DAYS_OF_WEEK.map((d) => (
                          <th key={d} className="p-2 text-center font-semibold text-slate-700 dark:text-slate-300">
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TIME_BLOCKS.map((block) => (
                        <tr key={block.id} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="p-2 text-slate-600 dark:text-slate-400 whitespace-nowrap font-medium">
                            {block.id}
                          </td>
                          {DAYS_OF_WEEK.map((day) => {
                            const key = `${day}-${block.id}`;
                            const active = availabilitySlots.includes(key);
                            return (
                              <td key={key} className="p-1 text-center">
                                <button
                                  type="button"
                                  aria-label={`${day} ${block.label}`}
                                  aria-pressed={active}
                                  onClick={() =>
                                    toggleItem(availabilitySlots, setAvailabilitySlots, key)
                                  }
                                  className={`w-full h-9 rounded-lg border text-xs font-medium transition-colors flex items-center justify-center ${
                                    active
                                      ? 'border-indigo-600 bg-indigo-600 text-white'
                                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Study style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: 'quiet', label: 'Quiet Co-working' },
                        { id: 'collaborative', label: 'Collaborative' },
                        { id: 'discussion', label: 'Active Discussion' },
                        { id: 'pomodoro', label: 'Pomodoro Sprints' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStudyStyle(opt.id)}
                        className={`px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                          studyStyle === opt.id
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Preferred setting</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['online', 'in-person', 'hybrid'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setStudyMode(m)}
                        className={`px-3 py-2 rounded-xl border text-xs font-medium capitalize transition-colors ${
                          studyMode === m
                            ? 'border-teal-600 bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Primary goals</label>
                <div className="flex flex-wrap gap-2">
                  {STUDY_GOALS.map((g) => {
                    const active = goals.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleItem(goals, setGoals, g)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                          active
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleFinish}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-60 transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Finish & Enter Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
