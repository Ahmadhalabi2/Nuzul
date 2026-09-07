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
  useHotelBookingFlow, HotelDetailsModal, HotelCard,
  themeStyles, type DisplayHotel,
} from '../../components/HotelBookingFlow';
import LiveBookingBar from '../../components/LiveBookingBar';

// ── Lattice helper ─────────────────────────────────────────────────────────────
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

// ── Types ──────────────────────────────────────────────────────────────────────
interface Province { id: number; name_ar: string; }

// ── Offers Swiper ──────────────────────────────────────────────────────────────
function OffersSwiper({ hotels, onOpen }: { hotels: DisplayHotel[]; onOpen: (h: DisplayHotel) => void }) {
  const [current, setCurrent]   = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX  = useRef(0);
  const diffX   = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const total = hotels.length;

  const prev = useCallback(() => setCurrent(c => (c - 1 + total) % total), [total]);
  const next = useCallback(() => setCurrent(c => (c + 1) % total), [total]);

  // Auto-play كل 4 ثوانٍ
  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(next, 4000);
    return () => clearInterval(t);
  }, [next, total]);

  // Touch / Mouse drag
  const onDragStart = (clientX: number) => { startX.current = clientX; setDragging(true); };
  const onDragEnd = () => {
    if (!dragging) return;
    setDragging(false);
    if (diffX.current > 50)  next();   // سحب يمين = التالي (RTL)
    else if (diffX.current < -50) prev(); // سحب يسار = السابق (RTL)
    diffX.current = 0;
  };
  const onDragMove  = (clientX: number) => { if (dragging) diffX.current = clientX - startX.current; };

  return (
    <div className="animate-reveal delay-1" style={{ marginBottom: 36 }}>
      <p style={themeStyles.sectionTitle}>
        <Tag size={16} color={PALETTE.pomegranate} /> عروض حصرية لفترة محدودة
      </p>

      {/* Container */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, userSelect: 'none' }}
        onMouseDown={e => onDragStart(e.clientX)}
        onMouseMove={e => onDragMove(e.clientX)}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onTouchStart={e => onDragStart(e.touches[0].clientX)}
        onTouchMove={e => onDragMove(e.touches[0].clientX)}
        onTouchEnd={onDragEnd}
      >
        {/* Track */}
        <div ref={trackRef} style={{
          display: 'flex',
          transform: `translateX(${current * -100}%)`,
          transition: dragging ? 'none' : 'transform 0.5s cubic-bezier(0.4,0,0.2,1)',
          direction: 'ltr',
          willChange: 'transform',
        }}>
          {hotels.map((h, i) => (
            <div key={h.id} style={{
              minWidth: '100%',
              height: 260,
              position: 'relative',
              cursor: 'pointer',
              flexShrink: 0,
            }} onClick={() => !dragging && onOpen(h)}>
              <img src={h.image} alt={h.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading={i === 0 ? 'eager' : 'lazy'} />
              {/* Gradient */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,34,28,0.92) 0%, rgba(10,34,28,0.3) 50%, transparent 100%)' }} />
              {/* Content */}
              <div style={{ position: 'absolute', bottom: 0, right: 0, left: 0, padding: '24px 28px', direction: 'rtl' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: PALETTE.pomegranate, color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, marginBottom: 8, fontFamily: "'Tajawal',sans-serif" }}>
                  <Tag size={11} /> {h.offerText}
                </div>
                <p style={{ margin: '0 0 4px', color: '#fff', fontSize: 20, fontWeight: 700, fontFamily: "'Amiri',serif", lineHeight: 1.3 }}>{h.name}</p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: "'Tajawal',sans-serif" }}>
                  {h.city} · {'⭐'.repeat(Math.min(h.stars, 5))} · ${h.price}/ليلة
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* السهم اليمين (السابق) */}
        {total > 1 && (
          <button onClick={e => { e.stopPropagation(); prev(); }} style={{
            position: 'absolute', top: '50%', right: 14, transform: 'translateY(-50%)',
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.3)', color: '#fff',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, zIndex: 10, transition: 'background 0.2s',
          }}>‹</button>
        )}

        {/* السهم اليسار (التالي) */}
        {total > 1 && (
          <button onClick={e => { e.stopPropagation(); next(); }} style={{
            position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)',
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.3)', color: '#fff',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, zIndex: 10, transition: 'background 0.2s',
          }}>›</button>
        )}
      </div>

      {/* Dots */}
      {total > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function HomePageUser() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const flow = useHotelBookingFlow(navigate);

  const [searchQuery,        setSearchQuery]        = useState('');
  const [selectedProvinceId, setSelectedProvinceId] = useState('all');
  const [selectedCity,       setSelectedCity]       = useState('all');
  const [allHotels,          setAllHotels]          = useState<DisplayHotel[]>([]);
  const [provinces,          setProvinces]          = useState<Province[]>([]);
  const [loadingHotels,      setLoadingHotels]      = useState(true);

  // ── جلب الفنادق والمحافظات من الباك اند ──────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('nuzul_token') ?? '';
    Promise.all([
      fetch(`${BACKEND_URL}/api/hotels?status=active`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
      fetch(`${BACKEND_URL}/api/provinces`).then(r => r.json()),
    ])
      .then(([hotelsData, provsData]) => {
        if (hotelsData.success) {
          const mapped: DisplayHotel[] = hotelsData.hotels.map((h: any) => ({
            id:            String(h.id),
            name:          h.name,
            provinceId:    String(h.province_id ?? ''),
            provinceName:  h.province_name ?? '',
            city:          h.city,
            country:       h.country ?? 'سوريا',
            image:         h.image ?? h.image_url ?? '',
            rating:        h.rating ?? 4.0,
            stars:         h.stars ?? 3,
            price:         h.price ?? h.price_per_night,
            originalPrice: (h.price_per_night && h.price_per_night !== h.price)
              ? h.price_per_night : undefined,
            amenities:     h.amenities ?? [],
            offerText:     h.offer_text ?? undefined,
            features:      h.amenities ?? [],
          }));
          setAllHotels(mapped);
        }
        if (provsData.success) setProvinces(provsData.provinces);
      })
      .catch(() => {})
      .finally(() => setLoadingHotels(false));
  }, []);

  // ── فلترة ─────────────────────────────────────────────────────────────────────
  const offerHotels = useMemo(() => allHotels.filter(h => !!h.offerText), [allHotels]);

  const byProvince = useMemo(() =>
    selectedProvinceId === 'all'
      ? allHotels
      : allHotels.filter(h => h.provinceId === String(selectedProvinceId)),
    [allHotels, selectedProvinceId]
  );

  const byCity = useMemo(() =>
    selectedCity === 'all' ? byProvince : byProvince.filter(h => h.city === selectedCity),
    [byProvince, selectedCity]
  );

  const availableCities = useMemo(() =>
    Array.from(new Set(byProvince.map(h => h.city).filter(Boolean))),
    [byProvince]
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return allHotels.filter(h =>
      h.name.toLowerCase().includes(q) ||
      h.city.toLowerCase().includes(q) ||
      h.provinceName.toLowerCase().includes(q)
    );
  }, [allHotels, searchQuery]);

  const isFiltering = selectedProvinceId !== 'all' || selectedCity !== 'all';

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loadingHotels) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 10, color: PALETTE.teal, fontFamily: "'Tajawal',sans-serif" }}>
        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
        <span>جاري تحميل الفنادق...</span>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ direction: 'rtl', padding: '8px 0', background: PALETTE.page }}>

      {/* ── Hero ── */}
      <div className="animate-reveal" style={S.hero}>
        <div style={S.heroLattice} />
        <div style={S.heroBlob} />
        <div style={S.archTopline} />
        <p style={S.eyebrow}>
          <Sparkles size={13} color={PALETTE.brassLight} />
          مرحباً بك مجدداً، {currentUser?.name?.split(' ')[0] || 'ضيفنا الكريم'}
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
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button style={S.clearBtn} onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── نبضات الحجز الحية ── */}
        <LiveBookingBar />
      </div>

      {/* ── نتائج البحث ── */}
      {searchResults && (
        <div className="animate-reveal">
          <p style={themeStyles.sectionTitle}>
            <KhatamMark />عثرنا على {searchResults.length} نتيجة لـ "{searchQuery}"
          </p>
          <div style={themeStyles.hotelsGrid}>
            {searchResults.map(h => (
              <HotelCard key={h.id} hotel={h} onViewDetails={() => flow.openDetails(h)} />
            ))}
          </div>
          {searchResults.length === 0 && (
            <div style={themeStyles.noResultsBox}>
              <Hotel size={40} color={PALETTE.ink400} style={{ marginBottom: 12 }} />
              <p style={{ margin: 0 }}>لم نجد منشآت مطابقة.</p>
            </div>
          )}
        </div>
      )}

      {/* ── المحتوى الرئيسي ── */}
      {!searchResults && (
        <>
          {/* عروض حصرية — Swiper */}
          {offerHotels.length > 0 && (
            <OffersSwiper hotels={offerHotels} onOpen={h => flow.openDetails(h)} />
          )}

          {/* موصى بها */}
          <div className="animate-reveal delay-1" style={themeStyles.sectionHeaderFlex}>
            <p style={{ ...themeStyles.sectionTitle, margin: 0 }}>
              <KhatamMark />إقامات سورية فاخرة موصى بها
            </p>
          </div>
          <div className="animate-reveal delay-1" style={themeStyles.hotelsGrid}>
            {allHotels.slice(0, 4).map(h => (
              <HotelCard key={h.id} hotel={h} onViewDetails={() => flow.openDetails(h)} />
            ))}
          </div>

          <LatticeDivider />

          {/* فلترة الوجهات */}
          <div className="animate-reveal delay-2 dest-panel" style={S.destPanel}>
            <div style={S.destHeader}>
              <p style={S.destTitle}>
                <SlidersHorizontal size={16} color={PALETTE.teal} /> استكشف حسب الوجهة
              </p>
              {isFiltering && (
                <button style={S.resetBtn} onClick={() => { setSelectedProvinceId('all'); setSelectedCity('all'); }}>
                  <RotateCcw size={13} /> إعادة ضبط
                </button>
              )}
            </div>
            <div style={S.destFields}>
              {/* المحافظة — من الباك اند */}
              <label style={S.destField}>
                <span style={S.destLabel}><Globe size={13} /> المحافظة</span>
                <span style={S.selectWrap}>
                  <select className="dest-select" style={S.select} value={selectedProvinceId}
                    onChange={e => { setSelectedProvinceId(e.target.value); setSelectedCity('all'); }}>
                    <option value="all">كل المحافظات</option>
                    {provinces.map(p => (
                      <option key={p.id} value={String(p.id)}>{p.name_ar}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} color={PALETTE.ink400} style={S.selectIcon} />
                </span>
              </label>
              {/* المدينة */}
              <label style={S.destField}>
                <span style={S.destLabel}><MapPin size={13} /> المدينة</span>
                <span style={S.selectWrap}>
                  <select className="dest-select" style={S.select} value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}>
                    <option value="all">كل المدن</option>
                    {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={15} color={PALETTE.ink400} style={S.selectIcon} />
                </span>
              </label>
              {/* عدد النتائج */}
              <div style={S.resultChip}>
                <span style={S.resultCount}>{byCity.length}</span>
                <span style={S.resultLabel}>منشأة متاحة</span>
              </div>
            </div>
          </div>

          <div style={{ ...themeStyles.hotelsGrid, marginTop: 24 }}>
            {byCity.map(h => (
              <HotelCard key={h.id} hotel={h} onViewDetails={() => flow.openDetails(h)} />
            ))}
          </div>
          {byCity.length === 0 && !loadingHotels && (
            <div style={themeStyles.noResultsBox}>
              <Hotel size={40} color={PALETTE.ink400} style={{ marginBottom: 12 }} />
              <p style={{ margin: 0 }}>لا توجد فنادق في هذه المنطقة.</p>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {flow.viewHotel && (
        <HotelDetailsModal
          hotel={flow.viewHotel}
          onClose={flow.closeDetails}
          onBook={() => flow.startBooking(flow.viewHotel!)}
        />
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  archTopline: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 3, background: `linear-gradient(90deg, transparent, ${PALETTE.brass}, transparent)`, borderRadius: '0 0 40px 40px' },

  hero: { background: `linear-gradient(160deg, ${PALETTE.ink} 0%, ${PALETTE.tealDeep} 100%)`, borderRadius: '28px 28px 20px 20px', padding: '52px 32px 44px', color: '#fff', marginBottom: 36, textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(13,22,38,0.25)' },
  heroLattice: { position: 'absolute', inset: 0, backgroundImage: latticeTile('#f3e2b8', 0.05), backgroundSize: '64px 64px', pointerEvents: 'none' },
  heroBlob: { position: 'absolute', width: 320, height: 320, background: `radial-gradient(circle, ${PALETTE.brass}22 0%, transparent 65%)`, top: '-18%', left: '-10%', filter: 'blur(25px)' },
  eyebrow: { margin: '0 0 10px', fontSize: 14, color: 'rgba(255,255,255,.9)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, position: 'relative', zIndex: 1 },
  heroTitle: { margin: '0 0 12px', fontSize: 34, fontWeight: 700, lineHeight: 1.35, color: '#fff', letterSpacing: '-0.3px', position: 'relative', zIndex: 1 },
  heroSub: { margin: '0 0 28px', fontSize: 15, color: 'rgba(255,255,255,.82)', fontWeight: 500, position: 'relative', zIndex: 1 },

  searchBar: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 14, padding: '13px 18px', maxWidth: 550, margin: '0 auto', border: '1px solid transparent', position: 'relative', zIndex: 1 },
  searchInput: { flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 15, color: PALETTE.ink900, fontWeight: 500 },
  clearBtn: { background: 'none', border: 'none', color: PALETTE.ink400, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 },

  offersRow: { display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 },
  offerCard: { position: 'relative', minWidth: 260, height: 150, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', flexShrink: 0, boxShadow: '0 10px 25px rgba(21,34,56,0.12)' },
  offerImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  offerOverlay: { position: 'absolute', inset: 0, background: `linear-gradient(0deg, ${PALETTE.inkDeep}ee 0%, transparent 60%)` },
  offerContent: { position: 'absolute', bottom: 0, right: 0, left: 0, padding: '14px 16px' },
  offerName: { margin: '0 0 4px', color: '#fff', fontSize: 13, fontWeight: 700 },
  offerText: { margin: 0, color: PALETTE.brassLight, fontSize: 11, fontWeight: 600 },

  destPanel: { background: PALETTE.paper, border: `1px solid ${PALETTE.line}`, borderRadius: 18, padding: '22px 24px' },
  destHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 8 },
  destTitle: { display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 15, fontWeight: 700, color: PALETTE.ink900 },
  resetBtn: { display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${PALETTE.line}`, borderRadius: 8, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, color: PALETTE.ink600, cursor: 'pointer' },
  destFields: { display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' },
  destField: { display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 220px', minWidth: 200 },
  destLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: PALETTE.ink600 },
  selectWrap: { position: 'relative', display: 'block' },
  select: { width: '100%', appearance: 'none', WebkitAppearance: 'none', background: PALETTE.page, border: `1px solid ${PALETTE.line}`, borderRadius: 10, padding: '11px 40px 11px 14px', fontSize: 14, fontWeight: 600, color: PALETTE.ink900, cursor: 'pointer' },
  selectIcon: { position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', pointerEvents: 'none' },
  resultChip: { display: 'flex', alignItems: 'baseline', gap: 6, background: `${PALETTE.teal}12`, border: `1px solid ${PALETTE.teal}30`, borderRadius: 10, padding: '10px 16px', flexShrink: 0 },
  resultCount: { fontSize: 18, fontWeight: 800, color: PALETTE.tealDeep },
  resultLabel: { fontSize: 12.5, fontWeight: 600, color: PALETTE.ink600 },
};
