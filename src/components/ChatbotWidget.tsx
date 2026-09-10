import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Trash2, Bot, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { BACKEND_URL } from '../config';

// ============================================================================
// Types
// ============================================================================

interface Message {
  id: number;
  role: 'user' | 'model';
  content: string;
  createdAt: string;
}

interface HistoryResponse {
  success: boolean;
  messages: Message[];
  session_id: number | null;
}

interface SendMessageResponse {
  success: boolean;
  session_id: number;
  reply: string;
}

const SUGGESTIONS = [
  'ما هي أفضل فنادق دمشق؟',
  'كم عدد حجوزاتي؟',
  'أنصحني بفندق عائلي',
] as const;

const ERROR_REPLY = 'عذراً، حدث خطأ. يرجى المحاولة مجدداً.';
const TOKEN_KEY = 'nuzul_token';

// ============================================================================
// Helpers
// ============================================================================

function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  return { Authorization: `Bearer ${getToken()}`, ...extra };
}

// ============================================================================
// Presentational subcomponents
// ============================================================================

function FloatingButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button className="cb-fab" onClick={onClick} aria-label="المساعد الذكي">
      {open ? <X size={24} color="#fff" /> : <MessageCircle size={24} color="#fff" />}
      {!open && <span className="cb-fab__status" />}
    </button>
  );
}

function Header({ userName, onClear }: { userName: string; onClear: () => void }) {
  return (
    <div className="cb-header">
      <div className="cb-header__info">
        <div className="cb-header__avatar">
          <Bot size={20} color="#fff" />
        </div>
        <div>
          <p className="cb-header__title">مساعد نُزُل الذكي</p>
          <p className="cb-header__subtitle">مدعوم بـ Gemini AI ✨</p>
        </div>
      </div>
      <button className="cb-header__clear" onClick={onClear} title="مسح المحادثة">
        <Trash2 size={15} color="#fff" />
      </button>
    </div>
  );
}

function EmptyState({
  userName,
  onPickSuggestion,
}: {
  userName: string;
  onPickSuggestion: (text: string) => void;
}) {
  return (
    <div className="cb-empty">
      <Bot size={36} color="var(--cb-primary)" style={{ margin: '0 auto 10px' }} />
      <p className="cb-empty__text">
        مرحباً {userName}! 👋
        <br />
        أنا مساعدك الذكي. يمكنني مساعدتك في استعراض الفنادق، الحجوزات، والأسعار.
      </p>
      <div className="cb-suggestions">
        {SUGGESTIONS.map(s => (
          <button key={s} className="cb-suggestion" onClick={() => onPickSuggestion(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`cb-msg-row ${isUser ? 'cb-msg-row--user' : 'cb-msg-row--model'}`}>
      {!isUser && (
        <div className="cb-avatar cb-avatar--bot">
          <Bot size={14} color="#fff" />
        </div>
      )}
      <div className={`cb-bubble ${isUser ? 'cb-bubble--user' : 'cb-bubble--model'}`}>
        {message.content}
      </div>
      {isUser && (
        <div className="cb-avatar cb-avatar--user">
          <User size={14} color="#fff" />
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="cb-msg-row cb-msg-row--model">
      <div className="cb-avatar cb-avatar--bot">
        <Bot size={14} color="#fff" />
      </div>
      <div className="cb-typing">
        <span className="cb-typing__dot" />
        <span className="cb-typing__dot" />
        <span className="cb-typing__dot" />
      </div>
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function ChatbotWidget() {
  const { currentUser } = useAuthStore();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [fetched, setFetched] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchHistory = useCallback(async () => {
    if (fetched) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/chatbot/history`, {
        headers: authHeaders(),
      });
      const data: HistoryResponse = await res.json();
      if (data.success) {
        setMessages(data.messages);
        setSessionId(data.session_id);
      }
    } catch {
      // تجاهل الخطأ بصمت — لا يوجد تاريخ سابق لعرضه
    } finally {
      setFetched(true);
    }
  }, [fetched]);

  useEffect(() => {
    if (!open) return;
    fetchHistory();
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(focusTimer);
  }, [open, fetchHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const appendMessage = (msg: Message) => setMessages(prev => [...prev, msg]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    appendMessage({
      id: Date.now(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    });
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/chatbot/message`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          message: text,
          ...(sessionId ? { session_id: sessionId } : {}),
        }),
      });
      const data: SendMessageResponse = await res.json();

      if (data.success) {
        setSessionId(data.session_id);
        appendMessage({
          id: Date.now() + 1,
          role: 'model',
          content: data.reply,
          createdAt: new Date().toISOString(),
        });
      } else {
        appendMessage({
          id: Date.now() + 1,
          role: 'model',
          content: ERROR_REPLY,
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      appendMessage({
        id: Date.now() + 1,
        role: 'model',
        content: ERROR_REPLY,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/chatbot/session`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
    } catch {
      // حتى لو فشل الحذف على الخادم، نصفّر الحالة المحلية
    }
    setMessages([]);
    setSessionId(null);
    setFetched(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const pickSuggestion = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  // إخفاء الـ widget لغير المستخدمين (admin/support ما يحتاجونه)
  if (!currentUser || currentUser.role !== 'user') return null;

  const firstName = currentUser.name.split(' ')[0];

  return (
    <>
      <FloatingButton open={open} onClick={() => setOpen(v => !v)} />

      {open && (
        <div className="cb-window">
          <Header userName={firstName} onClear={clearChat} />

          <div className="cb-messages">
            {messages.length === 0 && !loading && (
              <EmptyState userName={firstName} onPickSuggestion={pickSuggestion} />
            )}

            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {loading && <TypingIndicator />}

            <div ref={bottomRef} />
          </div>

          <div className="cb-input-bar">
            <textarea
              ref={inputRef}
              className="cb-textarea"
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب سؤالك هنا... (Enter للإرسال)"
              disabled={loading}
            />
            <button
              className="cb-send"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              aria-label="إرسال"
            >
              {loading ? (
                <Loader2 size={16} color="#fff" className="cb-spin" />
              ) : (
                <Send size={16} color="#fff" className="cb-send__icon" />
              )}
            </button>
          </div>
        </div>
      )}
      <style>{`
/* ==========================================================================
   ChatbotWidget — تصميم زجاجي داكن فاخر (Glass / Dark Elegant)
   ========================================================================== */

:root {
  --cb-bg-deep: #0b1613;
  --cb-panel: rgba(18, 30, 27, 0.72);
  --cb-panel-solid: #10201c;
  --cb-glass-border: rgba(201, 168, 76, 0.22);
  --cb-emerald: #17a883;
  --cb-emerald-soft: #22c99b;
  --cb-gold: #d4af5a;
  --cb-gold-dim: #b8933f;
  --cb-ink: #eef5f2;
  --cb-muted: #9fb8ae;
  --cb-user-bubble: linear-gradient(135deg, #1b8f6f, #12654f);
  --cb-bot-bubble: rgba(255, 255, 255, 0.06);
  --cb-font: 'Tajawal', sans-serif;
}

/* ── الزر العائم ─────────────────────────────────────────────── */

.cb-fab {
  position: fixed;
  bottom: 24px;
  left: 24px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 1px solid var(--cb-glass-border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 30% 25%, #1d8f70, var(--cb-panel-solid) 70%);
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(212, 175, 90, 0.12) inset;
  z-index: 1000;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.cb-fab::before {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1px solid rgba(212, 175, 90, 0.35);
  animation: cb-pulse-ring 2.6s ease-out infinite;
  pointer-events: none;
}

.cb-fab:hover {
  transform: scale(1.06) translateY(-2px);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.55);
}

.cb-fab__status {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--cb-emerald-soft);
  border: 2px solid var(--cb-panel-solid);
  box-shadow: 0 0 8px var(--cb-emerald-soft);
}

/* ── نافذة المحادثة ──────────────────────────────────────────── */

.cb-window {
  position: fixed;
  bottom: 96px;
  left: 24px;
  width: 368px;
  height: 540px;
  border-radius: 22px;
  background: var(--cb-panel);
  backdrop-filter: blur(22px) saturate(140%);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.55),
    0 0 0 1px var(--cb-glass-border);
  z-index: 999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  direction: rtl;
  animation: cb-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (max-width: 420px) {
  .cb-window {
    left: 10px;
    right: 10px;
    width: auto;
    height: 72vh;
    bottom: 88px;
  }
}

/* ── الهيدر ──────────────────────────────────────────────────── */

.cb-header {
  position: relative;
  background: linear-gradient(120deg, #0f2a22, #143b30 55%, #1c4d3d);
  padding: 18px 18px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  border-bottom: 1px solid var(--cb-glass-border);
}

.cb-header::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  bottom: -1px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--cb-gold), transparent);
  opacity: 0.6;
}

.cb-header__info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cb-header__avatar {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: linear-gradient(145deg, var(--cb-gold), var(--cb-gold-dim));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(212, 175, 90, 0.35);
}

.cb-header__title {
  margin: 0;
  color: var(--cb-ink);
  font-weight: 700;
  font-size: 14.5px;
  font-family: var(--cb-font);
  letter-spacing: 0.2px;
}

.cb-header__subtitle {
  margin: 2px 0 0;
  color: var(--cb-gold);
  font-size: 10.5px;
  font-family: var(--cb-font);
  letter-spacing: 0.3px;
}

.cb-header__clear {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 7px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background 0.2s, transform 0.15s;
}

.cb-header__clear:hover {
  background: rgba(255, 90, 90, 0.15);
  transform: scale(1.05);
}

/* ── منطقة الرسائل ───────────────────────────────────────────── */

.cb-messages {
  flex: 1;
  overflow-y: auto;
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background:
    radial-gradient(ellipse at top left, rgba(23, 168, 131, 0.08), transparent 55%),
    var(--cb-bg-deep);
}

.cb-messages::-webkit-scrollbar {
  width: 5px;
}

.cb-messages::-webkit-scrollbar-thumb {
  background: rgba(212, 175, 90, 0.3);
  border-radius: 10px;
}

.cb-empty {
  text-align: center;
  padding: 26px 14px 10px;
}

.cb-empty__text {
  color: var(--cb-muted);
  font-size: 13px;
  font-family: var(--cb-font);
  line-height: 1.8;
}

.cb-suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.cb-suggestion {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(212, 175, 90, 0.25);
  border-radius: 12px;
  padding: 9px 14px;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--cb-gold);
  font-family: var(--cb-font);
  text-align: right;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
}

.cb-suggestion:hover {
  background: rgba(212, 175, 90, 0.1);
  border-color: var(--cb-gold);
  transform: translateX(-2px);
}

/* ── فقاعات الرسائل ──────────────────────────────────────────── */

.cb-msg-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.cb-msg-row--user {
  justify-content: flex-start;
}

.cb-msg-row--model {
  justify-content: flex-end;
}

.cb-avatar {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cb-avatar--bot {
  background: linear-gradient(145deg, var(--cb-emerald-soft), var(--cb-emerald));
}

.cb-avatar--user {
  background: linear-gradient(145deg, var(--cb-gold), var(--cb-gold-dim));
}

.cb-bubble {
  max-width: 76%;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.7;
  font-family: var(--cb-font);
  white-space: pre-wrap;
  word-break: break-word;
}

.cb-bubble--user {
  border-radius: 16px 16px 16px 4px;
  background: rgba(212, 175, 90, 0.14);
  border: 1px solid rgba(212, 175, 90, 0.3);
  color: #f5e9cf;
}

.cb-bubble--model {
  border-radius: 16px 16px 4px 16px;
  background: var(--cb-user-bubble);
  color: #eafff5;
  box-shadow: 0 4px 14px rgba(18, 101, 79, 0.35);
}

/* ── مؤشر الكتابة ────────────────────────────────────────────── */

.cb-typing {
  background: var(--cb-user-bubble);
  border-radius: 16px 16px 4px 16px;
  padding: 12px 16px;
  display: flex;
  gap: 5px;
  align-items: center;
  box-shadow: 0 4px 14px rgba(18, 101, 79, 0.35);
}

.cb-typing__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #eafff5;
  display: inline-block;
  animation: cb-typing-dot 1.2s infinite ease-in-out;
}

.cb-typing__dot:nth-child(2) { animation-delay: 0.2s; }
.cb-typing__dot:nth-child(3) { animation-delay: 0.4s; }

/* ── حقل الإدخال ─────────────────────────────────────────────── */

.cb-input-bar {
  padding: 14px;
  border-top: 1px solid var(--cb-glass-border);
  display: flex;
  gap: 10px;
  align-items: flex-end;
  background: rgba(11, 22, 19, 0.9);
  flex-shrink: 0;
}

.cb-textarea {
  flex: 1;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 13px;
  font-family: var(--cb-font);
  resize: none;
  outline: none;
  background: rgba(255, 255, 255, 0.04);
  color: var(--cb-ink);
  direction: rtl;
  line-height: 1.5;
  max-height: 80px;
  overflow-y: auto;
  transition: border-color 0.2s, background 0.2s;
}

.cb-textarea::placeholder {
  color: var(--cb-muted);
}

.cb-textarea:focus {
  border-color: var(--cb-gold);
  background: rgba(255, 255, 255, 0.07);
}

.cb-send {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  background: linear-gradient(145deg, var(--cb-gold), var(--cb-gold-dim));
  box-shadow: 0 4px 14px rgba(212, 175, 90, 0.35);
  transition: transform 0.15s, box-shadow 0.2s;
}

.cb-send:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(212, 175, 90, 0.45);
}

.cb-send:active:not(:disabled) {
  transform: scale(0.94);
}

.cb-send:disabled {
  background: rgba(255, 255, 255, 0.08);
  box-shadow: none;
  cursor: not-allowed;
}

.cb-send__icon {
  transform: scaleX(-1);
}

/* ── الحركات ─────────────────────────────────────────────────── */

@keyframes cb-slide-up {
  from { opacity: 0; transform: translateY(24px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes cb-typing-dot {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30%           { transform: translateY(-5px); opacity: 1; }
}

@keyframes cb-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes cb-pulse-ring {
  0%   { transform: scale(1);   opacity: 0.6; }
  100% { transform: scale(1.35); opacity: 0; }
}

.cb-spin {
  animation: cb-spin 1s linear infinite;
}
      `}</style>
    </>
  );
}