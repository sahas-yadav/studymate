import React, { useMemo, useState } from 'react';
import { AlertTriangle, Calendar, Clock, MapPin, Sparkles, Video, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { createStudySession, rescheduleSession } from '../../services/firestoreService';
import { Conversation, StudySession, UserProfile } from '../../types';
import {
  SUBJECT_CATALOG,
  findSessionConflicts,
  formatSlotLabel,
  getNextDateForSlot,
  getOverlappingSlots,
} from '../../utils/matching';
import { Avatar } from '../common/Avatar';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: UserProfile[];
  existingSessions: StudySession[];
  initialPartnerIds?: string[];
  initialConversation?: Conversation;
  reschedulingSession?: StudySession | null;
}

function toLocalDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function CreateSessionModal({
  isOpen,
  onClose,
  partners,
  existingSessions,
  initialPartnerIds = [],
  initialConversation,
  reschedulingSession = null,
}: CreateSessionModalProps) {
  const { userProfile } = useAuth();
  const { showToast } = useToast();

  const defaultStart = useMemo(() => {
    if (reschedulingSession) return reschedulingSession.startTime.toDate();
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    return d;
  }, [reschedulingSession]);

  const [title, setTitle] = useState(reschedulingSession?.title || '');
  const [subject, setSubject] = useState(
    reschedulingSession?.subject || userProfile?.subjects?.[0] || SUBJECT_CATALOG[0]
  );
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>(
    reschedulingSession
      ? reschedulingSession.participantIds.filter((id) => id !== userProfile?.uid)
      : initialPartnerIds
  );
  const [dateTimeStr, setDateTimeStr] = useState(toLocalDateTimeInput(defaultStart));
  const [durationMinutes, setDurationMinutes] = useState<number>(
    reschedulingSession?.durationMinutes || 60
  );
  const [mode, setMode] = useState<'online' | 'in-person'>(reschedulingSession?.mode || 'online');
  const [locationOrLink, setLocationOrLink] = useState(
    reschedulingSession?.locationOrLink || 'https://meet.studymate.app/study-room'
  );
  const [notes, setNotes] = useState(reschedulingSession?.notes || '');
  const [saving, setSaving] = useState(false);

  const selectedPartners = useMemo(
    () => partners.filter((p) => selectedPartnerIds.includes(p.uid)),
    [partners, selectedPartnerIds]
  );

  const overlappingSlots = useMemo(
    () => getOverlappingSlots(userProfile, selectedPartners),
    [userProfile, selectedPartners]
  );

  const parsedStart = useMemo(() => new Date(dateTimeStr), [dateTimeStr]);
  const conflicts = useMemo(() => {
    if (Number.isNaN(parsedStart.getTime())) return [];
    return findSessionConflicts(
      parsedStart,
      durationMinutes,
      existingSessions,
      reschedulingSession?.id
    );
  }, [parsedStart, durationMinutes, existingSessions, reschedulingSession]);

  if (!isOpen || !userProfile) return null;

  const togglePartner = (uid: string) => {
    setSelectedPartnerIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const applyOverlappingSlot = (slotKey: string) => {
    const dt = getNextDateForSlot(slotKey);
    setDateTimeStr(toLocalDateTimeInput(dt));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number.isNaN(parsedStart.getTime())) {
      showToast('Please select a valid date and time', 'error');
      return;
    }

    setSaving(true);
    try {
      if (reschedulingSession) {
        await rescheduleSession(reschedulingSession.id, parsedStart, durationMinutes);
        showToast('Study session rescheduled', 'success');
      } else {
        if (!title.trim()) {
          showToast('Please enter a session title', 'error');
          setSaving(false);
          return;
        }
        await createStudySession({
          title: title.trim(),
          subject,
          creator: userProfile,
          partnerIds: selectedPartnerIds,
          startTime: parsedStart,
          durationMinutes,
          mode,
          locationOrLink,
          notes,
          conversation: initialConversation,
        });
        showToast('Study session scheduled', 'success');
      }
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save session', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 id="session-modal-title" className="font-display text-lg font-bold">
            {reschedulingSession ? 'Reschedule Study Session' : 'Schedule Study Session'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {!reschedulingSession && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Session title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm Graph Algorithms Review"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Subject
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Array.from(new Set([...(userProfile.subjects || []), ...SUBJECT_CATALOG])).map(
                      (s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Study mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('online');
                        if (!locationOrLink.startsWith('http')) {
                          setLocationOrLink('https://meet.studymate.app/study-room');
                        }
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors ${
                        mode === 'online'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Video className="h-4 w-4" />
                      Online
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('in-person');
                        if (locationOrLink.startsWith('http')) {
                          setLocationOrLink('Main Library · Study Room 2B');
                        }
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors ${
                        mode === 'in-person'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <MapPin className="h-4 w-4" />
                      In-person
                    </button>
                  </div>
                </div>
              </div>

              {/* Partner Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Invite partner(s)
                </label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  {partners.length === 0 ? (
                    <span className="text-xs text-slate-500 p-1">
                      Solo study session (connect with partners in Find Partners to invite peers)
                    </span>
                  ) : (
                    partners.map((p) => {
                      const active = selectedPartnerIds.includes(p.uid);
                      return (
                        <button
                          key={p.uid}
                          type="button"
                          onClick={() => togglePartner(p.uid)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                            active
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                          }`}
                        >
                          <Avatar src={p.avatarUrl} name={p.fullName} size="sm" />
                          <span>{p.fullName}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          {/* Overlapping Availability Picker */}
          {overlappingSlots.length > 0 && (
            <div className="rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/60 dark:bg-teal-950/30 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-800 dark:text-teal-300 mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                <span>
                  {selectedPartners.length > 0
                    ? 'Overlapping free slots with selected partners'
                    : 'Your preferred availability slots'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {overlappingSlots.slice(0, 6).map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => applyOverlappingSlot(slot)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-600 hover:text-white transition-colors"
                  >
                    {formatSlotLabel(slot)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Date & Time
                </span>
              </label>
              <input
                type="datetime-local"
                required
                value={dateTimeStr}
                onChange={(e) => setDateTimeStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Duration
                </span>
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes (1 hr)</option>
                <option value={90}>90 minutes (1.5 hrs)</option>
                <option value={120}>120 minutes (2 hrs)</option>
              </select>
            </div>
          </div>

          {/* Conflict Warning */}
          {conflicts.length > 0 && (
            <div
              role="alert"
              className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3.5 flex items-start gap-3"
            >
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-200">
                <p className="font-semibold">Schedule conflict detected</p>
                <p className="mt-0.5">
                  Overlaps with "{conflicts[0].title}" at{' '}
                  {conflicts[0].startTime.toDate().toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  . Choose an overlapping slot above or adjust the time.
                </p>
              </div>
            </div>
          )}

          {!reschedulingSession && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {mode === 'online' ? 'Meeting link' : 'Campus / Study location'}
                </label>
                <input
                  type="text"
                  value={locationOrLink}
                  onChange={(e) => setLocationOrLink(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Agenda or notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Topics to cover, textbook chapters, or prep work..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {saving
                ? 'Saving...'
                : reschedulingSession
                ? 'Confirm Reschedule'
                : 'Send Session Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
