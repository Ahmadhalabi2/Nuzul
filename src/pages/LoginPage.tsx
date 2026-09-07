import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Hotel, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { BACKEND_URL } from '../config';

const latticeTile = (color: string, opacity = 0.14) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Cg fill='none' stroke='${encodeURIComponent(
    color
  )}' stroke-width='0.75' opacity='${opacity}'%3E%3Cpath d='M32 2 L62 32 L32 62 L2 32 Z'/%3E%3Cpath d='M32 16 L48 32 L32 48 L16 32 Z'/%3E%3C/g%3E%3C/svg%3E`;

// ── أنواع الـ view داخل الكارد ─────────────────────────────────────────────
type View = 'login' | 'forgot-email' | 'forgot-otp' | 'forgot-newpw' | 'forgot-done';

export default function LoginPage() {
  const navigate  = useNavigate();
  const login     = useAuthStore((s) => s.login);

  // ── Login state ─────────────────────────────────────────────────────────
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showSignupHint, setShowSignupHint] = useState(false);

  // ── Forgot Password state ───────────────────────────────────────────────
  const [view,         setView]         = useState<View>('login');
  const [fpEmail,      setFpEmail]      = useState('');
  const [fpOtp,        setFpOtp]        = useState('');
  const [fpNewPw,      setFpNewPw]      = useState('');
  const [fpShowPw,     setFpShowPw]     = useState(false);
  const [fpError,      setFpError]      = useState('');
  const [fpLoading,    setFpLoading]    = useState(false);
  const [fpSuccess,    setFpSuccess]    = useState('');

  // ── Login submit ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      const role = useAuthStore.getState().currentUser?.role as string;
      const to =
        role === 'superadmin' ? '/dashboard'
        : role === 'support'  ? '/support'
        : '/home';
      navigate(to, { replace: true });
    } else {
      setError(result.message);
      setShowSignupHint(true);
    }
  };

  // ── Forgot: Step 1 — إرسال OTP للإيميل ─────────────────────────────────
  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError(''); setFpLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'حدث خطأ.');
      setFpSuccess(data.message);
      setView('forgot-otp');
    } catch (err: any) {
      setFpError(err.message);
    } finally {
      setFpLoading(false);
    }
  };

  // ── Forgot: Step 2 — التحقق من OTP ─────────────────────────────────────
  const handleForgotVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError(''); setFpLoading(true);
    // نتحقق فقط أن الـ OTP مكوّن من 6 أرقام قبل الإرسال
    if (!/^\d{6}$/.test(fpOtp.trim())) {
      setFpError('الرمز يجب أن يكون 6 أرقام.');
      setFpLoading(false);
      return;
    }
    // لا يوجد endpoint للتحقق فقط — ننتقل للخطوة التالية وإذا OTP غلط سيرد reset-password بخطأ
    setFpLoading(false);
    setFpError('');
    setView('forgot-newpw');
  };

  // ── Forgot: Step 3 — تغيير كلمة المرور ─────────────────────────────────
  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError(''); setFpLoading(true);
    if (fpNewPw.length < 6) {
      setFpError('كلمة المرور 6 أحرف على الأقل.');
      setFpLoading(false);
      return;
    }
    try {
      const res  = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail, otp: fpOtp, newPassword: fpNewPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'حدث خطأ.');
      setView('forgot-done');
    } catch (err: any) {
      setFpError(err.message);
    } finally {
      setFpLoading(false);
    }
  };

  // ── Reset forgot state ──────────────────────────────────────────────────
  const backToLogin = () => {
    setView('login');
    setFpEmail(''); setFpOtp(''); setFpNewPw('');
    setFpError(''); setFpSuccess(''); setFpLoading(false);
  };

  // ── Steps indicator for forgot flow ─────────────────────────────────────
  const fpSteps: Record<string, number> = { 'forgot-email': 1, 'forgot-otp': 2, 'forgot-newpw': 3 };
  const fpStep = fpSteps[view] ?? 0;

  return (
    <div style={s.shell}>
      <div style={s.latticeLayer} aria-hidden />
      <div style={s.glowTeal}  aria-hidden />
      <div style={s.glowBrass} aria-hidden />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Tajawal:wght@300;400;500;700;800;900&display=swap');

        @keyframes cardEntrance {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .login-card-lux { animation: cardEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .fp-slide        { animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        .input-lux { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
        .input-lux:focus {
          border-color: #C69A3A !important;
          background: #fff !important;
          box-shadow: 0 0 0 3px rgba(198, 154, 58, 0.15) !important;
        }
        .otp-input:focus {
          border-color: #C69A3A !important;
          background: #fff !important;
          box-shadow: 0 0 0 3px rgba(198, 154, 58, 0.15) !important;
          outline: none;
        }
        .btn-lux { transition: all 0.2s ease; }
        .btn-lux:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(14, 92, 74, 0.24) !important; }
        .btn-lux:active { transform: translateY(0); }
        .link-lux { transition: color 0.2s; }
        .link-lux:hover { color: #0E5C4A !important; text-decoration: underline !important; }
        .back-btn-lux { transition: all 0.2s ease; }
        .back-btn-lux:hover { background: rgba(198,154,58,0.1) !important; }
        .eye-btn-lux { transition: color 0.2s ease; }
        .eye-btn-lux:hover { color: #0E5C4A !important; }
        .fp-back-btn { transition: all 0.18s ease; }
        .fp-back-btn:hover { color: #0E5C4A !important; }
        .forgot-link { transition: color 0.2s; cursor: pointer; }
        .forgot-link:hover { color: #0E5C4A !important; text-decoration: underline; }
      `}</style>

      <div className="login-card-lux" style={s.card}>
        <div style={s.cardTopline} />

        {/* ── LOGO ─────────────────────────────────────────────────────── */}
        <div style={s.logo}>
          <div style={s.logoMark}><Hotel size={19} color="#8B681B" strokeWidth={2.2} /></div>
          <span style={s.logoText}>نُزُل</span>
        </div>

        {/* ══════════════════════ LOGIN VIEW ══════════════════════════════ */}
        {view === 'login' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div />
              <button type="button" onClick={() => navigate('/', { replace: true })} className="back-btn-lux" style={s.backBtn}>
                ← العودة للرئيسية
              </button>
            </div>

            <h1 style={s.title}>أهلاً بعودتك</h1>
            <p style={s.sub}>سجّل الدخول إلى بوابة حسابك الآمنة</p>

            <form onSubmit={handleSubmit} style={s.form}>
              <label style={s.label}>البريد الإلكتروني</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com" required
                className="input-lux" style={s.input} autoComplete="email"
              />

              <label style={s.label}>كلمة المرور</label>
              <div style={s.pwWrap}>
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="input-lux" style={{ ...s.input, margin: 0, paddingLeft: 44 }}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="eye-btn-lux" style={s.eyeBtn}
                  aria-label={showPw ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* رابط نسيت كلمة المرور */}
              <button
                type="button"
                className="forgot-link"
                onClick={() => { setFpEmail(email); setView('forgot-email'); setFpError(''); }}
                style={s.forgotLink}
              >
                نسيت كلمة المرور؟
              </button>

              {error && (
                <div style={s.error}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="btn-lux" style={s.btn} disabled={loading}>
                {loading ? 'جارٍ التحقق…' : 'تسجيل الدخول'}
              </button>
            </form>

            {showSignupHint && (
              <p style={s.signupHint}>
                ليس لديك حساب؟{' '}
                <Link to="/signup" className="link-lux" style={s.link}>أنشئ حساباً من هنا</Link>
              </p>
            )}

            <p style={{ ...s.signupHint, marginTop: 16, borderTop: '1px solid #EDE6D6', paddingTop: 16 }}>
              <Link to="/signup" className="link-lux" style={s.link}>تسجيل منشأة جديدة</Link>
            </p>
          </>
        )}

        {/* ══════════════════ FORGOT PASSWORD FLOW ════════════════════════ */}
        {view !== 'login' && (
          <div className="fp-slide">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              {view !== 'forgot-done' && (
                <button type="button" className="fp-back-btn" onClick={backToLogin} style={s.fpBackBtn}>
                  <ArrowRight size={16} />
                </button>
              )}
              <div>
                <h2 style={s.fpTitle}>
                  {view === 'forgot-done' ? 'تم بنجاح ✅' : 'إعادة تعيين كلمة المرور'}
                </h2>
                {view !== 'forgot-done' && (
                  <p style={s.fpSub}>الخطوة {fpStep} من 3</p>
                )}
              </div>
            </div>

            {/* Steps bar */}
            {view !== 'forgot-done' && (
              <div style={s.stepsBar}>
                {[1, 2, 3].map((n) => (
                  <div key={n} style={{
                    ...s.stepDot,
                    background: n <= fpStep
                      ? 'linear-gradient(135deg, #0E5C4A, #0A4437)'
                      : '#E7E0D0',
                    flex: n === 2 ? 1 : undefined,
                  }} />
                ))}
              </div>
            )}

            {/* ── Step 1: إدخال الإيميل ─────────────────────────────── */}
            {view === 'forgot-email' && (
              <form onSubmit={handleForgotSendOtp} style={{ ...s.form, marginTop: 20 }}>
                <p style={s.fpDesc}>أدخل البريد الإلكتروني المرتبط بحسابك وسنرسل لك رمز التحقق.</p>
                <label style={s.label}>البريد الإلكتروني</label>
                <input
                  type="email" value={fpEmail} onChange={(e) => setFpEmail(e.target.value)}
                  placeholder="name@company.com" required
                  className="input-lux" style={s.input} autoComplete="email"
                />
                {fpError && <FpError msg={fpError} />}
                <button type="submit" className="btn-lux" style={s.btn} disabled={fpLoading}>
                  {fpLoading ? 'جارٍ الإرسال…' : 'إرسال رمز التحقق'}
                </button>
              </form>
            )}

            {/* ── Step 2: إدخال OTP ─────────────────────────────────── */}
            {view === 'forgot-otp' && (
              <form onSubmit={handleForgotVerifyOtp} style={{ ...s.form, marginTop: 20 }}>
                {fpSuccess && (
                  <div style={s.successBox}>
                    <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                    <span>{fpSuccess}</span>
                  </div>
                )}
                <p style={s.fpDesc}>
                  تحقق من بريدك <strong style={{ color: '#0E5C4A' }}>{fpEmail}</strong> وأدخل الرمز المكوّن من 6 أرقام.
                </p>
                <label style={s.label}>رمز التحقق</label>
                <input
                  type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
                  value={fpOtp} onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •" required
                  className="input-lux otp-input"
                  style={{ ...s.input, textAlign: 'center', letterSpacing: 10, fontSize: 22, fontWeight: 700 }}
                />
                {fpError && <FpError msg={fpError} />}
                <button type="submit" className="btn-lux" style={s.btn} disabled={fpLoading}>
                  {fpLoading ? 'جارٍ التحقق…' : 'التالي'}
                </button>
                <button type="button" className="forgot-link"
                  onClick={() => { setFpOtp(''); setView('forgot-email'); setFpError(''); }}
                  style={{ ...s.forgotLink, textAlign: 'center', marginTop: 8 }}>
                  لم تصلك الرسالة؟ أعد الإرسال
                </button>
              </form>
            )}

            {/* ── Step 3: كلمة المرور الجديدة ─────────────────────── */}
            {view === 'forgot-newpw' && (
              <form onSubmit={handleForgotReset} style={{ ...s.form, marginTop: 20 }}>
                <p style={s.fpDesc}>أدخل كلمة المرور الجديدة. يجب أن تكون 6 أحرف على الأقل.</p>
                <label style={s.label}>كلمة المرور الجديدة</label>
                <div style={s.pwWrap}>
                  <input
                    type={fpShowPw ? 'text' : 'password'} value={fpNewPw}
                    onChange={(e) => setFpNewPw(e.target.value)}
                    placeholder="••••••••" required minLength={6}
                    className="input-lux" style={{ ...s.input, margin: 0, paddingLeft: 44 }}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setFpShowPw((v) => !v)}
                    className="eye-btn-lux" style={s.eyeBtn}
                    aria-label={fpShowPw ? 'إخفاء' : 'إظهار'}>
                    {fpShowPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Password strength hint */}
                {fpNewPw.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: fpNewPw.length >= 6 ? '#0E5C4A' : '#96432B', fontWeight: 600 }}>
                    {fpNewPw.length >= 6 ? '✓ كلمة المرور مقبولة' : `${6 - fpNewPw.length} أحرف متبقية`}
                  </div>
                )}
                {fpError && <FpError msg={fpError} />}
                <button type="submit" className="btn-lux" style={s.btn} disabled={fpLoading || fpNewPw.length < 6}>
                  {fpLoading ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور'}
                </button>
              </form>
            )}

            {/* ── Done ──────────────────────────────────────────────── */}
            {view === 'forgot-done' && (
              <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                <div style={s.doneIcon}>✅</div>
                <p style={{ fontSize: 15, color: '#152A24', fontWeight: 700, margin: '12px 0 6px' }}>
                  تم تغيير كلمة المرور بنجاح!
                </p>
                <p style={{ fontSize: 13, color: '#6E7C76', margin: '0 0 24px' }}>
                  يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.
                </p>
                <button type="button" className="btn-lux" style={s.btn} onClick={backToLogin}>
                  العودة لتسجيل الدخول
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── مكوّن خطأ مصغّر ─────────────────────────────────────────────────────────
function FpError({ msg }: { msg: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: '#FCEEE9', border: '1px solid #F3D2C2',
      borderRadius: 10, padding: '10px 14px',
      fontSize: 13, color: '#96432B', marginTop: 8,
    }}>
      <AlertCircle size={14} style={{ flexShrink: 0 }} />
      <span>{msg}</span>
    </div>
  );
}

// ─────────────────────── STYLES ─────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #FBF9F4 0%, #F3EEE1 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
    fontFamily: "'Tajawal', system-ui, -apple-system, sans-serif",
    direction: 'rtl',
    position: 'relative',
    overflow: 'hidden',
  },
  latticeLayer: {
    position: 'absolute', inset: 0,
    backgroundImage: latticeTile('#0E5C4A', 0.05),
    backgroundSize: '64px 64px',
    pointerEvents: 'none',
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
    background: '#FFFFFF', border: '1px solid #EDE6D6',
    borderRadius: 24, padding: '44px 40px',
    width: '100%', maxWidth: 430,
    boxShadow: '0 30px 60px -20px rgba(29, 45, 40, 0.16)',
    boxSizing: 'border-box', position: 'relative', zIndex: 1, overflow: 'hidden',
  },
  cardTopline: {
    position: 'absolute', top: 0, left: '12%', right: '12%', height: 3,
    background: 'linear-gradient(90deg, transparent, #C69A3A, transparent)',
    borderRadius: '0 0 20px 20px',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 },
  logoMark: {
    width: 36, height: 36,
    background: 'linear-gradient(135deg, #F6EBCB, #E8D29A)',
    borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 6px 14px rgba(14, 92, 74, 0.28)',
  },
  logoText: { fontSize: 20, fontWeight: 800, color: '#152A24', letterSpacing: '-0.3px', fontFamily: "'Amiri', serif" },
  title:    { margin: '0 0 6px', fontSize: 26, fontWeight: 800, color: '#152A24', letterSpacing: '-0.5px', fontFamily: "'Amiri', serif" },
  sub:      { margin: '0 0 24px', fontSize: 14, color: '#6E7C76', fontWeight: 500 },
  form:     { display: 'flex', flexDirection: 'column', gap: 4 },
  label:    { fontSize: 12, fontWeight: 700, color: '#3E4C46', marginBottom: 6, marginTop: 10, textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: {
    width: '100%', padding: '12px 16px',
    background: '#FAF8F2', border: '1px solid #E7E0D0',
    borderRadius: 12, fontSize: 14, color: '#152A24', outline: 'none',
    marginBottom: 4, boxSizing: 'border-box',
    fontFamily: "'Tajawal', sans-serif",
  },
  pwWrap:  { position: 'relative', marginBottom: 4 },
  eyeBtn: {
    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', color: '#8A968F',
    padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#FCEEE9', border: '1px solid #F3D2C2',
    borderRadius: 10, padding: '11px 14px',
    fontSize: 13, color: '#96432B', marginTop: 12,
  },
  btn: {
    marginTop: 20, padding: '14px',
    background: 'linear-gradient(135deg, #0E5C4A 0%, #0A4437 100%)',
    color: '#fff', border: 'none', borderRadius: 12,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 6px 16px rgba(14, 92, 74, 0.22)',
    fontFamily: "'Tajawal', sans-serif",
  },
  signupHint: { margin: '18px 0 0', textAlign: 'center', fontSize: 13, color: '#6E7C76', fontWeight: 500 },
  backBtn: {
    background: 'none', border: '1px solid rgba(198,154,58,0.45)',
    color: '#8A6A1F', borderRadius: 12, padding: '10px 14px',
    cursor: 'pointer', fontSize: 13, fontWeight: 800,
    fontFamily: "'Tajawal', sans-serif",
    display: 'flex', alignItems: 'center', gap: 8,
  },
  link:       { color: '#0E5C4A', fontWeight: 700, textDecoration: 'none' },
  forgotLink: {
    background: 'none', border: 'none', padding: '4px 0',
    fontSize: 12, color: '#8A6A1F', fontWeight: 700,
    fontFamily: "'Tajawal', sans-serif", textAlign: 'right',
    marginTop: 4,
  },
  // Forgot password styles
  fpTitle:  { margin: 0, fontSize: 20, fontWeight: 800, color: '#152A24', fontFamily: "'Amiri', serif" },
  fpSub:    { margin: '2px 0 0', fontSize: 12, color: '#93A29B', fontWeight: 500 },
  fpDesc:   { fontSize: 13, color: '#6E7C76', lineHeight: 1.7, margin: '0 0 4px' },
  fpBackBtn: {
    background: '#F5F0E8', border: '1px solid #E7E0D0',
    borderRadius: 8, padding: '6px 10px',
    cursor: 'pointer', color: '#6E7C76',
    display: 'flex', alignItems: 'center',
    flexShrink: 0,
  },
  stepsBar: {
    display: 'flex', gap: 6, marginBottom: 20, alignItems: 'center',
  },
  stepDot: {
    height: 4, borderRadius: 4, width: 28,
    transition: 'background 0.3s ease',
  },
  successBox: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#EDFAF4', border: '1px solid #B2E4CA',
    borderRadius: 10, padding: '10px 14px',
    fontSize: 13, color: '#1A6B42', marginBottom: 12,
  },
  doneIcon: {
    fontSize: 48, margin: '8px auto 0',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};
