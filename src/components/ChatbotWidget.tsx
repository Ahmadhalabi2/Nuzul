import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Trash2, Bot, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { BACKEND_URL } from '../config';

interface Message {
  id: number;
  role: 'user' | 'model';
  content: string;
  createdAt: string;
}

const PALETTE = {
  primary:    '#0E5C4A',
  primaryDk:  '#0a4437',
  accent:     '#C9A84C',
  bg:         '#f8faf9',
  surface:    '#ffffff',
  border:     '#e4ede9',
  ink:        '#1a2e26',
  muted:      '#6b8c7d',
  userBubble: '#0E5C4A',
  botBubble:  '#f0f5f2',
};

export default function ChatbotWidget() {
  const { currentUser } = useAuthStore();
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [fetched, setFetched]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // إخفاء الـ widget لغير المستخدمين (admin/support ما يحتاجونه)
  if (!currentUser || currentUser.role !== 'user') return null;

  const token = () => localStorage.getItem('nuzul_token') ?? '';

  // جلب تاريخ المحادثة عند الفتح أول مرة
  const fetchHistory = useCallback(async () => {
    if (fetched) return;
    try {
      const res  = await fetch(`${BACKEND_URL}/api/chatbot/history`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
        setSessionId(data.session_id);
      }
    } catch {}
    setFetched(true);
  }, [fetched]);

  useEffect(() => {
    if (open) {
      fetchHistory();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, fetchHistory]);

  // تمرير للأسفل عند وصول رسالة جديدة
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res  = await fetch(`${BACKEND_URL}/api/chatbot/message`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body:    JSON.stringify({ message: text, ...(sessionId ? { session_id: sessionId } : {}) }),
      });
      const data = await res.json();
      if (data.success) {
        setSessionId(data.session_id);
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'model',
          content: data.reply,
          createdAt: new Date().toISOString(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'model',
        content: 'عذراً، حدث خطأ. يرجى المحاولة مجدداً.',
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/chatbot/session`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
    } catch {}
    setMessages([]);
    setSessionId(null);
    setFetched(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* ── Floating Button ─────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="المساعد الذكي"
        style={{
          position:    'fixed',
          bottom:      24,
          left:        24,
          width:       56,
          height:      56,
          borderRadius: '50%',
          background:  `linear-gradient(135deg, ${PALETTE.primary}, #16a37a)`,
          border:      'none',
          cursor:      'pointer',
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'center',
          boxShadow:   '0 4px 20px rgba(14,92,74,0.45)',
          zIndex:      1000,
          transition:  'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open
          ? <X size={24} color="#fff" />
          : <MessageCircle size={24} color="#fff" />}
        {/* نقطة خضراء تدل على أن الـ AI متصل */}
        {!open && (
          <span style={{
            position: 'absolute', top: 2, left: 2,
            width: 12, height: 12, borderRadius: '50%',
            background: '#4ade80', border: '2px solid #fff',
          }} />
        )}
      </button>

      {/* ── Chat Window ─────────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position:     'fixed',
            bottom:       92,
            left:         24,
            width:        340,
            height:       480,
            borderRadius: 20,
            background:   PALETTE.surface,
            boxShadow:    '0 12px 48px rgba(0,0,0,0.18)',
            zIndex:       999,
            display:      'flex',
            flexDirection:'column',
            overflow:     'hidden',
            border:       `1px solid ${PALETTE.border}`,
            direction:    'rtl',
            animation:    'chatSlideUp 0.25s cubic-bezier(.4,0,.2,1)',
          }}
        >
          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, ${PALETTE.primary}, #16a37a)`,
            padding:    '14px 16px',
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bot size={20} color="#fff" />
              </div>
              <div>
                <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: "'Tajawal',sans-serif" }}>
                  مساعد نُزُل الذكي
                </p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: "'Tajawal',sans-serif" }}>
                  مدعوم بـ Gemini AI ✨
                </p>
              </div>
            </div>
            <button
              onClick={clearChat}
              title="مسح المحادثة"
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Trash2 size={15} color="#fff" />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex:       1,
            overflowY:  'auto',
            padding:    '14px 12px',
            display:    'flex',
            flexDirection: 'column',
            gap:        10,
            background: PALETTE.bg,
          }}>
            {messages.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '30px 16px' }}>
                <Bot size={36} color={PALETTE.primary} style={{ margin: '0 auto 10px' }} />
                <p style={{ color: PALETTE.muted, fontSize: 13, fontFamily: "'Tajawal',sans-serif", lineHeight: 1.7 }}>
                  مرحباً {currentUser.name.split(' ')[0]}! 👋<br />
                  أنا مساعدك الذكي. يمكنني مساعدتك في استعراض الفنادق، الحجوزات، والأسعار.
                </p>
                {/* Suggestions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                  {['ما هي أفضل فنادق دمشق؟', 'كم عدد حجوزاتي؟', 'أنصحني بفندق عائلي'].map(s => (
                    <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      style={{
                        background: PALETTE.surface, border: `1px solid ${PALETTE.border}`,
                        borderRadius: 10, padding: '7px 12px', cursor: 'pointer',
                        fontSize: 12, color: PALETTE.primary, fontFamily: "'Tajawal',sans-serif",
                        textAlign: 'right', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = PALETTE.botBubble)}
                      onMouseLeave={e => (e.currentTarget.style.background = PALETTE.surface)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} style={{
                display:    'flex',
                justifyContent: msg.role === 'user' ? 'flex-start' : 'flex-end',
                alignItems: 'flex-end',
                gap:        6,
              }}>
                {msg.role === 'model' && (
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: PALETTE.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bot size={14} color="#fff" />
                  </div>
                )}
                <div style={{
                  maxWidth:     '78%',
                  padding:      '9px 12px',
                  borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  background:   msg.role === 'user' ? PALETTE.userBubble : PALETTE.botBubble,
                  color:        msg.role === 'user' ? '#fff' : PALETTE.ink,
                  fontSize:     13,
                  lineHeight:   1.6,
                  fontFamily:   "'Tajawal',sans-serif",
                  whiteSpace:   'pre-wrap',
                  wordBreak:    'break-word',
                }}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: PALETTE.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={14} color="#fff" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 6 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: PALETTE.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={14} color="#fff" />
                </div>
                <div style={{ background: PALETTE.botBubble, borderRadius: '4px 16px 16px 16px', padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 7, height: 7, borderRadius: '50%', background: PALETTE.primary,
                      display: 'inline-block',
                      animation: `typingDot 1.2s ${i * 0.2}s infinite ease-in-out`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding:    '10px 12px',
            borderTop:  `1px solid ${PALETTE.border}`,
            display:    'flex',
            gap:        8,
            alignItems: 'flex-end',
            background: PALETTE.surface,
            flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب سؤالك هنا... (Enter للإرسال)"
              disabled={loading}
              style={{
                flex:        1,
                border:      `1px solid ${PALETTE.border}`,
                borderRadius: 12,
                padding:     '9px 12px',
                fontSize:    13,
                fontFamily:  "'Tajawal',sans-serif",
                resize:      'none',
                outline:     'none',
                background:  PALETTE.bg,
                color:       PALETTE.ink,
                direction:   'rtl',
                lineHeight:  1.5,
                maxHeight:   80,
                overflowY:   'auto',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                width:        38,
                height:       38,
                borderRadius: '50%',
                background:   (!input.trim() || loading) ? '#ccc' : PALETTE.primary,
                border:       'none',
                cursor:       (!input.trim() || loading) ? 'not-allowed' : 'pointer',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                flexShrink:   0,
                transition:   'background 0.2s',
              }}
            >
              {loading
                ? <Loader2 size={16} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                : <Send size={16} color="#fff" style={{ transform: 'scaleX(-1)' }} />}
            </button>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
