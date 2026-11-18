import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  Compass,
  Flame,
  MessageSquare,
  Plus,
  Users,
  Video,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import {
  getOrCreateDirectConversation,
  sendConnectionRequest,
} from '../services/firestoreService';
import { ConnectionStatus, StudySession, UserProfile } from '../types';
import { calculateMatchScore, formatRelativeTime } from '../utils/matching';
import { Avatar } from '../components/common/Avatar';
import { DashboardSkeleton } from '../components/common/LoadingSkeleton';
import { AppShell } from '../components/layout/AppShell';
import { CreateGroupModal } from '../components/modals/CreateGroupModal';
import { CreateSessionModal } from '../components/modals/CreateSessionModal';
import { PartnerProfileModal } from '../components/modals/PartnerProfileModal';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function DashboardPage() {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const {
    peers,
    usersById,
    connections,
    connectedPartnerIds,
    conversations,
    sessions,
    notifications,
    totalUnreadMessages,
    unreadNotificationsCount,
    loading,
  } = useWorkspaceData();

  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<StudySession | null>(null);
  const [sessionInitialPartners, setSessionInitialPartners] = useState<string[]>([]);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<UserProfile | null>(null);

  const connectionStatusByUser = useMemo(() => {
    const map: Record<string, ConnectionStatus> = {};
    if (!userProfile) return map;
    connections.forEach((c) => {
      const other = c.participantIds.find((id) => id !== userProfile.uid);
      if (other) map[other] = c.status;
    });
    return map;
  }, [connections, userProfile]);

  const upcomingSessions = useMemo(() => {
    const now = Date.now();
    return sessions
      .filter((s) => s.status !== 'cancelled' && s.status !== 'declined' && s.status !== 'completed')
      .filter((s) => s.startTime.toMillis() >= now - 30 * 60_000)
      .slice(0, 3);
  }, [sessions]);

  const recommendedPartners = useMemo(() => {
    return peers
      .map((peer) => ({
        peer,
        match: calculateMatchScore(userProfile, peer),
      }))
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 4);
  }, [peers, userProfile]);

  const weeklyHours = useMemo(() => {
    const base = userProfile?.weeklyHours?.length === 7 ? userProfile.weeklyHours : [1.5, 2, 1, 2.5, 1.5, 2, 1];
    return base;
  }, [userProfile]);

  const maxDailyHour = Math.max(4, ...weeklyHours);
  const weeklyTotal = weeklyHours.reduce((a, b) => a + b, 0);

  const handleConnect = async (partner: UserProfile) => {
    if (!userProfile) return;
    try {
      await sendConnectionRequest(userProfile, partner);
      showToast(`Connection request sent to ${partner.fullName}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send request', 'error');
    }
  };

  const handleOpenChatWith = async (partner: UserProfile) => {
    if (!userProfile) return;
    const convId = await getOrCreateDirectConversation(userProfile.uid, partner.uid);
    setSelectedPartner(null);
    navigate(`/chat/${convId}`);
  };

  const handleJoinSession = (session: StudySession) => {
    if (session.mode === 'online' && session.locationOrLink.startsWith('http')) {
      showToast(`Joining ${session.title}`, 'info', session.locationOrLink);
    } else {
      showToast(session.title, 'info', `Location: ${session.locationOrLink}`);
    }
  };

  return (
    <AppShell
      pageTitle="Dashboard"
      unreadMessages={totalUnreadMessages}
      unreadNotifications={unreadNotificationsCount}
      notifications={notifications}
    >
      {loading || !userProfile ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Welcome Banner + Quick Actions */}
          <section className="rounded-2xl border border-indigo-200/70 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-100">
                  <Flame className="h-4 w-4 text-teal-300" />
                  <span className="tabular-nums">{userProfile.streakDays || 1}-day study streak</span>
                  <span aria-hidden="true">·</span>
                  <span>{userProfile.course || 'Academic Workspace'}</span>
                </div>
                <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight">
                  Welcome back, {userProfile.fullName.split(' ')[0]}
                </h2>
                <p className="mt-1.5 text-sm text-indigo-100 max-w-xl">
                  You have {upcomingSessions.length} upcoming study session
                  {upcomingSessions.length === 1 ? '' : 's'} and {totalUnreadMessages} unread
                  message{totalUnreadMessages === 1 ? '' : 's'}.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 shrink-0">
                <Link
                  to="/partners"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 text-sm font-semibold hover:bg-indigo-50 transition-colors whitespace-nowrap"
                >
                  <Compass className="h-4 w-4" />
                  Find partner
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setRescheduleTarget(null);
                    setSessionInitialPartners([]);
                    setSessionModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-400 transition-colors whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  Schedule session
                </button>
                <button
                  type="button"
                  onClick={() => setGroupModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 text-white border border-white/25 text-sm font-semibold hover:bg-white/25 transition-colors whitespace-nowrap"
                >
                  <Users className="h-4 w-4" />
                  Create group
                </button>
              </div>
            </div>
          </section>

          {/* Quick Stats */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Sessions completed
              </p>
              <p className="mt-1.5 font-display text-2xl font-bold tabular-nums">
                {userProfile.sessionsCompleted || 0}
              </p>
              <p className="mt-1 text-xs text-teal-600 dark:text-teal-400">
                {sessions.filter((s) => s.status === 'accepted').length} scheduled ahead
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Study partners
              </p>
              <p className="mt-1.5 font-display text-2xl font-bold tabular-nums">
                {connectedPartnerIds.size}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {peers.length} total discoverable peers
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total study hours
              </p>
              <p className="mt-1.5 font-display text-2xl font-bold tabular-nums">
                {(userProfile.totalHours || 0).toFixed(1)} hrs
              </p>
              <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 tabular-nums">
                {weeklyTotal.toFixed(1)} hrs logged this week
              </p>
            </div>
          </section>

          {/* Main Grid: Upcoming Sessions + Weekly Chart + Recommended + Recent Messages */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Upcoming Sessions */}
            <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold">Upcoming Sessions</h3>
                <Link
                  to="/schedule"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  Full calendar
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {upcomingSessions.length === 0 ? (
                <div className="py-10 text-center">
                  <Calendar className="h-9 w-9 text-slate-300 dark:text-slate-600 mx-auto mb-2.5" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    No upcoming sessions scheduled
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Book a 60-minute study block with a partner to stay on track.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setRescheduleTarget(null);
                      setSessionModalOpen(true);
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                  >
                    Schedule Session
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingSessions.map((sess) => {
                    const start = sess.startTime.toDate();
                    const otherNames = sess.participantIds
                      .filter((id) => id !== userProfile.uid)
                      .map((id) => usersById[id]?.fullName || 'Partner');

                    return (
                      <div
                        key={sess.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {start.toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{sess.durationMinutes} min</span>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize">{sess.status}</span>
                          </div>
                          <p className="mt-1 font-display font-semibold text-slate-900 dark:text-white truncate">
                            {sess.title}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                            {sess.subject}
                            {otherNames.length > 0 ? ` · With ${otherNames.join(', ')}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleJoinSession(sess)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors"
                          >
                            <Video className="h-3.5 w-3.5" />
                            Join
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleTarget(sess);
                              setSessionModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            Reschedule
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Weekly Study Hours Chart */}
            <section className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold">Weekly Study Hours</h3>
                  <span className="font-mono text-xs font-semibold text-teal-700 dark:text-teal-400 tabular-nums">
                    {weeklyTotal.toFixed(1)}h total
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Completed session hours across this week
                </p>
              </div>

              <div className="mt-6 h-44 flex items-end justify-between gap-2.5 pt-4">
                {weeklyHours.map((hrs, idx) => {
                  const pct = Math.max(8, Math.round((hrs / maxDailyHour) * 100));
                  return (
                    <div key={WEEKDAYS[idx]} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        {hrs > 0 ? `${hrs}h` : ''}
                      </span>
                      <div className="w-full max-w-[34px] flex-1 flex items-end">
                        <div
                          title={`${WEEKDAYS[idx]}: ${hrs} hours`}
                          style={{ height: `${pct}%` }}
                          className="w-full rounded-t-lg bg-indigo-500/85 hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-all"
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {WEEKDAYS[idx]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Recommended Partners */}
            <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-lg font-bold">Recommended Partners</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ranked by shared subjects and overlapping weekly slots
                  </p>
                </div>
                <Link
                  to="/partners"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  Browse all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recommendedPartners.map(({ peer, match }) => {
                  const status = connectionStatusByUser[peer.uid];
                  return (
                    <div
                      key={peer.uid}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            src={peer.avatarUrl}
                            name={peer.fullName}
                            size="md"
                            showOnline
                            isOnline={peer.isOnline}
                          />
                          <div className="min-w-0">
                            <p className="font-display font-semibold text-sm truncate">
                              {peer.fullName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {peer.course} · {peer.year}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-400 shrink-0 tabular-nums">
                          {match.score}%
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                        {peer.subjects.slice(0, 2).join(' · ')}
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        {status === 'accepted' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenChatWith(peer)}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 transition-colors"
                          >
                            Message
                          </button>
                        ) : status === 'pending' ? (
                          <span className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-medium text-center">
                            Pending
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConnect(peer)}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
                          >
                            Connect
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedPartner(peer)}
                          className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          Profile
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Recent Messages Preview */}
            <section className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold">Recent Messages</h3>
                <Link
                  to="/chat"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  Open chat
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {conversations.length === 0 ? (
                <div className="py-10 text-center">
                  <MessageSquare className="h-9 w-9 text-slate-300 dark:text-slate-600 mx-auto mb-2.5" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    No active conversations yet
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Connect with a partner to start messaging in real time.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {conversations.slice(0, 4).map((conv) => {
                    const otherId = conv.participantIds.find((id) => id !== userProfile.uid);
                    const otherUser = otherId ? usersById[otherId] : undefined;
                    const title =
                      conv.type === 'group'
                        ? conv.name || 'Study Group'
                        : otherUser?.fullName || 'Study Partner';
                    const unread = conv.unreadCounts?.[userProfile.uid] ?? 0;

                    return (
                      <Link
                        key={conv.id}
                        to={`/chat/${conv.id}`}
                        className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-2 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            src={conv.type === 'direct' ? otherUser?.avatarUrl : ''}
                            name={title}
                            size="md"
                            showOnline={conv.type === 'direct'}
                            isOnline={Boolean(otherUser?.isOnline)}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {conv.lastMessageText || 'No messages yet'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[11px] text-slate-400 tabular-nums">
                            {formatRelativeTime(conv.lastMessageAt?.toDate())}
                          </span>
                          {unread > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-4.5 px-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold tabular-nums">
                              {unread}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      <CreateSessionModal
        isOpen={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        partners={peers}
        existingSessions={sessions}
        initialPartnerIds={sessionInitialPartners}
        reschedulingSession={rescheduleTarget}
      />

      <CreateGroupModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        partners={peers}
        onCreated={(id) => navigate(`/chat/${id}`)}
      />

      <PartnerProfileModal
        partner={selectedPartner}
        connectionStatus={selectedPartner ? connectionStatusByUser[selectedPartner.uid] : null}
        onClose={() => setSelectedPartner(null)}
        onConnect={handleConnect}
        onMessage={handleOpenChatWith}
        onSchedule={(p) => {
          setSelectedPartner(null);
          setRescheduleTarget(null);
          setSessionInitialPartners([p.uid]);
          setSessionModalOpen(true);
        }}
      />
    </AppShell>
  );
}
