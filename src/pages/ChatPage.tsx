import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  CheckCheck,
  FileText,
  Paperclip,
  Search,
  Send,
  Smile,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import {
  markConversationRead,
  sendChatMessage,
  setTypingStatus,
  subscribeMessages,
  uploadMediaFile,
} from '../services/firestoreService';
import { ChatMessage } from '../types';
import { formatDayGroupLabel, formatRelativeTime } from '../utils/matching';
import { Avatar } from '../components/common/Avatar';
import { AppShell } from '../components/layout/AppShell';
import { CreateSessionModal } from '../components/modals/CreateSessionModal';

const QUICK_EMOJIS = ['👋', '📚', '✅', '🎯', '💡', '🔥', '🙌', '⏰'];

export function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { showToast } = useToast();

  const {
    peers,
    usersById,
    conversations,
    sessions,
    notifications,
    totalUnreadMessages,
    unreadNotificationsCount,
  } = useWorkspaceData();

  const [convSearch, setConvSearch] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [proposeModalOpen, setProposeModalOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const activeConv = useMemo(() => {
    if (conversationId) {
      return conversations.find((c) => c.id === conversationId) || null;
    }
    return conversations[0] || null;
  }, [conversations, conversationId]);

  const filteredConversations = useMemo(() => {
    const q = convSearch.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const otherId = c.participantIds.find((id) => id !== userProfile?.uid);
      const otherName = otherId ? usersById[otherId]?.fullName || '' : '';
      const title = c.type === 'group' ? c.name || '' : otherName;
      return title.toLowerCase().includes(q) || (c.subject || '').toLowerCase().includes(q);
    });
  }, [conversations, convSearch, userProfile?.uid, usersById]);

  useEffect(() => {
    if (!activeConv) {
      setMessages([]);
      return;
    }
    const unsub = subscribeMessages(activeConv.id, setMessages);
    return () => unsub();
  }, [activeConv?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConv?.id]);

  useEffect(() => {
    if (!activeConv || !userProfile) return;
    const unreadMsgs = messages.filter(
      (m) => m.senderId !== userProfile.uid && !m.readBy?.includes(userProfile.uid)
    );
    const hasConvUnread = (activeConv.unreadCounts?.[userProfile.uid] ?? 0) > 0;
    if (unreadMsgs.length > 0 || hasConvUnread) {
      markConversationRead(activeConv, userProfile.uid, unreadMsgs).catch(() => {});
    }
  }, [activeConv?.id, messages, userProfile?.uid]);

  const handleDraftChange = (val: string) => {
    setDraft(val);
    if (!activeConv || !userProfile) return;
    setTypingStatus(activeConv.id, userProfile.uid, val.trim().length > 0);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      setTypingStatus(activeConv.id, userProfile.uid, false);
    }, 2200);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !userProfile || !draft.trim()) return;
    setSending(true);
    try {
      const textToSend = draft;
      setDraft('');
      setEmojiOpen(false);
      await sendChatMessage({
        conversation: activeConv,
        sender: userProfile,
        text: textToSend,
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Message failed to send', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv || !userProfile) return;
    setUploading(true);
    try {
      const uploaded = await uploadMediaFile(
        file,
        `chat/${activeConv.id}/${Date.now()}_${file.name}`
      );
      await sendChatMessage({
        conversation: activeConv,
        sender: userProfile,
        text: draft.trim() || `Shared ${uploaded.name}`,
        attachmentUrl: uploaded.url,
        attachmentName: uploaded.name,
        attachmentType: uploaded.type,
      });
      setDraft('');
      showToast('Attachment sent', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Attachment failed', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const groupedMessages = useMemo(() => {
    const groups: { label: string; items: ChatMessage[] }[] = [];
    messages.forEach((msg) => {
      const dt = msg.createdAt?.toDate() || new Date();
      const label = formatDayGroupLabel(dt);
      const last = groups[groups.length - 1];
      if (!last || last.label !== label) {
        groups.push({ label, items: [msg] });
      } else {
        last.items.push(msg);
      }
    });
    return groups;
  }, [messages]);

  const activeHeaderInfo = useMemo(() => {
    if (!activeConv || !userProfile) return null;
    if (activeConv.type === 'group') {
      return {
        title: activeConv.name || 'Study Group',
        subtitle: `${activeConv.participantIds.length} members · ${activeConv.subject || 'Group'}`,
        avatarUrl: '',
        isOnline: false,
        isGroup: true,
        partnerIds: activeConv.participantIds.filter((id) => id !== userProfile.uid),
      };
    }
    const otherId = activeConv.participantIds.find((id) => id !== userProfile.uid);
    const peer = otherId ? usersById[otherId] : undefined;
    return {
      title: peer?.fullName || 'Study Partner',
      subtitle: peer?.isOnline
        ? 'Online now'
        : peer?.lastSeen
        ? `Last active ${formatRelativeTime(peer.lastSeen.toDate())}`
        : peer?.course || 'Offline',
      avatarUrl: peer?.avatarUrl || '',
      isOnline: Boolean(peer?.isOnline),
      isGroup: false,
      partnerIds: otherId ? [otherId] : [],
    };
  }, [activeConv, userProfile, usersById]);

  const typingNames = useMemo(() => {
    if (!activeConv || !userProfile) return [];
    return Object.entries(activeConv.typingUsers || {})
      .filter(([uid, isTyping]) => isTyping && uid !== userProfile.uid)
      .map(([uid]) => usersById[uid]?.fullName?.split(' ')[0] || 'Partner');
  }, [activeConv, userProfile, usersById]);

  const showListOnMobile = !conversationId;

  return (
    <AppShell
      pageTitle="Real-Time Chat"
      unreadMessages={totalUnreadMessages}
      unreadNotifications={unreadNotificationsCount}
      notifications={notifications}
    >
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-[calc(100vh-11rem)] min-h-[540px]">
        {/* Conversation List Pane */}
        <aside
          aria-label="Conversations"
          className={`lg:col-span-4 border-r border-slate-200 dark:border-slate-800 flex flex-col min-h-0 ${
            showListOnMobile ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No conversations found. Connect with a peer in Find Partners to start chatting.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const otherId = conv.participantIds.find((id) => id !== userProfile?.uid);
                const other = otherId ? usersById[otherId] : undefined;
                const title =
                  conv.type === 'group' ? conv.name || 'Study Group' : other?.fullName || 'Partner';
                const unread = userProfile ? conv.unreadCounts?.[userProfile.uid] ?? 0 : 0;
                const isSelected = activeConv?.id === conv.id;

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => navigate(`/chat/${conv.id}`)}
                    className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {conv.type === 'group' ? (
                      <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5" />
                      </div>
                    ) : (
                      <Avatar
                        src={other?.avatarUrl}
                        name={title}
                        size="md"
                        showOnline
                        isOnline={Boolean(other?.isOnline)}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate">{title}</p>
                        <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">
                          {formatRelativeTime(conv.lastMessageAt?.toDate())}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {conv.lastMessageText || 'Start the conversation'}
                        </p>
                        {unread > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[18px] h-4.5 px-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold tabular-nums">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Active Thread Pane */}
        <section
          aria-label="Active chat thread"
          className={`lg:col-span-8 flex flex-col min-h-0 ${
            showListOnMobile ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {!activeConv || !activeHeaderInfo ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="font-display text-lg font-bold">Select a conversation</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Choose a direct message or study group from the sidebar to chat in real time.
              </p>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => navigate('/chat')}
                    aria-label="Back to conversations"
                    className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  {activeHeaderInfo.isGroup ? (
                    <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5" />
                    </div>
                  ) : (
                    <Avatar
                      src={activeHeaderInfo.avatarUrl}
                      name={activeHeaderInfo.title}
                      size="md"
                      showOnline
                      isOnline={activeHeaderInfo.isOnline}
                    />
                  )}
                  <div className="min-w-0">
                    <h2 className="font-display font-bold text-sm sm:text-base truncate">
                      {activeHeaderInfo.title}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {typingNames.length > 0
                        ? `${typingNames.join(', ')} typing...`
                        : activeHeaderInfo.subtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setProposeModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors whitespace-nowrap shrink-0"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Propose Session
                </button>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5 bg-slate-50/50 dark:bg-slate-950/40">
                {groupedMessages.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-12">
                    Say hello and coordinate your next study block!
                  </p>
                ) : (
                  groupedMessages.map((group) => (
                    <div key={group.label} className="space-y-3">
                      <div className="flex items-center justify-center">
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 px-3 py-0.5 rounded-full border border-slate-200/70 dark:border-slate-800">
                          {group.label}
                        </span>
                      </div>

                      {group.items.map((msg) => {
                        const isMe = msg.senderId === userProfile?.uid;
                        const timeStr = msg.createdAt
                          ? msg.createdAt.toDate().toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : 'Sending';
                        const isReadByOther = (msg.readBy?.length ?? 0) > 1;
                        const linkedSession = msg.sessionProposalId
                          ? sessions.find((s) => s.id === msg.sessionProposalId)
                          : undefined;

                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                          >
                            {!isMe && activeHeaderInfo.isGroup && (
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 ml-1">
                                {msg.senderName}
                              </span>
                            )}
                            <div
                              className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                                isMe
                                  ? 'bg-indigo-600 text-white rounded-br-xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-bl-xs'
                              }`}
                            >
                              {msg.attachmentUrl && (
                                <div className="mb-2">
                                  {msg.attachmentType?.startsWith('image/') ? (
                                    <img
                                      src={msg.attachmentUrl}
                                      alt={msg.attachmentName || 'Shared image'}
                                      className="rounded-xl max-h-56 object-cover"
                                    />
                                  ) : (
                                    <a
                                      href={msg.attachmentUrl}
                                      download={msg.attachmentName || 'attachment'}
                                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                                        isMe
                                          ? 'bg-indigo-700/80 text-white'
                                          : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                                      }`}
                                    >
                                      <FileText className="h-4 w-4 shrink-0" />
                                      <span className="truncate max-w-[180px]">
                                        {msg.attachmentName || 'Download file'}
                                      </span>
                                    </a>
                                  )}
                                </div>
                              )}

                              <p className="whitespace-pre-wrap break-words leading-relaxed">
                                {msg.text}
                              </p>

                              {linkedSession && (
                                <button
                                  type="button"
                                  onClick={() => navigate('/schedule')}
                                  className={`mt-2 w-full text-left rounded-xl p-2.5 text-xs border transition-colors ${
                                    isMe
                                      ? 'bg-indigo-700/60 border-indigo-400/40 text-indigo-50 hover:bg-indigo-700'
                                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  <p className="font-semibold">{linkedSession.title}</p>
                                  <p className="opacity-85 mt-0.5 capitalize">
                                    Status: {linkedSession.status} · View in Schedule →
                                  </p>
                                </button>
                              )}

                              <div
                                className={`mt-1 flex items-center justify-end gap-1 text-[10px] tabular-nums ${
                                  isMe ? 'text-indigo-200' : 'text-slate-400'
                                }`}
                              >
                                <span>{timeStr}</span>
                                {isMe &&
                                  (isReadByOther ? (
                                    <CheckCheck className="h-3 w-3 text-teal-300" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Composer */}
              <form
                onSubmit={handleSend}
                className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 relative"
              >
                {emojiOpen && (
                  <div className="absolute bottom-16 left-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-lg flex items-center gap-1 z-20">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setDraft((d) => `${d}${emoji}`)}
                        className="p-1.5 text-lg hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEmojiOpen((o) => !o)}
                    aria-label="Insert emoji"
                    className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Smile className="h-5 w-5" />
                  </button>

                  <label
                    aria-label="Attach image or file"
                    className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Paperclip className="h-5 w-5" />
                    <input
                      type="file"
                      disabled={uploading}
                      onChange={handleAttachment}
                      className="hidden"
                    />
                  </label>

                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => handleDraftChange(e.target.value)}
                    placeholder={
                      uploading ? 'Uploading attachment...' : 'Write a message...'
                    }
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    aria-label="Send message"
                    className="p-2.5 sm:px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 text-sm font-semibold"
                  >
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>

      {activeConv && activeHeaderInfo && (
        <CreateSessionModal
          isOpen={proposeModalOpen}
          onClose={() => setProposeModalOpen(false)}
          partners={peers}
          existingSessions={sessions}
          initialPartnerIds={activeHeaderInfo.partnerIds}
          initialConversation={activeConv}
        />
      )}
    </AppShell>
  );
}
