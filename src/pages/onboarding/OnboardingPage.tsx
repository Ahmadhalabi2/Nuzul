/**
 * OnboardingPage — تُعرض مرة واحدة بعد إنشاء الحساب لأول مرة
 * 3 خطوات: الملف الشخصي → التفضيلات → المحفظة
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Heart, Wallet, CheckCircle2,
  Hotel, Loader2, MapPin, Phone, Calendar,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { BACKEND_URL } from '../../config';

const P = {
  ink:     '#152238',
  teal:    '#1C7A78',
  tealDk:  '#0F4E4D',
  brass:   '#C69A3D',
  brassLt: '#E8C766',
  page:    '#F1F4EF',
  paper:   '#FFFFFF',
  line:    '#E1E6DC',
  ink600:  '#54627A',
  ink400:  '#8794A8',
  error:   '#B91C1C',
  pomeg:   '#8C2F3B',
};

interface Province { id: number; name_ar: string; }

const HOTEL_TYPES = [
  { id: 'luxury',   label: 'فاخر',    emoji: '👑' },
  { id: 'heritage', label: 'تراثي',   emoji: '🏛️' },
  { id: 'beach',    label: 'بحري',    emoji: '🏖️' },
  { id: 'budget',   label: 'اقتصادي', emoji: '💰' },
  { id: 'mountain', label: 'جبلي',    emoji: '⛰️' },
  { id: 'resort',   label: 'منتجع',   emoji: '🌴' },
];

const TRAVEL_TYPES = [
  { id: 'solo',     label: 'منفرد',  emoji: '🧳' },
  { id: 'couple',   label: 'زوجان',  emoji: '💑' },
  { id: 'family',   label: 'عائلة',  emoji: '👨‍👩‍👧‍👦' },
  { id: 'business', label: 'أعمال',  emoji: '💼' },
];

// ── Step Bar ──────────────────────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  const steps = [
    { icon: <User size={16} />,   label: 'الملف الشخصي' },
    { icon: <Heart size={16} />,  label: 'التفضيلات'    },
    { icon: <Wallet size={16} />, label: 'المحفظة'      },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 36 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: i <= current ? P.teal : 'transparent',
              border: `2px solid ${i <= current ? P.teal : P.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: i <= current ? '#fff' : P.ink400,
              transition: 'all 0.3s',
            }}>
              {i < current ? <CheckCircle2 size={18} /> : s.icon}
            </div>
            <span style={{
              fontSize: 11, fontWeight: i === current ? 700 : 500,
              color: i <= current ? P.teal : P.ink400,
              fontFamily: "'Tajawal',sans-serif", whiteSpace: 'nowrap',
            }}>{s.label}</span>
          </div>
          {i < 2 && (
            <div style={{
              flex: 1, height: 2, margin: '0 6px', marginBottom: 22,
              background: i < current ? P.teal : P.line, transition: 'background 0.3s',
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, required, children, error }: {
  label: string; required?: boolean; children: React.ReactNode; error?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12.5, fontWeight: 700, color: P.ink600, fontFamily: "'Tajawal',sans-serif" }}>
        {label}{required && <span style={{ color: P.error }}> *</span>}
      </label>
      {children}
      {error && <span style={{ fontSize: 11.5, color: P.error, fontFamily: "'Tajawal',sans-serif" }}>{error}</span>}
    </div>
  );
}

const inp: React.CSSProperties = {
  padding: '11px 14px', border: `1.5px solid ${P.line}`, borderRadius: 10,
  fontSize: 14, color: P.ink, outline: 'none', background: P.page,
  fontFamily: "'Tajawal',sans-serif", direction: 'rtl',
  width: '100%', boxSizing: 'border-box',
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate();
  const { currentUser, loginWithToken } = useAuthStore();

  const [step,       setStep]       = useState(0);
  const [provinces,  setProvinces]  = useState<Province[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState<Record<string, string>>({});

  // Step 1
  const [phone,      setPhone]      = useState('');
  const [birthDate,  setBirthDate]  = useState('');
  const [gender,     setGender]     = useState('');
  const [city,       setCity]       = useState('');
  const [provinceId, setProvinceId] = useState('');

  // Step 2
  const [hotelTypes,    setHotelTypes]    = useState<string[]>([]);
  const [budgetMin,     setBudgetMin]     = useState(50);
  const [budgetMax,     setBudgetMax]     = useState(200);
  const [prefProvinces, setPrefProvinces] = useState<number[]>([]);
  const [travelType,    setTravelType]    = useState('');

  // Step 3
  const [walletBalance,  setWalletBalance]  = useState('');
  const [walletCurrency, setWalletCurrency] = useState<'USD' | 'SYP'>('USD');

  const token = () => localStorage.getItem('nuzul_token') ?? '';

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/provinces`)
      .then(r => r.json())
      .then(d => { if (d.success) setProvinces(d.provinces); })
      .catch(() => {});
  }, []);

  const toggleArr = <T,>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!phone.trim())    e.phone      = 'رقم الهاتف مطلوب';
      if (!birthDate)       e.birthDate  = 'تاريخ الميلاد مطلوب';
      if (!gender)          e.gender     = 'الجنس مطلوب';
      if (!city.trim())     e.city       = 'المدينة مطلوبة';
      if (!provinceId)      e.provinceId = 'المحافظة مطلوبة';
    }
    if (s === 1) {
      if (!hotelTypes.length)    e.hotelTypes    = 'اختر نوعاً واحداً على الأقل';
      if (budgetMin >= budgetMax) e.budget       = 'الحد الأقصى يجب أن يكون أكبر من الأدنى';
      if (!prefProvinces.length) e.prefProvinces = 'اختر وجهة واحدة على الأقل';
      if (!travelType)           e.travelType    = 'نوع السفر مطلوب';
    }
    if (s === 2) {
      const b = parseFloat(walletBalance);
      if (walletBalance === '' || isNaN(b) || b < 0) e.walletBalance = 'أدخل مبلغاً صحيحاً';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => { if (validate(step)) setStep(p => p + 1); };
  const back = () => { setStep(p => p - 1); setErrors({}); };

  const submit = async () => {
    if (!validate(2)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/onboarding/complete`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          phone, birth_date: birthDate, gender, city,
          province_id:            Number(provinceId),
          preferred_hotel_types:  hotelTypes,
          budget_min:             budgetMin,
          budget_max:             budgetMax,
          preferred_provinces:    prefProvinces,
          travel_type:            travelType,
          wallet_balance:         parseFloat(walletBalance) || 0,
          wallet_currency:        walletCurrency,
        }),
      });
      const data = await res.json();
      if (data.success) {
        loginWithToken({ ...currentUser!, onboarding_completed: true } as any);
        navigate('/home/user', { replace: true });
      } else {
        setErrors({ submit: data.message ?? 'حدث خطأ.' });
      }
    } catch {
      setErrors({ submit: 'تعذّر الاتصال بالخادم.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Shared button styles ──────────────────────────────────────────────────
  const btnPrimary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, padding: '13px 28px',
    background: `linear-gradient(135deg, ${P.teal}, ${P.tealDk})`,
    color: '#fff', border: 'none', borderRadius: 12, fontSize: 15,
    fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal',sans-serif",
    boxShadow: '0 6px 18px rgba(28,122,120,0.28)',
  };
  const btnSecondary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
    background: 'transparent', color: P.ink600,
    border: `1.5px solid ${P.line}`, borderRadius: 12, fontSize: 14,
    fontWeight: 600, cursor: 'pointer', fontFamily: "'Tajawal',sans-serif",
  };

  return (
    <div style={{
      minHeight: '100vh', background: `linear-gradient(160deg, #f8f5ee 0%, ${P.page} 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', direction: 'rtl', fontFamily: "'Tajawal',sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      {/* خلفية زخرفية */}
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: `radial-gradient(circle, ${P.teal}12 0%, transparent 65%)`,
        top: '-10%', right: '-5%', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%',
        background: `radial-gradient(circle, ${P.brass}14 0%, transparent 65%)`,
        bottom: '-5%', left: '-8%', filter: 'blur(40px)', pointerEvents: 'none' }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=Tajawal:wght@400;500;700;800&display=swap');
        .ob-input:focus { border-color: ${P.teal} !important; background: #fff !important; box-shadow: 0 0 0 3px ${P.teal}22 !important; outline: none; }
        .ob-chip { transition: all 0.18s ease; cursor: pointer; user-select: none; }
        .ob-chip:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.08); }
        @keyframes obIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .ob-step { animation: obIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      <div style={{
        background: P.paper, borderRadius: 24, padding: '40px 36px',
        width: '100%', maxWidth: 600,
        boxShadow: '0 24px 60px rgba(13,22,38,0.10)',
        border: `1px solid ${P.line}`, position: 'relative', zIndex: 1,
      }}>
        {/* Logo + عنوان */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg,#F6EBCB,#E8D29A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Hotel size={20} color="#8B681B" /></div>
          <div>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 700, color: P.ink, fontFamily: "'Amiri',serif" }}>نُزُل</p>
            <p style={{ margin: 0, fontSize: 11, color: P.ink400, fontWeight: 600 }}>إعداد الحساب الشخصي</p>
          </div>
          <div style={{
            marginRight: 'auto', background: `${P.teal}15`, color: P.teal,
            fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20,
          }}>خطوة {step + 1} من 3</div>
        </div>

        <div style={{ height: 1, background: P.line, margin: '20px 0 28px' }} />

        <StepBar current={step} />

        {/* ══════════════ STEP 0: الملف الشخصي ══════════════ */}
        {step === 0 && (
          <div className="ob-step" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: P.ink, fontFamily: "'Amiri',serif" }}>
                الملف الشخصي
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: P.ink600 }}>
                أكمل بياناتك الشخصية لنجعل تجربتك أكثر تخصيصاً
              </p>
            </div>

            {/* رقم الهاتف */}
            <Field label="رقم الهاتف" required error={errors.phone}>
              <div style={{ position: 'relative' }}>
                <Phone size={15} color={P.ink400} style={{ position: 'absolute', top: '50%', right: 13, transform: 'translateY(-50%)' }} />
                <input className="ob-input" style={{ ...inp, paddingRight: 38 }}
                  placeholder="مثال: 0991234567" value={phone}
                  onChange={e => setPhone(e.target.value)} type="tel" />
              </div>
            </Field>

            {/* تاريخ الميلاد */}
            <Field label="تاريخ الميلاد" required error={errors.birthDate}>
              <div style={{ position: 'relative' }}>
                <Calendar size={15} color={P.ink400} style={{ position: 'absolute', top: '50%', right: 13, transform: 'translateY(-50%)' }} />
                <input className="ob-input" style={{ ...inp, paddingRight: 38 }}
                  type="date" value={birthDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setBirthDate(e.target.value)} />
              </div>
            </Field>

            {/* الجنس */}
            <Field label="الجنس" required error={errors.gender}>
              <div style={{ display: 'flex', gap: 12 }}>
                {[{ v: 'male', l: '👨 ذكر' }, { v: 'female', l: '👩 أنثى' }].map(g => (
                  <button key={g.v} type="button" onClick={() => setGender(g.v)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${gender === g.v ? P.teal : P.line}`,
                      background: gender === g.v ? `${P.teal}12` : P.page,
                      color: gender === g.v ? P.teal : P.ink600,
                      fontWeight: 700, fontSize: 14, fontFamily: "'Tajawal',sans-serif",
                      transition: 'all 0.2s',
                    }}>{g.l}</button>
                ))}
              </div>
            </Field>

            {/* المدينة والمحافظة */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="المدينة" required error={errors.city}>
                <div style={{ position: 'relative' }}>
                  <MapPin size={15} color={P.ink400} style={{ position: 'absolute', top: '50%', right: 13, transform: 'translateY(-50%)' }} />
                  <input className="ob-input" style={{ ...inp, paddingRight: 38 }}
                    placeholder="مثال: دمشق" value={city}
                    onChange={e => setCity(e.target.value)} />
                </div>
              </Field>
              <Field label="المحافظة" required error={errors.provinceId}>
                <select className="ob-input" style={{ ...inp, appearance: 'none', WebkitAppearance: 'none' }}
                  value={provinceId} onChange={e => setProvinceId(e.target.value)}>
                  <option value="">اختر المحافظة</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name_ar}</option>)}
                </select>
              </Field>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 1: التفضيلات ══════════════ */}
        {step === 1 && (
          <div className="ob-step" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: P.ink, fontFamily: "'Amiri',serif" }}>
                تفضيلات الإقامة
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: P.ink600 }}>
                أخبرنا عن ذوقك لنقترح الفنادق المناسبة لك
              </p>
            </div>

            {/* نوع الفندق */}
            <Field label="أنواع الفنادق المفضلة" required error={errors.hotelTypes}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {HOTEL_TYPES.map(t => (
                  <div key={t.id} className="ob-chip"
                    onClick={() => setHotelTypes(prev => toggleArr(prev, t.id))}
                    style={{
                      padding: '9px 16px', borderRadius: 30, fontSize: 13, fontWeight: 700,
                      border: `2px solid ${hotelTypes.includes(t.id) ? P.teal : P.line}`,
                      background: hotelTypes.includes(t.id) ? `${P.teal}15` : P.page,
                      color: hotelTypes.includes(t.id) ? P.teal : P.ink600,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                    <span>{t.emoji}</span> {t.label}
                    {hotelTypes.includes(t.id) && <CheckCircle2 size={13} />}
                  </div>
                ))}
              </div>
            </Field>

            {/* الميزانية */}
            <Field label="الميزانية لليلة الواحدة (بالدولار)" required error={errors.budget}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 11, color: P.ink400, fontWeight: 600 }}>الحد الأدنى</p>
                  <input className="ob-input" style={inp} type="number" min={0} max={budgetMax - 1}
                    value={budgetMin} onChange={e => setBudgetMin(Number(e.target.value))} />
                </div>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 11, color: P.ink400, fontWeight: 600 }}>الحد الأقصى</p>
                  <input className="ob-input" style={inp} type="number" min={budgetMin + 1}
                    value={budgetMax} onChange={e => setBudgetMax(Number(e.target.value))} />
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                background: `${P.brass}12`, borderRadius: 10, border: `1px solid ${P.brass}30`,
              }}>
                <span style={{ fontSize: 12, color: P.brass, fontWeight: 700 }}>
                  💰 نطاق ميزانيتك: ${budgetMin} — ${budgetMax} / ليلة
                </span>
              </div>
            </Field>

            {/* الوجهات المفضلة */}
            <Field label="الوجهات المفضلة" required error={errors.prefProvinces}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {provinces.map(p => (
                  <div key={p.id} className="ob-chip"
                    onClick={() => setPrefProvinces(prev => toggleArr(prev, p.id))}
                    style={{
                      padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      border: `2px solid ${prefProvinces.includes(p.id) ? P.teal : P.line}`,
                      background: prefProvinces.includes(p.id) ? `${P.teal}15` : P.page,
                      color: prefProvinces.includes(p.id) ? P.teal : P.ink600,
                    }}>
                    {prefProvinces.includes(p.id) ? '✓ ' : ''}{p.name_ar}
                  </div>
                ))}
              </div>
            </Field>

            {/* نوع السفر */}
            <Field label="نوع السفر المعتاد" required error={errors.travelType}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {TRAVEL_TYPES.map(t => (
                  <button key={t.id} type="button" onClick={() => setTravelType(t.id)}
                    style={{
                      padding: '13px', borderRadius: 12, cursor: 'pointer',
                      border: `2px solid ${travelType === t.id ? P.teal : P.line}`,
                      background: travelType === t.id ? `${P.teal}12` : P.page,
                      color: travelType === t.id ? P.teal : P.ink600,
                      fontWeight: 700, fontSize: 14, fontFamily: "'Tajawal',sans-serif",
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 8,
                    }}>
                    <span>{t.emoji}</span> {t.label}
                    {travelType === t.id && <CheckCircle2 size={14} />}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {/* ══════════════ STEP 2: المحفظة ══════════════ */}
        {step === 2 && (
          <div className="ob-step" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: P.ink, fontFamily: "'Amiri',serif" }}>
                محفظتك الرقمية
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: P.ink600, lineHeight: 1.7 }}>
                أدخل رصيدك الابتدائي الذي ستستخدمه لحجز الفنادق على المنصة.
                <br />
                <span style={{ color: P.brass, fontWeight: 600 }}>لا حاجة لربط بطاقة بنكية الآن.</span>
              </p>
            </div>

            {/* بطاقة المحفظة التخيلية */}
            <div style={{
              background: `linear-gradient(135deg, ${P.teal} 0%, ${P.tealDk} 100%)`,
              borderRadius: 20, padding: '28px 24px', color: '#fff',
              boxShadow: '0 12px 32px rgba(28,122,120,0.30)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)', top: -60, left: -40 }} />
              <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)', bottom: -30, right: -20 }} />
              <p style={{ margin: '0 0 6px', fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                محفظة نُزُل
              </p>
              <p style={{ margin: '0 0 16px', fontSize: 30, fontWeight: 800, fontFamily: "'Amiri',serif" }}>
                {walletCurrency === 'USD' ? '$' : 'ل.س'}{parseFloat(walletBalance || '0').toLocaleString()}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                {currentUser?.name}
              </p>
            </div>

            {/* العملة */}
            <Field label="عملة المحفظة" required>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[{ v: 'USD', l: '🇺🇸 دولار أمريكي' }, { v: 'SYP', l: '🇸🇾 ليرة سورية' }].map(c => (
                  <button key={c.v} type="button"
                    onClick={() => setWalletCurrency(c.v as 'USD' | 'SYP')}
                    style={{
                      padding: '13px', borderRadius: 12, cursor: 'pointer',
                      border: `2px solid ${walletCurrency === c.v ? P.brass : P.line}`,
                      background: walletCurrency === c.v ? `${P.brass}12` : P.page,
                      color: walletCurrency === c.v ? '#8B681B' : P.ink600,
                      fontWeight: 700, fontSize: 13, fontFamily: "'Tajawal',sans-serif",
                      transition: 'all 0.2s',
                    }}>{c.l}</button>
                ))}
              </div>
            </Field>

            {/* الرصيد */}
            <Field label={`الرصيد الابتدائي (${walletCurrency === 'USD' ? 'دولار' : 'ليرة سورية'})`}
              required error={errors.walletBalance}>
              <input className="ob-input" style={inp} type="number" min={0}
                placeholder={walletCurrency === 'USD' ? 'مثال: 500' : 'مثال: 500000'}
                value={walletBalance} onChange={e => setWalletBalance(e.target.value)} />
            </Field>

            {/* ملاحظة */}
            <div style={{
              padding: '14px', background: `${P.brass}10`,
              borderRadius: 12, border: `1px solid ${P.brass}25`,
            }}>
              <p style={{ margin: 0, fontSize: 12.5, color: '#8B681B', lineHeight: 1.7, fontWeight: 600 }}>
                💡 يمكنك تحديث رصيدك في أي وقت من صفحة الملف الشخصي.
                الرصيد يُستخدم داخل منصة نُزُل فقط لتأكيد الحجوزات.
              </p>
            </div>

            {errors.submit && (
              <div style={{
                padding: '12px 16px', background: '#fef2f2',
                border: '1px solid #fecaca', borderRadius: 10,
                fontSize: 13, color: P.error, fontWeight: 600,
              }}>{errors.submit}</div>
            )}
          </div>
        )}

        {/* ── أزرار التنقل ──────────────────────────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 32, paddingTop: 24, borderTop: `1px solid ${P.line}`,
        }}>
          {step > 0 ? (
            <button style={btnSecondary} onClick={back}>
              <ChevronRight size={16} /> رجوع
            </button>
          ) : (
            <div />
          )}

          {step < 2 ? (
            <button style={btnPrimary} onClick={next}>
              التالي <ChevronLeft size={16} />
            </button>
          ) : (
            <button style={{ ...btnPrimary, background: `linear-gradient(135deg, ${P.brass}, #9C7825)`, opacity: submitting ? 0.7 : 1 }}
              onClick={submit} disabled={submitting}>
              {submitting
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> جارٍ الحفظ...</>
                : <><CheckCircle2 size={16} /> إتمام الإعداد</>
              }
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

// نستورد هنا لتجنب مشكلة الـ import داخل JSX
function ChevronLeft({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
