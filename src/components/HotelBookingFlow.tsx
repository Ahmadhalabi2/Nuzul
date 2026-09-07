import { useState } from 'react';
import { MapPin, Star, X, Calendar, UserPlus, Tag, Coins, Info, Sparkles } from 'lucide-react';
import { useHotelsStore } from '../store/hotelsStore';
import { SYRIA_PROVINCES, SYRIA_HOTELS } from '../data/syria';

// ─────────────────────────────────────────────────────────────────────────────
// نظام التصميم الموحّد لتدفق الحجز — نفس هوية صفحة "عرض الكل" (الرئيسية)
// أي صفحة بدها تفتح نفس نافذة التفاصيل ← الحجز تستورد من هذا الملف
// ─────────────────────────────────────────────────────────────────────────────
export const PALETTE = {
  ink: '#152238',
  inkDeep: '#0D1626',
  inkSoft: '#233A5C',
  brass: '#C69A3D',
  brassLight: '#E8C766',
  teal: '#1C7A78',
  tealDeep: '#0F4E4D',
  pomegranate: '#8C2F3B',
  page: '#F1F4EF',
  paper: '#FFFFFF',
  ink900: '#1B2431',
  ink600: '#54627A',
  ink400: '#8794A8',
  line: '#E1E6DC',
};

// معدّل تحويل تقريبي للدولار إلى الليرة السورية الجديدة — عدّله هون فقط عند الحاجة
export const SYP_RATE = 115;
export const formatSYP = (usd: number) => Math.round(usd * SYP_RATE).toLocaleString('en-US');

export function KhatamMark({ color = PALETTE.brass, size = 16 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path
        d="M12 1 L15 8 L22 8 L16.5 12.5 L19 20 L12 15.5 L5 20 L7.5 12.5 L2 8 L9 8 Z"
        fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// كتالوج الإضافات الاختيارية — كل إضافة بتزيد السعر بنسبة مدروسة من سعر الليلة
// type: 'perNight' → النسبة تُحسب لكل ليلة × عدد الليالي
// type: 'oneTime'  → النسبة تُحسب مرة واحدة بغض النظر عن عدد الليالي
// ─────────────────────────────────────────────────────────────────────────────
export type ExtraOption = { id: string; label: string; pct: number; type: 'perNight' | 'oneTime' };

export const EXTRAS_CATALOG: ExtraOption[] = [
  { id: 'breakfast',    label: 'إفطار فاخر يومي لشخصين',              pct: 0.08, type: 'perNight' },
  { id: 'roomService',  label: 'خدمة الغرف على مدار الساعة',           pct: 0.05, type: 'perNight' },
  { id: 'viewUpgrade',  label: 'ترقية لغرفة بإطلالة مميزة',            pct: 0.15, type: 'perNight' },
  { id: 'transfer',     label: 'استقبال VIP من المطار',                pct: 0.06, type: 'oneTime' },
  { id: 'lateCheckout', label: 'تسجيل مغادرة متأخر (حتى الساعة 3 ظهراً)', pct: 0.04, type: 'oneTime' },
  { id: 'spa',          label: 'جلسة سبا واسترخاء لشخصين',              pct: 0.12, type: 'oneTime' },
];

export function calcExtraPrice(extra: ExtraOption, basePrice: number, nights: number) {
  return extra.type === 'perNight' ? extra.pct * basePrice * nights : extra.pct * basePrice;
}

// ─────────────────────────────────────────────────────────────────────────────
// نوع الفندق الموحّد للعرض (مبني من SYRIA_HOTELS) — نفس الشكل بكل الصفحات
// ─────────────────────────────────────────────────────────────────────────────
export type DisplayHotel = {
  id: string;
  name: string;
  provinceId: string;
  provinceName: string;
  city: string;
  country: string;
  image: string;
  rating: number;
  stars: number;
  price: number;
  originalPrice?: number;
  amenities: string[];
  offerText?: string;
  tag?: string;
};

export function buildDisplayHotels(): DisplayHotel[] {
  return SYRIA_HOTELS.map((h) => {
    const province = SYRIA_PROVINCES.find((p) => p.id === h.provinceId);
    return {
      id: h.id,
      name: h.name,
      provinceId: h.provinceId,
      provinceName: province?.name || '',
      city: h.city,
      country: 'سوريا',
      image: h.imageUrl,
      rating: h.rating,
      stars: h.stars,
      price: h.discountPrice ?? h.pricePerNight,
      originalPrice: h.discountPrice ? h.pricePerNight : undefined,
      amenities: h.features,
      offerText: h.offerText,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// خطاف مشترك لآلية "عرض التفاصيل ← الحجز ← تثبيت مباشر" — نفس الشي بكل الصفحات
// عند التأكيد: يُحفظ الحجز فوراً بحالة "بانتظار موافقة الإدارة" وينتقل المستخدم
// مباشرة لصفحة "حجوزاتي" — بدون أي نافذة نجاح وسيطة.
// ─────────────────────────────────────────────────────────────────────────────
export function useHotelBookingFlow(navigate?: (path: string) => void) {
  const { hotels } = useHotelsStore();

  const [viewHotel, setViewHotel] = useState<DisplayHotel | null>(null);

  const openDetails  = (hotel: DisplayHotel) => setViewHotel(hotel);
  const closeDetails = () => setViewHotel(null);

  // عند الضغط على "احجز الآن" نتنقل لـ BookHotelPage مع بيانات الفندق كاملة
  const startBooking = (hotel: DisplayHotel) => {
    setViewHotel(null);
    if (navigate) {
      // نحفظ الفندق في sessionStorage ليقرأه BookHotelPage
      sessionStorage.setItem('nuzul_booking_hotel', JSON.stringify(hotel));
      navigate(`/book-hotel/${hotel.id}`);
    }
  };

  return {
    viewHotel, openDetails, closeDetails,
    startBooking,
    // القيم التالية محتاجة للتوافق مع الكود الحالي
    bookingHotel: null as DisplayHotel | null,
    closeBooking: () => {},
    checkInDate: '', setCheckInDate: (_: string) => {},
    checkOutDate: '', setCheckOutDate: (_: string) => {},
    guestsCount: 1, setGuestsCount: (_: number) => {},
    roomType: 'standard', setRoomType: (_: string) => {},
    notes: '', setNotes: (_: string) => {},
    selectedExtras: [] as string[], toggleExtra: (_: string) => {},
    extrasAmount: 0, roomsTotal: 0, grandTotal: 0, nights: 1,
    confirmBooking: (_: React.FormEvent) => {},
  };
}

export type BookingFlow = ReturnType<typeof useHotelBookingFlow>;

// ─────────────────────────────────────────────────────────────────────────────
// نافذة تفاصيل الفندق — صور، مرافق كاملة، سعر بالدولار والليرة السورية الجديدة
// ─────────────────────────────────────────────────────────────────────────────
export function HotelDetailsModal({ hotel, onClose, onBook }: { hotel: DisplayHotel; onClose: () => void; onBook?: () => void }) {
  return (
    <div style={themeStyles.modalOverlay} onClick={onClose}>
      <div className="animate-reveal" style={themeStyles.detailsCard} onClick={(e) => e.stopPropagation()}>
        <button style={themeStyles.detailsCloseBtn} onClick={onClose}><X size={20} /></button>

        <div style={themeStyles.detailsImageWrap}>
          <img src={hotel.image} alt={hotel.name} style={themeStyles.detailsImg} />
          {hotel.offerText && (
            <div style={themeStyles.detailsOfferRibbon}><Tag size={13} /> {hotel.offerText}</div>
          )}
        </div>

        <div style={{ padding: '24px 26px' }}>
          <p style={themeStyles.detailsStars}>{'⭐'.repeat(Math.min(hotel.stars, 5))}</p>
          <h2 style={themeStyles.detailsTitle}>{hotel.name}</h2>
          <p style={themeStyles.detailsLocation}>
            <MapPin size={14} color={PALETTE.ink400} /> {hotel.city}، {hotel.provinceName}
            <span style={{ margin: '0 8px' }}>•</span>
            <Star size={13} fill={PALETTE.brass} stroke={PALETTE.brass} /> {hotel.rating}
          </p>

          <div style={themeStyles.detailsAmenitiesGrid}>
            {hotel.amenities.map((a) => (
              <span key={a} style={themeStyles.amenityBadge}>{a}</span>
            ))}
          </div>

          <div style={themeStyles.detailsPriceBox}>
            <div>
              {hotel.originalPrice && <p style={themeStyles.hotelOriginalPrice}>${hotel.originalPrice} / ليلة</p>}
              <p style={themeStyles.detailsPriceMain}>${hotel.price} <span style={themeStyles.currencyText}>/ ليلة</span></p>
              <p style={themeStyles.detailsPriceSyp}><Coins size={13} /> يعادل تقريباً {formatSYP(hotel.price)} ل.س (جديدة) / ليلة</p>
            </div>
          </div>

          {onBook && (
            <button className="btn-luxury-glow" style={themeStyles.confirmBookingSubmitBtn} onClick={onBook}>
              احجز الآن
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// استمارة تثبيت الحجز — تتضمن إضافات اختيارية تزيد السعر بشكل تناسبي ومدروس
// ─────────────────────────────────────────────────────────────────────────────
export function BookingFormModal({ hotel, flow }: { hotel: DisplayHotel; flow: BookingFlow }) {
  return (
    <div style={themeStyles.modalOverlay}>
      <div className="animate-reveal" style={themeStyles.bookingFormCard}>
        <div style={themeStyles.formHeaderRow}>
          <h3 style={themeStyles.formTitle}>تثبيت معلومات الحجز 🛎️</h3>
          <button style={themeStyles.closeFormBtn} onClick={flow.closeBooking}><X size={20} /></button>
        </div>

        <p style={themeStyles.formSubTitle}>أنت تقوم بالحجز في: <strong>{hotel.name}</strong> ({hotel.city}، سوريا)</p>

        <form onSubmit={flow.confirmBooking} style={themeStyles.bookingForm}>
          <div style={themeStyles.formGrid}>
            <div style={themeStyles.inputWrapper}>
              <label style={themeStyles.inputLabel}><Calendar size={14} style={{ marginLeft: 4 }} /> تاريخ الوصول (Check-In)</label>
              <input type="date" required value={flow.checkInDate} onChange={(e) => flow.setCheckInDate(e.target.value)} style={themeStyles.formInput} />
            </div>
            <div style={themeStyles.inputWrapper}>
              <label style={themeStyles.inputLabel}><Calendar size={14} style={{ marginLeft: 4 }} /> تاريخ المغادرة (Check-Out)</label>
              <input type="date" required value={flow.checkOutDate} onChange={(e) => flow.setCheckOutDate(e.target.value)} style={themeStyles.formInput} />
            </div>
          </div>

          <div style={themeStyles.formGrid}>
            <div style={themeStyles.inputWrapper}>
              <label style={themeStyles.inputLabel}><UserPlus size={14} style={{ marginLeft: 4 }} /> عدد النزلاء</label>
              <input type="number" min={1} max={10} required value={flow.guestsCount} onChange={(e) => flow.setGuestsCount(Number(e.target.value))} style={themeStyles.formInput} />
            </div>
            <div style={themeStyles.inputWrapper}>
              <label style={themeStyles.inputLabel}>نوع الجناح / الغرفة</label>
              <select value={flow.roomType} onChange={(e) => flow.setRoomType(e.target.value)} style={themeStyles.formSelect}>
                <option value="standard">غرفة قياسية ديلوكس</option>
                <option value="suite">جناح ملكي فاخر</option>
                <option value="family">جناح عائلي متصل</option>
              </select>
            </div>
          </div>

          <div style={themeStyles.inputWrapper}>
            <label style={themeStyles.inputLabel}>طلبات خاصة أو ملاحظات إضافية</label>
            <textarea rows={2} placeholder="مثال: سرير إضافي للأطفال، إطلالة على المسبح..." value={flow.notes} onChange={(e) => flow.setNotes(e.target.value)} style={themeStyles.formTextarea} />
          </div>

          {/* إضافات اختيارية — كل إضافة بتزيد السعر بنسبة مدروسة من سعر الليلة */}
          <div style={themeStyles.inputWrapper}>
            <label style={themeStyles.inputLabel}><Sparkles size={14} style={{ marginLeft: 4 }} /> إضافات اختيارية لتحسين إقامتك</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EXTRAS_CATALOG.map((ex) => {
                const extraPrice = Math.round(calcExtraPrice(ex, hotel.price, flow.nights));
                const checked = flow.selectedExtras.includes(ex.id);
                return (
                  <label key={ex.id} style={{ ...themeStyles.extraRow, ...(checked ? themeStyles.extraRowActive : {}) }}>
                    <span style={themeStyles.extraRowLeft}>
                      <input type="checkbox" checked={checked} onChange={() => flow.toggleExtra(ex.id)} style={{ accentColor: PALETTE.teal, width: 16, height: 16 }} />
                      {ex.label}
                      <span style={themeStyles.extraTypeTag}>{ex.type === 'perNight' ? 'لكل ليلة' : 'مرة واحدة'}</span>
                    </span>
                    <span style={themeStyles.extraPriceTag}>+${extraPrice}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ملخص السعر بالدولار والليرة السورية الجديدة قبل التأكيد */}
          <div style={themeStyles.priceSummaryBox}>
            <div style={themeStyles.priceSummaryRow}>
              <span>${hotel.price} × {flow.nights} ليالي</span>
              <span style={{ fontWeight: 800 }}>${Math.round(flow.roomsTotal)}</span>
            </div>
            {flow.extrasAmount > 0 && (
              <div style={themeStyles.priceSummaryRow}>
                <span>إجمالي الإضافات المختارة</span>
                <span style={{ fontWeight: 800, color: PALETTE.brass }}>+${Math.round(flow.extrasAmount)}</span>
              </div>
            )}
            <div style={themeStyles.priceSummaryDivider} />
            <div style={{ ...themeStyles.priceSummaryRow, fontSize: 15, fontWeight: 800 }}>
              <span>الإجمالي الكلي</span>
              <span style={{ color: PALETTE.pomegranate, fontWeight: 900 }}>${Math.round(flow.grandTotal)}</span>
            </div>
            <div style={{ ...themeStyles.priceSummaryRow, color: PALETTE.brass, fontSize: 12 }}>
              <span><Coins size={12} style={{ marginLeft: 4 }} /> بالليرة السورية الجديدة (تقريبي)</span>
              <span style={{ fontWeight: 700 }}>{formatSYP(flow.grandTotal)} ل.س</span>
            </div>
          </div>

          <button type="submit" className="btn-luxury-glow" style={themeStyles.confirmBookingSubmitBtn}>
            تأكيد وتثبيت الحجز
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// كرت الفندق المشترك — الضغط عليه يفتح التفاصيل، مو استمارة الحجز مباشرة
// ─────────────────────────────────────────────────────────────────────────────
export function HotelCard({ hotel: h, onViewDetails }: { hotel: DisplayHotel; onViewDetails: () => void }) {
  return (
    <div className="premium-hotel-card" style={themeStyles.hotelCard} onClick={onViewDetails}>
      <div style={themeStyles.hotelImageContainer}>
        <img src={h.image} alt={h.name} style={themeStyles.hotelImg} loading="lazy" />
        <span style={themeStyles.hotelTagBadge}>{'⭐'.repeat(Math.min(h.stars, 5))}</span>
        {h.offerText && <span style={themeStyles.discountBadge}><Tag size={11} /> عرض</span>}
      </div>
      <div style={{ padding: '20px' }}>
        <p style={themeStyles.hotelCardName}>{h.name}</p>
        <p style={themeStyles.hotelCardLocation}><MapPin size={13} color={PALETTE.ink400} /> {h.city}، {h.provinceName}</p>

        <div style={themeStyles.amenitiesFlexGap}>
          {h.amenities?.slice(0, 2).map((a) => <span key={a} style={themeStyles.amenityBadge}>{a}</span>)}
        </div>

        <div style={themeStyles.hotelCardMetaRow}>
          <span style={themeStyles.hotelRatingContainer}><Star size={13} fill={PALETTE.brass} stroke={PALETTE.brass} /> {h.rating}</span>
          <span style={themeStyles.hotelPriceWrap}>
            {h.originalPrice && <span style={themeStyles.hotelOriginalPrice}>${h.originalPrice}</span>}
            <span style={themeStyles.hotelPriceContainer}>${h.price} <span style={themeStyles.currencyText}>/ليلة</span></span>
          </span>
        </div>
        <p style={themeStyles.cardSypLine}><Coins size={12} /> ≈ {formatSYP(h.price)} ل.س</p>

        <button className="hotel-book-btn" style={themeStyles.hotelCtaBookBtn} onClick={(e) => { e.stopPropagation(); onViewDetails(); }}>
          <Info size={14} /> عرض التفاصيل
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// أنماط الحركة والتفاعل المشتركة — يكفي وضعها مرة واحدة بأي صفحة تستخدم هذا النظام
// (تكرارها بأكثر من صفحة غير ضار لأن الـ CSS بها idempotent)
// ─────────────────────────────────────────────────────────────────────────────
export function HotelBookingFlowStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;500;700&display=swap');
      @keyframes pageReveal { from { opacity: 0; transform: translateY(20px); filter: blur(4px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      .animate-reveal { animation: pageReveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .delay-1 { animation-delay: 0.12s; opacity: 0; }
      .delay-2 { animation-delay: 0.24s; opacity: 0; }
      .delay-3 { animation-delay: 0.36s; opacity: 0; }
      .premium-hotel-card { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important; cursor: pointer; }
      .premium-hotel-card:hover { transform: translateY(-6px); box-shadow: 0 25px 50px rgba(21, 34, 56, 0.12) !important; border-color: ${PALETTE.teal}44 !important; }
      .premium-hotel-card:hover img { transform: scale(1.05); }
      .btn-luxury-glow { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important; }
      .btn-luxury-glow:hover { transform: translateY(-2px); box-shadow: 0 12px 25px rgba(198, 154, 61, 0.35) !important; filter: brightness(1.06); }
      .hotel-book-btn { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important; }
      .hotel-book-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(28, 122, 120, 0.28) !important; filter: brightness(1.05); }
      .country-pill-hover { transition: all 0.2s ease; }
      .country-pill-hover:hover { background: ${PALETTE.page} !important; }
    `}</style>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES المشتركة لكروت الفنادق والنوافذ المنبثقة
// ─────────────────────────────────────────────────────────────────────────────
export const themeStyles: Record<string, React.CSSProperties> = {
  hotelsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 20, marginBottom: 16 },
  hotelCard: { background: PALETTE.paper, border: `1px solid ${PALETTE.line}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(21,34,56,0.04)' },
  hotelImageContainer: { position: 'relative', height: 160, overflow: 'hidden', background: PALETTE.page },
  hotelImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)' },
  hotelTagBadge: { position: 'absolute', top: 12, right: 12, background: 'rgba(13, 22, 38, 0.82)', backdropFilter: 'blur(4px)', color: PALETTE.brassLight, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 12 },
  discountBadge: { position: 'absolute', top: 12, left: 12, background: PALETTE.pomegranate, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 4 },
  hotelCardName: { margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: PALETTE.ink900, lineHeight: 1.4 },
  hotelCardLocation: { margin: '0 0 12px', fontSize: 12, color: PALETTE.ink600, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 },
  hotelCardMetaRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  hotelRatingContainer: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: PALETTE.ink900 },
  hotelPriceWrap: { display: 'flex', alignItems: 'baseline', gap: 6 },
  hotelOriginalPrice: { fontSize: 12, color: PALETTE.ink400, textDecoration: 'line-through' },
  hotelPriceContainer: { fontSize: 15, fontWeight: 800, color: PALETTE.pomegranate },
  currencyText: { color: PALETTE.ink400, fontWeight: 500, fontSize: 11 },
  cardSypLine: { margin: '0 0 12px', fontSize: 11, color: PALETTE.brass, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 },
  amenitiesFlexGap: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  amenityBadge: { background: PALETTE.page, color: PALETTE.ink600, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, border: `1px solid ${PALETTE.line}` },
  hotelCtaBookBtn: { width: '100%', padding: '10px 0', background: `linear-gradient(135deg, ${PALETTE.teal}, ${PALETTE.tealDeep})`, color: '#ffffff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  noResultsBox: { padding: '40px 20px', textAlign: 'center', background: PALETTE.paper, borderRadius: 16, color: PALETTE.ink600, border: `1px dashed ${PALETTE.line}`, marginTop: 16 },
  filterRowScrollable: { display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12, paddingRight: 4, whiteSpace: 'nowrap' },
  filterPill: { padding: '8px 16px', background: PALETTE.paper, border: `1px solid ${PALETTE.line}`, borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: PALETTE.ink600, display: 'flex', alignItems: 'center', gap: 6 },
  filterPillActive: { background: PALETTE.ink, color: PALETTE.brassLight, borderColor: PALETTE.ink },
  sectionTitle: { margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: PALETTE.ink900, letterSpacing: '-0.2px', display: 'flex', alignItems: 'center', gap: 8 },
  sectionHeaderFlex: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13, 22, 38, 0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 },
  modalCard: { background: '#fff', borderRadius: 20, padding: '36px 28px', maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.18)', border: `1px solid ${PALETTE.line}` },
  modalIconContainer: { background: `${PALETTE.teal}18`, width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  modalTitle: { margin: '0 0 8px', fontSize: 19, fontWeight: 700, color: PALETTE.ink900 },
  modalDescription: { margin: '0 0 24px', fontSize: 13, color: PALETTE.ink600, lineHeight: 1.6, fontWeight: 500 },
  modalCtaBtn: { width: '100%', padding: '12px', background: PALETTE.teal, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  bookingFormCard: { background: '#ffffff', borderRadius: '24px 24px 20px 20px', padding: '32px 24px', maxWidth: 520, width: '90%', boxShadow: '0 25px 50px rgba(13, 22, 38, 0.22)', border: `1px solid ${PALETTE.line}`, maxHeight: '90vh', overflowY: 'auto' },
  formHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  formTitle: { margin: 0, fontSize: 20, fontWeight: 700, color: PALETTE.ink900 },
  closeFormBtn: { background: 'none', border: 'none', color: PALETTE.ink600, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 },
  formSubTitle: { margin: '0 0 24px', fontSize: 14, color: PALETTE.ink600, borderBottom: `1px solid ${PALETTE.line}`, paddingBottom: 12 },
  bookingForm: { display: 'flex', flexDirection: 'column', gap: 16 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  inputWrapper: { display: 'flex', flexDirection: 'column', gap: 6 },
  inputLabel: { fontSize: 12, fontWeight: 700, color: PALETTE.ink600, display: 'flex', alignItems: 'center' },
  formInput: { padding: '10px 12px', border: `1px solid ${PALETTE.line}`, borderRadius: 8, fontSize: 14, color: PALETTE.ink900, fontWeight: 500, outline: 'none', fontFamily: 'inherit' },
  formSelect: { padding: '10px 12px', border: `1px solid ${PALETTE.line}`, borderRadius: 8, fontSize: 14, color: PALETTE.ink900, fontWeight: 500, outline: 'none', background: '#fff', fontFamily: 'inherit' },
  formTextarea: { padding: '10px 12px', border: `1px solid ${PALETTE.line}`, borderRadius: 8, fontSize: 14, color: PALETTE.ink900, fontWeight: 500, outline: 'none', resize: 'none', fontFamily: 'inherit' },
  extraRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: `1px solid ${PALETTE.line}`, borderRadius: 10, fontSize: 13, color: PALETTE.ink900, cursor: 'pointer', background: '#fff' },
  extraRowActive: { borderColor: `${PALETTE.teal}66`, background: `${PALETTE.teal}0c` },
  extraRowLeft: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 },
  extraTypeTag: { fontSize: 10, fontWeight: 700, color: PALETTE.ink400, background: PALETTE.page, padding: '2px 6px', borderRadius: 6 },
  extraPriceTag: { fontWeight: 800, color: PALETTE.brass, fontSize: 13, flexShrink: 0 },
  priceSummaryBox: { background: PALETTE.page, borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 },
  priceSummaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: PALETTE.ink900 },
  priceSummaryDivider: { borderTop: `1px dashed ${PALETTE.line}`, margin: '2px 0' },
  confirmBookingSubmitBtn: { width: '100%', padding: '12px 0', background: `linear-gradient(135deg, ${PALETTE.brass}, #a97e2c)`, color: '#ffffff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 8 },
  detailsCard: { background: '#fff', borderRadius: '24px 24px 20px 20px', maxWidth: 560, width: '92%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(13, 22, 38, 0.25)', position: 'relative' },
  detailsCloseBtn: { position: 'absolute', top: 14, left: 14, zIndex: 2, background: 'rgba(13,22,38,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  detailsImageWrap: { position: 'relative', height: 220, overflow: 'hidden', borderRadius: '24px 24px 0 0' },
  detailsImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  detailsOfferRibbon: { position: 'absolute', bottom: 0, left: 0, right: 0, background: PALETTE.pomegranate, color: '#fff', fontSize: 12, fontWeight: 700, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 },
  detailsStars: { margin: '20px 0 4px', fontSize: 13 },
  detailsTitle: { margin: '0 0 8px', fontSize: 21, fontWeight: 700, color: PALETTE.ink900 },
  detailsLocation: { margin: '0 0 16px', fontSize: 13, color: PALETTE.ink600, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  detailsAmenitiesGrid: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 },
  detailsPriceBox: { background: PALETTE.page, borderRadius: 14, padding: '16px 18px', marginBottom: 18 },
  detailsPriceMain: { margin: '2px 0', fontSize: 24, fontWeight: 800, color: PALETTE.pomegranate },
  detailsPriceSyp: { margin: 0, fontSize: 12, color: PALETTE.brass, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 },
};