import { Timestamp } from 'firebase/firestore';

export type StudyStyle = 'quiet' | 'collaborative' | 'discussion' | 'pomodoro';
export type StudyMode = 'online' | 'in-person' | 'hybrid';
export type ProfileVisibility = 'public' | 'connections' | 'private';

export interface UserProfile {
  uid: string;
  fullName: string;
  avatarUrl: string;
  university: string;
  course: string;
  year: string;
  bio: string;
  subjects: string[];
  strengths: string[];
  weaknesses: string[];
  availabilitySlots: string[]; // e.g., ["Mon-Morning", "Wed-Evening"]
  studyStyle: StudyStyle;
  studyMode: StudyMode;
  goals: string[];
  visibility: ProfileVisibility;
  onboardingCompleted: boolean;
  isOnline: boolean;
  lastSeen?: Timestamp | null;
  streakDays: number;
  totalHours: number;
  sessionsCompleted: number;
  ratingAvg: number;
  reviewCount: number;
  weeklyHours: number[]; // 7 entries Mon..Sun
  isSample?: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface NotificationPrefs {
  sessionReminders: boolean;
  messageAlerts: boolean;
  connectionRequests: boolean;
  emailDigest: boolean;
}

export interface PrivacyPrefs {
  showOnlineStatus: boolean;
  allowGroupInvites: boolean;
}

export interface PrivateUserInfo {
  uid: string;
  email: string;
  notificationPrefs: NotificationPrefs;
  privacyPrefs: PrivacyPrefs;
  updatedAt?: Timestamp | null;
}

export type ConnectionStatus = 'pending' | 'accepted' | 'declined';

export interface Connection {
  id: string;
  fromUserId: string;
  toUserId: string;
  participantIds: string[];
  status: ConnectionStatus;
  message?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string;
  subject?: string;
  description?: string;
  participantIds: string[];
  createdBy: string;
  lastMessageText?: string;
  lastMessageAt?: Timestamp | null;
  lastMessageSenderId?: string;
  unreadCounts: Record<string, number>;
  typingUsers: Record<string, boolean>;
  isPublicGroup?: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  sessionProposalId?: string;
  readBy: string[];
  createdAt?: Timestamp | null;
}

export type SessionMode = 'online' | 'in-person';
export type SessionStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';

export interface StudySession {
  id: string;
  title: string;
  subject: string;
  creatorId: string;
  participantIds: string[];
  participantResponses: Record<string, 'pending' | 'accepted' | 'declined'>;
  startTime: Timestamp;
  durationMinutes: number;
  mode: SessionMode;
  locationOrLink: string;
  notes?: string;
  status: SessionStatus;
  conversationId?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type NotificationType =
  | 'connection_request'
  | 'connection_accepted'
  | 'session_invite'
  | 'session_update'
  | 'session_reminder'
  | 'message'
  | 'review';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  relatedId?: string;
  read: boolean;
  createdAt?: Timestamp | null;
}

export interface PartnerReview {
  id: string;
  targetUserId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  rating: number;
  comment: string;
  subject?: string;
  createdAt?: Timestamp | null;
}

export interface MatchBreakdown {
  score: number;
  sharedSubjects: string[];
  complementaryTopics: string[];
  sharedSlots: string[];
}
