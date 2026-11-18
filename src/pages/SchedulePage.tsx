import { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Video,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import {
  cancelSession,
  completeSession,
  updateSessionResponse,
} from '../services/firestoreService';
import { StudySession } from '../types';
import { AppShell } from '../components/layout/AppShell';
import { CreateSessionModal } from '../components/modals/CreateSessionModal';

type CalendarView = 'month' | 'week' | 'day';

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function SchedulePage() {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const {
    peers,
    usersById,
    sessions,
    notifications,
    totalUnreadMessages,
    unreadNotificationsCount,
  } = useWorkspaceData();

  const [view, setView] = useState<CalendarView>('month');
  const [cursorDate, setCursorDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<StudySession | null>(null);

  const monthDays = useMemo(() => {
    const year = cursorDate.getFullYear();
    const month = cursorDate.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = first.getDay();
    const gridStart = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, idx) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + idx);
      return d;
    });
  }, [cursorDate]);

  const weekDays = useMemo(() => {
    const d = new Date(cursorDate);
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(start);
      x.setDate(start.getDate() + i);
      return x;
    });
  }, [cursorDate]);

  const activeSessions = useMemo(
    () => sessions.filter((s) => s.status !== 'cancelled'),
    [sessions]
  );

  const sessionsForDate = (dt: Date) =>
    activeSessions.filter((s) => isSameDay(s.startTime.toDate(), dt));

  const displayedList = useMemo(() => {
    if (view === 'day') return sessionsForDate(cursorDate);
    if (view === 'week') {
      const start = weekDays[0];
      const end = new Date(weekDays[6]);
      end.setHours(23, 59, 59, 999);
      return activeSessions.filter((s) => {
        const dt = s.startTime.toDate();
        return dt >= start && dt <= end;
      });
    }
    return sessionsForDate(selectedDate);
  }, [view, cursorDate, selectedDate, weekDays, activeSessions]);

  const shiftCursor = (dir: -1 | 1) => {
    const next = new Date(cursorDate);
    if (view === 'month') next.setMonth(next.getMonth() + dir);
    else if (view === 'week') next.setDate(next.getDate() + dir * 7);
    else next.setDate(next.getDate() + dir);
    setCursorDate(next);
    setSelectedDate(next);
  };

  const handleRespond = async (s: StudySession, resp: 'accepted' | 'declined') => {
    if (!userProfile) return;
    try {
      await updateSessionResponse(s, userProfile.uid, resp);
      showToast(resp === 'accepted' ? 'Session accepted' : 'Session declined', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  const handleComplete = async (s: StudySession) => {
    if (!userProfile) return;
    try {
      await completeSession(s, userProfile.uid);
      showToast('Session marked completed!', 'success', 'Study hours & streak updated.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to complete', 'error');
    }
  };

  const handleCancel = async (s: StudySession) => {
    try {
      await cancelSession(s.id);
      showToast('Session cancelled', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to cancel', 'error');
    }
  };

  return (
    <AppShell
      pageTitle="Schedule"
      unreadMessages={totalUnreadMessages}
      unreadNotifications={unreadNotificationsCount}
      notifications={notifications}
    >
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-2xl font-bold">
              {cursorDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftCursor(-1)}
                aria-label="Previous period"
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCursorDate(now);
                  setSelectedDate(now);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => shiftCursor(1)}
                aria-label="Next period"
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800">
              {(['month', 'week', 'day'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    view === v
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setRescheduleTarget(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Schedule Session
            </button>
          </div>
        </div>

        {/* Calendar Surface */}
        {view === 'month' && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center py-2.5 text-xs font-semibold text-slate-500">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthDays.map((day, idx) => {
                const inMonth = day.getMonth() === cursorDate.getMonth();
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);
                const daySessions = sessionsForDate(day);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className={`min-h-[84px] sm:min-h-[104px] p-2 border-b border-r border-slate-100 dark:border-slate-800/80 text-left flex flex-col justify-between transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    } ${!inMonth ? 'opacity-45' : ''}`}
                  >
                    <span
                      className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold tabular-nums ${
                        isToday
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {day.getDate()}
                    </span>

                    <div className="space-y-1 mt-1 w-full">
                      {daySessions.slice(0, 2).map((s) => (
                        <div
                          key={s.id}
                          className="truncate px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 text-[10px] font-medium"
                        >
                          {s.startTime.toDate().toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}{' '}
                          {s.title}
                        </div>
                      ))}
                      {daySessions.length > 2 && (
                        <span className="text-[10px] font-medium text-slate-400">
                          +{daySessions.length - 2} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === 'week' && (
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
            {weekDays.map((day) => {
              const daySessions = sessionsForDate(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={`rounded-2xl border p-3.5 min-h-[180px] bg-white dark:bg-slate-900 ${
                    isToday
                      ? 'border-indigo-500'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-500">
                    {day.toLocaleDateString(undefined, { weekday: 'short' })}
                  </p>
                  <p className="font-display text-lg font-bold tabular-nums mb-3">
                    {day.getDate()}
                  </p>
                  <div className="space-y-2">
                    {daySessions.length === 0 ? (
                      <p className="text-xs text-slate-400">Free</p>
                    ) : (
                      daySessions.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-xl bg-indigo-50 dark:bg-indigo-950/50 p-2 text-xs"
                        >
                          <p className="font-semibold text-indigo-900 dark:text-indigo-200 truncate">
                            {s.title}
                          </p>
                          <p className="text-[11px] text-indigo-700 dark:text-indigo-400 tabular-nums">
                            {s.startTime.toDate().toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Day / Period Session Agenda */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold">
              {view === 'week'
                ? 'Sessions This Week'
                : `Sessions for ${
                    view === 'day'
                      ? cursorDate.toLocaleDateString(undefined, {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        })
                      : selectedDate.toLocaleDateString(undefined, {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        })
                  }`}
            </h3>
            <span className="text-xs text-slate-500 tabular-nums">
              {displayedList.length} session{displayedList.length === 1 ? '' : 's'}
            </span>
          </div>

          {displayedList.length === 0 ? (
            <div className="py-10 text-center">
              <CalendarIcon className="h-9 w-9 text-slate-300 dark:text-slate-600 mx-auto mb-2.5" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No sessions scheduled for this {view === 'week' ? 'week' : 'day'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setRescheduleTarget(null);
                  setModalOpen(true);
                }}
                className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
              >
                Book Study Slot
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedList.map((sess) => {
                const start = sess.startTime.toDate();
                const myResp = userProfile ? sess.participantResponses?.[userProfile.uid] : 'accepted';
                const partnerNames = sess.participantIds
                  .filter((id) => id !== userProfile?.uid)
                  .map((id) => usersById[id]?.fullName || 'Partner');

                return (
                  <div
                    key={sess.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                          <Clock className="h-3.5 w-3.5" />
                          {start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                          at {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{sess.durationMinutes} min</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize font-medium">{sess.status}</span>
                      </div>

                      <h4 className="font-display font-bold text-base">{sess.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {sess.subject}
                        {partnerNames.length > 0 ? ` · With ${partnerNames.join(', ')}` : ' · Solo'}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                        {sess.mode === 'online' ? (
                          <Video className="h-3.5 w-3.5 text-teal-600" />
                        ) : (
                          <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                        )}
                        <span className="truncate">{sess.locationOrLink}</span>
                      </p>
                      {sess.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                          Notes: {sess.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {myResp === 'pending' && sess.status !== 'completed' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRespond(sess, 'accepted')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespond(sess, 'declined')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <X className="h-3.5 w-3.5" />
                            Decline
                          </button>
                        </>
                      )}

                      {sess.status !== 'completed' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleComplete(sess)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100"
                          >
                            Mark Completed
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleTarget(sess);
                              setModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Reschedule
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancel(sess)}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <CreateSessionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        partners={peers}
        existingSessions={sessions}
        reschedulingSession={rescheduleTarget}
      />
    </AppShell>
  );
}
