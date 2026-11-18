import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Calendar,
  Compass,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  Search,
  Settings,
  Sun,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { markAllNotificationsRead, markNotificationRead } from '../../services/firestoreService';
import { NotificationItem } from '../../types';
import { formatRelativeTime } from '../../utils/matching';
import { Avatar } from '../common/Avatar';

interface AppShellProps {
  children: React.ReactNode;
  unreadMessages: number;
  unreadNotifications: number;
  notifications: NotificationItem[];
  pageTitle?: string;
  onQuickSearch?: (query: string) => void;
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/partners', label: 'Find Partners', icon: Compass },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/schedule', label: 'Schedule', icon: Calendar },
  { to: '/groups', label: 'Study Groups', icon: Users },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const MOBILE_NAV_ITEMS = NAV_ITEMS.slice(0, 5);

export function AppShell({
  children,
  unreadMessages,
  unreadNotifications,
  notifications,
  pageTitle,
  onQuickSearch,
}: AppShellProps) {
  const { userProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onQuickSearch) {
      onQuickSearch(searchValue);
    } else if (searchValue.trim()) {
      navigate(`/partners?q=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  const handleNotifClick = async (n: NotificationItem) => {
    if (!n.read) {
      await markNotificationRead(n.id).catch(() => {});
    }
    setNotifOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside
        aria-label="Primary navigation"
        className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-30"
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            <span className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <BookOpen className="h-4 w-4" />
            </span>
            StudyMate
          </Link>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                  }`
                }
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {item.to === '/chat' && unreadMessages > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold tabular-nums bg-teal-600 text-white">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 p-3.5">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Weekly Study Goal
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
              {userProfile?.totalHours?.toFixed(1) ?? '0.0'} hrs logged · {userProfile?.streakDays ?? 0} day streak
            </p>
            <div className="mt-2.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round(((userProfile?.totalHours ?? 0) / 15) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              to="/dashboard"
              className="lg:hidden flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white shrink-0"
            >
              <span className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <BookOpen className="h-3.5 w-3.5" />
              </span>
              StudyMate
            </Link>

            {pageTitle && (
              <h1 className="hidden lg:block font-display text-lg font-bold text-slate-900 dark:text-white truncate">
                {pageTitle}
              </h1>
            )}

            <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center flex-1 max-w-md ml-2 lg:ml-6">
              <div className="relative w-full">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search partners, subjects, or courses..."
                  aria-label="Search partners or subjects"
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </form>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Notifications Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                aria-label={`Notifications (${unreadNotifications} unread)`}
                aria-expanded={notifOpen}
                className="relative p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden z-40">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Notifications
                    </span>
                    {unreadNotifications > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllNotificationsRead(notifications)}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        You are all caught up.
                      </div>
                    ) : (
                      notifications.slice(0, 12).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleNotifClick(n)}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                            !n.read ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {n.title}
                            </p>
                            <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">
                              {formatRelativeTime(n.createdAt?.toDate())}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {n.body}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar Menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Open account menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2.5 p-1 pr-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Avatar src={userProfile?.avatarUrl} name={userProfile?.fullName || 'Student'} size="sm" />
                <span className="hidden md:inline text-sm font-medium text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                  {userProfile?.fullName || 'Student'}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1.5 z-40">
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {userProfile?.fullName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {userProfile?.course || 'Academic Member'}
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      setMenuOpen(false);
                      await logout();
                      navigate('/');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-16 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md grid grid-cols-5 px-1"
      >
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span className="truncate max-w-[64px]">{item.label.split(' ')[0]}</span>
              {item.to === '/chat' && unreadMessages > 0 && (
                <span className="absolute top-1.5 right-3 h-4 min-w-[16px] px-1 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadMessages}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
