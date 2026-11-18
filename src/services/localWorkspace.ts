import { Timestamp } from 'firebase/firestore';
import {
  ChatMessage,
  Connection,
  Conversation,
  NotificationItem,
  NotificationPrefs,
  PartnerReview,
  PrivacyPrefs,
  PrivateUserInfo,
  StudySession,
  UserProfile,
} from '../types';
import { sanitizeText } from '../utils/matching';
import { SAMPLE_PARTNERS } from './seedData';

const STORAGE_KEY = 'studymate_local_workspace_v1';
const LOCAL_EVENT = 'studymate-local-sync';

interface LocalAccount {
  uid: string;
  email: string;
  password: string;
  fullName: string;
}

interface StoredTimestamp {
  __ts: number;
}

interface LocalDB {
  accounts: LocalAccount[];
  currentUid: string | null;
  users: Record<string, any>;
  privateInfo: Record<string, any>;
  connections: Record<string, any>;
  conversations: Record<string, any>;
  messages: Record<string, any[]>;
  sessions: Record<string, any>;
  notifications: Record<string, any>;
  reviews: Record<string, any>;
}

function encodeTimestamps(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Timestamp) {
    return { __ts: obj.toMillis() };
  }
  if (obj instanceof Date) {
    return { __ts: obj.getTime() };
  }
  if (Array.isArray(obj)) {
    return obj.map(encodeTimestamps);
  }
  if (typeof obj === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = encodeTimestamps(v);
    }
    return out;
  }
  return obj;
}

function decodeTimestamps(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'object' && typeof (obj as StoredTimestamp).__ts === 'number') {
    return Timestamp.fromMillis((obj as StoredTimestamp).__ts);
  }
  if (Array.isArray(obj)) {
    return obj.map(decodeTimestamps);
  }
  if (typeof obj === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = decodeTimestamps(v);
    }
    return out;
  }
  return obj;
}

function createInitialDB(): LocalDB {
  const now = Date.now();
  const users: Record<string, any> = {};
  SAMPLE_PARTNERS.forEach((p) => {
    users[p.uid] = encodeTimestamps({
      ...p,
      lastSeen: Timestamp.fromMillis(now - 5 * 60_000),
      createdAt: Timestamp.fromMillis(now - 7 * 86_400_000),
      updatedAt: Timestamp.fromMillis(now),
    });
  });

  return {
    accounts: [],
    currentUid: null,
    users,
    privateInfo: {},
    connections: {},
    conversations: {},
    messages: {},
    sessions: {},
    notifications: {},
    reviews: {},
  };
}

function loadDB(): LocalDB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const init = createInitialDB();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
      return init;
    }
    const parsed = JSON.parse(raw) as LocalDB;
    // Ensure sample partners exist
    SAMPLE_PARTNERS.forEach((p) => {
      if (!parsed.users[p.uid]) {
        parsed.users[p.uid] = encodeTimestamps({
          ...p,
          lastSeen: Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    });
    return parsed;
  } catch {
    return createInitialDB();
  }
}

function saveDB(db: LocalDB): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  window.dispatchEvent(new CustomEvent(LOCAL_EVENT));
}

function subscribeLocal(callback: () => void): () => void {
  callback();
  const handler = () => callback();
  window.addEventListener(LOCAL_EVENT, handler);
  return () => window.removeEventListener(LOCAL_EVENT, handler);
}

// ============================================================================
// LOCAL AUTHENTICATION & DEMO ENTRY
// ============================================================================

export function getLocalCurrentUid(): string | null {
  return loadDB().currentUid;
}

export function localSignup(fullName: string, email: string, password: string): string {
  const db = loadDB();
  const normalizedEmail = email.trim().toLowerCase();
  if (db.accounts.some((a) => a.email === normalizedEmail)) {
    throw new Error('An account with this email already exists. Try logging in instead.');
  }
  const uid = `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  db.accounts.push({
    uid,
    email: normalizedEmail,
    password,
    fullName: sanitizeText(fullName, 100),
  });
  db.currentUid = uid;

  const now = Timestamp.now();
  db.users[uid] = encodeTimestamps({
    uid,
    fullName: sanitizeText(fullName, 100),
    avatarUrl: '',
    university: '',
    course: '',
    year: '1st Year',
    bio: '',
    subjects: [],
    strengths: [],
    weaknesses: [],
    availabilitySlots: [],
    studyStyle: 'collaborative',
    studyMode: 'hybrid',
    goals: [],
    visibility: 'public',
    onboardingCompleted: false,
    isOnline: true,
    lastSeen: now,
    streakDays: 1,
    totalHours: 0,
    sessionsCompleted: 0,
    ratingAvg: 5.0,
    reviewCount: 0,
    weeklyHours: [0, 0, 0, 0, 0, 0, 0],
    createdAt: now,
    updatedAt: now,
  });

  db.privateInfo[uid] = encodeTimestamps({
    uid,
    email: normalizedEmail,
    notificationPrefs: {
      sessionReminders: true,
      messageAlerts: true,
      connectionRequests: true,
      emailDigest: false,
    },
    privacyPrefs: {
      showOnlineStatus: true,
      allowGroupInvites: true,
    },
    updatedAt: now,
  });

  saveDB(db);
  return uid;
}

export function localLogin(email: string, password: string): string {
  const db = loadDB();
  const normalizedEmail = email.trim().toLowerCase();
  const acc = db.accounts.find((a) => a.email === normalizedEmail);
  if (!acc) {
    throw new Error(
      'No account found for this email yet. Click "Create account" or use "Instant Demo Login" below.'
    );
  }
  if (acc.password !== password) {
    throw new Error('Incorrect email or password. Please double-check and try again.');
  }
  db.currentUid = acc.uid;
  if (db.users[acc.uid]) {
    db.users[acc.uid].isOnline = true;
    db.users[acc.uid].lastSeen = encodeTimestamps(Timestamp.now());
  }
  saveDB(db);
  return acc.uid;
}

export function localEnterDemo(): string {
  const db = loadDB();
  const demoUid = 'local_demo_student';
  const now = Timestamp.now();

  if (!db.accounts.some((a) => a.uid === demoUid)) {
    db.accounts.push({
      uid: demoUid,
      email: 'alex.rivera@studymate.edu',
      password: 'DemoUser123!',
      fullName: 'Alex Rivera',
    });
  }

  if (!db.users[demoUid]) {
    db.users[demoUid] = encodeTimestamps({
      uid: demoUid,
      fullName: 'Alex Rivera',
      avatarUrl: '',
      university: 'UC Berkeley',
      course: 'Computer Science & Applied Math',
      year: '3rd Year',
      bio: 'Prepping algorithms, machine learning, and linear algebra for finals. Always reliable with scheduled evening sessions!',
      subjects: [
        'Data Structures & Algorithms',
        'Machine Learning',
        'Calculus & Linear Algebra',
        'Statistics & Probability',
      ],
      strengths: ['Calculus & Linear Algebra', 'Data Structures & Algorithms'],
      weaknesses: ['Statistics & Probability'],
      availabilitySlots: [
        'Mon-Evening',
        'Tue-Afternoon',
        'Wed-Evening',
        'Thu-Evening',
        'Sat-Morning',
      ],
      studyStyle: 'collaborative',
      studyMode: 'hybrid',
      goals: ['Exam Prep', 'Weekly Problem Sets'],
      visibility: 'public',
      onboardingCompleted: true,
      isOnline: true,
      lastSeen: now,
      streakDays: 8,
      totalHours: 14.5,
      sessionsCompleted: 6,
      ratingAvg: 4.9,
      reviewCount: 4,
      weeklyHours: [2, 1.5, 2.5, 1.5, 2, 3, 2],
      createdAt: now,
      updatedAt: now,
    });

    db.privateInfo[demoUid] = encodeTimestamps({
      uid: demoUid,
      email: 'alex.rivera@studymate.edu',
      notificationPrefs: {
        sessionReminders: true,
        messageAlerts: true,
        connectionRequests: true,
        emailDigest: false,
      },
      privacyPrefs: {
        showOnlineStatus: true,
        allowGroupInvites: true,
      },
      updatedAt: now,
    });
  } else {
    db.users[demoUid].isOnline = true;
    db.users[demoUid].onboardingCompleted = true;
  }

  db.currentUid = demoUid;
  saveDB(db);
  localSeedUserWorkspace(demoUid, 'Alex Rivera');
  return demoUid;
}

export function localLogout(): void {
  const db = loadDB();
  if (db.currentUid && db.users[db.currentUid]) {
    db.users[db.currentUid].isOnline = false;
    db.users[db.currentUid].lastSeen = encodeTimestamps(Timestamp.now());
  }
  db.currentUid = null;
  saveDB(db);
}

export function localChangePassword(uid: string, currentPassword: string, newPassword: string): void {
  const db = loadDB();
  const acc = db.accounts.find((a) => a.uid === uid);
  if (!acc) throw new Error('Account not found.');
  if (acc.password !== currentPassword) throw new Error('Current password is incorrect.');
  acc.password = newPassword;
  saveDB(db);
}

export function localResetPassword(email: string): boolean {
  const db = loadDB();
  return db.accounts.some((a) => a.email === email.trim().toLowerCase());
}

export function localDeleteAccount(uid: string): void {
  const db = loadDB();
  db.accounts = db.accounts.filter((a) => a.uid !== uid);
  delete db.users[uid];
  delete db.privateInfo[uid];
  if (db.currentUid === uid) db.currentUid = null;
  saveDB(db);
}

// ============================================================================
// LOCAL WORKSPACE SEEDING & CRUD
// ============================================================================

export function localSeedUserWorkspace(uid: string, fullName: string): void {
  const db = loadDB();
  const alreadySeeded = Object.values(db.connections).some((c: any) =>
    c.participantIds?.includes(uid)
  );
  if (alreadySeeded) return;

  const now = Date.now();
  const tsNow = Timestamp.fromMillis(now);

  // 1. Connections
  db.connections[`conn_${uid}_maya`] = encodeTimestamps({
    fromUserId: uid,
    toUserId: 'sample_maya_lin',
    participantIds: [uid, 'sample_maya_lin'],
    status: 'accepted',
    message: 'Hey Maya! Would love to prep algorithms and problem sets together.',
    createdAt: tsNow,
    updatedAt: tsNow,
  });
  db.connections[`conn_${uid}_liam`] = encodeTimestamps({
    fromUserId: 'sample_liam_oconnor',
    toUserId: uid,
    participantIds: ['sample_liam_oconnor', uid],
    status: 'accepted',
    message: 'Saw we share evening availability — up for Pomodoro sprints?',
    createdAt: tsNow,
    updatedAt: tsNow,
  });
  db.connections[`conn_priya_${uid}`] = encodeTimestamps({
    fromUserId: 'sample_priya_nair',
    toUserId: uid,
    participantIds: ['sample_priya_nair', uid],
    status: 'pending',
    message: 'Hi! Looking for a weekly partner to review ML & Statistics concepts.',
    createdAt: tsNow,
    updatedAt: tsNow,
  });

  // 2. Conversations & Messages
  const convDirectId = `conv_${uid}_maya`;
  db.conversations[convDirectId] = encodeTimestamps({
    type: 'direct',
    participantIds: [uid, 'sample_maya_lin'],
    createdBy: uid,
    lastMessageText: 'Sounds great! Let me know if Thursday 6pm works for dynamic programming.',
    lastMessageAt: tsNow,
    lastMessageSenderId: 'sample_maya_lin',
    unreadCounts: { [uid]: 1, sample_maya_lin: 0 },
    typingUsers: {},
    createdAt: tsNow,
    updatedAt: tsNow,
  });
  db.messages[convDirectId] = encodeTimestamps([
    {
      id: 'msg_init_1',
      senderId: 'sample_maya_lin',
      senderName: 'Maya Lin',
      text: `Hey ${fullName.split(' ')[0]}! Excited to connect on StudyMate. Which topics are top priority for you this week?`,
      readBy: ['sample_maya_lin'],
      createdAt: Timestamp.fromMillis(now - 15 * 60_000),
    },
    {
      id: 'msg_init_2',
      senderId: 'sample_maya_lin',
      senderName: 'Maya Lin',
      text: 'Sounds great! Let me know if Thursday 6pm works for dynamic programming.',
      readBy: ['sample_maya_lin'],
      createdAt: Timestamp.fromMillis(now - 5 * 60_000),
    },
  ]);

  const groupConvId = `group_algo_${uid.slice(0, 12)}`;
  db.conversations[groupConvId] = encodeTimestamps({
    type: 'group',
    name: 'Algorithms & Exam Prep Squad',
    subject: 'Data Structures & Algorithms',
    description: 'Weekly problem-solving sprints, whiteboard walkthroughs, and midterm prep.',
    participantIds: [uid, 'sample_maya_lin', 'sample_noah_kim', 'sample_hana_takahashi'],
    createdBy: uid,
    lastMessageText: 'Noah shared a graph traversal practice sheet for our next sprint!',
    lastMessageAt: Timestamp.fromMillis(now - 45 * 60_000),
    lastMessageSenderId: 'sample_noah_kim',
    unreadCounts: { [uid]: 1 },
    typingUsers: {},
    isPublicGroup: true,
    createdAt: tsNow,
    updatedAt: tsNow,
  });
  db.messages[groupConvId] = encodeTimestamps([
    {
      id: 'msg_group_1',
      senderId: 'sample_noah_kim',
      senderName: 'Noah Kim',
      text: 'Noah shared a graph traversal practice sheet for our next sprint!',
      readBy: ['sample_noah_kim'],
      createdAt: Timestamp.fromMillis(now - 45 * 60_000),
    },
  ]);

  // 3. Sessions
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);

  const inThreeDays = new Date();
  inThreeDays.setDate(inThreeDays.getDate() + 3);
  inThreeDays.setHours(15, 0, 0, 0);

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  twoDaysAgo.setHours(17, 0, 0, 0);

  db.sessions[`sess_${uid}_1`] = encodeTimestamps({
    title: 'Graph Algorithms & DP Problem Set',
    subject: 'Data Structures & Algorithms',
    creatorId: uid,
    participantIds: [uid, 'sample_maya_lin'],
    participantResponses: { [uid]: 'accepted', sample_maya_lin: 'accepted' },
    startTime: Timestamp.fromDate(tomorrow),
    durationMinutes: 90,
    mode: 'online',
    locationOrLink: 'https://meet.studymate.app/algo-sprint-101',
    notes: 'Focus on Dijkstra, topological sort, and 2D DP recurrence relations.',
    status: 'accepted',
    conversationId: convDirectId,
    createdAt: tsNow,
    updatedAt: tsNow,
  });

  db.sessions[`sess_${uid}_2`] = encodeTimestamps({
    title: 'Calculus & Linear Algebra Review',
    subject: 'Calculus & Linear Algebra',
    creatorId: 'sample_liam_oconnor',
    participantIds: [uid, 'sample_liam_oconnor'],
    participantResponses: { [uid]: 'pending', sample_liam_oconnor: 'accepted' },
    startTime: Timestamp.fromDate(inThreeDays),
    durationMinutes: 60,
    mode: 'online',
    locationOrLink: 'https://meet.studymate.app/calc-pomodoro',
    notes: 'Two 25-min Pomodoro blocks covering eigenvalues and diagonalization.',
    status: 'pending',
    createdAt: tsNow,
    updatedAt: tsNow,
  });

  db.sessions[`sess_${uid}_3`] = encodeTimestamps({
    title: 'Midterm Study Plan Kickoff',
    subject: 'Machine Learning',
    creatorId: uid,
    participantIds: [uid, 'sample_maya_lin'],
    participantResponses: { [uid]: 'accepted', sample_maya_lin: 'accepted' },
    startTime: Timestamp.fromDate(twoDaysAgo),
    durationMinutes: 60,
    mode: 'in-person',
    locationOrLink: 'Main Library · Floor 3 Quiet Room B',
    notes: 'Mapped out weekly chapters and practice exam schedule.',
    status: 'completed',
    createdAt: tsNow,
    updatedAt: tsNow,
  });

  // 4. Notifications
  db.notifications[`notif_${uid}_1`] = encodeTimestamps({
    userId: uid,
    type: 'connection_request',
    title: 'New partner request from Priya Nair',
    body: 'Priya wants to connect for Machine Learning & Statistics review.',
    link: '/partners',
    relatedId: `conn_priya_${uid}`,
    read: false,
    createdAt: tsNow,
  });
  db.notifications[`notif_${uid}_2`] = encodeTimestamps({
    userId: uid,
    type: 'session_invite',
    title: 'Session invite from Liam O’Connor',
    body: 'Calculus & Linear Algebra Review scheduled in 3 days.',
    link: '/schedule',
    relatedId: `sess_${uid}_2`,
    read: false,
    createdAt: tsNow,
  });

  // 5. Reviews
  db.reviews[`rev_${uid}_1`] = encodeTimestamps({
    targetUserId: uid,
    authorId: 'sample_maya_lin',
    authorName: 'Maya Lin',
    authorAvatar: '/src/assets/images/avatar_student_maya_1795013373818.jpg',
    rating: 5,
    subject: 'Data Structures & Algorithms',
    comment: 'Super reliable and came prepared with clean notes for our practice problems!',
    createdAt: tsNow,
  });

  saveDB(db);
}

// ============================================================================
// LOCAL SUBSCRIPTIONS & MUTATIONS
// ============================================================================

export function localSubscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void
) {
  return subscribeLocal(() => {
    const db = loadDB();
    const raw = db.users[uid];
    onData(raw ? (decodeTimestamps(raw) as UserProfile) : null);
  });
}

export function localSubscribePrivateInfo(
  uid: string,
  onData: (info: PrivateUserInfo | null) => void
) {
  return subscribeLocal(() => {
    const db = loadDB();
    const raw = db.privateInfo[uid];
    onData(raw ? (decodeTimestamps(raw) as PrivateUserInfo) : null);
  });
}

export function localUpdateUserProfile(uid: string, partial: Partial<UserProfile>): void {
  const db = loadDB();
  const existing = db.users[uid] || {};
  db.users[uid] = encodeTimestamps({
    ...decodeTimestamps(existing),
    ...partial,
    uid,
    updatedAt: Timestamp.now(),
  });
  saveDB(db);
}

export function localSavePrivateInfo(
  uid: string,
  email: string,
  notificationPrefs?: NotificationPrefs,
  privacyPrefs?: PrivacyPrefs
): void {
  const db = loadDB();
  const prev = db.privateInfo[uid] ? decodeTimestamps(db.privateInfo[uid]) : {};
  db.privateInfo[uid] = encodeTimestamps({
    uid,
    email: sanitizeText(email, 200),
    notificationPrefs: notificationPrefs ?? prev.notificationPrefs ?? {
      sessionReminders: true,
      messageAlerts: true,
      connectionRequests: true,
      emailDigest: false,
    },
    privacyPrefs: privacyPrefs ?? prev.privacyPrefs ?? {
      showOnlineStatus: true,
      allowGroupInvites: true,
    },
    updatedAt: Timestamp.now(),
  });
  saveDB(db);
}

export function localSubscribePublicUsers(onData: (users: UserProfile[]) => void) {
  return subscribeLocal(() => {
    const db = loadDB();
    const list = Object.values(db.users)
      .map((u) => decodeTimestamps(u) as UserProfile)
      .filter((u) => u.visibility === 'public');
    onData(list);
  });
}

export function localSubscribeConnections(uid: string, onData: (conns: Connection[]) => void) {
  return subscribeLocal(() => {
    const db = loadDB();
    const list = Object.entries(db.connections)
      .map(([id, c]) => ({ ...(decodeTimestamps(c) as Omit<Connection, 'id'>), id }))
      .filter((c) => c.participantIds.includes(uid));
    onData(list);
  });
}

export function localSendConnectionRequest(
  fromUser: UserProfile,
  toUser: UserProfile,
  introMessage?: string
): void {
  const db = loadDB();
  const pairIds = [fromUser.uid, toUser.uid].sort();
  const connId = `conn_${pairIds[0]}_${pairIds[1]}`.slice(0, 120);
  const now = Timestamp.now();

  db.connections[connId] = encodeTimestamps({
    fromUserId: fromUser.uid,
    toUserId: toUser.uid,
    participantIds: [fromUser.uid, toUser.uid],
    status: 'pending',
    message: sanitizeText(introMessage || `Hi ${toUser.fullName.split(' ')[0]}, let's study together!`, 400),
    createdAt: now,
    updatedAt: now,
  });

  const notifId = `notif_${Date.now()}`;
  db.notifications[notifId] = encodeTimestamps({
    userId: toUser.uid,
    type: 'connection_request',
    title: `Connection request from ${fromUser.fullName}`,
    body: `${fromUser.course || 'Student'} · Wants to connect as a study partner`,
    link: '/partners',
    relatedId: connId,
    read: false,
    createdAt: now,
  });
  saveDB(db);
}

export function localRespondToConnection(
  connection: Connection,
  status: 'accepted' | 'declined',
  responder: UserProfile
): void {
  const db = loadDB();
  if (db.connections[connection.id]) {
    db.connections[connection.id].status = status;
    db.connections[connection.id].updatedAt = encodeTimestamps(Timestamp.now());
  }
  if (status === 'accepted') {
    db.notifications[`notif_${Date.now()}`] = encodeTimestamps({
      userId: connection.fromUserId,
      type: 'connection_accepted',
      title: `${responder.fullName} accepted your request`,
      body: 'You can now chat and schedule study sessions together.',
      link: '/chat',
      relatedId: connection.id,
      read: false,
      createdAt: Timestamp.now(),
    });
  }
  saveDB(db);
}

export function localSubscribeConversations(
  uid: string,
  onData: (convs: Conversation[]) => void
) {
  return subscribeLocal(() => {
    const db = loadDB();
    const list = Object.entries(db.conversations)
      .map(([id, c]) => ({ ...(decodeTimestamps(c) as Omit<Conversation, 'id'>), id }))
      .filter((c) => c.participantIds.includes(uid))
      .sort((a, b) => {
        const tA = a.lastMessageAt?.toMillis() ?? a.updatedAt?.toMillis() ?? 0;
        const tB = b.lastMessageAt?.toMillis() ?? b.updatedAt?.toMillis() ?? 0;
        return tB - tA;
      });
    onData(list);
  });
}

export function localSubscribePublicGroups(onData: (groups: Conversation[]) => void) {
  return subscribeLocal(() => {
    const db = loadDB();
    const list = Object.entries(db.conversations)
      .map(([id, c]) => ({ ...(decodeTimestamps(c) as Omit<Conversation, 'id'>), id }))
      .filter((c) => c.isPublicGroup === true);
    onData(list);
  });
}

export function localGetOrCreateDirectConversation(meId: string, partnerId: string): string {
  const db = loadDB();
  const existing = Object.entries(db.conversations).find(([, raw]) => {
    const c = raw as Conversation;
    return c.type === 'direct' && c.participantIds.includes(meId) && c.participantIds.includes(partnerId);
  });
  if (existing) return existing[0];

  const pair = [meId, partnerId].sort();
  const id = `conv_${pair[0].slice(0, 20)}_${pair[1].slice(0, 20)}`;
  const now = Timestamp.now();
  db.conversations[id] = encodeTimestamps({
    type: 'direct',
    participantIds: [meId, partnerId],
    createdBy: meId,
    lastMessageText: '',
    lastMessageAt: now,
    lastMessageSenderId: '',
    unreadCounts: { [meId]: 0, [partnerId]: 0 },
    typingUsers: {},
    createdAt: now,
    updatedAt: now,
  });
  saveDB(db);
  return id;
}

export function localCreateStudyGroup(params: {
  name: string;
  subject: string;
  description: string;
  creatorId: string;
  memberIds: string[];
  isPublicGroup: boolean;
}): string {
  const db = loadDB();
  const id = `group_${Date.now().toString(36)}`;
  const participants = Array.from(new Set([params.creatorId, ...params.memberIds]));
  const unreadCounts: Record<string, number> = {};
  participants.forEach((p) => {
    unreadCounts[p] = p === params.creatorId ? 0 : 1;
  });
  const now = Timestamp.now();
  db.conversations[id] = encodeTimestamps({
    type: 'group',
    name: sanitizeText(params.name, 120),
    subject: sanitizeText(params.subject, 120),
    description: sanitizeText(params.description, 400),
    participantIds: participants,
    createdBy: params.creatorId,
    lastMessageText: 'Study group created',
    lastMessageAt: now,
    lastMessageSenderId: params.creatorId,
    unreadCounts,
    typingUsers: {},
    isPublicGroup: params.isPublicGroup,
    createdAt: now,
    updatedAt: now,
  });
  saveDB(db);
  return id;
}

export function localJoinPublicGroup(groupId: string, uid: string): void {
  const db = loadDB();
  const group = db.conversations[groupId];
  if (group && !group.participantIds.includes(uid)) {
    group.participantIds.push(uid);
    group.updatedAt = encodeTimestamps(Timestamp.now());
    saveDB(db);
  }
}

export function localSubscribeMessages(
  conversationId: string,
  onData: (messages: ChatMessage[]) => void
) {
  return subscribeLocal(() => {
    const db = loadDB();
    const list = (db.messages[conversationId] || []).map((m) => decodeTimestamps(m) as ChatMessage);
    onData(list);
  });
}

export function localSendChatMessage(params: {
  conversation: Conversation;
  sender: UserProfile;
  text: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  sessionProposalId?: string;
}): void {
  const db = loadDB();
  const { conversation, sender, text, attachmentUrl, attachmentName, attachmentType, sessionProposalId } = params;
  const cleanText = sanitizeText(text, 2000);
  if (!cleanText && !attachmentUrl && !sessionProposalId) return;

  const now = Timestamp.now();
  const msg: any = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    senderId: sender.uid,
    senderName: sender.fullName,
    text: cleanText || (attachmentName ? `Shared attachment: ${attachmentName}` : 'Proposed a study session'),
    readBy: [sender.uid],
    createdAt: now,
  };
  if (attachmentUrl) msg.attachmentUrl = attachmentUrl;
  if (attachmentName) msg.attachmentName = attachmentName;
  if (attachmentType) msg.attachmentType = attachmentType;
  if (sessionProposalId) msg.sessionProposalId = sessionProposalId;

  if (!db.messages[conversation.id]) db.messages[conversation.id] = [];
  db.messages[conversation.id].push(encodeTimestamps(msg));

  const conv = db.conversations[conversation.id];
  if (conv) {
    const nextUnread: Record<string, number> = { ...(conv.unreadCounts || {}) };
    conv.participantIds.forEach((pid: string) => {
      nextUnread[pid] = pid === sender.uid ? 0 : (nextUnread[pid] || 0) + 1;
    });
    conv.lastMessageText = msg.text.slice(0, 200);
    conv.lastMessageAt = encodeTimestamps(now);
    conv.lastMessageSenderId = sender.uid;
    conv.unreadCounts = nextUnread;
    conv.typingUsers = { ...(conv.typingUsers || {}), [sender.uid]: false };
    conv.updatedAt = encodeTimestamps(now);
  }
  saveDB(db);
}

export function localMarkConversationRead(conversationId: string, uid: string): void {
  const db = loadDB();
  let changed = false;
  const conv = db.conversations[conversationId];
  if (conv && (conv.unreadCounts?.[uid] ?? 0) > 0) {
    conv.unreadCounts = { ...(conv.unreadCounts || {}), [uid]: 0 };
    changed = true;
  }
  const msgs = db.messages[conversationId] || [];
  msgs.forEach((m: any) => {
    if (!m.readBy?.includes(uid)) {
      m.readBy = [...(m.readBy || []), uid];
      changed = true;
    }
  });
  if (changed) saveDB(db);
}

export function localSetTypingStatus(conversationId: string, uid: string, isTyping: boolean): void {
  const db = loadDB();
  const conv = db.conversations[conversationId];
  if (!conv) return;
  conv.typingUsers = { ...(conv.typingUsers || {}), [uid]: isTyping };
  saveDB(db);
}

export function localSubscribeSessions(uid: string, onData: (sessions: StudySession[]) => void) {
  return subscribeLocal(() => {
    const db = loadDB();
    const list = Object.entries(db.sessions)
      .map(([id, s]) => ({ ...(decodeTimestamps(s) as Omit<StudySession, 'id'>), id }))
      .filter((s) => s.participantIds.includes(uid))
      .sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
    onData(list);
  });
}

export function localCreateSession(params: {
  title: string;
  subject: string;
  creator: UserProfile;
  partnerIds: string[];
  startTime: Date;
  durationMinutes: number;
  mode: 'online' | 'in-person';
  locationOrLink: string;
  notes?: string;
  conversation?: Conversation;
}): string {
  const db = loadDB();
  const id = `sess_${Date.now().toString(36)}`;
  const now = Timestamp.now();
  const participantIds = Array.from(new Set([params.creator.uid, ...params.partnerIds]));
  const responses: Record<string, 'pending' | 'accepted' | 'declined'> = {};
  participantIds.forEach((pid) => {
    responses[pid] = pid === params.creator.uid ? 'accepted' : 'pending';
  });

  db.sessions[id] = encodeTimestamps({
    title: sanitizeText(params.title, 140),
    subject: sanitizeText(params.subject, 120),
    creatorId: params.creator.uid,
    participantIds,
    participantResponses: responses,
    startTime: Timestamp.fromDate(params.startTime),
    durationMinutes: params.durationMinutes,
    mode: params.mode,
    locationOrLink: sanitizeText(params.locationOrLink || 'https://meet.studymate.app/room', 300),
    notes: sanitizeText(params.notes || '', 1000),
    status: participantIds.length === 1 ? 'accepted' : 'pending',
    conversationId: params.conversation?.id,
    createdAt: now,
    updatedAt: now,
  });

  participantIds.forEach((pid) => {
    if (pid === params.creator.uid) return;
    db.notifications[`notif_${Date.now()}_${pid}`] = encodeTimestamps({
      userId: pid,
      type: 'session_invite',
      title: `Study session invite: ${sanitizeText(params.title, 90)}`,
      body: `${params.creator.fullName} invited you for ${params.startTime.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })}`,
      link: '/schedule',
      relatedId: id,
      read: false,
      createdAt: now,
    });
  });

  saveDB(db);

  if (params.conversation) {
    localSendChatMessage({
      conversation: params.conversation,
      sender: params.creator,
      text: `Proposed a study session: "${sanitizeText(params.title, 100)}" on ${params.startTime.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })} (${params.durationMinutes} min)`,
      sessionProposalId: id,
    });
  }

  return id;
}

export function localUpdateSessionResponse(
  session: StudySession,
  uid: string,
  response: 'accepted' | 'declined'
): void {
  const db = loadDB();
  const s = db.sessions[session.id];
  if (!s) return;
  const nextResponses = { ...(s.participantResponses || {}), [uid]: response };
  const otherIds = s.participantIds.filter((id: string) => id !== s.creatorId);
  const anyAccepted = otherIds.some((id: string) => nextResponses[id] === 'accepted');
  const allDeclined = otherIds.length > 0 && otherIds.every((id: string) => nextResponses[id] === 'declined');
  s.participantResponses = nextResponses;
  s.status = allDeclined ? 'declined' : anyAccepted ? 'accepted' : s.status;
  s.updatedAt = encodeTimestamps(Timestamp.now());
  saveDB(db);
}

export function localRescheduleSession(
  sessionId: string,
  newStartTime: Date,
  newDurationMinutes: number
): void {
  const db = loadDB();
  const s = db.sessions[sessionId];
  if (!s) return;
  s.startTime = encodeTimestamps(Timestamp.fromDate(newStartTime));
  s.durationMinutes = newDurationMinutes;
  s.updatedAt = encodeTimestamps(Timestamp.now());
  saveDB(db);
}

export function localCancelSession(sessionId: string): void {
  const db = loadDB();
  if (db.sessions[sessionId]) {
    db.sessions[sessionId].status = 'cancelled';
    db.sessions[sessionId].updatedAt = encodeTimestamps(Timestamp.now());
    saveDB(db);
  }
}

export function localCompleteSession(session: StudySession, uid: string): void {
  const db = loadDB();
  if (db.sessions[session.id]) {
    db.sessions[session.id].status = 'completed';
    db.sessions[session.id].updatedAt = encodeTimestamps(Timestamp.now());
  }
  const u = db.users[uid];
  if (u) {
    const hrs = Number((session.durationMinutes / 60).toFixed(2));
    u.totalHours = Number(((u.totalHours || 0) + hrs).toFixed(2));
    u.sessionsCompleted = (u.sessionsCompleted || 0) + 1;
    u.streakDays = (u.streakDays || 0) + 1;
    const dayIdx = (new Date().getDay() + 6) % 7;
    const weekly = Array.isArray(u.weeklyHours) && u.weeklyHours.length === 7 ? [...u.weeklyHours] : [0, 0, 0, 0, 0, 0, 0];
    weekly[dayIdx] = Number((weekly[dayIdx] + hrs).toFixed(1));
    u.weeklyHours = weekly;
    u.updatedAt = encodeTimestamps(Timestamp.now());
  }
  saveDB(db);
}

export function localSubscribeNotifications(
  uid: string,
  onData: (items: NotificationItem[]) => void
) {
  return subscribeLocal(() => {
    const db = loadDB();
    const list = Object.entries(db.notifications)
      .map(([id, n]) => ({ ...(decodeTimestamps(n) as Omit<NotificationItem, 'id'>), id }))
      .filter((n) => n.userId === uid)
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    onData(list);
  });
}

export function localMarkNotificationRead(id: string): void {
  const db = loadDB();
  if (db.notifications[id]) {
    db.notifications[id].read = true;
    saveDB(db);
  }
}

export function localMarkAllNotificationsRead(items: NotificationItem[]): void {
  const db = loadDB();
  let changed = false;
  items.forEach((n) => {
    if (db.notifications[n.id] && !db.notifications[n.id].read) {
      db.notifications[n.id].read = true;
      changed = true;
    }
  });
  if (changed) saveDB(db);
}

export function localCreateReminderNotification(uid: string, session: StudySession): void {
  const db = loadDB();
  const id = `rem_${uid}_${session.id}`.slice(0, 120);
  if (db.notifications[id]) return;
  db.notifications[id] = encodeTimestamps({
    userId: uid,
    type: 'session_reminder',
    title: `Starting soon: ${session.title}`,
    body: `Your ${session.subject} study session begins in under 30 minutes.`,
    link: '/schedule',
    relatedId: session.id,
    read: false,
    createdAt: Timestamp.now(),
  });
  saveDB(db);
}

export function localSubscribeReviews(
  targetUserId: string,
  onData: (reviews: PartnerReview[]) => void
) {
  return subscribeLocal(() => {
    const db = loadDB();
    const list = Object.entries(db.reviews)
      .map(([id, r]) => ({ ...(decodeTimestamps(r) as Omit<PartnerReview, 'id'>), id }))
      .filter((r) => r.targetUserId === targetUserId)
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    onData(list);
  });
}

export function localSubmitReview(params: {
  targetUserId: string;
  author: UserProfile;
  rating: number;
  comment: string;
  subject: string;
}): void {
  const db = loadDB();
  const id = `rev_${Date.now().toString(36)}`;
  db.reviews[id] = encodeTimestamps({
    targetUserId: params.targetUserId,
    authorId: params.author.uid,
    authorName: params.author.fullName,
    authorAvatar: params.author.avatarUrl || '',
    rating: Math.min(5, Math.max(1, Math.round(params.rating))),
    comment: sanitizeText(params.comment, 600),
    subject: sanitizeText(params.subject, 120),
    createdAt: Timestamp.now(),
  });
  saveDB(db);
}
