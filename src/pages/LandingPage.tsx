import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  MessageSquare,
  Moon,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Avatar } from '../components/common/Avatar';

const FAQS = [
  {
    q: 'How does StudyMate match me with academic partners?',
    a: 'StudyMate calculates compatibility from your enrolled subjects, complementary strengths and weak areas, overlapping weekly availability slots, and preferred study style (quiet co-working, Pomodoro sprints, or active discussion).',
  },
  {
    q: 'Can I schedule both 1-on-1 and group study sessions?',
    a: 'Yes. You can invite a single connected peer or spin up a study group for your course, check overlapping free slots, detect calendar conflicts automatically, and switch between online video links and campus locations.',
  },
  {
    q: 'How does real-time chat work?',
    a: 'All direct and group threads sync in real time with typing indicators, read receipts, day-grouped messages, file/image attachments, and one-click study session proposals directly inside chat.',
  },
  {
    q: 'Is my email or private schedule hidden from strangers?',
    a: 'Yes. Email addresses and notification preferences are stored in an owner-only private collection. You can also set your profile visibility to Public, Connections Only, or Private anytime in Settings.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Maya Lin',
    role: 'Computer Science, 3rd Year · UC Berkeley',
    avatar: '/src/assets/images/avatar_student_maya_1795013373818.jpg',
    quote:
      'I struggled to find reliable algorithms partners outside crowded lecture halls. Within two days on StudyMate I matched with two peers sharing my exact Tuesday and Thursday evening slots, and we stayed consistent all semester.',
  },
  {
    name: "Liam O'Connor",
    role: 'Mechanical Engineering, 2nd Year · UMich',
    avatar: '/src/assets/images/avatar_student_liam_1795013374448.jpg',
    quote:
      'The overlapping availability picker saved us endless back-and-forth texts. We went from missing review sessions to logging 8 focused hours a week before finals.',
  },
  {
    name: 'Priya Nair',
    role: 'Data Science M.S. · Georgia Tech',
    avatar: '/src/assets/images/avatar_student_priya_1795013374333.jpg',
    quote:
      'Pairing strengths with weak areas is genius—I traded statistics walkthroughs for systems design help, and proposing sessions straight from chat kept everyone accountable.',
  },
];

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [heroImgErr, setHeroImgErr] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            <span className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </span>
            StudyMate
          </Link>

          <nav
            aria-label="Landing sections"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <a href="#how-it-works" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0">
              How It Works
            </a>
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0">
              Features
            </a>
            <a href="#testimonials" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0">
              Testimonials
            </a>
            <a href="#faq" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              to={isAuthenticated ? '/dashboard' : '/signup'}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
            >
              {isAuthenticated ? 'Open Dashboard' : 'Get Started'}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-20 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-sm font-semibold text-teal-700 dark:text-teal-400 mb-3">
              Academic Peer Matching · Real-Time Chat · Conflict-Free Scheduling
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] text-balance">
              Find your perfect study partner
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              Match with reliable classmates by subject, academic strengths, weekly schedule, and
              study style—then coordinate in real-time chat and plan conflict-free sessions in one
              calm workspace.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to={isAuthenticated ? '/dashboard' : '/signup'}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-sm transition-colors whitespace-nowrap"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Sign up free'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  Log in
                </Link>
              )}
            </div>

            <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-6 max-w-lg">
              <div>
                <p className="font-display text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  12+
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Active sample peers ready to match
                </p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  94%
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Session show-up consistency
                </p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  30m
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Pre-session smart reminders
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 flex">
            <div className="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-sm min-h-[320px] lg:min-h-[440px]">
              {!heroImgErr ? (
                <img
                  src="/src/assets/images/hero_studymate_collab_1795013373913.jpg"
                  alt="University students collaborating around a sunlit study table with laptops and notebooks"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgErr(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 bg-gradient-to-br from-indigo-50 to-teal-50 dark:from-indigo-950 dark:to-slate-900 text-center">
                  <BookOpen className="h-12 w-12 text-indigo-600 mb-3" />
                  <p className="font-display font-bold text-lg">Collaborative Study Workspace</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (3 steps) */}
      <section
        id="how-it-works"
        className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 py-16 lg:py-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
              How StudyMate works in three focused steps
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">
              Skip unreliable group chats and mismatched schedules. Go from signup to your first
              booked session in under three minutes.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Set your academic profile',
                desc: 'Add your university, course, subjects, strengths, areas needing review, and weekly free time blocks.',
              },
              {
                step: '02',
                title: 'Match with compatible peers',
                desc: 'Filter by subject, year, and study style. See instant compatibility scores and overlapping availability.',
              },
              {
                step: '03',
                title: 'Chat and schedule together',
                desc: 'Message 1-on-1 or in study groups, share notes, and lock in conflict-free sessions with 30-minute reminders.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 p-6"
              >
                <span className="font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {item.step}
                </span>
                <h3 className="mt-3 font-display text-lg font-bold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section id="features" className="py-16 lg:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
            Built for real academic accountability
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Every workflow keeps focus high and scheduling friction near zero.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Sparkles,
              title: 'Smart Compatibility %',
              desc: 'Weighted matching scores combine shared courses, complementary strengths, and overlapping free slots.',
            },
            {
              icon: MessageSquare,
              title: 'Real-Time Peer Chat',
              desc: '1-to-1 and group chats with typing indicators, read receipts, image/file sharing, and session invites.',
            },
            {
              icon: CalendarCheck,
              title: 'Conflict-Aware Calendar',
              desc: 'Month, week, and day views with automatic overlap detection and 30-minute pre-session alerts.',
            },
            {
              icon: Users,
              title: 'Course Study Groups',
              desc: 'Spin up topic squads for exam prep or team projects and keep every discussion organized.',
            },
          ].map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs"
              >
                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-slate-900 dark:text-white">
                  {feat.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials */}
      <section
        id="testimonials"
        className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 py-16 lg:py-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Trusted by students across majors
          </h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 p-6 flex flex-col justify-between"
              >
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  “{t.quote}”
                </p>
                <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800">
                  <Avatar src={t.avatar} name={t.name} size="md" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 lg:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-center">
          Frequently asked questions
        </h2>
        <div className="mt-8 space-y-3">
          {FAQS.map((item, idx) => {
            const open = openFaq === idx;
            return (
              <div
                key={item.q}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenFaq(open ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-display font-semibold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-500 shrink-0 transition-transform ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {open && (
                  <div className="px-6 pb-5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-14 rounded-2xl bg-indigo-600 text-white p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-2xl font-bold">Ready for more consistent study weeks?</h3>
            <p className="mt-1.5 text-sm text-indigo-100 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Free student account with real-time chat and calendar sync
            </p>
          </div>
          <Link
            to={isAuthenticated ? '/dashboard' : '/signup'}
            className="px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold text-sm hover:bg-indigo-50 transition-colors whitespace-nowrap shrink-0"
          >
            {isAuthenticated ? 'Open Dashboard' : 'Create Free Account'}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} StudyMate. Built for focused peer learning.</p>
          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-slate-900 dark:hover:text-white">
              Log in
            </Link>
            <Link to="/signup" className="hover:text-slate-900 dark:hover:text-white">
              Create account
            </Link>
            <a href="#faq" className="hover:text-slate-900 dark:hover:text-white">
              FAQ
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
