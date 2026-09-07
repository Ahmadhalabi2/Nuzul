import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  Hotel, Eye, EyeOff, AlertCircle, CheckCircle,
  Mail, ArrowRight, RotateCcw, UserPlus,
} from 'lucide-react';

import { BACKEND_URL } from '../config';
const API = `${BACKEND_URL}/api/auth`;

// ─── أنواع إيميلات OTP المعروفة ─────────────────────────────────────────────
const OTP_PROVIDERS = [
  {
    id:     'gmail',
    label:  'Gmail',
    domain: 'gmail.com',
    color:  '#EA4335',
    bg:     '#FEF0EF',
    border: '#FBCBC8',
    logo: (
      <svg width="20" height="20" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 5C13.5 5 5 13.5 5 24s8.5 19 19 19 19-8.5 19-19S34.5 5 24 5z" opacity="0"/>
        <path fill="#4285F4" d="M6.3 14.7l17.7 11.4 17.7-11.4"/>
        <path fill="#EA4335" d="M39 10H9a3 3 0 00-3 3v22a3 3 0 003 3h30a3 3 0 003-3V13a3 3 0 00-3-3z" fillOpacity="0"/>
        <path fill="#34A853" d="M9 10h30a3 3 0 013 3v1.5L24 26.1 6 14.5V13a3 3 0 013-3z" fillOpacity="0"/>
        <rect width="36" height="28" x="6" y="10" rx="3" fill="none" stroke="#EA4335" strokeWidth="2.5"/>
        <path fill="none" stroke="#EA4335" strokeWidth="2.5" d="M6 13l18 12 18-12"/>
      </svg>
    ),
  },
  {
    id:     'yahoo',
    label:  'Yahoo',
    domain: 'yahoo.com',
    color:  '#6001D2',
    bg:     '#F5EDFF',
    border: '#D4B3F5',
    logo: (
      <svg width="20" height="20" viewBox="0 0 48 48">
        <rect width="36" height="28" x="6" y="10" rx="3" fill="none" stroke="#6001D2" strokeWidth="2.5"/>
        <text x="24" y="29" textAnchor="middle" fontSize="16" fontWeight="900" fill="#6001D2" fontFamily="Arial">Y!</text>
      </svg>
    ),
  },
  {
    id:     'outlook',
    label:  'Outlook',
    domain: 'outlook.com',
    color:  '#0078D4',
    bg:     '#EDF4FF',
    border: '#B3D1F5',
    logo: (
      <svg width="20" height="20" viewBox="0 0 48 48">
        <rect width="36" height="28" x="6" y="10" rx="3" fill="none" stroke="#0078D4" strokeWidth="2.5"/>
        <circle cx="24" cy="24" r="7" fill="none" stroke="#0078D4" strokeWidth="2.5"/>
      </svg>
    ),
  },
];

// ─── كشف نوع الإيميل ─────────────────────────────────────────────────────────
function detectProvider(email: string) {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  if (domain === 'gmail.com')                          return 'gmail';
  if (domain === 'yahoo.com' || domain === 'yahoo.co.uk') return 'yahoo';
  if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com') return 'outlook';
  return 'other';
}

// ─── مكوّن OTP boxes ──────────────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const arr   = value.split('');
    arr[i]      = digit;
    onChange(arr.join('').slice(0, 6));
    if (digit && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) { onChange(pasted.padEnd(6, '').slice(0, 6)); inputs.current[Math.min(pasted.length, 5)]?.focus(); }
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', direction: 'ltr' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="otp-box"
          style={otpBoxStyle}
          aria-label={`الرقم ${i + 1} من رمز التحقق`}
        />
      ))}
    </div>
  );
}

const latticeTile = (color: string, opacity = 0.05) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Cg fill='none' stroke='${encodeURIComponent(color)}' stroke-width='0.75' opacity='${opacity}'%3E%3Cpath d='M32 2 L62 32 L32 62 L2 32 Z'/%3E%3Cpath d='M32 16 L48 32 L32 48 L16 32 Z'/%3E%3C/g%3E%3C/svg%3E`;

// ─── الصفحة الرئيسية ──────────────────────────────────────────────────────────
export default function SignupPage() {
  const navigate        = useNavigate();
  const loginWithToken  = useAuthStore((s) => s.loginWithToken);

  // ── step: 'form' | 'provider' | 'otp'
  // form     → المستخدم يدخل الاسم / الإيميل / كلمة السر
  // provider → الإيميل من نوع معروف، نعرض أزرار الخيار
  // otp      → المستخدم اختار OTP، ننتظر الرمز
  const [step,     setStep]     = useState<'form' | 'provider' | 'otp'>('form');

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [otp,      setOtp]      = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const provider = detectProvider(email);

  // ── validation مشترك ────────────────────────────────────────────────────────
  const validateForm = () => {
    if (!name.trim())   { setError('الاسم مطلوب.');                        return false; }
    if (!email.trim())  { setError('الإيميل مطلوب.');                       return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('صيغة الإيميل غير صحيحة.'); return false; }
    if (password.length < 6) { setError('كلمة المرور 6 أحرف على الأقل.'); return false; }
    return true;
  };

  // ── submit المرحلة الأولى ────────────────────────────────────────────────────
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;

    // إذا الإيميل من نوع معروف → عرض خيار OTP أو مباشر
    if (provider !== 'other') {
      setStep('provider');
      return;
    }

    // إيميل غير معروف → تسجيل مباشر
    await directRegister();
  };

  // ── تسجيل مباشر بدون OTP ────────────────────────────────────────────────────
  const directRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${API}/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message); return; }
      if (data.token) localStorage.setItem('nuzul_token', data.token);
      loginWithToken(data.user);
      navigate('/onboarding', { replace: true });
    } catch {
      setError('تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  // ── إرسال OTP ────────────────────────────────────────────────────────────────
  const sendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${API}/send-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message); return; }
      setStep('otp');
      setCooldown(60);
    } catch {
      setError('تعذّر الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  // ── التحقق من OTP ────────────────────────────────────────────────────────────
  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.replace(/\s/g, '').length < 6) { setError('أدخل الرمز المكوّن من 6 أرقام.'); return; }
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${API}/verify-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message); return; }
      if (data.token) localStorage.setItem('nuzul_token', data.token);
      loginWithToken(data.user);
      navigate('/onboarding', { replace: true });
    } catch {
      setError('تعذّر الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  // ── إعادة إرسال OTP ──────────────────────────────────────────────────────────
  const resendOtp = async () => {
    if (cooldown > 0) return;
    setOtp(''); setError('');
    await sendOtp();
  };

  const providerInfo = OTP_PROVIDERS.find((p) => p.id === provider);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={S.shell}>
      <div style={S.lattice} aria-hidden />
      <div style={S.glowTeal}  aria-hidden />
      <div style={S.glowBrass} aria-hidden />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@400;500;700;800;900&display=swap');
        @keyframes cardIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .signup-card { animation: cardIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
        .input-lux { transition: all 0.2s; }
        .input-lux:focus { border-color:#C69A3A!important; background:#fff!important; box-shadow:0 0 0 3px rgba(198,154,58,0.15)!important; }
        .btn-primary { transition: all 0.2s ease; }
        .btn-primary:hover { transform:translateY(-1px); box-shadow:0 10px 22px rgba(14,92,74,0.24)!important; }
        .btn-primary:active { transform:translateY(0); }
        .provider-btn { transition: all 0.2s ease; }
        .provider-btn:hover { transform:translateY(-2px); box-shadow:0 8px 18px rgba(0,0,0,0.1)!important; }
        .provider-btn:active { transform:translateY(0); }
        .otp-box { transition: all 0.2s ease; }
        .otp-box:focus { outline:none; border-color:#C69A3A!important; background:#fff!important; box-shadow:0 0 0 3px rgba(198,154,58,0.18)!important; }
        .link-lux:hover { color:#0E5C4A!important; text-decoration:underline!important; }
        .back-btn:hover { background:rgba(198,154,58,0.1)!important; }
      `}</style>

      <div className="signup-card" style={S.card}>
        <div style={S.topLine} />

        {/* Logo */}
        <div style={S.logo}>
          <div style={S.logoMark}><Hotel size={19} color="#8B681B" strokeWidth={2.2} /></div>
          <span style={S.logoText}>نُزُل</span>
        </div>

        {/* ── زر الرجوع ── */}
        <div style={{ marginBottom: 8 }}>
          {step === 'form' ? (
            <button className="back-btn" style={S.backBtn} onClick={() => navigate('/', { replace: true })}>
              ← العودة للرئيسية
            </button>
          ) : step === 'provider' ? (
            <button className="back-btn" style={S.backBtn} onClick={() => { setStep('form'); setError(''); }}>
              ← تعديل البيانات
            </button>
          ) : (
            <button className="back-btn" style={S.backBtn} onClick={() => { setStep('provider'); setError(''); setOtp(''); }}>
              ← اختيار طريقة أخرى
            </button>
          )}
        </div>

        {/* ════════════════ step: form ════════════════ */}
        {step === 'form' && (
          <>
            <h1 style={S.title}>إنشاء حساب</h1>
            <p style={S.sub}>انضم إلى نُزُل وابدأ حجز إقامتك</p>

            <form onSubmit={handleFormSubmit} style={S.form}>
              <label style={S.label}>الاسم الكامل</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="أحمد الناصر" required className="input-lux" style={S.input} />

              <label style={S.label}>البريد الإلكتروني</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required className="input-lux" style={S.input} dir="ltr" />

              <label style={S.label}>كلمة المرور</label>
              <div style={S.pwWrap}>
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل" required
                  className="input-lux" style={{ ...S.input, margin: 0, paddingLeft: 44 }} />
                <button type="button" style={S.eyeBtn} onClick={() => setShowPw((v) => !v)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && <ErrorBox text={error} />}

              <button type="submit" className="btn-primary" style={S.btnPrimary} disabled={loading}>
                {loading ? 'جارٍ المعالجة…' : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <UserPlus size={16} /> متابعة
                  </span>
                )}
              </button>
            </form>

            <p style={S.hint}>
              لديك حساب؟{' '}
              <Link to="/login" className="link-lux" style={S.link}>تسجيل الدخول</Link>
            </p>
          </>
        )}

        {/* ════════════════ step: provider ════════════════ */}
        {step === 'provider' && (
          <>
            <h1 style={S.title}>كيف تريد إنشاء الحساب؟</h1>

            {/* badge الإيميل */}
            <div style={S.emailBadge}>
              <Mail size={14} color="#0E5C4A" />
              <span style={{ fontSize: 13, color: '#152A24', fontWeight: 600, direction: 'ltr' }}>{email}</span>
            </div>

            <p style={{ ...S.sub, marginBottom: 20 }}>
              إيميلك من نوع <strong style={{ color: providerInfo?.color }}>{providerInfo?.label}</strong>.
              <br />
              يمكنك إما التحقق برمز OTP أو التسجيل مباشرة.
            </p>

            {error && <ErrorBox text={error} />}

            <div style={S.providerGrid}>
              {/* زر OTP */}
              <button
                className="provider-btn"
                style={{ ...S.providerBtn, borderColor: providerInfo?.border, background: providerInfo?.bg }}
                onClick={sendOtp}
                disabled={loading}
              >
                <div style={{ ...S.providerIconWrap, background: providerInfo?.bg, border: `1.5px solid ${providerInfo?.border}` }}>
                  {providerInfo?.logo}
                </div>
                <div style={S.providerBtnText}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: providerInfo?.color }}>
                    تحقق عبر {providerInfo?.label}
                  </span>
                  <span style={{ fontSize: 11, color: '#6E7C76', marginTop: 2 }}>
                    يُرسل رمز OTP لإيميلك
                  </span>
                </div>
                {loading ? <span style={{ fontSize: 11, color: '#93A29B' }}>جارٍ الإرسال…</span>
                         : <ArrowRight size={16} color="#93A29B" />}
              </button>

              {/* فاصل */}
              <div style={S.orDivider}>
                <div style={S.orLine} />
                <span style={S.orText}>أو</span>
                <div style={S.orLine} />
              </div>

              {/* تسجيل مباشر */}
              <button
                className="provider-btn"
                style={{ ...S.providerBtn, borderColor: '#E5DFC8', background: '#FAF8F2' }}
                onClick={directRegister}
                disabled={loading}
              >
                <div style={{ ...S.providerIconWrap, background: '#F3EEDD', border: '1.5px solid #E5DFC8' }}>
                  <UserPlus size={18} color="#52655F" />
                </div>
                <div style={S.providerBtnText}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#1C2B27' }}>تسجيل مباشر</span>
                  <span style={{ fontSize: 11, color: '#6E7C76', marginTop: 2 }}>بدون رمز تحقق</span>
                </div>
                {loading ? <span style={{ fontSize: 11, color: '#93A29B' }}>جارٍ التسجيل…</span>
                         : <ArrowRight size={16} color="#93A29B" />}
              </button>
            </div>
          </>
        )}

        {/* ════════════════ step: otp ════════════════ */}
        {step === 'otp' && (
          <>
            <h1 style={S.title}>تحقق من إيميلك</h1>

            <div style={S.emailBadge}>
              <Mail size={14} color="#0E5C4A" />
              <span style={{ fontSize: 13, color: '#152A24', fontWeight: 600, direction: 'ltr' }}>{email}</span>
            </div>

            <p style={{ ...S.sub, marginBottom: 24 }}>
              أرسلنا رمز تحقق من 6 أرقام إلى إيميلك.
              <br />
              <span style={{ fontSize: 12, color: '#A09484' }}>تحقق من صندوق البريد أو Spam.</span>
            </p>

            <form onSubmit={verifyOtp} style={S.form}>
              <OtpInput value={otp} onChange={setOtp} disabled={loading} />

              {error && <div style={{ marginTop: 12 }}><ErrorBox text={error} /></div>}

              <button type="submit" className="btn-primary"
                style={{ ...S.btnPrimary, marginTop: 20, opacity: otp.replace(/\s/g,'').length < 6 ? 0.5 : 1 }}
                disabled={loading || otp.replace(/\s/g,'').length < 6}>
                {loading ? 'جارٍ التحقق…' : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <CheckCircle size={16} /> تأكيد وإنشاء الحساب
                  </span>
                )}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                onClick={resendOtp}
                disabled={cooldown > 0 || loading}
                style={{ background: 'none', border: 'none', cursor: cooldown > 0 ? 'default' : 'pointer',
                  color: cooldown > 0 ? '#93A29B' : '#0E5C4A',
                  fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: "'Tajawal', sans-serif", opacity: cooldown > 0 ? 0.6 : 1 }}
              >
                <RotateCcw size={13} />
                {cooldown > 0 ? `إعادة الإرسال بعد ${cooldown}s` : 'لم يصلك الرمز؟ أعد الإرسال'}
              </button>
            </div>

            {/* مؤشر الخطوات */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
              <div style={{ width: 24, height: 4, borderRadius: 2, background: '#C69A3A' }} />
              <div style={{ width: 24, height: 4, borderRadius: 2, background: '#0E5C4A' }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── مكوّن رسالة الخطأ ────────────────────────────────────────────────────────
function ErrorBox({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8,
      background: '#FCEEE9', border: '1px solid #F3D2C2',
      borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#96432B',
      fontFamily: "'Tajawal', sans-serif" }}>
      <AlertCircle size={15} style={{ flexShrink: 0 }} />
      {text}
    </div>
  );
}

// ── OTP box style ─────────────────────────────────────────────────────────────
const otpBoxStyle: React.CSSProperties = {
  width: 46, height: 54,
  textAlign: 'center', fontSize: 22, fontWeight: 800,
  fontFamily: "'Courier New', monospace",
  background: '#FAF8F2', border: '1.5px solid #E7E0D0',
  borderRadius: 12, color: '#0E5C4A', outline: 'none',
};

// ── STYLES ────────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #FBF9F4 0%, #F3EEE1 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24, fontFamily: "'Tajawal', system-ui, sans-serif",
    direction: 'rtl', position: 'relative', overflow: 'hidden',
  },
  lattice: {
    position: 'absolute', inset: 0,
    backgroundImage: latticeTile('#0E5C4A'),
    backgroundSize: '64px 64px', pointerEvents: 'none',
  },
  glowTeal: {
    position: 'absolute', width: 380, height: 380,
    background: 'radial-gradient(circle, rgba(14,92,74,0.10) 0%, transparent 68%)',
    top: '-8%', right: '-8%', filter: 'blur(10px)', pointerEvents: 'none',
  },
  glowBrass: {
    position: 'absolute', width: 320, height: 320,
    background: 'radial-gradient(circle, rgba(198,154,58,0.14) 0%, transparent 68%)',
    bottom: '-10%', left: '-6%', filter: 'blur(10px)', pointerEvents: 'none',
  },
  card: {
    background: '#FFFFFF', border: '1px solid #EDE6D6', borderRadius: 24,
    padding: '40px 38px', width: '100%', maxWidth: 450,
    boxShadow: '0 30px 60px -20px rgba(29,45,40,0.16)',
    boxSizing: 'border-box', position: 'relative', zIndex: 1, overflow: 'hidden',
  },
  topLine: {
    position: 'absolute', top: 0, left: '12%', right: '12%', height: 3,
    background: 'linear-gradient(90deg, transparent, #C69A3A, transparent)',
    borderRadius: '0 0 20px 20px',
  },
  logo:     { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  logoMark: {
    width: 34, height: 34, background: 'linear-gradient(135deg,#F6EBCB,#E8D29A)',
    borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(14,92,74,0.28)',
  },
  logoText: { fontSize: 19, fontWeight: 800, color: '#152A24', fontFamily: "'Amiri', serif" },
  backBtn:  {
    background: 'none', border: '1px solid rgba(198,154,58,0.4)',
    color: '#8A6A1F', borderRadius: 10, padding: '8px 14px',
    cursor: 'pointer', fontSize: 13, fontWeight: 700,
    fontFamily: "'Tajawal', sans-serif",
  },
  title: { margin: '0 0 6px', fontSize: 24, fontWeight: 800, color: '#152A24', fontFamily: "'Amiri', serif" },
  sub:   { margin: '0 0 20px', fontSize: 13, color: '#6E7C76', lineHeight: 1.7 },
  form:  { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 700, color: '#3E4C46', marginBottom: 5, marginTop: 10,
           textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: {
    width: '100%', padding: '11px 14px',
    background: '#FAF8F2', border: '1px solid #E7E0D0',
    borderRadius: 11, fontSize: 14, color: '#152A24',
    outline: 'none', marginBottom: 4, boxSizing: 'border-box',
    fontFamily: "'Tajawal', sans-serif",
  },
  pwWrap: { position: 'relative', marginBottom: 4 },
  eyeBtn: {
    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', color: '#8A968F',
    padding: 4, display: 'flex', alignItems: 'center',
  },
  btnPrimary: {
    marginTop: 20, padding: '13px',
    background: 'linear-gradient(135deg,#0E5C4A 0%,#0A4437 100%)',
    color: '#fff', border: 'none', borderRadius: 12,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 6px 16px rgba(14,92,74,0.22)',
    fontFamily: "'Tajawal', sans-serif",
  },
  hint:  { margin: '18px 0 0', textAlign: 'center', fontSize: 13, color: '#6E7C76' },
  link:  { color: '#0E5C4A', fontWeight: 700, textDecoration: 'none' },

  // provider step
  emailBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: '#EAF5EF', border: '1px solid #BFE3D1',
    borderRadius: 10, padding: '7px 14px', marginBottom: 12,
  },
  providerGrid: { display: 'flex', flexDirection: 'column', gap: 0 },
  providerBtn:  {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px', border: '1.5px solid #E5DFC8',
    borderRadius: 14, cursor: 'pointer', background: '#fff',
    textAlign: 'right', width: '100%', marginBottom: 10,
    fontFamily: "'Tajawal', sans-serif", boxSizing: 'border-box',
    boxShadow: '0 2px 8px rgba(28,43,39,0.04)',
  },
  providerIconWrap: {
    width: 42, height: 42, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  providerBtnText: { flex: 1, display: 'flex', flexDirection: 'column', textAlign: 'right' },
  orDivider: { display: 'flex', alignItems: 'center', gap: 12, margin: '2px 0 12px' },
  orLine:    { flex: 1, height: 1, background: '#E5DFC8' },
  orText:    { fontSize: 12, color: '#93A29B', fontWeight: 700, flexShrink: 0 },
};
