import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, MapPin, Clock, CheckCircle, XCircle, Plus, CreditCard, AlertCircle, Star, Loader2 } from 'lucide-react';
import Layout from '../../components/Layout';
import { useAuthStore } from '../../store/authStore';
import { useRatingsStore } from '../../store/ratingsStore';
import RatingModal from '../../components/RatingModal';
import { bookingsApi } from '../../services/api';
import type { Booking } from '../../store/bookingsStore';

const STATUS: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  pending_admin:            { label: 'في انتظار موافقة الإدارة', bg: '#FAEAE2', text: '#BD5B3E', icon: <Clock size={13} /> },
  accepted_waiting_payment: { label: 'مقبول - في انتظار الدفع',  bg: '#E1EEE7', text: '#0A4437', icon: <CreditCard size={13} /> },
  paid_confirmed:           { label: 'مؤكد ومدفوع ✨',           bg: '#E1EEE7', text: '#0A4437', icon: <CheckCircle size={13} /> },
  completed:                { label: 'مكتمل',                     bg: '#E6F7F1', text: '#0D6B4B', icon: <CheckCircle size={13} /> },
  cancelled_by_admin:       { label: 'ملغي من الإدارة',           bg: '#FAEAE2', text: '#BD5B3E', icon: <XCircle size={13} /> },
  cancelled_by_user:        { label: 'ملغي من قبلك',              bg: '#F1F1EC', text: '#6E7C76', icon: <XCircle size={13} /> },
};
const DEFAULT_STATUS = { label: 'محدث', bg: '#F3EEDD', text: '#52655F', icon: <AlertCircle size={13} /> };

// تحويل بيانات الباك اند لـ Booking type
function mapApiBooking(b: any): Booking {
  return {
    id:             String(b.id),
    userId:         String(b.userId  ?? b.user_id ?? ''),
    userEmail:      b.userEmail  ?? b.user_email ?? '',
    userName:       b.userName   ?? b.user_name  ?? '',
    hotelId:        Number(b.hotelId ?? b.hotel_id ?? 0),
    hotelName:      b.hotelName  ?? b.hotel_name ?? '',
    country:        b.country    ?? 'سوريا',
    city:           b.city       ?? '',
    checkIn:        b.checkIn    ?? b.check_in   ?? '',
    checkOut:       b.checkOut   ?? b.check_out  ?? '',
    nights:         Number(b.nights  ?? 1),
    guests:         Number(b.guests  ?? 1),
    amount:         Number(b.amount  ?? 0),
    status:         b.status     as Booking['status'],
    createdAt:      b.createdAt  ?? b.created_at ? new Date(b.createdAt ?? b.created_at).getTime() : Date.now(),
    decidedAt:      b.decidedAt  ?? b.decided_at ? new Date(b.decidedAt ?? b.decided_at).getTime() : undefined,
    paidAt:         b.paidAt     ?? b.paid_at    ? new Date(b.paidAt    ?? b.paid_at).getTime()    : undefined,
    decidedById:    String(b.decidedById ?? b.decided_by_id ?? ''),
    decidedByName:  b.decidedByName ?? b.decided_by_name ?? '',
    reason:         b.reason     ?? '',
  };
}

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { hasRated, getRatingForBooking } = useRatingsStore();

  const [bookings,       setBookings]       = useState<Booking[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [tab,            setTab]            = useState('all');
  const [ratingBooking,  setRatingBooking]  = useState<Booking | null>(null);
  const [cancelling,     setCancelling]     = useState<string | null>(null);

  // ── جلب الحجوزات من الباك اند ─────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.list();
      if (res.success) setBookings(res.bookings.map(mapApiBooking));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // دوال التصنيف
  const isPendingStatus   = (s: string) => s === 'pending_admin' || s === 'accepted_waiting_payment';
  const isConfirmedStatus = (s: string) => s === 'paid_confirmed';
  const isCompletedStatus = (s: string) => s === 'completed';
  const isCancelledStatus = (s: string) => s.startsWith('cancelled');

  const filtered = bookings.filter(b => {
    if (tab === 'all')       return true;
    if (tab === 'pending')   return isPendingStatus(b.status);
    if (tab === 'confirmed') return isConfirmedStatus(b.status);
    if (tab === 'completed') return isCompletedStatus(b.status);
    if (tab === 'cancelled') return isCancelledStatus(b.status);
    return b.status === tab;
  });

  // ── إلغاء الحجز ──────────────────────────────────────────────────────────
  const handleCancel = async (b: Booking) => {
    if (!window.confirm(`هل أنت متأكد من إلغاء حجزك في "${b.hotelName}"؟`)) return;
    setCancelling(b.id);
    try {
      const res = await bookingsApi.cancel(Number(b.id));
      if (res.success) {
        setBookings(prev => prev.map(x => x.id === b.id ? { ...x, status: 'cancelled_by_user' } : x));
      } else { alert(res.message); }
    } catch { alert('تعذّر الاتصال بالخادم.'); }
    finally { setCancelling(null); }
  };

  return (
    <>
      <Layout>
        <style>{`
          @keyframes cardEntrance { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
          .booking-card-lux { animation:cardEntrance 0.5s cubic-bezier(0.16,1,0.3,1) forwards; transition:all 0.3s ease !important; }
          .booking-card-lux:hover { transform:translateY(-3px); box-shadow:0 16px 32px rgba(14,92,74,0.08) !important; border-color:rgba(14,92,74,0.2) !important; }
          .tabs-container-lux { display:flex; gap:6px; margin-bottom:24px; border-bottom:1px solid #E5DFC8; overflow-x:auto; white-space:nowrap; }
          .tabs-container-lux::-webkit-scrollbar { display:none; }
        `}</style>

        <div style={S.wrap}>
          {/* Header */}
          <div style={S.header}>
            <div>
              <h1 style={S.title}>سجلات حجوزاتي</h1>
              <p style={S.sub}>مرحباً بك، {currentUser?.name?.split(' ')[0]}! لديك {bookings.length} حجز إجمالاً.</p>
            </div>
            <button style={S.newBtn} onClick={() => navigate('/home/user')}>
              <Plus size={16} /> حجز إقامة جديدة
            </button>
          </div>

          {/* Tabs */}
          <div className="tabs-container-lux">
            {[
              { id: 'all',       label: 'الكل' },
              { id: 'pending',   label: 'قيد المراجعة' },
              { id: 'confirmed', label: 'المؤكدة' },
              { id: 'completed', label: 'المكتملة' },
              { id: 'cancelled', label: 'الملغية' },
            ].map(t => {
              const count = t.id === 'all' ? bookings.length : bookings.filter(b => {
                if (t.id === 'pending')   return isPendingStatus(b.status);
                if (t.id === 'confirmed') return isConfirmedStatus(b.status);
                if (t.id === 'completed') return isCompletedStatus(b.status);
                if (t.id === 'cancelled') return isCancelledStatus(b.status);
                return false;
              }).length;
              return (
                <button key={t.id} style={{ ...S.tab, ...(tab === t.id ? S.tabActive : {}) }} onClick={() => setTab(t.id)}>
                  {t.label}
                  <span style={{ ...S.tabCount, ...(tab === t.id ? S.tabCountActive : {}) }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: '#0E5C4A', gap: 10 }}>
              <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontFamily: "'Tajawal',sans-serif" }}>جاري تحميل الحجوزات...</span>
              <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* List */}
          {!loading && (
            <div style={S.list}>
              {filtered.map(b => {
                const st = STATUS[b.status] ?? DEFAULT_STATUS;
                return (
                  <div key={b.id} className="booking-card-lux" style={S.card}>
                    <div style={{ ...S.sideBar, background: st.text }} />
                    <div style={S.info}>
                      <div style={S.topRow}>
                        <div>
                          <p style={S.hotelName}>{b.hotelName}</p>
                          <p style={S.loc}><MapPin size={13} style={{ marginLeft: 3 }} /> {b.city}</p>
                        </div>
                        <span style={{ ...S.pill, background: st.bg, color: st.text }}>
                          {st.icon} <span style={{ marginRight: 4 }}>{st.label}</span>
                        </span>
                      </div>

                      {/* سبب الإلغاء */}
                      {b.reason && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                          <p style={{ margin: 0, color: '#dc2626', fontWeight: 600 }}>سبب الإلغاء: {b.reason}</p>
                          {b.decidedByName && <p style={{ margin: '4px 0 0', color: '#6b7280' }}>بواسطة: {b.decidedByName}</p>}
                        </div>
                      )}

                      {/* Meta */}
                      <div style={S.metaRow}>
                        {[
                          { label: 'تسجيل الوصول', val: b.checkIn },
                          { label: 'المغادرة',      val: b.checkOut },
                          { label: 'الليالي',       val: `${b.nights} ليالٍ` },
                          { label: 'الإجمالي',      val: `$${b.amount.toLocaleString()}`, highlight: true },
                        ].map((m, i) => (
                          <div key={i} style={S.metaItem}>
                            <p style={S.metaLabel}>{m.label}</p>
                            <p style={{ ...S.metaVal, ...(m.highlight ? { color: '#0E5C4A', fontWeight: 900 } : {}) }}>{m.val}</p>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div style={S.actions}>
                        <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>#{b.id}</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {isPendingStatus(b.status) && (
                            <button style={{ ...S.cancelBtn, opacity: cancelling === b.id ? 0.6 : 1 }}
                              onClick={() => handleCancel(b)} disabled={cancelling === b.id}>
                              {cancelling === b.id ? 'جاري الإلغاء...' : 'إلغاء الحجز'}
                            </button>
                          )}
                          {(isConfirmedStatus(b.status) || isCompletedStatus(b.status)) && (
                            <button style={{ ...S.rateBtn, background: hasRated(b.id) ? '#E1EEE7' : '#F6EBCB', color: hasRated(b.id) ? '#0A4437' : '#9C7825' }}
                              onClick={() => setRatingBooking(b)}>
                              <Star size={13} fill={hasRated(b.id) ? '#C69A3A' : 'none'} stroke="#C69A3A" />
                              {hasRated(b.id) ? `تقييمك: ${getRatingForBooking(b.id)?.stars}/5` : 'تقييم الإقامة'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div style={S.empty}>
                  <CalendarCheck size={40} color="#0E5C4A" />
                  <p style={{ color: '#1C2B27', margin: '12px 0 4px', fontSize: 16, fontWeight: 700 }}>لا توجد حجوزات هنا</p>
                  <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: 13 }}>لم تقم بأي حجز تحت هذا التصنيف.</p>
                  <button style={S.newBtn} onClick={() => navigate('/home/user')}>استكشف الفنادق</button>
                </div>
              )}
            </div>
          )}
        </div>
      </Layout>

      {ratingBooking && (
        <RatingModal booking={ratingBooking} onClose={() => { setRatingBooking(null); fetchBookings(); }} />
      )}
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap:         { direction: 'rtl', padding: '10px 0', fontFamily: "'Tajawal',sans-serif" },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 },
  title:        { margin: 0, fontSize: 28, fontWeight: 700, color: '#1C2B27', fontFamily: "'Amiri',serif" },
  sub:          { margin: '6px 0 0', fontSize: 14, color: '#52655F' },
  newBtn:       { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'linear-gradient(135deg,#0E5C4A,#0A4437)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  tab:          { padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#52655F', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '2px solid transparent', marginBottom: -1, flexShrink: 0 },
  tabActive:    { color: '#0E5C4A', borderBottomColor: '#0E5C4A', fontWeight: 700 },
  tabCount:     { background: '#f3f4f6', color: '#6b7280', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 20 },
  tabCountActive:{ background: '#E1EEE7', color: '#0A4437' },
  list:         { display: 'flex', flexDirection: 'column', gap: 16 },
  card:         { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', display: 'flex' },
  sideBar:      { width: 5, flexShrink: 0 },
  info:         { flex: 1, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 },
  topRow:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  hotelName:    { margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: '#111827' },
  loc:          { margin: 0, fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center' },
  pill:         { display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, flexShrink: 0 },
  metaRow:      { display: 'flex', background: '#f9fafb', borderRadius: 10, border: '1px solid #f3f4f6', overflow: 'hidden', flexWrap: 'wrap' },
  metaItem:     { flex: 1, padding: '10px 14px', minWidth: 90, textAlign: 'right' },
  metaLabel:    { margin: '0 0 3px', fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' as const },
  metaVal:      { margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' },
  actions:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  cancelBtn:    { padding: '7px 14px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  rateBtn:      { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  empty:        { textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', border: '1px dashed #e5e7eb', borderRadius: 16, gap: 4 },
};
