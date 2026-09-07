import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { supportApi } from '../../services/api';
import {
  Send, Loader2, MessagesSquare, User,
  Lock, Trash2, MessageCircle, CheckCheck,
} from 'lucide-react';
import Layout from '../../components/Layout';

interface Thread  { id: number; userId: number; userName: string; unreadForSupport: number; unreadForUser: number; lastMessageAt?: string; lastMessagePreview?: string; }
interface Message { id: number; threadId: number; senderRole: string; senderId: number; senderName: string; content: string; createdAt: string; }

// ── اختصار الاسم لـ Avatar ────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ── وقت منسّق ────────────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'اليوم';
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 1) return 'أمس';
    return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

export default function SupportChatPage() {
  const navigate   = useNavigate();
  const { currentUser, logout } = useAuthStore();

  const isSupportAgent = currentUser?.role === 'support';
  const isAdminViewer  = currentUser?.role === 'superadmin';
  const isSupport      = isSupportAgent || isAdminViewer;

  const [threads,   setThreads]   = useState<Thread[]>([]);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [threadId,  setThreadId]  = useState<number | null>(null);
  const [text,      setText]      = useState('');
  const [sending,   setSending]   = useState(false);
  const [sideOpen,  setSideOpen]  = useState(true); // للموبايل

  const scrollRef    = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchThreads = useCallback(async () => {
    try {
      const res = await supportApi.getThreads();
      if (res.success) {
        setThreads(res.threads);
        if (res.threads.length > 0 && !threadId && isSupport)
          setThreadId(res.threads[0].id);
      }
    } catch {}
  }, [isSupport, threadId]);

  const ensureThread = useCallback(async () => {
    try {
      const res = await supportApi.ensureThread();
      if (res.success) setThreadId(res.thread.id);
    } catch {}
  }, []);

  const fetchMessages = useCallback(async (tid: number) => {
    try {
      const res = await supportApi.getMessages(tid);
      if (res.success) setMessages(res.messages);
    } catch {}
  }, []);

  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }
    if (isSupport) fetchThreads();
    else ensureThread();
  // eslint-disable-next-line
  }, [currentUser?.id]);

  useEffect(() => {
    if (!threadId) return;
    fetchMessages(threadId);
    supportApi.markRead(threadId).catch(() => {});
    const t = setInterval(() => fetchMessages(threadId), 5000);
    return () => clearInterval(t);
  }, [threadId, fetchMessages]);

  useEffect(() => {
    if (!isSupport) return;
    const t = setInterval(fetchThreads, 10000);
    return () => clearInterval(t);
  }, [isSupport, fetchThreads]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Send ───────────────────────────────────────────────────────────────────
  const onSend = async () => {
    if (isAdminViewer || !currentUser || !threadId || !text.trim()) return;
    const payload = text.trim();
    // Optimistic
    const tempMsg: Message = {
      id: Date.now(), threadId: threadId!, senderRole: currentUser.role,
      senderId: Number(currentUser.id), senderName: currentUser.name,
      content: payload, createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    setText('');
    setSending(true);
    try {
      const res = await supportApi.sendMessage(threadId!, payload);
      if (res.success) {
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? res.message : m));
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    }
    setSending(false);
    textareaRef.current?.focus();
  };

  const handleDeleteThread = async (tid: number, userName: string) => {
    if (!window.confirm(`حذف سجل محادثة "${userName}" نهائياً؟`)) return;
    try {
      await supportApi.deleteThread(tid);
      setThreads(prev => prev.filter(t => t.id !== tid));
      if (threadId === tid) { setThreadId(null); setMessages([]); }
    } catch {}
  };

  const threadMessages = useMemo(() =>
    messages.filter(m => m.threadId === threadId),
    [messages, threadId]
  );

  // ── Group messages by date ─────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const groups: { date: string; msgs: Message[] }[] = [];
    threadMessages.forEach(m => {
      const d = fmtDate(m.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.date === d) last.msgs.push(m);
      else groups.push({ date: d, msgs: [m] });
    });
    return groups;
  }, [threadMessages]);

  const activeThread = threads.find(t => t.id === threadId);

  return (
    <Layout>
      <style>{`
        @keyframes bubbleIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .bubble-in { animation: bubbleIn 0.25s ease forwards; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .sp { animation: spin 1s linear infinite; }
        .thread-item:hover { background: #f0fdf4 !important; }
        .thread-item.active { background: #e6f7f0 !important; border-right: 3px solid #0E5C4A !important; }
        textarea.chat-input:focus { outline: none; border-color: #0E5C4A; box-shadow: 0 0 0 3px rgba(14,92,74,0.12); }
        .send-btn:hover:not(:disabled) { background: #0a4437 !important; }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        @media(max-width:768px){
          .support-shell { flex-direction: column !important; }
          .support-sidebar { width: 100% !important; max-height: 200px !important; border-left: none !important; border-bottom: 1px solid #e5e7eb !important; }
          .thread-list { flex-direction: row !important; overflow-x: auto !important; overflow-y: hidden !important; }
          .thread-item { min-width: 180px !important; border-left: 1px solid #f3f4f6 !important; border-bottom: none !important; }
        }
      `}</style>

      <div style={{ direction: 'rtl', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', fontFamily: "'Tajawal',sans-serif" }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#0E5C4A,#1a8a6b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isAdminViewer ? <Lock size={20} color="#fff" /> : <MessagesSquare size={20} color="#fff" />}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827', fontFamily: "'Amiri',serif" }}>
                {isAdminViewer ? 'أرشيف الدعم' : isSupportAgent ? 'صندوق الدعم' : 'الدعم الفني'}
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                {isAdminViewer ? 'عرض فقط' : isSupportAgent ? `${threads.length} محادثة` : 'نرد عليك بأسرع وقت'}
              </p>
            </div>
          </div>
          {isAdminViewer && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
              <Lock size={12} /> قراءة فقط
            </span>
          )}
          {!isSupport && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#15803d', fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              متصل
            </span>
          )}
        </div>

        {/* ── Shell ── */}
        <div className="support-shell" style={{ flex: 1, display: 'flex', gap: 0, border: '1px solid #e5e7eb', borderRadius: 20, overflow: 'hidden', background: '#fff', minHeight: 0 }}>

          {/* ── Sidebar ── */}
          {isSupport && (
            <div className="support-sidebar" style={{ width: 280, borderLeft: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              {/* Sidebar header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                  {isAdminViewer ? 'كل المحادثات' : 'المحادثات'}
                </span>
                <span style={{ background: '#e5e7eb', color: '#6b7280', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                  {threads.length}
                </span>
              </div>

              {/* Thread list */}
              <div className="thread-list" style={{ flex: 1, overflowY: 'auto' }}>
                {threads.length === 0 ? (
                  <div style={{ padding: '40px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                    <MessageCircle size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                    لا توجد محادثات
                  </div>
                ) : threads.map(th => {
                  const sel = th.id === threadId;
                  const unread = th.unreadForSupport > 0;
                  return (
                    <div
                      key={th.id}
                      className={`thread-item${sel ? ' active' : ''}`}
                      onClick={() => setThreadId(th.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', borderRight: sel ? '3px solid #0E5C4A' : '3px solid transparent', transition: 'all 0.15s' }}
                    >
                      {/* Avatar */}
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: sel ? '#0E5C4A' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: sel ? '#fff' : '#6b7280' }}>
                        {initials(th.userName)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: unread ? 700 : 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {th.userName}
                          </span>
                          {unread && !isAdminViewer && (
                            <span style={{ background: '#0E5C4A', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20, flexShrink: 0 }}>
                              {th.unreadForSupport}
                            </span>
                          )}
                        </div>
                        {th.lastMessagePreview && (
                          <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {th.lastMessagePreview}
                          </p>
                        )}
                      </div>
                      {isSupportAgent && (
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteThread(th.id, th.userName); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 4, borderRadius: 6, flexShrink: 0, lineHeight: 0 }}
                          title="حذف"
                          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Chat Area ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

            {/* Chat header */}
            {(isSupport && activeThread) ? (
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10, background: '#fff', flexShrink: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0E5C4A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                  {initials(activeThread.userName)}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>{activeThread.userName}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>
                    {isAdminViewer ? 'أرشيف المحادثة' : 'نشط'}
                  </p>
                </div>
              </div>
            ) : !isSupport && (
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10, background: '#fff', flexShrink: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#0E5C4A,#1a8a6b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} color="#fff" />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>فريق الدعم</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
                    متصل الآن
                  </p>
                </div>
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#f9fafb', display: 'flex', flexDirection: 'column', gap: 0 }}>
              {threadMessages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9ca3af', padding: 40 }}>
                  <MessageCircle size={40} style={{ opacity: 0.3 }} />
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#6b7280' }}>
                    {isAdminViewer ? 'اختر محادثة من القائمة'
                    : isSupportAgent ? 'اختر مستخدماً للبدء'
                    : 'ابدأ المحادثة! سنرد عليك فوراً.'}
                  </p>
                  {!isSupport && <p style={{ margin: 0, fontSize: 12, color: '#d1d5db' }}>اكتب رسالتك في الأسفل</p>}
                </div>
              ) : grouped.map(({ date, msgs }) => (
                <div key={date}>
                  {/* Date divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px', color: '#9ca3af' }}>
                    <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, background: '#f3f4f6', padding: '3px 10px', borderRadius: 20 }}>{date}</span>
                    <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                  </div>

                  {msgs.map((m, i) => {
                    const mine     = isSupport ? m.senderRole !== 'user' : m.senderRole === 'user';
                    const prevSame = i > 0 && msgs[i-1].senderRole === m.senderRole;
                    const nextSame = i < msgs.length - 1 && msgs[i+1].senderRole === m.senderRole;

                    return (
                      <div key={m.id} className="bubble-in" style={{ display: 'flex', justifyContent: mine ? 'flex-start' : 'flex-end', marginBottom: nextSame ? 2 : 10, alignItems: 'flex-end', gap: 8 }}>
                        {/* Avatar للطرف الآخر */}
                        {!mine && !nextSame ? (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', flexShrink: 0 }}>
                            {initials(m.senderName)}
                          </div>
                        ) : !mine && <div style={{ width: 28, flexShrink: 0 }} />}

                        <div style={{ maxWidth: '68%' }}>
                          {/* اسم المرسل */}
                          {!mine && !prevSame && (
                            <p style={{ margin: '0 0 4px 4px', fontSize: 11, fontWeight: 600, color: '#6b7280' }}>{m.senderName}</p>
                          )}
                          {/* الفقاعة */}
                          <div style={{
                            padding: '10px 14px',
                            borderRadius: mine
                              ? `16px 16px ${nextSame ? '16px' : '4px'} 16px`
                              : `16px 16px 16px ${nextSame ? '16px' : '4px'}`,
                            background: mine ? 'linear-gradient(135deg,#0E5C4A,#0a4437)' : '#fff',
                            color: mine ? '#fff' : '#111827',
                            border: mine ? 'none' : '1px solid #e5e7eb',
                            boxShadow: mine ? '0 2px 8px rgba(14,92,74,0.2)' : '0 1px 3px rgba(0,0,0,0.06)',
                            wordBreak: 'break-word',
                          }}>
                            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.content}</p>
                          </div>
                          {/* الوقت */}
                          {!nextSame && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, justifyContent: mine ? 'flex-start' : 'flex-end' }}>
                              <span style={{ fontSize: 10, color: '#9ca3af' }}>{fmtTime(m.createdAt)}</span>
                              {mine && <CheckCheck size={12} color="#9ca3af" />}
                            </div>
                          )}
                        </div>

                        {/* Avatar لـ mine */}
                        {mine && !nextSame ? (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#0E5C4A,#1a8a6b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {initials(currentUser?.name ?? 'أنت')}
                          </div>
                        ) : mine && <div style={{ width: 28, flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            {/* ── Composer ── */}
            {threadId && !isAdminViewer ? (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', background: '#fff', display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
                <textarea
                  ref={textareaRef}
                  className="chat-input"
                  value={text}
                  onChange={e => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                  placeholder={isSupportAgent ? 'اكتب رداً...' : 'اكتب رسالتك...'}
                  rows={1}
                  style={{ flex: 1, resize: 'none', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '10px 14px', fontSize: 13.5, fontFamily: "'Tajawal',sans-serif", background: '#f9fafb', color: '#111827', lineHeight: 1.5, maxHeight: 120, overflow: 'auto', transition: 'border-color 0.2s, box-shadow 0.2s', outline: 'none' }}
                />
                <button
                  className="send-btn"
                  onClick={onSend}
                  disabled={sending || !text.trim()}
                  style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#0E5C4A,#1a8a6b)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}
                >
                  {sending
                    ? <Loader2 size={16} className="sp" />
                    : <Send size={16} style={{ transform: 'rotate(180deg)' }} />}
                </button>
              </div>
            ) : isAdminViewer && threadId ? (
              <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', background: '#fef2f2', display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontSize: 12.5, fontWeight: 600, flexShrink: 0 }}>
                <Lock size={13} /> وضع العرض فقط — لا يمكن الرد
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Layout>
  );
}
