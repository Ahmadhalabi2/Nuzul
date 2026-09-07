import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Hotel, CalendarCheck, TrendingUp, Users,
  ChevronRight, Star, MapPin, Shield, Plus, BarChart3,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { bookingsApi, hotelsApi, usersApi, type ApiHotel } from '../../services/api';
import {
  PALETTE, KhatamMark,
  useHotelBookingFlow, HotelDetailsModal,
  themeStyles,
} from '../../components/HotelBookingFlow';

// ── Lattice helper ────────────────────────────────────────────────────────────
const latticeTile = (color: string, opacity = 0.16) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Cg fill='none' stroke='${encodeURIComponent(color)}' stroke-width='0.75' opacity='${opacity}'%3E%3Cpath d='M32 2 L62 32 L32 62 L2 32 Z'/%3E%3Cpath d='M32 16 L48 32 L32 48 L16 32 Z'/%3E%3C/g%3E%3C/svg%3E`;

function LatticeDivider() {
  return (
    <div aria-hidden style={{
      height: 22, margin: '44px 0 36px',
      backgroundImage: `linear-gradient(90deg, transparent, ${PALETTE.line} 12%, ${PALETTE.line} 88%, transparent), ${latticeTile(PALETTE.brass, 0.5)}`,
      backgroundRepeat: 'no-repeat, repeat-x',
      backgroundSize: '100% 1px, 22px 22px',
      backgroundPosition: 'center, center',
    }} />
  );
}

// ── Skeleton Loader ───────────────────────────────────────────────────────────
function SkeletonKpi() {
  return (
    <div style={S.kpiGrid}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="metric-col" style={{ ...S.kpiCol, borderInlineStart: i === 0 ? 'none' : `1px solid ${PALETTE.line}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={S.skeletonIcon} />
            <div style={{ ...S.skeletonBar, width: 20 }} />
          </div>
          <div style={{ ...S.skeletonBar, width: 56, height: 28, marginTop: 6, borderRadius: 6 }} />
          <div style={{ ...S.skeletonBar, width: 90, height: 13, marginTop: 6 }} />
        </div>
      ))}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
        .skeleton-pulse {
          background: linear-gradient(90deg, #f0ede6 25%, #e8e3d8 50%, #f0ede6 75%);
          background-size: 800px 100%;
          animation: shimmer 1.4s infinite linear;
        }
      `}</style>
    </div>
  );
}

function SkeletonHotelCards() {
  return (
    <div style={themeStyles.hotelsGrid}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ ...themeStyles.hotelCard, overflow: 'hidden' }}>
          <div className="skeleton-pulse" style={{ height: 180, borderRadius: '12px 12px 0 0' }} />
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="skeleton-pulse" style={{ height: 16, borderRadius: 6, width: '70%' }} />
            <div className="skeleton-pulse" style={{ height: 13, borderRadius: 6, width: '45%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="skeleton-pulse" style={{ height: 13, borderRadius: 6, width: 50 }} />
              <div className="skeleton-pulse" style={{ height: 13, borderRadius: 6, width: 70 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Staff Hotel Card ──────────────────────────────────────────────────────────
function StaffHotelCard({ hotel, onView }: { hotel: ApiHotel; onView: () => void }) {
  return (
    <div className="premium-hotel-card" style={themeStyles.hotelCard}>
      <div style={{ ...themeStyles.hotelImageContainer, cursor: 'pointer' }} onClick={onView}>
        <img
          src={hotel.image ?? hotel.image_url ?? ''}
          alt={hotel.name}
          style={themeStyles.hotelImg}
          loading="lazy"
        />
        {hotel.tag && <span style={themeStyles.hotelTagBadge}>{hotel.tag}</span>}
      </div>
      <div style={{ padding: 20 }}>
        <p style={themeStyles.hotelCardName}>{hotel.name}</p>
        <p style={themeStyles.hotelCardLocation}>
          <MapPin size={13} color={PALETTE.ink400} /> {hotel.city}، {hotel.country}
        </p>
        <div style={themeStyles.hotelCardMetaRow}>
          <span style={themeStyles.hotelRatingContainer}>
            <Star size={13} fill={PALETTE.brass} stroke={PALETTE.brass} /> {hotel.rating}
          </span>
          <span style={themeStyles.hotelPriceContainer}>
            ${hotel.price?.toLocaleString?.()}
            <span style={themeStyles.currencyText}>/ليلة</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Error Banner ──────────────────────────────────────────────────────────────
function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={S.errorBanner}>
      <span>⚠️ {message}</span>
      <button style={S.retryBtn} onClick={onRetry}>إعادة المحاولة</button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function HomePageAdmin() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();

  const [time,          setTime]          = useState(new Date());
  const [pendingCount,  setPendingCount]  = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalUsers,    setTotalUsers]    = useState(0);
  const [hotelsList,    setHotelsList]    = useState<ApiHotel[]>([]);
  const [loadingStats,  setLoadingStats]  = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  const flow = useHotelBookingFlow(navigate);

  // ── جلب الإحصائيات والفنادق ───────────────────────────────────────────────
  const fetchStats = async () => {
    setLoadingStats(true);
    setError(null);
    try {
      const [bRes, uRes, hRes] = await Promise.all([
        bookingsApi.list(),
        usersApi.list(),
        hotelsApi.list(),
      ]);

      if (bRes.success) {
        setTotalBookings(bRes.bookings.length);
        setPendingCount(bRes.bookings.filter(b => b.status === 'pending_admin').length);
      }
      if (uRes.success) {
        setTotalUsers(uRes.users.filter(u => u.role === 'user').length);
      }
      if (hRes.success) {
        setHotelsList(hRes.hotels);
      }
    } catch {
      setError('تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مجدداً.');
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const greeting = time.getHours() < 12
    ? 'صباح الخير'
    : time.getHours() < 18
      ? 'مساء الخير'
      : 'طاب مساؤك';

  const STATS = useMemo(() => [
    { label: 'إجمالي الفنادق',        value: hotelsList.length,  icon: <Hotel size={18} />,         accent: PALETTE.brass },
    { label: 'حجوزات بانتظار القرار', value: pendingCount,        icon: <CalendarCheck size={18} />, accent: PALETTE.teal },
    { label: 'إجمالي الحجوزات',       value: totalBookings,       icon: <TrendingUp size={18} />,    accent: PALETTE.pomegranate },
    { label: 'المستخدمين المسجلين',    value: totalUsers,          icon: <Users size={18} />,         accent: PALETTE.inkSoft },
  ], [hotelsList.length, pendingCount, totalBookings, totalUsers]);

  return (
    <div style={{ direction: 'rtl', padding: '8px 0', background: PALETTE.page }}>

      {/* ── Hero ── */}
      <div className="animate-reveal" style={S.hero}>
        <div style={S.heroLattice} />
        <div style={S.archTopline} />
        <div style={S.heroText}>
          <p style={S.eyebrow}>
            <KhatamMark color={PALETTE.brassLight} size={11} />
            لوحة القيادة الإدارية
            <span style={S.dotSep} />
            {time.toLocaleDateString('ar-EG', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 style={S.heroTitle}>{greeting}، {currentUser?.name?.split(' ')[0]}</h1>
          <p style={S.heroSub}>
            لديك حالياً{' '}
            <strong style={{ color: PALETTE.brassLight }}>
              {loadingStats ? '...' : `${pendingCount} حجزاً معلقاً`}
            </strong>
            {' '}بانتظار مراجعتك.
          </p>
          <div style={S.heroBtns}>
            <button style={S.btnPrimary} onClick={() => navigate('/bookings')}>
              مراجعة طلبات الحجز
              <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <button style={S.btnSecondary} onClick={() => navigate('/hotels')}>
              إضافة فندق جديد
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* بطاقة حالة النظام */}
        <div className="staff-status-card" style={S.statusCard}>
          <div style={S.statusRing}><Shield size={22} color={PALETTE.brassLight} /></div>
          <p style={S.statusTitle}>حالة النظام</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={error ? S.redDot : S.greenDot} />
            <p style={error ? S.statusRed : S.statusGreen}>
              {error ? 'خطأ في الاتصال' : 'مستقر بالكامل'}
            </p>
          </div>
          <p style={S.statusSub}>{error ? 'تعذّر تحميل البيانات' : 'جميع البوابات تعمل'}</p>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && <ErrorBanner message={error} onRetry={fetchStats} />}

      {/* ── KPIs ── */}
      {loadingStats ? (
        <SkeletonKpi />
      ) : (
        <div className="animate-reveal delay-1 metrics-band" style={S.kpiGrid}>
          {STATS.map((s, i) => (
            <div key={s.label} className="metric-col" style={{ ...S.kpiCol, borderInlineStart: i === 0 ? 'none' : `1px solid ${PALETTE.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: s.accent }}>{s.icon}</span>
                <span style={{ ...S.kpiBar, background: s.accent }} />
              </div>
              <p style={S.kpiVal}>{s.value.toLocaleString('ar-EG')}</p>
              <p style={S.kpiLabel}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── الاختصارات السريعة ── */}
      <div className="animate-reveal delay-2" style={S.quickGrid}>
        {[
          { label: 'الفنادق',    icon: Hotel,         path: '/hotels',    accent: PALETTE.brass },
          { label: 'الحجوزات',   icon: CalendarCheck, path: '/bookings',  accent: PALETTE.pomegranate },
          { label: 'التحليلات',  icon: BarChart3,     path: '/analytics', accent: PALETTE.teal },
          { label: 'المستخدمين', icon: Users,          path: '/users',     accent: PALETTE.inkSoft },
        ].map(q => (
          <button key={q.path} style={{ ...S.quickBtn, borderColor: `${q.accent}33` }} onClick={() => navigate(q.path)}>
            <span style={{ color: q.accent }}><q.icon size={20} /></span>
            <span style={S.quickLabel}>{q.label}</span>
            <ChevronRight size={14} color={PALETTE.ink400} style={{ transform: 'rotate(180deg)', marginRight: 'auto' }} />
          </button>
        ))}
      </div>

      <LatticeDivider />

      {/* ── آخر الفنادق ── */}
      <div className="animate-reveal delay-3" style={themeStyles.sectionHeaderFlex}>
        <p style={{ ...themeStyles.sectionTitle, margin: 0 }}>
          <KhatamMark />الفنادق المسجلة حديثاً
        </p>
        <button style={S.seeAll} onClick={() => navigate('/hotels')}>
          إدارة الفنادق كاملة <ChevronRight size={15} style={{ transform: 'rotate(180deg)' }} />
        </button>
      </div>

      {loadingStats ? (
        <SkeletonHotelCards />
      ) : (
        <div className="animate-reveal delay-3" style={themeStyles.hotelsGrid}>
          {hotelsList.slice(0, 4).map(h => (
            <StaffHotelCard
              key={h.id}
              hotel={h}
              onView={() => {
                // نمرر بيانات الـ API مباشرة بدل الـ fragile name-matching
                flow.openDetails({
                  id:           String(h.id),
                  name:         h.name,
                  city:         h.city,
                  country:      h.country,
                  image:        h.image ?? h.image_url ?? '',
                  rating:       h.rating,
                  stars:        h.stars,
                  price:        h.price,
                  amenities:    h.amenities,
                  provinceId:   String(h.province_id ?? ''),
                  provinceName: h.province_name ?? '',
                  tag:          h.tag ?? undefined,
                  offerText:    h.offer_text ?? undefined,
                });
              }}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {flow.viewHotel && (
        <HotelDetailsModal hotel={flow.viewHotel} onClose={flow.closeDetails} />
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  archTopline: {
    position: 'absolute', top: 0, left: '10%', right: '10%', height: 3,
    background: `linear-gradient(90deg, transparent, ${PALETTE.brass}, transparent)`,
    borderRadius: '0 0 40px 40px',
  },

  hero: {
    background: `linear-gradient(135deg, ${PALETTE.inkDeep} 0%, ${PALETTE.ink} 55%, ${PALETTE.inkSoft} 100%)`,
    borderRadius: '28px 28px 20px 20px', padding: '44px', color: '#fff',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 28, flexWrap: 'wrap', marginBottom: 28, position: 'relative',
    overflow: 'hidden', boxShadow: '0 20px 45px rgba(13,22,38,0.25)',
  },
  heroLattice: {
    position: 'absolute', inset: 0,
    backgroundImage: latticeTile('#f3e2b8', 0.05),
    backgroundSize: '64px 64px', pointerEvents: 'none',
  },
  heroText:  { maxWidth: 580, zIndex: 1 },
  eyebrow: {
    margin: '0 0 12px', fontSize: 12.5, color: PALETTE.brassLight,
    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  dotSep: {
    width: 3, height: 3, borderRadius: '50%',
    background: `${PALETTE.brassLight}88`, display: 'inline-block',
  },
  heroTitle: { margin: '0 0 12px', fontSize: 33, fontWeight: 700, lineHeight: 1.3, color: '#fff' },
  heroSub:   { margin: 0, fontSize: 15, color: '#cdd6e4', lineHeight: 1.7 },
  heroBtns:  { display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 },

  btnPrimary: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '12px 24px',
    background: `linear-gradient(135deg, ${PALETTE.teal}, ${PALETTE.tealDeep})`,
    color: '#fff', border: 'none', borderRadius: 12, fontSize: 14,
    fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal',sans-serif",
  },
  btnSecondary: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '12px 24px',
    background: 'rgba(255,255,255,.06)', color: '#f1f5f9',
    border: `1px solid ${PALETTE.brass}44`, borderRadius: 12, fontSize: 14,
    fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(4px)',
    fontFamily: "'Tajawal',sans-serif",
  },

  statusCard: {
    background: 'rgba(255,255,255,.05)', backdropFilter: 'blur(16px)',
    border: `1px solid ${PALETTE.brass}33`, borderRadius: 16, padding: '26px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    minWidth: 180, textAlign: 'center', zIndex: 1,
  },
  statusRing: {
    width: 46, height: 46, borderRadius: '50%', border: `1px solid ${PALETTE.brass}55`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  statusTitle: { margin: '10px 0 4px', fontWeight: 700, fontSize: 14, color: '#f1f5f9' },
  greenDot:    { width: 8, height: 8, borderRadius: '50%', background: '#5ed6b5', boxShadow: '0 0 10px #5ed6b5', display: 'block' },
  redDot:      { width: 8, height: 8, borderRadius: '50%', background: '#f87171', boxShadow: '0 0 10px #f87171', display: 'block' },
  statusGreen: { margin: 0, fontSize: 12, color: '#5ed6b5', fontWeight: 700 },
  statusRed:   { margin: 0, fontSize: 12, color: '#f87171', fontWeight: 700 },
  statusSub:   { margin: '4px 0 0', fontSize: 11, color: '#93a3bd' },

  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    background: PALETTE.paper, border: `1px solid ${PALETTE.line}`,
    borderRadius: 18, marginBottom: 32, overflow: 'hidden',
  },
  kpiCol:  { padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 6 },
  kpiBar:  { width: 20, height: 3, borderRadius: 2, opacity: 0.6 },
  kpiVal:  { margin: '4px 0 0', fontSize: 26, fontWeight: 800, color: PALETTE.ink900, lineHeight: 1 },
  kpiLabel:{ margin: 0, fontSize: 12.5, color: PALETTE.ink600, fontWeight: 600 },

  // Skeleton helpers
  skeletonIcon: { width: 24, height: 24, borderRadius: '50%', background: '#e8e3d8' },
  skeletonBar:  {
    height: 10, borderRadius: 4,
    background: 'linear-gradient(90deg, #f0ede6 25%, #e8e3d8 50%, #f0ede6 75%)',
    backgroundSize: '800px 100%',
    animation: 'shimmer 1.4s infinite linear',
  },

  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 8 },
  quickBtn: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px',
    background: PALETTE.paper, border: '1px solid', borderRadius: 14,
    cursor: 'pointer', fontFamily: "'Tajawal',sans-serif", transition: 'all 0.2s',
  },
  quickLabel: { fontSize: 14, fontWeight: 700, color: PALETTE.ink900 },

  seeAll: {
    display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
    color: PALETTE.teal, fontWeight: 700, fontSize: 13, cursor: 'pointer',
    fontFamily: "'Tajawal',sans-serif",
  },

  errorBanner: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
    padding: '12px 20px', marginBottom: 24, fontSize: 14,
    color: '#b91c1c', fontFamily: "'Tajawal',sans-serif", fontWeight: 600,
    direction: 'rtl',
  },
  retryBtn: {
    padding: '6px 16px', background: '#ef4444', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Tajawal',sans-serif",
  },
};
