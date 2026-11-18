import {
  Timestamp,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { UserProfile } from '../types';
import { auth, db } from './firebase';
import { localSeedUserWorkspace } from './localWorkspace';

export const SAMPLE_PARTNERS: Omit<UserProfile, 'createdAt' | 'updatedAt'>[] = [
  {
    uid: 'sample_maya_lin',
    fullName: 'Maya Lin',
    avatarUrl: '/src/assets/images/avatar_student_maya_1795013373818.jpg',
    university: 'UC Berkeley',
    course: 'Computer Science & Cognitive Science',
    year: '3rd Year',
    bio: 'Love working through LeetCode mediums and dynamic programming together on a whiteboard. Looking for reliable accountability partners for midterms.',
    subjects: ['Data Structures & Algorithms', 'Machine Learning', 'Calculus & Linear Algebra'],
    strengths: ['Data Structures & Algorithms', 'Python & Graph Theory'],
    weaknesses: ['Statistics & Probability', 'Database Systems'],
    availabilitySlots: ['Mon-Evening', 'Tue-Afternoon', 'Wed-Evening', 'Thu-Evening', 'Sat-Morning'],
    studyStyle: 'collaborative',
    studyMode: 'hybrid',
    goals: ['Exam Prep', 'Weekly Problem Sets'],
    visibility: 'public',
    onboardingCompleted: true,
    isOnline: true,
    streakDays: 14,
    totalHours: 48.5,
    sessionsCompleted: 19,
    ratingAvg: 4.9,
    reviewCount: 11,
    weeklyHours: [2.5, 1.5, 3, 2, 1.5, 2.5, 1],
    isSample: true,
  },
  {
    uid: 'sample_liam_oconnor',
    fullName: "Liam O'Connor",
    avatarUrl: '/src/assets/images/avatar_student_liam_1795013374448.jpg',
    university: 'University of Michigan',
    course: 'Mechanical & Systems Engineering',
    year: '2nd Year',
    bio: 'Focused on calculus, physics problem sets, and Pomodoro deep-work blocks. Always happy to explain mechanics concepts if you can help with stats!',
    subjects: ['Calculus & Linear Algebra', 'Physics & Mechanics', 'Statistics & Probability'],
    strengths: ['Physics & Mechanics', 'Calculus & Linear Algebra'],
    weaknesses: ['Academic Writing', 'Machine Learning'],
    availabilitySlots: ['Mon-Morning', 'Wed-Evening', 'Fri-Afternoon', 'Sun-Afternoon'],
    studyStyle: 'pomodoro',
    studyMode: 'online',
    goals: ['Weekly Problem Sets', 'Exam Prep'],
    visibility: 'public',
    onboardingCompleted: true,
    isOnline: true,
    streakDays: 9,
    totalHours: 36,
    sessionsCompleted: 14,
    ratingAvg: 4.8,
    reviewCount: 8,
    weeklyHours: [1.5, 2, 1.5, 2.5, 1, 2, 1.5],
    isSample: true,
  },
  {
    uid: 'sample_priya_nair',
    fullName: 'Priya Nair',
    avatarUrl: '/src/assets/images/avatar_student_priya_1795013374333.jpg',
    university: 'Georgia Tech',
    course: 'Data Science & Analytics',
    year: 'Graduate / Masters',
    bio: 'Grad student tackling statistical modeling, SQL optimization, and ML papers. Looking for structured weekly review calls.',
    subjects: ['Machine Learning', 'Statistics & Probability', 'Database Systems'],
    strengths: ['Statistics & Probability', 'Database Systems'],
    weaknesses: ['Operating Systems', 'Discrete Mathematics'],
    availabilitySlots: ['Tue-Evening', 'Thu-Evening', 'Sat-Afternoon', 'Sun-Morning'],
    studyStyle: 'discussion',
    studyMode: 'online',
    goals: ['Research & Thesis', 'Concept Review'],
    visibility: 'public',
    onboardingCompleted: true,
    isOnline: false,
    streakDays: 21,
    totalHours: 64,
    sessionsCompleted: 26,
    ratingAvg: 5.0,
    reviewCount: 15,
    weeklyHours: [2, 2.5, 2, 3, 2, 3.5, 2],
    isSample: true,
  },
  {
    uid: 'sample_marcus_cole',
    fullName: 'Marcus Cole',
    avatarUrl: '/src/assets/images/avatar_student_marcus_1795013373818.jpg',
    university: 'UT Austin',
    course: 'Software Engineering',
    year: '4th Year',
    bio: 'Senior building distributed systems capstone. Into quiet accountability sessions where we set goals at :00 and check in at :50.',
    subjects: ['Operating Systems', 'Software Engineering', 'Database Systems'],
    strengths: ['Operating Systems', 'Software Engineering'],
    weaknesses: ['Calculus & Linear Algebra', 'Microeconomics'],
    availabilitySlots: ['Mon-Afternoon', 'Wed-Morning', 'Thu-Evening', 'Fri-Morning'],
    studyStyle: 'quiet',
    studyMode: 'hybrid',
    goals: ['Group Projects', 'Accountability Check-ins'],
    visibility: 'public',
    onboardingCompleted: true,
    isOnline: true,
    streakDays: 7,
    totalHours: 29,
    sessionsCompleted: 11,
    ratingAvg: 4.7,
    reviewCount: 6,
    weeklyHours: [1, 1.5, 2, 1.5, 2, 1, 0.5],
    isSample: true,
  },
  {
    uid: 'sample_sofia_alvarez',
    fullName: 'Sofia Alvarez',
    avatarUrl: '',
    university: 'UCLA',
    course: 'Biochemistry & Pre-Med',
    year: '3rd Year',
    bio: 'Pre-med student organizing organic chemistry reaction flashcards and cellular bio active recall quizzes.',
    subjects: ['Organic Chemistry', 'Molecular Biology', 'Neuroscience'],
    strengths: ['Molecular Biology', 'Academic Writing'],
    weaknesses: ['Organic Chemistry', 'Physics & Mechanics'],
    availabilitySlots: ['Tue-Morning', 'Thu-Morning', 'Sat-Morning', 'Sun-Evening'],
    studyStyle: 'collaborative',
    studyMode: 'in-person',
    goals: ['Exam Prep', 'Concept Review'],
    visibility: 'public',
    onboardingCompleted: true,
    isOnline: false,
    streakDays: 12,
    totalHours: 52,
    sessionsCompleted: 22,
    ratingAvg: 4.9,
    reviewCount: 9,
    weeklyHours: [2, 2, 2.5, 1.5, 2, 3, 2],
    isSample: true,
  },
  {
    uid: 'sample_noah_kim',
    fullName: 'Noah Kim',
    avatarUrl: '',
    university: 'University of Washington',
    course: 'Applied Mathematics',
    year: '2nd Year',
    bio: 'Enjoy proving theorems and solving linear algebra & discrete math problem sets with peers who challenge my reasoning.',
    subjects: ['Discrete Mathematics', 'Calculus & Linear Algebra', 'Data Structures & Algorithms'],
    strengths: ['Discrete Mathematics', 'Calculus & Linear Algebra'],
    weaknesses: ['Software Engineering', 'Academic Writing'],
    availabilitySlots: ['Mon-Evening', 'Tue-Evening', 'Thu-Afternoon', 'Sun-Afternoon'],
    studyStyle: 'discussion',
    studyMode: 'online',
    goals: ['Weekly Problem Sets', 'Concept Review'],
    visibility: 'public',
    onboardingCompleted: true,
    isOnline: true,
    streakDays: 16,
    totalHours: 41,
    sessionsCompleted: 17,
    ratingAvg: 4.8,
    reviewCount: 7,
    weeklyHours: [1.5, 2, 1.5, 2, 1.5, 2, 1.5],
    isSample: true,
  },
  {
    uid: 'sample_elena_rostova',
    fullName: 'Elena Rostova',
    avatarUrl: '',
    university: 'NYU',
    course: 'Economics & Finance',
    year: '3rd Year',
    bio: 'Preparing for econometrics and corporate finance exams. Prefer focused silent sprints followed by 10-minute Q&A debriefs.',
    subjects: ['Microeconomics', 'Financial Accounting', 'Statistics & Probability'],
    strengths: ['Microeconomics', 'Financial Accounting'],
    weaknesses: ['Statistics & Probability', 'Data Structures & Algorithms'],
    availabilitySlots: ['Mon-Morning', 'Wed-Afternoon', 'Fri-Afternoon', 'Sat-Afternoon'],
    studyStyle: 'pomodoro',
    studyMode: 'hybrid',
    goals: ['Exam Prep', 'Accountability Check-ins'],
    visibility: 'public',
    onboardingCompleted: true,
    isOnline: false,
    streakDays: 5,
    totalHours: 24,
    sessionsCompleted: 10,
    ratingAvg: 4.6,
    reviewCount: 5,
    weeklyHours: [1, 1, 1.5, 1.5, 2, 1, 1],
    isSample: true,
  },
  {
    uid: 'sample_devon_brooks',
    fullName: 'Devon Brooks',
    avatarUrl: '',
    university: 'Boston University',
    course: 'Neuroscience & Psychology',
    year: '4th Year',
    bio: 'Writing senior honors thesis on memory consolidation. Down for quiet co-working mornings or neuroanatomy quiz sessions.',
    subjects: ['Neuroscience', 'Cognitive Psychology', 'Molecular Biology'],
    strengths: ['Cognitive Psychology', 'Academic Writing'],
    weaknesses: ['Statistics & Probability', 'Organic Chemistry'],
    availabilitySlots: ['Tue-Morning', 'Wed-Morning', 'Fri-Morning', 'Sun-Morning'],
    studyStyle: 'quiet',
    studyMode: 'online',
    goals: ['Research & Thesis', 'Accountability Check-ins'],
    visibility: 'public',
    onboardingCompleted: true,
    isOnline: true,
    streakDays: 11,
    totalHours: 38,
    sessionsCompleted: 15,
    ratingAvg: 4.9,
    reviewCount: 10,
    weeklyHours: [1.5, 2, 2, 1, 2, 1.5, 1],
    isSample: true,
  },
  {
    uid: 'sample_hana_takahashi',
    fullName: 'Hana Takahashi',
    avatarUrl: '',
    university: 'UIUC',
    course: 'Computer Engineering',
    year: '2nd Year',
    bio: 'Working through systems programming, discrete math, and digital logic. Looking for evening study sessions.',
    subjects: ['Data Structures & Algorithms', 'Operating Systems', 'Discrete Mathematics'],
    strengths: ['Data Structures & Algorithms', 'Operating Systems'],
    weaknesses: ['Physics & Mechanics', 'Calculus & Linear Algebra'],
    availabilitySlots: ['Mon-Evening', 'Wed-Evening', 'Fri-Evening', 'Sat-Evening'],
    studyStyle: 'collaborative',
    studyMode: 'online',
    goals: ['Weekly Problem Sets', 'Group Projects'],
    visibility: 'public',
    onboardingCompleted: true,
    isOnline: false,
    streakDays: 8,
    totalHours: 31,
    sessionsCompleted: 13,
    ratingAvg: 4.8,
    reviewCount: 6,
    weeklyHours: [1.5, 1, 2, 1.5, 2, 2, 1],
    isSample: true,
  },
  {
    uid: 'sample_caleb_wright',
    fullName: 'Caleb Wright',
    avatarUrl: '',
    university: 'University of Toronto',
    course: 'Life Sciences & Chemistry',
    year: '1st Year',
    bio: 'First-year student getting ahead on organic chem mechanisms and bio labs. Very consistent with scheduled slots!',
    subjects: ['Organic Chemistry', 'Molecular Biology', 'Calculus & Linear Algebra'],
    strengths: ['Molecular Biology', 'Academic Writing'],
    weaknesses: ['Organic Chemistry', 'Calculus & Linear Algebra'],
    availabilitySlots: ['Tue-Afternoon', 'Thu-Afternoon', 'Sat-Morning', 'Sun-Afternoon'],
    studyStyle: 'pomodoro',
    studyMode: 'hybrid',
    goals: ['Exam Prep', 'Concept Review'],
    visibility: 'public',
    onboardingCompleted: true,
    isOnline: true,
    streakDays: 6,
    totalHours: 22,
    sessionsCompleted: 9,
    ratingAvg: 4.7,
    reviewCount: 4,
    weeklyHours: [1, 1.5, 1, 1.5, 1, 2, 1.5],
    isSample: true,
  },
  {
    uid: 'sample_amara_okafor',
    fullName: 'Amara Okafor',
    avatarUrl: '',
    university: 'Imperial College',
    course: 'Artificial Intelligence',
    year: 'Graduate / Masters',
    bio: 'Deep learning researcher & teaching assistant. Happy to trade ML architecture walkthroughs for academic paper proofreading.',
    subjects: ['Machine Learning', 'Statistics & Probability', 'Academic Writing'],
    strengths: ['Machine Learning', 'Data Structures & Algorithms'],
    weaknesses: ['Academic Writing', 'Microeconomics'],
    availabilitySlots: ['Mon-Afternoon', 'Wed-Evening', 'Thu-Evening', 'Sat-Afternoon'],
    studyStyle: 'discussion',
    studyMode: 'online',
    goals: ['Research & Thesis', 'Group Projects'],
    visibility: 'public',
    onboardingCompleted: true,
    isOnline: true,
    streakDays: 19,
    totalHours: 59,
    sessionsCompleted: 23,
    ratingAvg: 5.0,
    reviewCount: 14,
    weeklyHours: [2.5, 2, 2.5, 2, 2, 3, 1.5],
    isSample: true,
  },
  {
    uid: 'sample_lucas_bennett',
    fullName: 'Lucas Bennett',
    avatarUrl: '',
    university: 'Penn State',
    course: 'Accounting & Analytics',
    year: '3rd Year',
    bio: 'Building spreadsheet models and prepping for CPA prerequisites. Always down for focused library or Zoom study sprints.',
    subjects: ['Financial Accounting', 'Microeconomics', 'Database Systems'],
    strengths: ['Financial Accounting', 'Database Systems'],
    weaknesses: ['Calculus & Linear Algebra', 'Statistics & Probability'],
    availabilitySlots: ['Mon-Morning', 'Tue-Evening', 'Thu-Morning', 'Sun-Evening'],
    studyStyle: 'quiet',
    studyMode: 'hybrid',
    goals: ['Exam Prep', 'Accountability Check-ins'],
    visibility: 'public',
    onboardingCompleted: true,
    isOnline: false,
    streakDays: 10,
    totalHours: 33,
    sessionsCompleted: 12,
    ratingAvg: 4.8,
    reviewCount: 7,
    weeklyHours: [1.5, 1.5, 1, 2, 1.5, 1, 1.5],
    isSample: true,
  },
];

let seededPartnersOnce = false;

/**
 * Ensures the 12 realistic sample academic partner profiles exist in Firestore so Find Partners
 * and Recommended Matches are richly populated on first run.
 */
export async function ensureSamplePartnersSeeded(): Promise<void> {
  if (seededPartnersOnce) return;
  try {
    const existing = await getDocs(
      query(collection(db, 'users'), where('isSample', '==', true), limit(1))
    );
    if (!existing.empty) {
      seededPartnersOnce = true;
      return;
    }

    const batch = writeBatch(db);
    for (const partner of SAMPLE_PARTNERS) {
      const ref = doc(db, 'users', partner.uid);
      batch.set(ref, {
        ...partner,
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    seededPartnersOnce = true;
  } catch (err) {
    console.warn('Sample partners seed skipped or deferred:', err);
  }
}

/**
 * Seeds starter connections, 1-to-1 and group chats, sample messages, upcoming/completed sessions,
 * notifications, and partner reviews scoped to a newly onboarded user.
 */
export async function seedUserStarterWorkspace(uid: string, fullName: string): Promise<void> {
  if (!auth.currentUser) {
    localSeedUserWorkspace(uid, fullName);
    return;
  }
  try {
    // Check if user already has any connections or sessions
    const existingConn = await getDocs(
      query(collection(db, 'connections'), where('participantIds', 'array-contains', uid), limit(1))
    );
    if (!existingConn.empty) return;

    const batch = writeBatch(db);

    // 1. Starter connections (2 accepted, 1 incoming pending request)
    const conn1Ref = doc(db, 'connections', `conn_${uid}_maya`);
    batch.set(conn1Ref, {
      fromUserId: uid,
      toUserId: 'sample_maya_lin',
      participantIds: [uid, 'sample_maya_lin'],
      status: 'accepted',
      message: 'Hey Maya! Would love to prep algorithms and problem sets together.',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const conn2Ref = doc(db, 'connections', `conn_${uid}_liam`);
    batch.set(conn2Ref, {
      fromUserId: 'sample_liam_oconnor',
      toUserId: uid,
      participantIds: ['sample_liam_oconnor', uid],
      status: 'accepted',
      message: 'Saw we share evening availability — up for Pomodoro sprints?',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const conn3Ref = doc(db, 'connections', `conn_priya_${uid}`);
    batch.set(conn3Ref, {
      fromUserId: 'sample_priya_nair',
      toUserId: uid,
      participantIds: ['sample_priya_nair', uid],
      status: 'pending',
      message: 'Hi! Looking for a weekly partner to review ML & Statistics concepts.',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Starter 1-to-1 conversation with Maya Lin
    const convDirectId = `conv_${uid}_maya`;
    const convDirectRef = doc(db, 'conversations', convDirectId);
    batch.set(convDirectRef, {
      type: 'direct',
      participantIds: [uid, 'sample_maya_lin'],
      createdBy: uid,
      lastMessageText: 'Sounds great! Let me know if Thursday 6pm works for dynamic programming.',
      lastMessageAt: serverTimestamp(),
      lastMessageSenderId: 'sample_maya_lin',
      unreadCounts: { [uid]: 1, sample_maya_lin: 0 },
      typingUsers: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const msg1Ref = doc(db, 'conversations', convDirectId, 'messages', 'msg_init_1');
    batch.set(msg1Ref, {
      senderId: 'sample_maya_lin',
      senderName: 'Maya Lin',
      text: `Hey ${fullName.split(' ')[0]}! Excited to connect on StudyMate. Which topics are top priority for you this week?`,
      readBy: ['sample_maya_lin'],
      createdAt: serverTimestamp(),
    });

    const msg2Ref = doc(db, 'conversations', convDirectId, 'messages', 'msg_init_2');
    batch.set(msg2Ref, {
      senderId: 'sample_maya_lin',
      senderName: 'Maya Lin',
      text: 'Sounds great! Let me know if Thursday 6pm works for dynamic programming.',
      readBy: ['sample_maya_lin'],
      createdAt: serverTimestamp(),
    });

    // 3. Starter Study Group Conversation
    const groupConvId = `group_algo_${uid.slice(0, 12)}`;
    const groupConvRef = doc(db, 'conversations', groupConvId);
    batch.set(groupConvRef, {
      type: 'group',
      name: 'Algorithms & Exam Prep Squad',
      subject: 'Data Structures & Algorithms',
      description: 'Weekly problem-solving sprints, whiteboard walkthroughs, and midterm prep.',
      participantIds: [uid, 'sample_maya_lin', 'sample_noah_kim', 'sample_hana_takahashi'],
      createdBy: uid,
      lastMessageText: 'Noah shared a graph traversal practice sheet for our next sprint!',
      lastMessageAt: serverTimestamp(),
      lastMessageSenderId: 'sample_noah_kim',
      unreadCounts: { [uid]: 1 },
      typingUsers: {},
      isPublicGroup: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const groupMsgRef = doc(db, 'conversations', groupConvId, 'messages', 'msg_group_1');
    batch.set(groupMsgRef, {
      senderId: 'sample_noah_kim',
      senderName: 'Noah Kim',
      text: 'Noah shared a graph traversal practice sheet for our next sprint!',
      readBy: ['sample_noah_kim'],
      createdAt: serverTimestamp(),
    });

    // Discoverable public group the user hasn't joined yet? They can join via Study Groups!
    // Note: creator must be in participantIds per rules, so we include uid in one and let user create more!

    // 4. Starter Study Sessions (upcoming + past)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);

    const inThreeDays = new Date();
    inThreeDays.setDate(inThreeDays.getDate() + 3);
    inThreeDays.setHours(15, 0, 0, 0);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(17, 0, 0, 0);

    const sess1Ref = doc(db, 'sessions', `sess_${uid}_1`);
    batch.set(sess1Ref, {
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const sess2Ref = doc(db, 'sessions', `sess_${uid}_2`);
    batch.set(sess2Ref, {
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const sess3Ref = doc(db, 'sessions', `sess_${uid}_3`);
    batch.set(sess3Ref, {
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 5. Starter Notifications
    const notif1Ref = doc(db, 'notifications', `notif_${uid}_1`);
    batch.set(notif1Ref, {
      userId: uid,
      type: 'connection_request',
      title: 'New partner request from Priya Nair',
      body: 'Priya wants to connect for Machine Learning & Statistics review.',
      link: '/partners',
      relatedId: `conn_priya_${uid}`,
      read: false,
      createdAt: serverTimestamp(),
    });

    const notif2Ref = doc(db, 'notifications', `notif_${uid}_2`);
    batch.set(notif2Ref, {
      userId: uid,
      type: 'session_invite',
      title: 'Session invite from Liam O’Connor',
      body: 'Calculus & Linear Algebra Review scheduled in 3 days.',
      link: '/schedule',
      relatedId: `sess_${uid}_2`,
      read: false,
      createdAt: serverTimestamp(),
    });

    // 6. Starter Review
    const revRef = doc(db, 'reviews', `rev_${uid}_1`);
    batch.set(revRef, {
      targetUserId: uid,
      authorId: 'sample_maya_lin',
      authorName: 'Maya Lin',
      authorAvatar: '/src/assets/images/avatar_student_maya_1795013373818.jpg',
      rating: 5,
      subject: 'Data Structures & Algorithms',
      comment: 'Super reliable and came prepared with clean notes for our practice problems!',
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (err) {
    console.warn('Starter workspace seed skipped:', err);
  }
}
