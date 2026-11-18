import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, MessageSquare, Plus, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import { joinPublicStudyGroup } from '../services/firestoreService';
import { Conversation } from '../types';
import { AppShell } from '../components/layout/AppShell';
import { CreateGroupModal } from '../components/modals/CreateGroupModal';
import { CreateSessionModal } from '../components/modals/CreateSessionModal';

export function StudyGroupsPage() {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const {
    peers,
    conversations,
    publicGroups,
    sessions,
    notifications,
    totalUnreadMessages,
    unreadNotificationsCount,
  } = useWorkspaceData();

  const [createOpen, setCreateOpen] = useState(false);
  const [sessionGroup, setSessionGroup] = useState<Conversation | null>(null);

  const myGroups = useMemo(
    () => conversations.filter((c) => c.type === 'group'),
    [conversations]
  );

  const discoverGroups = useMemo(() => {
    if (!userProfile) return [];
    return publicGroups.filter((g) => !g.participantIds.includes(userProfile.uid));
  }, [publicGroups, userProfile]);

  const handleJoin = async (group: Conversation) => {
    if (!userProfile) return;
    try {
      await joinPublicStudyGroup(group.id, userProfile.uid);
      showToast(`Joined ${group.name}`, 'success');
      navigate(`/chat/${group.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to join group', 'error');
    }
  };

  return (
    <AppShell
      pageTitle="Study Groups"
      unreadMessages={totalUnreadMessages}
      unreadNotifications={unreadNotificationsCount}
      notifications={notifications}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Study Groups</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Collaborate with multi-partner squads for courses, projects, and exam reviews.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors self-start"
          >
            <Plus className="h-4 w-4" />
            Create Study Group
          </button>
        </div>

        {/* My Study Groups */}
        <section className="space-y-3">
          <h3 className="font-display text-lg font-bold">Your Groups ({myGroups.length})</h3>
          {myGroups.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
              <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="font-display font-bold">No study groups yet</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Create a study group for your next exam or project and invite connected partners.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myGroups.map((group) => (
                <article
                  key={group.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-teal-700 dark:text-teal-400">
                        {group.subject || 'General Study'}
                      </span>
                      <span className="tabular-nums">{group.participantIds.length} members</span>
                    </div>
                    <h4 className="mt-1.5 font-display text-lg font-bold">{group.name}</h4>
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {group.description || 'Collaborative peer study group.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => navigate(`/chat/${group.id}`)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Group Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionGroup(group)}
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Schedule
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Discoverable Public Groups */}
        {discoverGroups.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-display text-lg font-bold">
              Discover Open Groups ({discoverGroups.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {discoverGroups.map((group) => (
                <article
                  key={group.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {group.subject}
                      </span>
                      <span className="tabular-nums">{group.participantIds.length} members</span>
                    </div>
                    <h4 className="mt-1.5 font-display text-lg font-bold">{group.name}</h4>
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                      {group.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleJoin(group)}
                    className="w-full py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors"
                  >
                    Join Study Group
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      <CreateGroupModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        partners={peers}
        onCreated={(id) => navigate(`/chat/${id}`)}
      />

      {sessionGroup && userProfile && (
        <CreateSessionModal
          isOpen={Boolean(sessionGroup)}
          onClose={() => setSessionGroup(null)}
          partners={peers}
          existingSessions={sessions}
          initialPartnerIds={sessionGroup.participantIds.filter((id) => id !== userProfile.uid)}
          initialConversation={sessionGroup}
        />
      )}
    </AppShell>
  );
}
