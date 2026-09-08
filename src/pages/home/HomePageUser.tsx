import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Hotel, ChevronDown, MapPin, Search,
  Tag, SlidersHorizontal, RotateCcw, Sparkles, Globe, X, Loader2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { BACKEND_URL } from '../../config';
import {
  PALETTE, KhatamMark,
  HotelCard,
  themeStyles, type DisplayHotel,
} from '../../components/HotelBookingFlow';
import LiveBookingBar from '../../components/LiveBookingBar';
import ChatbotWidget from '../../components/ChatbotWidget';

// ============================================================================
// Types
// ============================================================================

interface Province {
  id: number;
  name_ar: string;
}

interface RawHotelApi {
  id: number | string;
  name: string;
  province_id?: number | string;
  province_name?: string;
  city: string;
  country?: string;
  image?: string;
  image_url?: string;
  rating?: number;
  stars?: number;
  price?: number;
  price_per_night?: number;
  amenities?: string[];
  offer_text?: string;
}

// ============================================================================
// Constants
// ============================================================================

const TOKEN_KEY = 'nuzul_token';
const OFFERS_AUTOPLAY_MS = 4000;
const SWIPE_THRESHOLD_PX = 50;
const RECOMMENDED_COUNT = 4;

// ============================================================================
// Helpers
// ============================================================================

function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${getToken()}` };
}

function mapHotelResponse(h: RawHotelApi): DisplayHotel {
  const price = h.price ?? h.price_per_night;
  const hasDiscount = !!h.price_per_night && h.price_per_night !== h.price;

  return {
    id: String(h.id),
    name: h.name,
    provinceId: String(h.province_id ?? ''),
    provinceName: h.province_name ?? '',
    city: h.city,
    country: h.country ?? 'سوريا',
    image: h.image ?? h.image_url ?? '',
    rating: h.rating ?? 4.0,
    stars: h.stars ?? 3,
    price,
    originalPrice: hasDiscount ? h.price_per_night : undefined,
    amenities: h.amenities ?? [],
    offerText: h.offer_text ?? undefined,
  };
}

const latticeTile = (color: string, opacity = 0.16) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Cg fill='none' stroke='${encodeURIComponent(color)}' stroke-width='0.75' opacity='${opacity}'%3E%3Cpath d='M32 2 L62 32 L32 62 L2 32 Z'/%3E%3Cpath d='M32 16 L48 32 L32 48 L16 32 Z'/%3E%3C/g%3E%3C/svg%3E`;

// ============================================================================
// Data hooks
// ============================================================================

/** يجلب قائمة الفنادق الفعّالة والمحافظات معاً من الباك اند. */
function useHotelsCatalog() {
  const [hotels, setHotels] = useState<DisplayHotel[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${BACKEND_URL}/api/hotels?status=active`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${BACKEND_URL}/api/provinces`).then(r => r.json()),
    ])
      .then(([hotelsData, provsData]) => {
        if (hotelsData.success) {
          setHotels(hotelsData.hotels.map(mapHotelResponse));
        }
        if (provsData.success) {
          setProvinces(provsData.provinces);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { hotels, provinces, loading };
}

// ============================================================================
// Small presentational pieces
// ============================================================================

function LatticeDivider() {
  return (
    <div
      aria-hidden
      style={{
        height: 22,
        margin: '44px 0 36px',
        backgroundImage: `linear-gradient(90deg, transparent, ${PALETTE.line} 12%, ${PALETTE.line} 88%, transparent), ${latticeTile(PALETTE.brass, 0.5)}`,
        backgroundRepeat: 'no-repeat, repeat-x',
        backgroundSize: '100% 1px, 22px 22px',
        backgroundPosition: 'center, center',
      }}
    />
  );
}

function LoadingState() {
  return (
    <div style={S.loadingBox}>
      <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
      <span>جاري تحميل الفنادق...</span>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function WalletBanner({ balance: _balance, currency: _currency }: { balance: number; currency: string }) {
  return null; // removed
}

function HeroSection({
  userName,
  searchQuery,
  onSearchChange,
  onClearSearch,
}: {
  userName: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
}) {
  return (
    <div className="animate-reveal" style={S.hero}>
      <div style={S.heroLattice} />
      <div style={S.heroBlob} />
      <div style={S.archTopline} />

      <p style={S.eyebrow}>
        <Sparkles size={13} color={PALETTE.brassLight} />
        مرحباً بك مجدداً، {userName}
      </p>

      <h1 style={S.heroTitle}>
        اكتشف ملاذك الفاخر<br />
        وإقامتك الاستثنائية في سوريا
      </h1>

      <div className="luxury-search-shadow" style={S.searchBar}>
        <Search size={19} color={PALETTE.teal} style={{ flexShrink: 0 }} />
        <input
          style={S.searchInput}
          placeholder="ابحث عن الفنادق، المدن، أو المحافظة..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button style={S.clearBtn} onClick={onClearSearch} aria-label="مسح البحث">
            <X size={16} />
          </button>
        )}
      </div>

      <LiveBookingBar />
    </div>
  );
}

function SearchResultsSection({
  query,
  results,
  onOpenHotel,
}: {
  query: string;
  results: DisplayHotel[];
  onOpenHotel: (hotel: DisplayHotel) => void;
}) {
  return (
    <div className="animate-reveal">
      <p style={themeStyles.sectionTitle}>
        <KhatamMark />عثرنا على {results.length} نتيجة لـ "{query}"
      </p>
      <div style={themeStyles.hotelsGrid}>
        {results.map(h => (
          <HotelCard key={h.id} hotel={h} onViewDetails={() => onOpenHotel(h)} />
        ))}
      </div>
      {results.length === 0 && <NoResultsBox message='لم نجد منشآت مطابقة.' />}
    </div>
  );
}

function NoResultsBox({ message }: { message: string }) {
  return (
    <div style={themeStyles.noResultsBox}>
      <Hotel size={40} color={PALETTE.ink400} style={{ marginBottom: 12 }} />
      <p style={{ margin: 0 }}>{message}</p>
    </div>
  );
}

function DestinationFilterPanel({
  provinces,
  availableCities,
  selectedProvinceId,
  selectedCity,
  resultCount,
  isFiltering,
  onProvinceChange,
  onCityChange,
  onReset,
}: {
  provinces: Province[];
  availableCities: string[];
  selectedProvinceId: string;
  selectedCity: string;
  resultCount: number;
  isFiltering: boolean;
  onProvinceChange: (id: string) => void;
  onCityChange: (city: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="animate-reveal delay-2 dest-panel" style={S.destPanel}>
      <div style={S.destHeader}>
        <p style={S.destTitle}>
          <SlidersHorizontal size={16} color={PALETTE.teal} /> استكشف حسب الوجهة
        </p>
        {isFiltering && (
          <button style={S.resetBtn} onClick={onReset}>
            <RotateCcw size={13} /> إعادة ضبط
          </button>
        )}
      </div>

      <div style={S.destFields}>
        <label style={S.destField}>
          <span style={S.destLabel}><Globe size={13} /> المحافظة</span>
          <span style={S.selectWrap}>
            <select
              className="dest-select"
              style={S.select}
              value={selectedProvinceId}
              onChange={e => onProvinceChange(e.target.value)}
            >
              <option value="all">كل المحافظات</option>
              {provinces.map(p => (
                <option key={p.id} value={String(p.id)}>{p.name_ar}</option>
              ))}
            </select>
            <ChevronDown size={15} color={PALETTE.ink400} style={S.selectIcon} />
          </span>
        </label>

        <label style={S.destField}>
          <span style={S.destLabel}><MapPin size={13} /> المدينة</span>
          <span style={S.selectWrap}>
            <select
              className="dest-select"
              style={S.select}
              value={selectedCity}
              onChange={e => onCityChange(e.target.value)}
            >
              <option value="all">كل المدن</option>
              {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={15} color={PALETTE.ink400} style={S.selectIcon} />
          </span>
        </label>

        <div style={S.resultChip}>
          <span style={S.resultCount}>{resultCount}</span>
          <span style={S.resultLabel}>منشأة متاحة</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Offers Swiper
// ============================================================================

function OffersSwiper({ hotels, onOpen }: { hotels: DisplayHotel[]; onOpen: (h: DisplayHotel) => void }) {
  const [current, setCurrent] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const diffX = useRef(0);
  const total = hotels.length;

  const prev = useCallback(() => setCurrent(c => (c - 1 + total) % total), [total]);
  const next = useCallback(() => setCurrent(c => (c + 1) % total), [total]);

  // Auto-play
  useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(next, OFFERS_AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [next, total]);

  // Touch / Mouse drag
  const onDragStart = (clientX: number) => {
    startX.current = clientX;
    setDragging(true);
  };

  const onDragMove = (clientX: number) => {
    if (dragging) diffX.current = clientX - startX.current;
  };

  const onDragEnd = () => {
    if (!dragging) return;
    setDragging(false);
    if (diffX.current > SWIPE_THRESHOLD_PX) next();       // سحب يمين = التالي (RTL)
    else if (diffX.current < -SWIPE_THRESHOLD_PX) prev();  // سحب يسار = السابق (RTL)
    diffX.current = 0;
  };

  return (
    <div className="animate-reveal delay-1" style={{ marginBottom: 36 }}>
      <p style={themeStyles.sectionTitle}>
        <Tag size={16} color={PALETTE.pomegranate} /> عروض حصرية لفترة محدودة
      </p>

      <div
        style={S.swiperContainer}
        onMouseDown={e => onDragStart(e.clientX)}
        onMouseMove={e => onDragMove(e.clientX)}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onTouchStart={e => onDragStart(e.touches[0].clientX)}
        onTouchMove={e => onDragMove(e.touches[0].clientX)}
        onTouchEnd={onDragEnd}
      >
        <div
          style={{
            ...S.swiperTrack,
            transform: `translateX(${current * -100}%)`,
            transition: dragging ? 'none' : 'transform 0.5s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {hotels.map((h, i) => (
            <div
              key={h.id}
              style={S.swiperSlide}
              onClick={() => !dragging && onOpen(h)}
            >
              <img
                src={h.image}
                alt={h.name}
                style={S.swiperImg}
                loading={i === 0 ? 'eager' : 'lazy'}
              />
              <div style={S.swiperGradient} />
              <div style={S.swiperContent}>
                <div style={S.swiperBadge}>
                  <Tag size={11} /> {h.offerText}
                </div>
                <p style={S.swiperHotelName}>{h.name}</p>
                <p style={S.swiperHotelMeta}>
                  {h.city} · {'⭐'.repeat(Math.min(h.stars, 5))} · ${h.price}/ليلة
                </p>
              </div>
            </div>
          ))}
        </div>

        {total > 1 && (
          <>
            <button
              aria-label="العرض السابق"
              style={S.swiperArrowRight}
              onClick={e => { e.stopPropagation(); prev(); }}
            >
              ‹
            </button>
            <button
              aria-label="العرض التالي"
              style={S.swiperArrowLeft}
              onClick={e => { e.stopPropagation(); next(); }}
            >
              ›
            </button>
          </>
        )}
      </div>

      {total > 1 && (
        <div style={S.swiperDots}>
          {hotels.map((h, i) => (
            <button
              key={h.id}
              aria-label={`الانتقال للعرض ${i + 1}`}
              onClick={() => setCurrent(i)}
              style={{
                ...S.swiperDot,
                background: i === current ? PALETTE.pomegranate : PALETTE.line,
                width: i === current ? 18 : 6,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function HomePageUser() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvinceId, setSelectedProvinceId] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');

  const { hotels: allHotels, provinces, loading: loadingHotels } = useHotelsCatalog();

  // ── فلترة ──────────────────────────────────────────────────────────────────
  const offerHotels = useMemo(
    () => allHotels.filter(h => !!h.offerText),
    [allHotels],
  );

  const byProvince = useMemo(
    () => (selectedProvinceId === 'all'
      ? allHotels
      : allHotels.filter(h => h.provinceId === String(selectedProvinceId))),
    [allHotels, selectedProvinceId],
  );

  const byCity = useMemo(
    () => (selectedCity === 'all' ? byProvince : byProvince.filter(h => h.city === selectedCity)),
    [byProvince, selectedCity],
  );

  const availableCities = useMemo(
    () => Array.from(new Set(byProvince.map(h => h.city).filter(Boolean))),
    [byProvince],
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return allHotels.filter(h =>
      h.name.toLowerCase().includes(q) ||
      h.city.toLowerCase().includes(q) ||
      h.provinceName.toLowerCase().includes(q),
    );
  }, [allHotels, searchQuery]);

  const isFiltering = selectedProvinceId !== 'all' || selectedCity !== 'all';

  const resetDestinationFilters = () => {
    setSelectedProvinceId('all');
    setSelectedCity('all');
  };

  if (loadingHotels) return <LoadingState />;

  return (
    <div style={{ direction: 'rtl', padding: '8px 0', background: PALETTE.page }}>
      <HeroSection
        userName={currentUser?.name?.split(' ')[0] || 'ضيفنا الكريم'}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={() => setSearchQuery('')}
      />

      {searchResults ? (
        <SearchResultsSection
          query={searchQuery}
          results={searchResults}
          onOpenHotel={h => navigate(`/hotel/${h.id}`)}
        />
      ) : (
        <>
          {offerHotels.length > 0 && (
            <OffersSwiper hotels={offerHotels} onOpen={h => navigate(`/hotel/${h.id}`)} />
          )}

          <div className="animate-reveal delay-1" style={themeStyles.sectionHeaderFlex}>
            <p style={{ ...themeStyles.sectionTitle, margin: 0 }}>
              <KhatamMark />إقامات سورية فاخرة موصى بها
            </p>
          </div>
          <div className="animate-reveal delay-1" style={themeStyles.hotelsGrid}>
            {allHotels.slice(0, RECOMMENDED_COUNT).map(h => (
              <HotelCard key={h.id} hotel={h} onViewDetails={() => navigate(`/hotel/${h.id}`)} />
            ))}
          </div>

          <LatticeDivider />

          <DestinationFilterPanel
            provinces={provinces}
            availableCities={availableCities}
            selectedProvinceId={selectedProvinceId}
            selectedCity={selectedCity}
            resultCount={byCity.length}
            isFiltering={isFiltering}
            onProvinceChange={id => { setSelectedProvinceId(id); setSelectedCity('all'); }}
            onCityChange={setSelectedCity}
            onReset={resetDestinationFilters}
          />

          <div style={{ ...themeStyles.hotelsGrid, marginTop: 24 }}>
            {byCity.map(h => (
              <HotelCard key={h.id} hotel={h} onViewDetails={() => navigate(`/hotel/${h.id}`)} />
            ))}
          </div>
          {byCity.length === 0 && <NoResultsBox message='لا توجد فنادق في هذه المنطقة.' />}
        </>
      )}

      <ChatbotWidget />
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const S: Record<string, React.CSSProperties> = {
  loadingBox: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: 300, gap: 10, color: PALETTE.teal, fontFamily: "'Tajawal',sans-serif",
  },

  archTopline: {
    position: 'absolute', top: 0, left: '10%', right: '10%', height: 3,
    background: `linear-gradient(90deg, transparent, ${PALETTE.brass}, transparent)`,
    borderRadius: '0 0 40px 40px',
  },

  hero: {
    background: `linear-gradient(160deg, ${PALETTE.ink} 0%, ${PALETTE.tealDeep} 100%)`,
    borderRadius: '28px 28px 20px 20px', padding: '52px 32px 44px', color: '#fff',
    marginBottom: 36, textAlign: 'center', position: 'relative', overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(13,22,38,0.25)',
  },
  heroLattice: {
    position: 'absolute', inset: 0, backgroundImage: latticeTile('#f3e2b8', 0.05),
    backgroundSize: '64px 64px', pointerEvents: 'none',
  },
  heroBlob: {
    position: 'absolute', width: 320, height: 320,
    background: `radial-gradient(circle, ${PALETTE.brass}22 0%, transparent 65%)`,
    top: '-18%', left: '-10%', filter: 'blur(25px)',
  },
  eyebrow: {
    margin: '0 0 10px', fontSize: 14, color: 'rgba(255,255,255,.9)', fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    position: 'relative', zIndex: 1,
  },
  heroTitle: {
    margin: '0 0 12px', fontSize: 34, fontWeight: 700, lineHeight: 1.35, color: '#fff',
    letterSpacing: '-0.3px', position: 'relative', zIndex: 1,
  },

  searchBar: {
    display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 14,
    padding: '13px 18px', maxWidth: 550, margin: '0 auto', border: '1px solid transparent',
    position: 'relative', zIndex: 1,
  },
  searchInput: { flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 15, color: PALETTE.ink900, fontWeight: 500 },
  clearBtn: { background: 'none', border: 'none', color: PALETTE.ink400, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 },

  walletBanner: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, flexWrap: 'wrap', marginBottom: 24,
    background: `linear-gradient(135deg, ${PALETTE.tealDeep}ee, ${PALETTE.ink}ee)`,
    borderRadius: 16, padding: '16px 22px', border: `1px solid ${PALETTE.teal}44`,
  },
  walletInfo: { display: 'flex', alignItems: 'center', gap: 10 },
  walletIcon: {
    width: 40, height: 40, borderRadius: '50%', background: `${PALETTE.brass}22`,
    border: `1px solid ${PALETTE.brass}44`, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  walletLabel: { margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontFamily: "'Tajawal',sans-serif" },
  walletAmount: { margin: 0, fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: "'Tajawal',sans-serif" },
  walletHint: { display: 'flex', alignItems: 'center', gap: 6 },
  walletHintText: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: "'Tajawal',sans-serif", fontWeight: 600 },

  swiperContainer: { position: 'relative', overflow: 'hidden', borderRadius: 20, userSelect: 'none' },
  swiperTrack: { display: 'flex', direction: 'ltr', willChange: 'transform' },
  swiperSlide: { minWidth: '100%', height: 260, position: 'relative', cursor: 'pointer', flexShrink: 0 },
  swiperImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  swiperGradient: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(to top, rgba(10,34,28,0.92) 0%, rgba(10,34,28,0.3) 50%, transparent 100%)',
  },
  swiperContent: { position: 'absolute', bottom: 0, right: 0, left: 0, padding: '24px 28px', direction: 'rtl' },
  swiperBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6, background: PALETTE.pomegranate, color: '#fff',
    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, marginBottom: 8,
    fontFamily: "'Tajawal',sans-serif",
  },
  swiperHotelName: { margin: '0 0 4px', color: '#fff', fontSize: 20, fontWeight: 700, fontFamily: "'Amiri',serif", lineHeight: 1.3 },
  swiperHotelMeta: { margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: "'Tajawal',sans-serif" },
  swiperArrowRight: {
    position: 'absolute', top: '50%', right: 14, transform: 'translateY(-50%)',
    width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.18)',
    backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, zIndex: 10, transition: 'background 0.2s',
  },
  swiperArrowLeft: {
    position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)',
    width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.18)',
    backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, zIndex: 10, transition: 'background 0.2s',
  },
  swiperDots: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 },
  swiperDot: { height: 6, borderRadius: 4, border: 'none', cursor: 'pointer', transition: 'width 0.25s, background 0.25s' },

  destPanel: { background: PALETTE.paper, border: `1px solid ${PALETTE.line}`, borderRadius: 18, padding: '22px 24px' },
  destHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 8 },
  destTitle: { display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 15, fontWeight: 700, color: PALETTE.ink900 },
  resetBtn: {
    display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${PALETTE.line}`,
    borderRadius: 8, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, color: PALETTE.ink600, cursor: 'pointer',
  },
  destFields: { display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' },
  destField: { display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 220px', minWidth: 200 },
  destLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: PALETTE.ink600 },
  selectWrap: { position: 'relative', display: 'block' },
  select: {
    width: '100%', appearance: 'none', WebkitAppearance: 'none', background: PALETTE.page,
    border: `1px solid ${PALETTE.line}`, borderRadius: 10, padding: '11px 40px 11px 14px',
    fontSize: 14, fontWeight: 600, color: PALETTE.ink900, cursor: 'pointer',
  },
  selectIcon: { position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', pointerEvents: 'none' },
  resultChip: {
    display: 'flex', alignItems: 'baseline', gap: 6, background: `${PALETTE.teal}12`,
    border: `1px solid ${PALETTE.teal}30`, borderRadius: 10, padding: '10px 16px', flexShrink: 0,
  },
  resultCount: { fontSize: 18, fontWeight: 800, color: PALETTE.tealDeep },
  resultLabel: { fontSize: 12.5, fontWeight: 600, color: PALETTE.ink600 },
};