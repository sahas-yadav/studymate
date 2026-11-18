import { MatchBreakdown, StudySession, UserProfile } from '../types';

export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const TIME_BLOCKS = [
  { id: 'Morning', label: 'Morning (8am–12pm)', startHour: 9 },
  { id: 'Afternoon', label: 'Afternoon (12pm–5pm)', startHour: 14 },
  { id: 'Evening', label: 'Evening (5pm–9pm)', startHour: 18 },
  { id: 'Night', label: 'Late Night (9pm–12am)', startHour: 21 },
] as const;

export const SUBJECT_CATALOG = [
  'Data Structures & Algorithms',
  'Calculus & Linear Algebra',
  'Machine Learning',
  'Organic Chemistry',
  'Microeconomics',
  'Database Systems',
  'Physics & Mechanics',
  'Molecular Biology',
  'Statistics & Probability',
  'Operating Systems',
  'Cognitive Psychology',
  'Academic Writing',
  'Discrete Mathematics',
  'Financial Accounting',
  'Software Engineering',
  'Neuroscience',
];

export const STUDY_GOALS = [
  'Exam Prep',
  'Weekly Problem Sets',
  'Group Projects',
  'Accountability Check-ins',
  'Concept Review',
  'Research & Thesis',
];

export const YEAR_OPTIONS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  'Graduate / Masters',
  'PhD / Researcher',
];

/**
 * Sanitizes text input to strip dangerous control characters and trim excess whitespace.
 */
export function sanitizeText(input: string, maxLength = 500): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Evaluates password strength on a 0..4 scale with human-readable label and checklist.
 */
export function evaluatePasswordStrength(password: string) {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return {
    score,
    label: password.length === 0 ? 'Enter a password' : labels[score],
    checks,
  };
}

/**
 * Computes compatibility score (0-99%) between current user and a peer
 * based on shared subjects, complementary strengths/weaknesses, availability overlap, and study style/mode.
 */
export function calculateMatchScore(me: UserProfile | null, peer: UserProfile): MatchBreakdown {
  if (!me) {
    return {
      score: 75,
      sharedSubjects: peer.subjects.slice(0, 2),
      complementaryTopics: [],
      sharedSlots: peer.availabilitySlots.slice(0, 2),
    };
  }

  const mySubjects = new Set(me.subjects.map((s) => s.toLowerCase()));
  const sharedSubjects = peer.subjects.filter((s) => mySubjects.has(s.toLowerCase()));

  const myWeaknesses = new Set(me.weaknesses.map((s) => s.toLowerCase()));
  const complementaryTopics = peer.strengths.filter((s) => myWeaknesses.has(s.toLowerCase()));

  const mySlots = new Set(me.availabilitySlots);
  const sharedSlots = peer.availabilitySlots.filter((slot) => mySlots.has(slot));

  let score = 38;
  // Shared subjects up to +32
  const subjectDenominator = Math.max(1, Math.min(me.subjects.length, peer.subjects.length));
  score += Math.min(32, Math.round((sharedSubjects.length / subjectDenominator) * 32));

  // Shared availability up to +18
  score += Math.min(18, sharedSlots.length * 4);

  // Complementary strengths/weaknesses +8
  if (complementaryTopics.length > 0) {
    score += Math.min(8, complementaryTopics.length * 4);
  }

  // Study style & mode alignment
  if (me.studyStyle === peer.studyStyle) score += 5;
  if (me.studyMode === peer.studyMode || me.studyMode === 'hybrid' || peer.studyMode === 'hybrid') {
    score += 4;
  }

  return {
    score: Math.min(99, Math.max(42, score)),
    sharedSubjects,
    complementaryTopics,
    sharedSlots,
  };
}

/**
 * Finds overlapping availability slots between the current user and one or more selected partners.
 */
export function getOverlappingSlots(me: UserProfile | null, partners: UserProfile[]): string[] {
  if (!me || partners.length === 0) return me?.availabilitySlots ?? [];
  let intersection = new Set(me.availabilitySlots);
  for (const partner of partners) {
    const partnerSlots = new Set(partner.availabilitySlots);
    intersection = new Set([...intersection].filter((slot) => partnerSlots.has(slot)));
  }
  return Array.from(intersection);
}

/**
 * Converts a slot key like "Wed-Evening" into the next upcoming Date object matching that day and time block.
 */
export function getNextDateForSlot(slotKey: string): Date {
  const [dayStr, blockId] = slotKey.split('-');
  const dayIndexMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const targetDay = dayIndexMap[dayStr] ?? 1;
  const block = TIME_BLOCKS.find((b) => b.id === blockId);
  const hour = block?.startHour ?? 14;

  const now = new Date();
  const result = new Date(now);
  result.setHours(hour, 0, 0, 0);
  const diff = (targetDay - now.getDay() + 7) % 7;
  result.setDate(now.getDate() + (diff === 0 && result <= now ? 7 : diff));
  return result;
}

/**
 * Detects overlapping sessions for conflict warnings before creating or rescheduling.
 */
export function findSessionConflicts(
  candidateStart: Date,
  durationMinutes: number,
  existingSessions: StudySession[],
  ignoreSessionId?: string
): StudySession[] {
  const candidateEnd = new Date(candidateStart.getTime() + durationMinutes * 60_000);
  return existingSessions.filter((s) => {
    if (s.id === ignoreSessionId) return false;
    if (s.status === 'cancelled' || s.status === 'declined') return false;
    const sStart = s.startTime.toDate();
    const sEnd = new Date(sStart.getTime() + s.durationMinutes * 60_000);
    return candidateStart < sEnd && candidateEnd > sStart;
  });
}

export function formatSlotLabel(slotKey: string): string {
  return slotKey.replace('-', ' · ');
}

export function formatRelativeTime(date?: Date | null): string {
  if (!date) return '';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDayGroupLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
