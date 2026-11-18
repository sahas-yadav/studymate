import {
  Timestamp,
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  ChatMessage,
  Connection,
  Conversation,
  NotificationItem,
  NotificationPrefs,
  PartnerReview,
  PrivacyPrefs,
  StudySession,
  UserProfile,
} from '../types';
import { sanitizeText } from '../utils/matching';
import { OperationType, auth, db, handleFirestoreError, storage } from './firebase';
import {
  localCancelSession,
  localCompleteSession,
  localCreateReminderNotification,
  localCreateSession,
  localCreateStudyGroup,
  localDeleteAccount,
  localGetOrCreateDirectConversation,
  localJoinPublicGroup,
  localMarkAllNotificationsRead,
  localMarkConversationRead,
  localMarkNotificationRead,
  localRescheduleSession,
  localRespondToConnection,
  localSavePrivateInfo,
  localSendChatMessage,
  localSendConnectionRequest,
  localSetTypingStatus,
  localSubmitReview,
  localSubscribeConnections,
  localSubscribeConversations,
  localSubscribeMessages,
  localSubscribeNotifications,
  localSubscribePublicGroups,
  localSubscribePublicUsers,
  localSubscribeReviews,
  localSubscribeSessions,
  localUpdateSessionResponse,
  localUpdateUserProfile,
} from './localWorkspace';

const isCloudSession = () => Boolean(auth.currentUser);

/**
 * Compresses an image File to a small JPEG Data URL so it safely fits in Firestore
 * or localStorage if Firebase Storage is unreachable or in local mode.
 */
async function compressImageToDataUrl(file: File, maxDim = 480, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an avatar or chat attachment to Firebase Storage, falling back cleanly
 * to a compressed Data URL in local mode or if Storage is not configured.
 */
export async function uploadMediaFile(
  file: File,
  storagePath: string
): Promise<{ url: string; name: string; type: string }> {
  const safeName = sanitizeText(file.name, 160) || 'attachment';
  if (isCloudSession()) {
    try {
      const fileRef = ref(storage, storagePath);
      const uploadPromise = uploadBytes(fileRef, file).then((snap) => getDownloadURL(snap.ref));
      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Storage upload timed out')), 4500)
      );
      const url = await Promise.race([uploadPromise, timeoutPromise]);
      return { url, name: safeName, type: file.type || 'application/octet-stream' };
    } catch {
      // Fall through to compressed Data URL
    }
  }

  if (file.type.startsWith('image/')) {
    const dataUrl = await compressImageToDataUrl(file);
    return { url: dataUrl, name: safeName, type: 'image/jpeg' };
  }
  if (file.size <= 300_000) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
    return { url: dataUrl, name: safeName, type: file.type || 'application/octet-stream' };
  }
  throw new Error('File exceeds 300KB limit. Please choose a smaller file or image.');
}

// ============================================================================
// USER PROFILES & SETTINGS
// ============================================================================

export async function createOrUpdateUserProfile(
  uid: string,
  partial: Partial<UserProfile>,
  isNew = false
): Promise<void> {
  if (!isCloudSession()) {
    localUpdateUserProfile(uid, partial);
    return;
  }
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    if (isNew) {
      await setDoc(userRef, {
        uid,
        fullName: sanitizeText(partial.fullName || 'Student', 100),
        avatarUrl: partial.avatarUrl || '',
        university: sanitizeText(partial.university || '', 140),
        course: sanitizeText(partial.course || '', 140),
        year: sanitizeText(partial.year || '1st Year', 40),
        bio: sanitizeText(partial.bio || '', 600),
        subjects: partial.subjects ?? [],
        strengths: partial.strengths ?? [],
        weaknesses: partial.weaknesses ?? [],
        availabilitySlots: partial.availabilitySlots ?? [],
        studyStyle: partial.studyStyle ?? 'collaborative',
        studyMode: partial.studyMode ?? 'hybrid',
        goals: partial.goals ?? [],
        visibility: partial.visibility ?? 'public',
        onboardingCompleted: partial.onboardingCompleted ?? false,
        isOnline: true,
        lastSeen: serverTimestamp(),
        streakDays: partial.streakDays ?? 1,
        totalHours: partial.totalHours ?? 2.5,
        sessionsCompleted: partial.sessionsCompleted ?? 1,
        ratingAvg: partial.ratingAvg ?? 5.0,
        reviewCount: partial.reviewCount ?? 1,
        weeklyHours: partial.weeklyHours ?? [1, 0, 1.5, 0, 0, 0, 0],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const sanitized: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (partial.fullName !== undefined) sanitized.fullName = sanitizeText(partial.fullName, 100);
      if (partial.avatarUrl !== undefined) sanitized.avatarUrl = partial.avatarUrl;
      if (partial.university !== undefined) sanitized.university = sanitizeText(partial.university, 140);
      if (partial.course !== undefined) sanitized.course = sanitizeText(partial.course, 140);
      if (partial.year !== undefined) sanitized.year = sanitizeText(partial.year, 40);
      if (partial.bio !== undefined) sanitized.bio = sanitizeText(partial.bio, 600);
      if (partial.subjects !== undefined) sanitized.subjects = partial.subjects.slice(0, 20);
      if (partial.strengths !== undefined) sanitized.strengths = partial.strengths.slice(0, 20);
      if (partial.weaknesses !== undefined) sanitized.weaknesses = partial.weaknesses.slice(0, 20);
      if (partial.availabilitySlots !== undefined)
        sanitized.availabilitySlots = partial.availabilitySlots.slice(0, 42);
      if (partial.studyStyle !== undefined) sanitized.studyStyle = partial.studyStyle;
      if (partial.studyMode !== undefined) sanitized.studyMode = partial.studyMode;
      if (partial.goals !== undefined) sanitized.goals = partial.goals.slice(0, 12);
      if (partial.visibility !== undefined) sanitized.visibility = partial.visibility;
      if (partial.onboardingCompleted !== undefined)
        sanitized.onboardingCompleted = partial.onboardingCompleted;
      if (partial.isOnline !== undefined) {
        sanitized.isOnline = partial.isOnline;
        sanitized.lastSeen = serverTimestamp();
      }
      await updateDoc(userRef, sanitized);
    }
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function savePrivateUserInfo(
  uid: string,
  email: string,
  notificationPrefs?: NotificationPrefs,
  privacyPrefs?: PrivacyPrefs
): Promise<void> {
  if (!isCloudSession()) {
    localSavePrivateInfo(uid, email, notificationPrefs, privacyPrefs);
    return;
  }
  const path = `users/${uid}/private/info`;
  try {
    const refDoc = doc(db, 'users', uid, 'private', 'info');
    const existing = await getDoc(refDoc);
    const defaultNotif: NotificationPrefs = {
      sessionReminders: true,
      messageAlerts: true,
      connectionRequests: true,
      emailDigest: false,
    };
    const defaultPrivacy: PrivacyPrefs = {
      showOnlineStatus: true,
      allowGroupInvites: true,
    };
    await setDoc(refDoc, {
      uid,
      email: sanitizeText(email, 200),
      notificationPrefs: notificationPrefs ?? existing.data()?.notificationPrefs ?? defaultNotif,
      privacyPrefs: privacyPrefs ?? existing.data()?.privacyPrefs ?? defaultPrivacy,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribePublicUsers(
  onData: (users: UserProfile[]) => void,
  onError?: (err: unknown) => void
) {
  if (!isCloudSession()) {
    return localSubscribePublicUsers(onData);
  }
  const path = 'users';
  const q = query(collection(db, path), where('visibility', '==', 'public'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ ...(d.data() as UserProfile), uid: d.id }));
      onData(list);
    },
    (err) => {
      if (onError) onError(err);
      else handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

// ============================================================================
// CONNECTIONS
// ============================================================================

export function subscribeUserConnections(
  uid: string,
  onData: (connections: Connection[]) => void
) {
  if (!isCloudSession()) {
    return localSubscribeConnections(uid, onData);
  }
  const path = 'connections';
  const q = query(collection(db, path), where('participantIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ ...(d.data() as Omit<Connection, 'id'>), id: d.id })));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function sendConnectionRequest(
  fromUser: UserProfile,
  toUser: UserProfile,
  introMessage?: string
): Promise<void> {
  if (!isCloudSession()) {
    localSendConnectionRequest(fromUser, toUser, introMessage);
    return;
  }
  const pairIds = [fromUser.uid, toUser.uid].sort();
  const connId = `conn_${pairIds[0]}_${pairIds[1]}`.slice(0, 120);
  const path = `connections/${connId}`;
  try {
    const batch = writeBatch(db);
    const connRef = doc(db, 'connections', connId);
    batch.set(connRef, {
      fromUserId: fromUser.uid,
      toUserId: toUser.uid,
      participantIds: [fromUser.uid, toUser.uid],
      status: 'pending',
      message: sanitizeText(introMessage || `Hi ${toUser.fullName.split(' ')[0]}, let's study together!`, 400),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const notifRef = doc(collection(db, 'notifications'));
    batch.set(notifRef, {
      userId: toUser.uid,
      type: 'connection_request',
      title: `Connection request from ${fromUser.fullName}`,
      body: `${fromUser.course || 'Student'} · Wants to connect as a study partner`,
      link: '/partners',
      relatedId: connId,
      read: false,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function respondToConnection(
  connection: Connection,
  status: 'accepted' | 'declined',
  responder: UserProfile
): Promise<void> {
  if (!isCloudSession()) {
    localRespondToConnection(connection, status, responder);
    return;
  }
  const path = `connections/${connection.id}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'connections', connection.id), {
      status,
      updatedAt: serverTimestamp(),
    });

    if (status === 'accepted') {
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        userId: connection.fromUserId,
        type: 'connection_accepted',
        title: `${responder.fullName} accepted your request`,
        body: 'You can now chat and schedule study sessions together.',
        link: '/chat',
        relatedId: connection.id,
        read: false,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// ============================================================================
// REAL-TIME CHAT & STUDY GROUPS
// ============================================================================

export function subscribeUserConversations(
  uid: string,
  onData: (convs: Conversation[]) => void
) {
  if (!isCloudSession()) {
    return localSubscribeConversations(uid, onData);
  }
  const path = 'conversations';
  const q = query(collection(db, path), where('participantIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ ...(d.data() as Omit<Conversation, 'id'>), id: d.id }))
        .sort((a, b) => {
          const tA = a.lastMessageAt?.toMillis() ?? a.updatedAt?.toMillis() ?? 0;
          const tB = b.lastMessageAt?.toMillis() ?? b.updatedAt?.toMillis() ?? 0;
          return tB - tA;
        });
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribePublicStudyGroups(onData: (groups: Conversation[]) => void) {
  if (!isCloudSession()) {
    return localSubscribePublicGroups(onData);
  }
  const path = 'conversations';
  const q = query(collection(db, path), where('isPublicGroup', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ ...(d.data() as Omit<Conversation, 'id'>), id: d.id })));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function getOrCreateDirectConversation(
  meId: string,
  partnerId: string
): Promise<string> {
  if (!isCloudSession()) {
    return localGetOrCreateDirectConversation(meId, partnerId);
  }
  const pair = [meId, partnerId].sort();
  const deterministicId = `conv_${pair[0].slice(0, 20)}_${pair[1].slice(0, 20)}`;
  const path = `conversations/${deterministicId}`;
  try {
    const existingSnap = await getDocs(
      query(collection(db, 'conversations'), where('participantIds', 'array-contains', meId))
    );
    const found = existingSnap.docs.find((d) => {
      const data = d.data() as Conversation;
      return data.type === 'direct' && data.participantIds.includes(partnerId);
    });
    if (found) return found.id;

    await setDoc(doc(db, 'conversations', deterministicId), {
      type: 'direct',
      participantIds: [meId, partnerId],
      createdBy: meId,
      lastMessageText: '',
      lastMessageAt: serverTimestamp(),
      lastMessageSenderId: '',
      unreadCounts: { [meId]: 0, [partnerId]: 0 },
      typingUsers: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return deterministicId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function createStudyGroup(params: {
  name: string;
  subject: string;
  description: string;
  creatorId: string;
  memberIds: string[];
  isPublicGroup: boolean;
}): Promise<string> {
  if (!isCloudSession()) {
    return localCreateStudyGroup(params);
  }
  const path = 'conversations';
  try {
    const participants = Array.from(new Set([params.creatorId, ...params.memberIds]));
    const unreadCounts: Record<string, number> = {};
    participants.forEach((id) => {
      unreadCounts[id] = id === params.creatorId ? 0 : 1;
    });
    const docRef = await addDoc(collection(db, 'conversations'), {
      type: 'group',
      name: sanitizeText(params.name, 120),
      subject: sanitizeText(params.subject, 120),
      description: sanitizeText(params.description, 400),
      participantIds: participants,
      createdBy: params.creatorId,
      lastMessageText: 'Study group created',
      lastMessageAt: serverTimestamp(),
      lastMessageSenderId: params.creatorId,
      unreadCounts,
      typingUsers: {},
      isPublicGroup: params.isPublicGroup,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function joinPublicStudyGroup(groupId: string, uid: string): Promise<void> {
  if (!isCloudSession()) {
    localJoinPublicGroup(groupId, uid);
    return;
  }
  const path = `conversations/${groupId}`;
  try {
    await updateDoc(doc(db, 'conversations', groupId), {
      participantIds: arrayUnion(uid),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeMessages(
  conversationId: string,
  onData: (messages: ChatMessage[]) => void
) {
  if (!isCloudSession()) {
    return localSubscribeMessages(conversationId, onData);
  }
  const path = `conversations/${conversationId}/messages`;
  const q = query(collection(db, path), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ ...(d.data() as Omit<ChatMessage, 'id'>), id: d.id })));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function sendChatMessage(params: {
  conversation: Conversation;
  sender: UserProfile;
  text: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  sessionProposalId?: string;
}): Promise<void> {
  if (!isCloudSession()) {
    localSendChatMessage(params);
    return;
  }
  const { conversation, sender, text, attachmentUrl, attachmentName, attachmentType, sessionProposalId } = params;
  const cleanText = sanitizeText(text, 2000);
  if (!cleanText && !attachmentUrl && !sessionProposalId) return;

  const path = `conversations/${conversation.id}/messages`;
  try {
    const batch = writeBatch(db);
    const msgRef = doc(collection(db, path));
    const payload: Record<string, unknown> = {
      senderId: sender.uid,
      senderName: sender.fullName,
      text: cleanText || (attachmentName ? `Shared attachment: ${attachmentName}` : 'Proposed a study session'),
      readBy: [sender.uid],
      createdAt: serverTimestamp(),
    };
    if (attachmentUrl) payload.attachmentUrl = attachmentUrl;
    if (attachmentName) payload.attachmentName = attachmentName;
    if (attachmentType) payload.attachmentType = attachmentType;
    if (sessionProposalId) payload.sessionProposalId = sessionProposalId;

    batch.set(msgRef, payload);

    const nextUnread: Record<string, number> = { ...(conversation.unreadCounts || {}) };
    conversation.participantIds.forEach((pid) => {
      if (pid === sender.uid) {
        nextUnread[pid] = 0;
      } else {
        nextUnread[pid] = (nextUnread[pid] || 0) + 1;
      }
    });

    const convRef = doc(db, 'conversations', conversation.id);
    batch.update(convRef, {
      lastMessageText: (payload.text as string).slice(0, 200),
      lastMessageAt: serverTimestamp(),
      lastMessageSenderId: sender.uid,
      unreadCounts: nextUnread,
      [`typingUsers.${sender.uid}`]: false,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function markConversationRead(
  conversation: Conversation,
  uid: string,
  unreadMessages: ChatMessage[]
): Promise<void> {
  if (!isCloudSession()) {
    localMarkConversationRead(conversation.id, uid);
    return;
  }
  const path = `conversations/${conversation.id}`;
  try {
    const batch = writeBatch(db);
    let hasChanges = false;
    if ((conversation.unreadCounts?.[uid] ?? 0) > 0) {
      batch.update(doc(db, 'conversations', conversation.id), {
        [`unreadCounts.${uid}`]: 0,
        updatedAt: serverTimestamp(),
      });
      hasChanges = true;
    }
    unreadMessages.forEach((msg) => {
      if (!msg.readBy?.includes(uid)) {
        batch.update(doc(db, 'conversations', conversation.id, 'messages', msg.id), {
          readBy: arrayUnion(uid),
        });
        hasChanges = true;
      }
    });
    if (hasChanges) await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function setTypingStatus(
  conversationId: string,
  uid: string,
  isTyping: boolean
): Promise<void> {
  if (!isCloudSession()) {
    localSetTypingStatus(conversationId, uid, isTyping);
    return;
  }
  try {
    await updateDoc(doc(db, 'conversations', conversationId), {
      [`typingUsers.${uid}`]: isTyping,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-critical ephemeral state
  }
}

// ============================================================================
// SCHEDULING & STUDY SESSIONS
// ============================================================================

export function subscribeUserSessions(
  uid: string,
  onData: (sessions: StudySession[]) => void
) {
  if (!isCloudSession()) {
    return localSubscribeSessions(uid, onData);
  }
  const path = 'sessions';
  const q = query(collection(db, path), where('participantIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ ...(d.data() as Omit<StudySession, 'id'>), id: d.id }))
        .sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function createStudySession(params: {
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
}): Promise<string> {
  if (!isCloudSession()) {
    return localCreateSession(params);
  }
  const path = 'sessions';
  try {
    const participantIds = Array.from(new Set([params.creator.uid, ...params.partnerIds]));
    const responses: Record<string, 'pending' | 'accepted' | 'declined'> = {};
    participantIds.forEach((pid) => {
      responses[pid] = pid === params.creator.uid ? 'accepted' : 'pending';
    });

    const sessionRef = doc(collection(db, 'sessions'));
    const batch = writeBatch(db);
    const payload: Record<string, unknown> = {
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (params.conversation) payload.conversationId = params.conversation.id;

    batch.set(sessionRef, payload);

    for (const pid of participantIds) {
      if (pid === params.creator.uid) continue;
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
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
        relatedId: sessionRef.id,
        read: false,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();

    if (params.conversation) {
      await sendChatMessage({
        conversation: params.conversation,
        sender: params.creator,
        text: `Proposed a study session: "${sanitizeText(params.title, 100)}" on ${params.startTime.toLocaleString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })} (${params.durationMinutes} min)`,
        sessionProposalId: sessionRef.id,
      });
    }

    return sessionRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateSessionResponse(
  session: StudySession,
  uid: string,
  response: 'accepted' | 'declined'
): Promise<void> {
  if (!isCloudSession()) {
    localUpdateSessionResponse(session, uid, response);
    return;
  }
  const path = `sessions/${session.id}`;
  try {
    const nextResponses = { ...(session.participantResponses || {}), [uid]: response };
    const otherIds = session.participantIds.filter((id) => id !== session.creatorId);
    const anyAccepted = otherIds.some((id) => nextResponses[id] === 'accepted');
    const allDeclined = otherIds.length > 0 && otherIds.every((id) => nextResponses[id] === 'declined');

    const nextStatus = allDeclined ? 'declined' : anyAccepted ? 'accepted' : session.status;
    await updateDoc(doc(db, 'sessions', session.id), {
      participantResponses: nextResponses,
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function rescheduleSession(
  sessionId: string,
  newStartTime: Date,
  newDurationMinutes: number
): Promise<void> {
  if (!isCloudSession()) {
    localRescheduleSession(sessionId, newStartTime, newDurationMinutes);
    return;
  }
  const path = `sessions/${sessionId}`;
  try {
    await updateDoc(doc(db, 'sessions', sessionId), {
      startTime: Timestamp.fromDate(newStartTime),
      durationMinutes: newDurationMinutes,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function cancelSession(sessionId: string): Promise<void> {
  if (!isCloudSession()) {
    localCancelSession(sessionId);
    return;
  }
  const path = `sessions/${sessionId}`;
  try {
    await updateDoc(doc(db, 'sessions', sessionId), {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function completeSession(session: StudySession, uid: string): Promise<void> {
  if (!isCloudSession()) {
    localCompleteSession(session, uid);
    return;
  }
  const path = `sessions/${session.id}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'sessions', session.id), {
      status: 'completed',
      updatedAt: serverTimestamp(),
    });

    const hoursAdded = Number((session.durationMinutes / 60).toFixed(2));
    batch.update(doc(db, 'users', uid), {
      totalHours: increment(hoursAdded),
      sessionsCompleted: increment(1),
      streakDays: increment(1),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// ============================================================================
// NOTIFICATIONS & REVIEWS
// ============================================================================

export function subscribeUserNotifications(
  uid: string,
  onData: (items: NotificationItem[]) => void
) {
  if (!isCloudSession()) {
    return localSubscribeNotifications(uid, onData);
  }
  const path = 'notifications';
  const q = query(collection(db, path), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ ...(d.data() as Omit<NotificationItem, 'id'>), id: d.id }))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!isCloudSession()) {
    localMarkNotificationRead(id);
    return;
  }
  const path = `notifications/${id}`;
  try {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function markAllNotificationsRead(items: NotificationItem[]): Promise<void> {
  if (!isCloudSession()) {
    localMarkAllNotificationsRead(items);
    return;
  }
  const unread = items.filter((n) => !n.read);
  if (unread.length === 0) return;
  try {
    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'notifications');
  }
}

export async function createReminderNotification(
  uid: string,
  session: StudySession
): Promise<void> {
  if (!isCloudSession()) {
    localCreateReminderNotification(uid, session);
    return;
  }
  const deterministicId = `rem_${uid}_${session.id}`.slice(0, 120);
  const path = `notifications/${deterministicId}`;
  try {
    const refDoc = doc(db, 'notifications', deterministicId);
    const snap = await getDoc(refDoc);
    if (snap.exists()) return;
    await setDoc(refDoc, {
      userId: uid,
      type: 'session_reminder',
      title: `Starting soon: ${session.title}`,
      body: `Your ${session.subject} study session begins in under 30 minutes.`,
      link: '/schedule',
      relatedId: session.id,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export function subscribeUserReviews(
  targetUserId: string,
  onData: (reviews: PartnerReview[]) => void
) {
  if (!isCloudSession()) {
    return localSubscribeReviews(targetUserId, onData);
  }
  const path = 'reviews';
  const q = query(collection(db, path), where('targetUserId', '==', targetUserId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ ...(d.data() as Omit<PartnerReview, 'id'>), id: d.id }))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function submitPartnerReview(params: {
  targetUserId: string;
  author: UserProfile;
  rating: number;
  comment: string;
  subject: string;
}): Promise<void> {
  if (!isCloudSession()) {
    localSubmitReview(params);
    return;
  }
  const path = 'reviews';
  try {
    await addDoc(collection(db, 'reviews'), {
      targetUserId: params.targetUserId,
      authorId: params.author.uid,
      authorName: params.author.fullName,
      authorAvatar: params.author.avatarUrl || '',
      rating: Math.min(5, Math.max(1, Math.round(params.rating))),
      comment: sanitizeText(params.comment, 600),
      subject: sanitizeText(params.subject, 120),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteAccountData(uid: string): Promise<void> {
  if (!isCloudSession()) {
    localDeleteAccount(uid);
    return;
  }
  try {
    await deleteDoc(doc(db, 'users', uid, 'private', 'info')).catch(() => {});
    await deleteDoc(doc(db, 'users', uid));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
  }
}
