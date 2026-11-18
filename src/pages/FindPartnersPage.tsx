import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Compass, MessageSquare, Search, UserPlus, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import {
  getOrCreateDirectConversation,
  respondToConnection,
  sendConnectionRequest,
} from '../services/firestoreService';
import { Connection, UserProfile } from '../types';
import {
  DAYS_OF_WEEK,
  SUBJECT_CATALOG,
  YEAR_OPTIONS,
  calculateMatchScore,
} from '../utils/matching';
import { Avatar } from '../components/common/Avatar';
import { CardGridSkeleton } from '../components/common/LoadingSkeleton';
import { AppShell } from '../components/layout/AppShell';
import { CreateSessionModal } from '../components/modals/CreateSessionModal';
import { PartnerProfileModal } from '../components/modals/PartnerProfileModal';

export function FindPartnersPage() {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    peers,
    usersById,
    connections,
    conversations,
    sessions,
    notifications,
    totalUnreadMessages,
    unreadNotificationsCount,
    loading,
  } = useWorkspaceData();

  const [tab, setTab] = useState<'discover' | 'requests'>('discover');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [styleFilter, setStyleFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');

  const [selectedPartner, setSelectedPartner] = useState<UserProfile | null>(null);
  const [schedulePartnerIds, setSchedulePartnerIds] = useState<string[]>([]);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchQuery(q);
  }, [searchParams]);

  const connectionMap = useMemo(() => {
    const map: Record<string, Connection> = {};
    if (!userProfile) return map;
    connections.forEach((c) => {
      const other = c.participantIds.find((id) => id !== userProfile.uid);
      if (other) map[other] = c;
    });
    return map;
  }, [connections, userProfile]);

  const incomingRequests = useMemo(
    () =>
      connections.filter(
        (c) => c.status === 'pending' && c.toUserId === userProfile?.uid
      ),
    [connections, userProfile]
  );

  const outgoingRequests = useMemo(
    () =>
      connections.filter(
        (c) => c.status === 'pending' && c.fromUserId === userProfile?.uid
      ),
    [connections, userProfile]
  );

  const filteredPeers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return peers
      .map((peer) => ({ peer, match: calculateMatchScore(userProfile, peer) }))
      .filter(({ peer }) => {
        if (q) {
          const hay = `${peer.fullName} ${peer.course} ${peer.university} ${peer.subjects.join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (subjectFilter && !peer.subjects.includes(subjectFilter)) return false;
        if (yearFilter && peer.year !== yearFilter) return false;
        if (styleFilter && peer.studyStyle !== styleFilter) return false;
        if (modeFilter && peer.studyMode !== modeFilter) return false;
        if (dayFilter && !peer.availabilitySlots.some((s) => s.startsWith(dayFilter))) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.match.score - a.match.score);
  }, [peers, userProfile, searchQuery, subjectFilter, yearFilter, dayFilter, styleFilter, modeFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setSubjectFilter('');
    setYearFilter('');
    setDayFilter('');
    setStyleFilter('');
    setModeFilter('');
  };

  const handleConnect = async (partner: UserProfile) => {
    if (!userProfile) return;
    try {
      await sendConnectionRequest(userProfile, partner);
      showToast(`Connection request sent to ${partner.fullName}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to connect', 'error');
    }
  };

  const handleRespond = async (conn: Connection, status: 'accepted' | 'declined') => {
    if (!userProfile) return;
    try {
      await respondToConnection(conn, status, userProfile);
      showToast(
        status === 'accepted' ? 'Partner request accepted!' : 'Request declined',
        status === 'accepted' ? 'success' : 'info'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
    }
  };

  const handleMessage = async (partner: UserProfile) => {
    if (!userProfile) return;
    const convId = await getOrCreateDirectConversation(userProfile.uid, partner.uid);
    navigate(`/chat/${convId}`);
  };

  return (
    <AppShell
      pageTitle="Find Partners"
      unreadMessages={totalUnreadMessages}
      unreadNotifications={unreadNotificationsCount}
      notifications={notifications}
      onQuickSearch={(val) => {
        setTab('discover');
        setSearchQuery(val);
      }}
    >
      <div className="space-y-6">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Find Academic Partners</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Discover compatible peers sorted by shared subjects and availability overlap.
            </p>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 self-start">
            <button
              type="button"
              onClick={() => setTab('discover')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === 'discover'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Discover Peers ({filteredPeers.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('requests')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                tab === 'requests'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Requests
              {incomingRequests.length > 0 && (
                <span className="h-4 min-w-[16px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {incomingRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {tab === 'discover' ? (
          <>
            {/* Search & Filter Bar */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4 relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, major, or university..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <select
                  aria-label="Filter by subject"
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="md:col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                >
                  <option value="">All subjects</option>
                  {SUBJECT_CATALOG.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter by year"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="md:col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                >
                  <option value="">Any year</option>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter by day"
                  value={dayFilter}
                  onChange={(e) => setDayFilter(e.target.value)}
                  className="md:col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                >
                  <option value="">Any day</option>
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter by study style"
                  value={styleFilter}
                  onChange={(e) => setStyleFilter(e.target.value)}
                  className="md:col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                >
                  <option value="">Any style</option>
                  <option value="collaborative">Collaborative</option>
                  <option value="quiet">Quiet Co-working</option>
                  <option value="discussion">Active Discussion</option>
                  <option value="pomodoro">Pomodoro Sprints</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Mode:</span>
                  {(['', 'online', 'in-person', 'hybrid'] as const).map((m) => (
                    <button
                      key={m || 'all'}
                      type="button"
                      onClick={() => setModeFilter(m)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                        modeFilter === m
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {m || 'All'}
                    </button>
                  ))}
                </div>

                {(searchQuery || subjectFilter || yearFilter || dayFilter || styleFilter || modeFilter) && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <CardGridSkeleton count={6} />
            ) : filteredPeers.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
                <Compass className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="font-display text-lg font-bold">No matching study partners</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Try clearing one or more filters to widen your peer search.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredPeers.map(({ peer, match }) => {
                  const conn = connectionMap[peer.uid];
                  return (
                    <article
                      key={peer.uid}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              src={peer.avatarUrl}
                              name={peer.fullName}
                              size="lg"
                              showOnline
                              isOnline={peer.isOnline}
                            />
                            <div className="min-w-0">
                              <h3 className="font-display font-bold text-base truncate">
                                {peer.fullName}
                              </h3>
                              <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                {peer.course} · {peer.year}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-500 truncate">
                                {peer.university}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono text-sm font-bold text-teal-700 dark:text-teal-400 tabular-nums">
                              {match.score}%
                            </span>
                            <p className="text-[11px] text-slate-400">match</p>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {peer.bio || 'Looking for dedicated peers for weekly study sprints.'}
                        </p>

                        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <p className="truncate">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Subjects:{' '}
                            </span>
                            {peer.subjects.join(' · ')}
                          </p>
                          <p className="truncate">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Style:{' '}
                            </span>
                            <span className="capitalize">{peer.studyStyle}</span> ·{' '}
                            <span className="capitalize">{peer.studyMode}</span>
                            {match.sharedSlots.length > 0 &&
                              ` · ${match.sharedSlots.length} shared slots`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        {conn?.status === 'accepted' ? (
                          <button
                            type="button"
                            onClick={() => handleMessage(peer)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Message
                          </button>
                        ) : conn?.status === 'pending' ? (
                          <span className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-semibold text-center">
                            {conn.toUserId === userProfile?.uid ? 'Requested You' : 'Request Sent'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConnect(peer)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Connect
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedPartner(peer)}
                          className="py-2 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          View profile
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Incoming */}
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h3 className="font-display text-lg font-bold mb-4">
                Incoming Requests ({incomingRequests.length})
              </h3>
              {incomingRequests.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                  No pending incoming partner requests.
                </p>
              ) : (
                <div className="space-y-3">
                  {incomingRequests.map((req) => {
                    const sender = usersById[req.fromUserId];
                    if (!sender) return null;
                    return (
                      <div
                        key={req.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar src={sender.avatarUrl} name={sender.fullName} size="md" />
                          <div>
                            <p className="font-semibold text-sm">{sender.fullName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {sender.course} · {sender.university}
                            </p>
                            {req.message && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">
                                “{req.message}”
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRespond(req, 'accepted')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespond(req, 'declined')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <X className="h-3.5 w-3.5" />
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Outgoing */}
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h3 className="font-display text-lg font-bold mb-4">
                Sent Requests ({outgoingRequests.length})
              </h3>
              {outgoingRequests.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                  No outgoing pending requests.
                </p>
              ) : (
                <div className="space-y-3">
                  {outgoingRequests.map((req) => {
                    const target = usersById[req.toUserId];
                    if (!target) return null;
                    return (
                      <div
                        key={req.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar src={target.avatarUrl} name={target.fullName} size="md" />
                          <div>
                            <p className="font-semibold text-sm">{target.fullName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {target.course} · Awaiting response
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPartner(target)}
                          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          View
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <PartnerProfileModal
        partner={selectedPartner}
        connectionStatus={selectedPartner ? connectionMap[selectedPartner.uid]?.status : null}
        onClose={() => setSelectedPartner(null)}
        onConnect={handleConnect}
        onMessage={handleMessage}
        onSchedule={(p) => {
          setSelectedPartner(null);
          setSchedulePartnerIds([p.uid]);
          setSessionModalOpen(true);
        }}
      />

      <CreateSessionModal
        isOpen={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        partners={peers}
        existingSessions={sessions}
        initialPartnerIds={schedulePartnerIds}
        initialConversation={conversations[0]}
      />
    </AppShell>
  );
}
