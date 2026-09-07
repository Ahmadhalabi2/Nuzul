import { useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Star, Wifi, ArrowRight, CheckCircle2, Users, CalendarDays } from 'lucide-react';
import Layout from '../../components/Layout';
import { useAuthStore } from '../../store/authStore';
import { useBookingsStore } from '../../store/bookingsStore';
import { useNotifEventsStore } from '../../store/notifEvents';import { useHotelsStore } from '../../store/hotelsStore';
import { SYRIA_COUNTRY_NAME, SYRIA_HOTELS } from '../../data/syria';
import type { DisplayHotel } from '../../components/HotelBookingFlow';
import { bookingsApi } from '../../services/api';

/* ─────────────────────────────────────────────────────────
   هوية بصرية: أخضر زمردي شامي + لمسة نحاس ذهبي على خلفية
   كريمية دافئة. الخط العريض Amiri للعناوين والتفاصيل الفخمة،
   Tajawal للواجهة والنصوص التشغيلية.
   ───────────────────────────────────────────────────────── */

const STEPS = ['تفاصيل الإقامة', 'مراجعة الطلب', 'تأكيد الحجز'] as const;

function StepIndicator({ current }: { current: 0 | 1 | 2 }) {
  return (
    <div style={S.stepper} dir="rtl">
      {STEPS.map((label, i) => (
        <div key={label} style={S.stepItem}>
          <div style={S.stepMarkerRow}>
            <span
              style={{
                ...S.stepDot,
                background: i <= current ? '#0E5C4A' : 'transparent',
                borderColor: i <= current ? '#0E5C4A' : '#D8CFAE',
                color: i <= current ? '#fff' : '#93A29B',
              }}
            >
              {i < current ? <CheckCircle2 size={13} /> : i + 1}
            </span>
            {i < STEPS.length - 1 && (
              <span style={{ ...S.stepLine, background: i < current ? '#0E5C4A' : '#E5DFC8' }} />
            )}
          </div>
          <span style={{ ...S.stepLabel, color: i <= current ? '#1C2B27' : '#93A29B', fontWeight: i === current ? 800 : 600 }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function BookHotelPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { hotels } = useHotelsStore();

  // أولاً: نحاول نأخذ الفندق من sessionStorage (القادم من navigate)
  const hotelFromState: DisplayHotel | undefined = (() => {
    try {
      const stored = sessionStorage.getItem('nuzul_booking_hotel');
      if (!stored) return undefined;
      const parsed: DisplayHotel = JSON.parse(stored);
      // نتأكد أنه نفس الفندق بالـ id
      return String(parsed.id) === String(id) ? parsed : undefined;
    } catch { return undefined; }
  })();

  const resolveNumericHotelId = useCallback((hotelName: string, hotelId: string | number): number => {
    // إذا كان id رقمياً (من الباك اند) نستخدمه مباشرة
    if (typeof hotelId === 'number') return hotelId;
    const numericId = parseInt(hotelId);
    if (!isNaN(numericId)) return numericId;
    // fallback بالاسم
    const cleanName = hotelName.replace(/\([^)]*\)/g, '').trim();
    const match = hotels.find(h =>
      h.name.includes(cleanName.slice(0, 15)) ||
      cleanName.includes(h.name.replace(/\([^)]*\)/g, '').trim().slice(0, 10))
    );
    if (match) return match.id;

    const STATIC_MAP: Record<string, number> = {
      'hotel-dama-rose': 1,
      'hotel-four-seasons-dam': 1,
      'hotel-beit-al-wali': 3,
      'hotel-sheraton-dam': 4,
      'hotel-afamia-hama': 2,
      'hotel-afamia-resort-lat': 2,
      'hotel-shahba-aleppo': 0,
    };
    return STATIC_MAP[String(hotelId)] ?? 0;
  }, [hotels]);

  const findHotelInStore = (hid: string | undefined) => {
    if (!hid) return undefined;
    return hotels.find((h) => {
      if (!isNaN(Number(hid))) return Number(h.id) === Number(hid);
      const slug = hid.toLowerCase();
      return (
        (slug.includes('dama-rose') && h.name.includes('داما روز')) ||
        (slug.includes('afamia') && h.name.includes('أفاميا')) ||
        (slug.includes('wali') && h.name.includes('الوالي')) ||
        (slug.includes('sheraton') && h.name.includes('الشيراتون')) ||
        (slug.includes('mamlooka') && h.name.includes('المملوكة')) ||
        (slug.includes('shahba') && h.name.includes('شهباء')) ||
        (slug.includes('junada') && h.name.includes('جونادا')) ||
        h.id.toString() === hid
      );
    });
  };

  const fallbackHotels = SYRIA_HOTELS.map((h) => ({
    ...h,
    status: 'active' as const,
    tag: 'فنادق سوريا',
    image: h.imageUrl,
    amenities: h.features,
    price: h.discountPrice ?? h.pricePerNight,
    rooms: 12,
    rating: h.rating,
    id: h.id,
    country: SYRIA_COUNTRY_NAME,
  }));

  const findHotelFallback = (hid: string | undefined) => {
    if (!hid) return undefined;
    const byNumeric = Number(hid);
    const slug = hid.toLowerCase();
    return fallbackHotels.find((h) => {
      if (!isNaN(byNumeric)) return Number(h.id) === byNumeric;
      return (
        (slug.includes('dama-rose') && h.name.includes('داما روز')) ||
        (slug.includes('afamia') && h.name.includes('أفاميا')) ||
        (slug.includes('wali') && h.name.includes('الوالي')) ||
        (slug.includes('sheraton') && h.name.includes('الشيراتون')) ||
        (slug.includes('mamlooka') && h.name.includes('المملوكة')) ||
        (slug.includes('shahba') && h.name.includes('شهباء')) ||
        (slug.includes('junada') && h.name.includes('جونادا')) ||
        h.id.toString() === hid
      );
    });
  };

  // الأولوية: state → store → fallback
  const hotel = hotelFromState || findHotelInStore(id) || findHotelFallback(id);

  // بيانات الضيف الفعلي — مستقلة عن بيانات الحساب
  const [guestName,  setGuestName]  = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [checkIn,    setCheckIn]    = useState('');
  const [checkOut,   setCheckOut]   = useState('');
  const [guests,     setGuests]     = useState(1);
  const [roomType,   setRoomType]   = useState<'standard' | 'suite' | 'family'>('standard');
  const [notes,      setNotes]      = useState('');

  const { createBooking } = useBookingsStore();
  const { addEvent } = useNotifEventsStore();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [step, setStep] = useState<'form' | 'summary' | 'confirmed_submit'>('form');
  const [, setLastBookingId] = useState<string | null>(null);

  const nights = useMemo(
    () =>
      checkIn && checkOut
        ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
        : 0,
    [checkIn, checkOut]
  );

  const total = hotel ? nights * hotel.price * guests : 0;

  if (!hotel) return (
    <Layout>
      <div style={S.notFound}>
        <p style={S.notFoundText}>لم يتم العثور على هذا الفندق.</p>
        <button style={S.btnGhost} onClick={() => navigate('/home')}>العودة إلى الفنادق</button>
      </div>
    </Layout>
  );

  const handleBookPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return alert('يرجى تسجيل الدخول أولاً.');
    if (!guestName.trim()) return alert('يرجى إدخال اسم الضيف.');
    if (!checkIn || !checkOut || nights <= 0) return alert('يرجى اختيار تواريخ صحيحة.');
    setStep('summary');
  };

  const handleConfirmBooking = async () => {
    if (!currentUser) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const numericHotelId = resolveNumericHotelId(hotel.name, hotel.id);
      const res = await bookingsApi.create({
        hotel_id:    numericHotelId,
        hotel_name:  hotel.name,
        country:     hotel.country || 'سوريا',
        city:        hotel.city,
        check_in:    checkIn,
        check_out:   checkOut,
        nights,
        guests,
        amount:      total,
        room_type:   roomType,
        notes:       notes.trim() || undefined,
        guest_name:  guestName.trim(),
        guest_phone: guestPhone.trim() || undefined,
        guest_email: guestEmail.trim() || undefined,
      });
      if (!res.success) { setSubmitError(res.message ?? 'حدث خطأ.'); return; }
      sessionStorage.removeItem('nuzul_booking_hotel');
      setStep('confirmed_submit');
    } catch {
      setSubmitError('تعذّر الاتصال بالخادم.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── خطوة الملخص ─────────────────────────────────────── */
  if (step === 'summary') return (
    <Layout>
      <div style={S.page}>
        <button style={S.back} onClick={() => setStep('form')}>
          <ArrowRight size={16} /> العودة إلى التفاصيل
        </button>
        <StepIndicator current={1} />

        <div style={S.summaryWrap}>
          <div style={S.summaryCard}>
            <span style={S.summaryEyebrow}>{hotel.city} · {hotel.country}</span>
            <h2 style={S.summaryTitle}>{hotel.name}</h2>

            {/* بيانات الضيف */}
            <div style={S.sectionLabel}>بيانات الضيف</div>
            <div style={S.summaryGrid}>
              <div style={{ ...S.summaryRowBox, gridColumn: 'span 2' }}>
                <Users size={16} color="#0E5C4A" />
                <div>
                  <span style={S.summaryLabel}>اسم الضيف</span>
                  <span style={S.summaryValue}>{guestName}</span>
                </div>
              </div>
              {guestPhone && (
                <div style={S.summaryRowBox}>
                  <span style={{ fontSize: 16 }}>📞</span>
                  <div>
                    <span style={S.summaryLabel}>رقم الهاتف</span>
                    <span style={S.summaryValue}>{guestPhone}</span>
                  </div>
                </div>
              )}
              {guestEmail && (
                <div style={S.summaryRowBox}>
                  <span style={{ fontSize: 16 }}>✉️</span>
                  <div>
                    <span style={S.summaryLabel}>البريد الإلكتروني</span>
                    <span style={S.summaryValue}>{guestEmail}</span>
                  </div>
                </div>
              )}
            </div>

            {/* بيانات الإقامة */}
            <div style={{ ...S.sectionLabel, marginTop: 18 }}>تفاصيل الإقامة</div>
            <div style={S.summaryGrid}>
              <div style={S.summaryRowBox}>
                <CalendarDays size={16} color="#0E5C4A" />
                <div>
                  <span style={S.summaryLabel}>تسجيل الوصول</span>
                  <span style={S.summaryValue}>{checkIn}</span>
                </div>
              </div>
              <div style={S.summaryRowBox}>
                <CalendarDays size={16} color="#0E5C4A" />
                <div>
                  <span style={S.summaryLabel}>المغادرة</span>
                  <span style={S.summaryValue}>{checkOut}</span>
                </div>
              </div>
              <div style={S.summaryRowBox}>
                <Users size={16} color="#0E5C4A" />
                <div>
                  <span style={S.summaryLabel}>الضيوف</span>
                  <span style={S.summaryValue}>{guests}</span>
                </div>
              </div>
              <div style={S.summaryRowBox}>
                <Star size={16} color="#C9A84C" />
                <div>
                  <span style={S.summaryLabel}>عدد الليالي</span>
                  <span style={S.summaryValue}>{nights}</span>
                </div>
              </div>
              <div style={{ ...S.summaryRowBox, gridColumn: 'span 2' }}>
                <span style={{ fontSize: 16 }}>🛏️</span>
                <div>
                  <span style={S.summaryLabel}>نوع الجناح</span>
                  <span style={S.summaryValue}>
                    {roomType === 'standard' ? 'غرفة قياسية' : roomType === 'suite' ? 'جناح ملكي' : 'جناح عائلي'}
                  </span>
                </div>
              </div>
              {notes && (
                <div style={{ ...S.summaryRowBox, gridColumn: 'span 2' }}>
                  <span style={{ fontSize: 16 }}>📝</span>
                  <div>
                    <span style={S.summaryLabel}>ملاحظات</span>
                    <span style={S.summaryValue}>{notes}</span>
                  </div>
                </div>
              )}
            </div>

            <div style={S.divider} />

            <div style={S.summaryTotal}>
              <span style={S.summaryTotalLabel}>الإجمالي المستحق</span>
              <span style={S.summaryTotalValue}>${total.toLocaleString()}</span>
            </div>

            <button style={S.btn} onClick={handleConfirmBooking} disabled={submitting}>
              {submitting ? 'جاري الإرسال...' : 'تأكيد وإرسال الطلب'}
            </button>
            {submitError && <p style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', marginTop: 8, fontFamily: "'Tajawal',sans-serif" }}>{submitError}</p>}
            <p style={S.summaryNote}>سيتم مراجعة طلبك من قبل إدارة الفندق قبل التأكيد النهائي.</p>
          </div>
        </div>
      </div>
    </Layout>
  );

  /* ── خطوة التأكيد ─────────────────────────────────────── */
  if (step === 'confirmed_submit') return (
    <Layout>
      <div style={S.page}>
        <StepIndicator current={2} />
        <div style={S.success}>
          <div style={S.successBadge}>
            <CheckCircle2 size={40} color="#0E5C4A" />
          </div>
          <h2 style={S.successTitle}>تم إرسال طلبك</h2>
          <p style={S.successSub}>
            حجزك في <strong style={{ color: '#1C2B27' }}>{hotel.name}</strong> بانتظار موافقة الإدارة الآن
          </p>
          <div style={S.successMeta}>
            <span>{checkIn} → {checkOut}</span>
            <span style={S.dotSep}>·</span>
            <span>{nights} ليالٍ</span>
            <span style={S.dotSep}>·</span>
            <span>{guests} ضيف/ضيوف</span>
          </div>
          <p style={S.successTotal}>{total.toLocaleString()} ل.س</p>
          <button style={S.btn} onClick={() => navigate('/my-bookings')}>عرض حجوزاتي</button>
        </div>
      </div>
    </Layout>
  );

  /* ── نموذج الحجز ──────────────────────────────────────── */
  return (
    <Layout>
      <div style={S.page}>
        <button style={S.back} onClick={() => navigate('/home')}>
          <ArrowRight size={16} /> العودة إلى الرئيسية
        </button>
        <StepIndicator current={0} />

        <div style={S.layout}>
          {/* بطاقة الفندق */}
          <div style={S.infoCard}>
            <div style={S.imgWrap}>
              <img src={hotel.image} alt={hotel.name} style={S.img} />
              <div style={S.imgGradient} />
              <span style={S.tag}>{hotel.tag}</span>
              <div style={S.imgCaption}>
                <h2 style={S.hotelName}>{hotel.name}</h2>
                <p style={S.loc}><MapPin size={13} /> {hotel.city}, {hotel.country}</p>
              </div>
            </div>
            <div style={S.infoBody}>
              <div style={S.ratingRow}>
                <Star size={14} fill="#C9A84C" stroke="#C9A84C" />
                <span style={{ fontWeight: 800 }}>{hotel.rating}</span>
                <span style={{ color: '#93A29B', fontSize: 12 }}>تقييم النزلاء</span>
              </div>
              <div style={S.amenities}>
                {hotel.amenities.map((a) => (
                  <span key={a} style={S.chip}><Wifi size={11} /> {a}</span>
                ))}
              </div>
              <div style={S.priceRow}>
                <span style={S.price}>{hotel.price.toLocaleString()} ل.س</span>
                <span style={{ color: '#93A29B', fontSize: 13 }}>لليلة الواحدة للضيف الواحد</span>
              </div>
            </div>
          </div>

          {/* نموذج الحجز */}
          <form style={S.form} onSubmit={handleBookPreview}>
            <h3 style={S.formTitle}>تفاصيل الإقامة</h3>
            

            {/* ── قسم بيانات الضيف ── */}
            <div style={S.sectionDivider}>👤 بيانات الضيف</div>

            <label style={S.label}>اسم الضيف الكامل *</label>
            <input
              style={S.input}
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              placeholder="الاسم الكامل كما في الهوية"
              required
            />

            <div style={S.row}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>رقم الهاتف</label>
                <input
                  style={S.input}
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                  placeholder="مثال: 0991234567"
                  type="tel"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>البريد الإلكتروني (اختياري)</label>
                <input
                  style={S.input}
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  placeholder="guest@example.com"
                  type="email"
                />
              </div>
            </div>

            {/* ── قسم تفاصيل الإقامة ── */}
            <div style={S.sectionDivider}>🗓️ تفاصيل الإقامة</div>

            <div style={S.row}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>تسجيل الوصول *</label>
                <input
                  type="date"
                  style={S.input}
                  value={checkIn}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setCheckIn(e.target.value)}
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>المغادرة *</label>
                <input
                  type="date"
                  style={S.input}
                  value={checkOut}
                  min={checkIn || new Date().toISOString().split('T')[0]}
                  onChange={e => setCheckOut(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={S.row}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>عدد الضيوف *</label>
                <select style={S.input} value={guests} onChange={e => setGuests(Number(e.target.value))} aria-label="عدد الضيوف">
                  {[1,2,3,4,5,6].map(g => (
                    <option key={g} value={g}>{g} {g > 1 ? 'ضيوف' : 'ضيف'}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>نوع الجناح *</label>
                <select style={S.input} value={roomType} onChange={e => setRoomType(e.target.value as any)} aria-label="نوع الجناح">
                  <option value="standard">🛏️ غرفة قياسية</option>
                  <option value="suite">👑 جناح ملكي فاخر</option>
                  <option value="family">👨‍👩‍👧 جناح عائلي متصل</option>
                </select>
              </div>
            </div>

            {/* ── ملاحظات خاصة ── */}
            <label style={S.label}>طلبات خاصة / ملاحظات (اختياري)</label>
            <textarea
              style={{ ...S.input, resize: 'vertical', minHeight: 72 }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: غرفة بعيدة عن الضجيج، سرير إضافي، احتياجات خاصة..."
              rows={3}
            />

            {/* ── ملخص التكلفة ── */}
            {nights > 0 && (
              <div style={S.summary}>
                <div style={S.summaryRow}>
                  <span>سعر الليلة × {guests} ضيف</span>
                  <span>${(hotel.price * guests).toLocaleString()}</span>
                </div>
                <div style={S.summaryRow}>
                  <span>عدد الليالي</span>
                  <span>{nights}</span>
                </div>
                <div style={S.summaryRowTotal}>
                  <span>الإجمالي</span>
                  <span style={{ color: '#0E5C4A' }}>${total.toLocaleString()}</span>
                </div>
              </div>
            )}

            <button type="submit" style={S.btn}>متابعة إلى الملخص</button>
          </form>
        </div>
      </div>
    </Layout>
  );
}

const FONT = "'Tajawal', sans-serif";
const FONT_SERIF = "'Amiri', serif";

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1040, margin: '0 auto', direction: 'rtl' },
  back: { display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#52655F', fontSize: 13, fontWeight: 700, padding: 0, marginBottom: 22, fontFamily: FONT },

  /* Stepper */
  stepper: { display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 32 },
  stepItem: { display: 'flex', flexDirection: 'column', gap: 8, flex: 1 },
  stepMarkerRow: { display: 'flex', alignItems: 'center', gap: 6 },
  stepDot: { width: 24, height: 24, borderRadius: '50%', border: '1.5px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, fontFamily: FONT, flexShrink: 0, transition: 'all 0.25s' },
  stepLine: { flex: 1, height: 2, transition: 'background 0.25s' },
  stepLabel: { fontSize: 12.5, fontFamily: FONT, transition: 'color 0.25s' },

  notFound: { textAlign: 'center', paddingTop: 90, fontFamily: FONT },
  notFoundText: { color: '#93A29B', fontSize: 15, marginBottom: 18 },
  btnGhost: { padding: '10px 22px', background: 'transparent', border: '1.5px solid #0E5C4A', color: '#0E5C4A', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT },

  layout: { display: 'grid', gridTemplateColumns: 'minmax(300px, 0.95fr) minmax(320px, 1.05fr)', gap: 28 },

  infoCard: { background: '#fff', border: '1px solid #E5DFC8', borderRadius: 18, overflow: 'hidden', height: 'fit-content', boxShadow: '0 1px 2px rgba(28,43,39,0.04)' },
  imgWrap: { position: 'relative', height: 260 },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  imgGradient: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,68,55,0.88) 0%, rgba(10,68,55,0.25) 45%, rgba(10,68,55,0) 65%)' },
  tag: { position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.92)', color: '#0A4437', fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 20, fontFamily: FONT },
  imgCaption: { position: 'absolute', bottom: 0, right: 0, left: 0, padding: '18px 20px' },
  hotelName: { margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#fff', fontFamily: FONT_SERIF, lineHeight: 1.3 },
  loc: { margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT },

  infoBody: { padding: '20px 22px 22px' },
  ratingRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, fontFamily: FONT },
  amenities: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 },
  chip: { fontSize: 11.5, fontWeight: 600, color: '#0A4437', background: '#E1EEE7', padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT },
  priceRow: { display: 'flex', alignItems: 'baseline', gap: 6, paddingTop: 14, borderTop: '1px dashed #E5DFC8' },
  price: { fontSize: 21, fontWeight: 800, color: '#1C2B27', fontFamily: FONT },

  form: { background: '#fff', border: '1px solid #E5DFC8', borderRadius: 18, padding: 26, display: 'flex', flexDirection: 'column', gap: 12, fontFamily: FONT, height: 'fit-content', boxShadow: '0 1px 2px rgba(28,43,39,0.04)' },
  formTitle: { margin: 0, fontSize: 20, fontWeight: 700, color: '#1C2B27', fontFamily: FONT_SERIF },
  formSub: { margin: '-6px 0 4px', fontSize: 12.5, color: '#93A29B' },
  sectionDivider: { fontSize: 12, fontWeight: 700, color: '#0E5C4A', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 12px', marginTop: 4 },
  label: { fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: -6 },
  input: { padding: '11px 13px', border: '1.5px solid #E5DFC8', borderRadius: 9, fontSize: 14, color: '#1C2B27', outline: 'none', background: '#FAF6EC', boxSizing: 'border-box', width: '100%', fontFamily: FONT, direction: 'rtl' },
  row: { display: 'flex', gap: 12 },  summary: { background: '#FAF6EC', border: '1px solid #EFE7C9', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 9 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' },
  summaryRowTotal: { display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16, borderTop: '1px solid #E5DFC8', paddingTop: 10, marginTop: 2 },

  btn: { padding: '14px', background: 'linear-gradient(135deg,#0E5C4A,#0A4437)', color: '#fff', border: 'none', borderRadius: 11, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4, fontFamily: FONT, boxShadow: '0 4px 14px rgba(14,92,74,0.28)' },

  /* Summary page */
  summaryWrap: { display: 'flex', justifyContent: 'center' },
  summaryCard: { width: 'min(680px, 100%)', background: '#fff', border: '1px solid #E5DFC8', borderRadius: 18, padding: 30, fontFamily: FONT, boxShadow: '0 1px 2px rgba(28,43,39,0.04)' },
  summaryEyebrow: { fontSize: 12.5, color: '#93A29B', fontWeight: 600 },
  summaryTitle: { margin: '4px 0 22px', fontSize: 24, fontWeight: 700, color: '#1C2B27', fontFamily: FONT_SERIF },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 },
  summaryRowBox: { background: '#FAF6EC', border: '1px solid #EFE7C9', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 10 },
  summaryLabel: { display: 'block', color: '#52655F', fontSize: 11.5, fontWeight: 700, marginBottom: 2 },
  summaryValue: { display: 'block', color: '#1C2B27', fontSize: 14, fontWeight: 800 },
  divider: { height: 1, background: '#E5DFC8', margin: '22px 0 18px' },
  summaryTotal: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  summaryTotalLabel: { fontSize: 14, color: '#52655F', fontWeight: 600 },
  summaryTotalValue: { fontSize: 26, fontWeight: 900, color: '#0E5C4A', fontFamily: FONT_SERIF },
  summaryNote: { textAlign: 'center', fontSize: 12, color: '#93A29B', marginTop: 12 },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#0E5C4A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 },

  /* Confirmation */
  success: { textAlign: 'center', paddingTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontFamily: FONT },
  successBadge: { width: 76, height: 76, borderRadius: '50%', background: '#E1EEE7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  successTitle: { margin: 0, fontSize: 26, fontWeight: 700, color: '#1C2B27', fontFamily: FONT_SERIF },
  successSub: { margin: '2px 0 4px', fontSize: 14.5, color: '#52655F' },
  successMeta: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#93A29B', margin: '6px 0' },
  dotSep: { color: '#D8CFAE' },
  successTotal: { fontSize: 26, fontWeight: 900, color: '#0E5C4A', fontFamily: FONT_SERIF, margin: '4px 0 22px' },
};