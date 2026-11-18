import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  createReminderNotification,
  subscribePublicStudyGroups,
  subscribePublicUsers,
  subscribeUserConnections,
  subscribeUserConversations,
  subscribeUserNotifications,
  subscribeUserSessions,
} from '../services/firestoreService';
import { Connection, Conversation, NotificationItem, StudySession, UserProfile } from '../types';

export function useWorkspaceData() {
  const { currentUid, userProfile, privateInfo } = useAuth();
  const { showToast } = useToast();

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [publicGroups, setPublicGroups] = useState<Conversation[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let firstUsersLoaded = false;

    const unsubUsers = subscribePublicUsers((list) => {
      setAllUsers(list);
      if (!firstUsersLoaded) {
        firstUsersLoaded = true;
        setLoading(false);
      }
    });
    const unsubConns = subscribeUserConnections(currentUid, setConnections);
    const unsubConvs = subscribeUserConversations(currentUid, setConversations);
    const unsubPublicGroups = subscribePublicStudyGroups(setPublicGroups);
    const unsubSessions = subscribeUserSessions(currentUid, setSessions);
    const unsubNotifs = subscribeUserNotifications(currentUid, setNotifications);

    return () => {
      unsubUsers();
      unsubConns();
      unsubConvs();
      unsubPublicGroups();
      unsubSessions();
      unsubNotifs();
    };
  }, [currentUid]);

  // 30-minute upcoming session reminder check
  useEffect(() => {
    if (!currentUid || !userProfile) return;
    if (privateInfo && privateInfo.notificationPrefs?.sessionReminders === false) return;

    const checkReminders = () => {
      const now = Date.now();
      const thirtyMinsMs = 30 * 60_000;
      sessions.forEach((s) => {
        if (s.status !== 'accepted') return;
        const startMs = s.startTime.toMillis();
        const diff = startMs - now;
        if (diff > 0 && diff <= thirtyMinsMs) {
          const storageKey = `sm_rem_${currentUid}_${s.id}`;
          if (!sessionStorage.getItem(storageKey)) {
            sessionStorage.setItem(storageKey, '1');
            createReminderNotification(currentUid, s).catch(() => {});
            showToast(
              `Session starts in ${Math.max(1, Math.round(diff / 60000))} min`,
              'info',
              s.title
            );
          }
        }
      });
    };

    checkReminders();
    const timer = setInterval(checkReminders, 60_000);
    return () => clearInterval(timer);
  }, [currentUid, sessions, privateInfo?.notificationPrefs?.sessionReminders]);

  const usersById = useMemo(() => {
    const map: Record<string, UserProfile> = {};
    allUsers.forEach((u) => {
      map[u.uid] = u;
    });
    if (userProfile) {
      map[userProfile.uid] = userProfile;
    }
    return map;
  }, [allUsers, userProfile]);

  const peers = useMemo(() => {
    if (!currentUid) return [];
    return allUsers.filter((u) => u.uid !== currentUid);
  }, [allUsers, currentUid]);

  const connectedPartnerIds = useMemo(() => {
    if (!currentUid) return new Set<string>();
    const set = new Set<string>();
    connections.forEach((c) => {
      if (c.status === 'accepted') {
        const other = c.participantIds.find((id) => id !== currentUid);
        if (other) set.add(other);
      }
    });
    return set;
  }, [connections, currentUid]);

  const totalUnreadMessages = useMemo(() => {
    if (!currentUid) return 0;
    return conversations.reduce((sum, c) => sum + (c.unreadCounts?.[currentUid] ?? 0), 0);
  }, [conversations, currentUid]);

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  return {
    allUsers,
    peers,
    usersById,
    connections,
    connectedPartnerIds,
    conversations,
    publicGroups,
    sessions,
    notifications,
    totalUnreadMessages,
    unreadNotificationsCount,
    loading,
  };
}
