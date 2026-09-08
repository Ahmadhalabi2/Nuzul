/**
 * HotelDetailsPage — صفحة تفاصيل الفندق المستقلة
 * /hotel/:id
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight, MapPin, Star, Coins, Tag,
  Wifi, Coffee, Car, Dumbbell, Waves, Wind,
  ChevronRight, CalendarCheck, Share2, Heart,
  CheckCircle2, Loader2,
} from 'lucide-react';
import Layout from '../../components/Layout';
import {
  PALETTE, formatSYP, KhatamMark,
  HotelBookingFlowStyles,
} from '../../components/HotelBookingFlow';
import { hotelsApi, type ApiHotel } from '../../services/api';

// ── أيقونة المرفق ─────────────────────────────────────────────────────────────
function AmenityIcon({ name }: { name: string }) {
  const n = name.toLowerCase();
  if (n.includes('واي') || n.includes('wifi') || n.includes('إنترنت')) return <Wifi size={14} />;
  if (n.includes('إفطار') || n.includes('مطعم') || n.includes('طعام'))  return <Coffee size={14} />;
  if (n.includes('موقف') || n.includes('سيارة') || n.includes('باركنج')) return <Car size={14} />;
  if (n.includes('صالة') || n.includes('رياضة') || n.includes('جيم'))   return <Dumbbell size={14} />;
  if (n.includes('سباحة') || n.includes('مسبح') || n.includes('حمام'))  return <Waves size={14} />;
  if (n.includes('تكييف') || n.includes('هواء'))                         return <Wind size={14} />;
  return <CheckCircle2 size={14} />;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ padding: '24px 0' }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }
        .sk { background: linear-gradient(90deg,#f0ede6 25%,#e8e3d8 50%,#f0ede6 75%);
               background-size:1200px 100%; animation: shimmer 1.4s infinite linear; border-radius:10px; }
      `}</style>
      <div className="sk" style={{ height: 340, borderRadius: 20, marginBottom: 28 }} />
      <div className="sk" style={{ height: 28, width: '55%', marginBottom: 14 }} />
      <div className="sk" style={{ height: 18, width: '35%', marginBottom: 28 }} />
      <div style={{ display: 'flex', gap: 10 }}>
        {[1,2,3,4].map(i => <div key={i} className="sk" style={{ height: 36, flex: 1 }} />)}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HotelDetailsPage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const [hotel,   setHotel]   = useState<ApiHotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [saved,   setSaved]   = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    hotelsApi.list()
      .then(res => {
        if (res.success) {
          const found = res.hotels.find(h => String(h.id) === id);
          if (found) setHotel(found);
          else       setError('لم يُعثر على هذا الفندق.');
        } else {
          setError('تعذّر تحميل بيانات الفندق.');
        }
      })
      .catch(() => setError('تعذّر الاتصال بالخادم.'))
      .finally(() => setLoading(false));
  }, [id]);

  // صور بتأثيرات مختلفة حتى تتوفر multi-image API
  const baseImg = hotel?.image ?? hotel?.image_url ?? '';
  const images = baseImg ? [
    { src: baseImg, filter: 'none',                           label: 'الواجهة الرئيسية' },
    { src: baseImg, filter: 'brightness(0.82) saturate(1.3)', label: 'اللوبي الداخلي'  },
    { src: baseImg, filter: 'brightness(1.12) contrast(0.9)', label: 'المطل الخارجي'   },
  ] : [];

  const handleBook = () => navigate(`/book-hotel/${id}`);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: hotel?.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <Layout>
      <HotelBookingFlowStyles />
      <style>{`
        .amenity-chip:hover { background: ${PALETTE.teal}22 !important; border-color: ${PALETTE.teal}55 !important; }
        .thumb-btn { transition: all 0.2s ease; }
        .thumb-btn:hover { transform: scale(1.05); }
        .book-float-btn { transition: all 0.3s cubic-bezier(0.16,1,0.3,1); }
        .book-float-btn:hover { transform: translateY(-3px); box-shadow: 0 16px 32px rgba(28,122,120,0.35) !important; }
        .back-link:hover { color: ${PALETTE.teal} !important; }
      `}</style>

      <div style={{ direction: 'rtl', maxWidth: 860, margin: '0 auto' }}>

        {/* ── Breadcrumb ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 13, color: PALETTE.ink600 }}>
          <button className="back-link" onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
              cursor: 'pointer', color: PALETTE.ink600, fontFamily: "'Tajawal',sans-serif", fontSize: 13, fontWeight: 600 }}>
            <ArrowRight size={16} /> العودة
          </button>
          <ChevronRight size={13} color={PALETTE.ink400} style={{ transform: 'rotate(180deg)' }} />
          <span style={{ color: PALETTE.ink400 }}>الفنادق</span>
          {hotel && (
            <>
              <ChevronRight size={13} color={PALETTE.ink400} style={{ transform: 'rotate(180deg)' }} />
              <span style={{ color: PALETTE.ink900, fontWeight: 700 }}>{hotel.name}</span>
            </>
          )}
        </div>

        {loading && <Skeleton />}
        {error   && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: PALETTE.ink600 }}>
            <p style={{ fontSize: 18, fontWeight: 700 }}>{error}</p>
            <button onClick={() => navigate(-1)} style={{ marginTop: 16, padding: '10px 24px',
              background: PALETTE.teal, color: '#fff', border: 'none', borderRadius: 10,
              cursor: 'pointer', fontFamily: "'Tajawal',sans-serif", fontWeight: 700 }}>
              العودة
            </button>
          </div>
        )}

        {hotel && !loading && (
          <div className="animate-reveal">

            {/* ── صورة رئيسية ── */}
            <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden',
              height: 360, marginBottom: 20, boxShadow: '0 12px 36px rgba(13,22,38,0.14)' }}>
              <img src={images[activeImg]?.src || baseImg} alt={hotel.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                  filter: images[activeImg]?.filter ?? 'none',
                  transition: 'filter 0.4s ease' }} />

              {/* الـ gradient */}
              <div style={{ position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(13,22,38,0.7) 0%, transparent 50%)' }} />

              {/* badge العرض */}
              {hotel.offer_text && (
                <div style={{ position: 'absolute', top: 18, right: 18,
                  background: PALETTE.pomegranate, color: '#fff',
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Tajawal',sans-serif" }}>
                  <Tag size={12} /> {hotel.offer_text}
                </div>
              )}

              {/* أزرار أكشن */}
              <div style={{ position: 'absolute', top: 18, left: 18, display: 'flex', gap: 8 }}>
                <button onClick={handleShare}
                  style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)',
                    color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Share2 size={16} />
                </button>
                <button onClick={() => setSaved(s => !s)}
                  style={{ width: 38, height: 38, borderRadius: '50%',
                    background: saved ? `${PALETTE.pomegranate}dd` : 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)',
                    color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s' }}>
                  <Heart size={16} fill={saved ? '#fff' : 'none'} />
                </button>
              </div>

              {/* اسم الفندق فوق الصورة */}
              <div style={{ position: 'absolute', bottom: 20, right: 22, left: 22 }}>
                <p style={{ margin: '0 0 4px', color: PALETTE.brassLight, fontSize: 13, fontWeight: 700,
                  fontFamily: "'Tajawal',sans-serif" }}>
                  {'⭐'.repeat(Math.min(hotel.stars, 5))}
                </p>
                <h1 style={{ margin: 0, color: '#fff', fontSize: 26, fontWeight: 700,
                  fontFamily: "'Amiri',serif", lineHeight: 1.3 }}>{hotel.name}</h1>
              </div>
            </div>

            {/* ── Thumbnails ── */}
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                {images.map((img, i) => (
                  <button key={i} className="thumb-btn" onClick={() => setActiveImg(i)}
                    style={{ flex: 1, borderRadius: 12, overflow: 'hidden', padding: 0,
                      border: `2px solid ${i === activeImg ? PALETTE.teal : 'transparent'}`,
                      cursor: 'pointer', transition: 'border-color 0.2s',
                      display: 'flex', flexDirection: 'column', background: 'none' }}>
                    <div style={{ height: 64, overflow: 'hidden' }}>
                      <img src={img.src} alt={img.label}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                          filter: img.filter, transition: 'transform 0.3s' }} />
                    </div>
                    <div style={{
                      padding: '5px 6px', background: i === activeImg ? PALETTE.teal : PALETTE.page,
                      transition: 'background 0.2s',
                    }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textAlign: 'center',
                        color: i === activeImg ? '#fff' : PALETTE.ink600,
                        fontFamily: "'Tajawal',sans-serif", whiteSpace: 'nowrap', overflow: 'hidden',
                        textOverflow: 'ellipsis' }}>
                        {img.label}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ── معلومات أساسية ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20,
              alignItems: 'start', marginBottom: 28 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <MapPin size={15} color={PALETTE.teal} />
                  <span style={{ fontSize: 14, color: PALETTE.ink600, fontWeight: 600,
                    fontFamily: "'Tajawal',sans-serif" }}>
                    {hotel.city}، {hotel.province_name ?? hotel.country}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5,
                    background: `${PALETTE.brass}18`, padding: '5px 12px', borderRadius: 20,
                    border: `1px solid ${PALETTE.brass}33` }}>
                    <Star size={13} fill={PALETTE.brass} stroke={PALETTE.brass} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: PALETTE.ink900 }}>{hotel.rating}</span>
                  </div>
                  <span style={{ fontSize: 12, color: PALETTE.ink400, fontFamily: "'Tajawal',sans-serif" }}>
                    تقييم النزلاء
                  </span>
                </div>
              </div>

              {/* السعر */}
              <div style={{ textAlign: 'left', background: PALETTE.paper, border: `1px solid ${PALETTE.line}`,
                borderRadius: 16, padding: '14px 20px', boxShadow: '0 4px 12px rgba(13,22,38,0.06)' }}>
                {hotel.price_per_night && hotel.price_per_night !== hotel.price && (
                  <p style={{ margin: '0 0 2px', fontSize: 12, color: PALETTE.ink400,
                    textDecoration: 'line-through', fontFamily: "'Tajawal',sans-serif" }}>
                    ${hotel.price_per_night}
                  </p>
                )}
                <p style={{ margin: '0 0 2px', fontSize: 26, fontWeight: 900,
                  color: PALETTE.pomegranate, fontFamily: "'Tajawal',sans-serif" }}>
                  ${hotel.price}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: PALETTE.ink400,
                  fontFamily: "'Tajawal',sans-serif" }}>لليلة الواحدة</p>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: PALETTE.brass, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Tajawal',sans-serif" }}>
                  <Coins size={11} /> ≈ {formatSYP(hotel.price)} ل.س
                </p>
              </div>
            </div>

            {/* ── المرافق ── */}
            {hotel.amenities?.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: PALETTE.ink900,
                  display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Tajawal',sans-serif" }}>
                  <KhatamMark size={14} /> المرافق والخدمات
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {hotel.amenities.map(a => (
                    <span key={a} className="amenity-chip"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                        background: PALETTE.page, border: `1px solid ${PALETTE.line}`,
                        borderRadius: 30, fontSize: 13, fontWeight: 600, color: PALETTE.ink600,
                        fontFamily: "'Tajawal',sans-serif", cursor: 'default' }}>
                      <AmenityIcon name={a} />
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── معلومات إضافية ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 32 }}>
              {[
                { label: 'عدد النجوم', value: '⭐'.repeat(Math.min(hotel.stars, 5)) },
                { label: 'المحافظة',   value: hotel.province_name ?? '—' },
                { label: 'الدولة',     value: hotel.country ?? 'سوريا' },
              ].map(item => (
                <div key={item.label} style={{ background: PALETTE.paper, border: `1px solid ${PALETTE.line}`,
                  borderRadius: 14, padding: '16px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, color: PALETTE.ink400, fontWeight: 600,
                    fontFamily: "'Tajawal',sans-serif" }}>{item.label}</p>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: PALETTE.ink900,
                    fontFamily: "'Tajawal',sans-serif" }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* ── زر الحجز ── */}
            <div style={{ position: 'sticky', bottom: 20, zIndex: 50 }}>
              <button className="book-float-btn btn-luxury-glow" onClick={handleBook}
                style={{ width: '100%', padding: '16px', fontSize: 17, fontWeight: 800,
                  background: `linear-gradient(135deg, ${PALETTE.teal}, ${PALETTE.tealDeep})`,
                  color: '#fff', border: 'none', borderRadius: 16, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  fontFamily: "'Tajawal',sans-serif",
                  boxShadow: '0 8px 24px rgba(28,122,120,0.30)' }}>
                <CalendarCheck size={20} />
                احجز الآن — ${hotel.price} / ليلة
              </button>
            </div>

          </div>
        )}
      </div>
    </Layout>
  );
}
