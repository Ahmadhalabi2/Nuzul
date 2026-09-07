/**
 * LiveBookingBar — Social Proof شريط نبضات الحجز الحي
 * يعرض آخر الحجوزات بشكل متحرك أسفل Hero لزيادة الثقة والـ FOMO
 */

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Users, TrendingUp } from 'lucide-react';
import { bookingsApi, type RecentBooking } from '../services/api';
import { PALETTE } from './HotelBookingFlow';

// ── Fallback data لو الـ API فاضي أو وقت التطوير ──────────────────────────────
const FALLBACK: RecentBooking[] = [
  { hotelName: 'فندق الشام باليس',      city: 'دمشق',  country: 'سوريا', guests: 2, minutesAgo: 3  },
  { hotelName: 'سيمرميس إنتركونتيننتال', city: 'دمشق',  country: 'سوريا', guests: 3, minutesAgo: 7  },
  { hotelName: 'فندق كارلتون حلب',       city: 'حلب',   country: 'سوريا', guests: 2, minutesAgo: 12 },
  { hotelName: 'أوتيل بارون',            city: 'حلب',   country: 'سوريا', guests: 1, minutesAgo: 18 },
  { hotelName: 'فندق الوادي الأخضر',     city: 'اللاذقية', country: 'سوريا', guests: 4, minutesAgo: 25 },
  { hotelName: 'فندق تشرين',             city: 'طرطوس', country: 'سوريا', guests: 2, minutesAgo: 31 },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatTime(min: number): string {
  if (min < 1)  return 'الآن';
  if (min < 60) return `منذ ${min} دقيقة`;
  const h = Math.floor(min / 60);
  return h === 1 ? 'منذ ساعة' : `منذ ${h} ساعات`;
}

const ICONS = [
  <CheckCircle2 size={14} strokeWidth={2.5} />,
  <Users        size={14} strokeWidth={2.5} />,
  <TrendingUp   size={14} strokeWidth={2.5} />,
];

const ACCENT_COLORS = [PALETTE.teal, PALETTE.brass, PALETTE.pomegranate];

// ── Sub-component: بطاقة حجز واحدة ───────────────────────────────────────────
function BookingPill({
  booking,
  index,
  visible,
}: {
  booking: RecentBooking;
  index:   number;
  visible: boolean;
}) {
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];
  const icon   = ICONS[index % ICONS.length];

  return (
    <div
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            8,
        background:     'rgba(255,255,255,0.96)',
        border:         `1px solid ${accent}30`,
        borderRadius:   40,
        padding:        '7px 14px 7px 10px',
        boxShadow:      '0 4px 20px rgba(13,22,38,0.10)',
        whiteSpace:     'nowrap',
        direction:      'rtl',
        backdropFilter: 'blur(8px)',
        // ── animation ──
        opacity:              visible ? 1 : 0,
        transform:            visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.95)',
        transition:           'opacity 0.45s cubic-bezier(0.34,1.4,0.64,1), transform 0.45s cubic-bezier(0.34,1.4,0.64,1)',
        willChange:           'opacity, transform',
      }}
      role="status"
      aria-live="polite"
    >
      {/* أيقونة ملوّنة */}
      <span style={{
        width:          26,
        height:         26,
        borderRadius:   '50%',
        background:     `${accent}18`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        color:          accent,
        flexShrink:     0,
      }}>
        {icon}
      </span>

      {/* النص */}
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: PALETTE.ink900, fontFamily: "'Tajawal',sans-serif" }}>
          {booking.hotelName}
        </span>
        <span style={{ fontSize: 11, color: PALETTE.ink600, fontFamily: "'Tajawal',sans-serif", fontWeight: 500 }}>
          {booking.guests > 1 ? `${booking.guests} أشخاص` : 'شخص واحد'} · {booking.city} · {formatTime(booking.minutesAgo)}
        </span>
      </span>

      {/* نقطة نبض خضراء */}
      <span style={{ position: 'relative', width: 8, height: 8, flexShrink: 0, marginRight: 2 }}>
        <span style={{
          position:     'absolute',
          inset:        0,
          borderRadius: '50%',
          background:   '#22c55e',
          animation:    'lbb-ping 1.6s ease-out infinite',
          opacity:      0.5,
        }} />
        <span style={{
          position:     'absolute',
          inset:        '1px',
          borderRadius: '50%',
          background:   '#22c55e',
        }} />
      </span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function LiveBookingBar() {
  const [bookings,    setBookings]    = useState<RecentBooking[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible,     setVisible]     = useState(true);
  const [totalToday,  setTotalToday]  = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── جلب البيانات من الـ API ─────────────────────────────────────────────────
  useEffect(() => {
    bookingsApi.recent()
      .then(res => {
        if (res.success && res.bookings.length > 0) {
          setBookings(res.bookings);
          setTotalToday(res.bookings.length);
        } else {
          setBookings(FALLBACK);
          setTotalToday(FALLBACK.length);
        }
      })
      .catch(() => {
        setBookings(FALLBACK);
        setTotalToday(FALLBACK.length);
      });
  }, []);

  // ── تدوير البطاقات كل 4 ثوانٍ مع fade ─────────────────────────────────────
  useEffect(() => {
    if (bookings.length <= 1) return;

    timerRef.current = setInterval(() => {
      // 1. أخفِ
      setVisible(false);
      // 2. بعد 400ms غيّر البطاقة
      setTimeout(() => {
        setActiveIndex(i => (i + 1) % bookings.length);
        // 3. أظهر
        setVisible(true);
      }, 420);
    }, 4000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [bookings]);

  if (bookings.length === 0) return null;

  const current = bookings[activeIndex];

  return (
    <>
      {/* ── Keyframes ── */}
      <style>{`
        @keyframes lbb-ping {
          0%   { transform: scale(1);   opacity: 0.6; }
          70%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes lbb-counter-pop {
          0%   { transform: scale(0.8); opacity: 0; }
          60%  { transform: scale(1.1); }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>

      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            12,
          flexWrap:       'wrap',
          marginTop:      22,
          position:       'relative',
          zIndex:         2,
          direction:      'rtl',
        }}
      >
        {/* ── بطاقة الحجز المتحركة ── */}
        <BookingPill booking={current} index={activeIndex} visible={visible} />

        {/* ── عداد اليوم ── */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          gap:            6,
          background:     'rgba(255,255,255,0.13)',
          border:         '1px solid rgba(255,255,255,0.22)',
          borderRadius:   40,
          padding:        '7px 14px',
          backdropFilter: 'blur(8px)',
          animation:      'lbb-counter-pop 0.6s ease forwards',
        }}>
          <span style={{
            fontSize:   15,
            fontWeight: 800,
            color:      PALETTE.brassLight,
            fontFamily: "'Tajawal',sans-serif",
            lineHeight: 1,
          }}>
            {totalToday}+
          </span>
          <span style={{
            fontSize:   12,
            color:      'rgba(255,255,255,0.85)',
            fontFamily: "'Tajawal',sans-serif",
            fontWeight: 600,
          }}>
            حجزاً اليوم
          </span>
        </div>

        {/* ── نقاط التنقل (dots) ── */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {bookings.map((_, i) => (
            <button
              key={i}
              onClick={() => { setVisible(false); setTimeout(() => { setActiveIndex(i); setVisible(true); }, 250); }}
              aria-label={`عرض الحجز ${i + 1}`}
              style={{
                width:      i === activeIndex ? 18 : 6,
                height:     6,
                borderRadius: 3,
                background: i === activeIndex ? PALETTE.brassLight : 'rgba(255,255,255,0.35)',
                border:     'none',
                cursor:     'pointer',
                padding:    0,
                transition: 'all 0.35s ease',
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
