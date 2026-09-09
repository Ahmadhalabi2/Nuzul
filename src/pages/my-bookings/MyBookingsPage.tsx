import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck, MapPin, Clock, CheckCircle, XCircle, Plus,
  CreditCard, AlertCircle, Star, Loader2, X, Hotel,
  CalendarDays, Users, Coins, FileText, ChevronLeft,
} from 'lucide-react';
import Layout from '../../components/Layout';
import { useAuthStore } from '../../store/authStore';
import { useRatingsStore } from '../../store/ratingsStore';
import RatingModal from '../../components/RatingModal';
import { bookingsApi } from '../../services/api';
import { PALETTE, formatSYP } from '../../components/HotelBookingFlow';
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
    paymentNotifiedAt: b.paymentNotifiedAt ?? b.payment_notified_at
      ? new Date(b.paymentNotifiedAt ?? b.payment_notified_at).getTime()
      : undefined,
  };
}

// ── Timeline steps definition ─────────────────────────────────────────────────
function buildTimeline(b: Booking) {
  const isCancelled = b.status.startsWith('cancelled');
  const cancelByAdmin = b.status === 'cancelled_by_admin';

  // المراحل الأساسية دائماً موجودة
  const steps = [
    {
      key:       'created',
      label:     'تم إرسال طلب الحجز',
      sublabel:  b.createdAt ? new Date(b.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
      icon:      <FileText size={15} />,
      done:      true,
      cancelled: false,
    },
    {
      key:       'decision',
      label:     isCancelled
        ? (cancelByAdmin ? 'ملغي من الإدارة' : 'ملغي من المستخدم')
        : b.status === 'pending_admin' ? 'قيد مراجعة الإدارة' : 'قرار الإدارة',
      sublabel:  b.decidedAt
        ? `${cancelByAdmin ? 'بواسطة' : ''} ${b.decidedByName ?? ''} — ${new Date(b.decidedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}`
        : b.status === 'pending_admin' ? 'بانتظار المراجعة...' : '',
      icon:      isCancelled ? <XCircle size={15} /> : <CheckCircle size={15} />,
      done:      b.status !== 'pending_admin',
      cancelled: isCancelled,
    },
    {
      key:       'payment',
      label:     'تأكيد الدفع',
      sublabel:  b.paidAt ? new Date(b.paidAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : 'بانتظار الدفع',
      icon:      <CreditCard size={15} />,
      done:      !!b.paidAt || b.status === 'paid_confirmed' || b.status === 'completed',
      cancelled: isCancelled,
      hidden:    isCancelled,
    },
    {
      key:       'completed',
      label:     'إقامة مكتملة',
      sublabel:  b.status === 'completed' ? 'شكراً لاختيارك نُزُل' : 'موعد الإقامة القادم',
      icon:      <CalendarCheck size={15} />,
      done:      b.status === 'completed',
      cancelled: false,
      hidden:    isCancelled,
    },
  ];

  return steps.filter(s => !s.hidden);
}

// ── Booking Detail Modal ───────────────────────────────────────────────────────
function BookingDetailModal({
  booking: b,
  onClose,
  onCancel,
  onNotifyPayment,
  cancelling,
}: {
  booking:         Booking;
  onClose:         () => void;
  onCancel:        (b: Booking) => void;
  onNotifyPayment: (b: Booking) => void;
  cancelling:      string | null;
}) {
  const st        = STATUS[b.status] ?? DEFAULT_STATUS;
  const steps     = buildTimeline(b);
  const canCancel = b.status === 'pending_admin' || b.status === 'accepted_waiting_payment';
  const isCancelled = b.status.startsWith('cancelled');

  // ── animation stagger ──
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  useEffect(() => {
    steps.forEach((_, i) => {
      setTimeout(() => setVisibleSteps(p => [...p, i]), i * 160 + 80);
    });
  
  }, []);

  const nodeColor = (step: ReturnType<typeof buildTimeline>[0]) => {
    if (step.cancelled) return '#BD5B3E';
    if (step.done)      return PALETTE.teal;
    return PALETTE.line;
  };

  return (
    <div style={M.overlay} onClick={onClose}>
      <style>{`
        @keyframes modalIn {
          from { opacity:0; transform:translateY(24px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)   scale(1);    }
        }
        @keyframes stepIn {
          from { opacity:0; transform:translateX(14px); }
          to   { opacity:1; transform:translateX(0);    }
        }
        .modal-step-reveal { animation: stepIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      <div style={M.card} onClick={e => e.stopPropagation()}>

        {/* ── الخط الذهبي العلوي ── */}
        <div style={M.goldTopline} />

        {/* ── Close ── */}
        <button style={M.closeBtn} onClick={onClose}><X size={18} /></button>

        {/* ── Header ── */}
        <div style={M.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ ...M.hotelIcon, background: `${PALETTE.teal}18` }}>
              <Hotel size={18} color={PALETTE.teal} />
            </div>
            <div>
              <h2 style={M.hotelName}>{b.hotelName}</h2>
              <p style={M.hotelLoc}><MapPin size={12} /> {b.city}</p>
            </div>
          </div>
          <span style={{ ...M.pill, background: st.bg, color: st.text }}>
            {st.icon} <span style={{ marginRight: 4 }}>{st.label}</span>
          </span>
        </div>

        <div style={M.body}>

          {/* ── التايم لاين ── */}
          <div style={M.timelineWrap}>
            <h3 style={M.sectionTitle}>مسار الحجز</h3>
            <div style={{ position: 'relative', paddingRight: 32 }}>

              {/* خط التدرج الرابط */}
              <div style={M.timelineLine} />

              {steps.map((step, i) => (
                <div
                  key={step.key}
                  className={visibleSteps.includes(i) ? 'modal-step-reveal' : ''}
                  style={{ ...M.stepRow, opacity: visibleSteps.includes(i) ? 1 : 0 }}
                >
                  {/* النقطة */}
                  <div style={{
                    ...M.stepNode,
                    background:  step.done ? nodeColor(step) : 'transparent',
                    border:      `2px solid ${nodeColor(step)}`,
                    boxShadow:   step.done && !step.cancelled
                      ? `0 0 0 4px ${PALETTE.teal}22`
                      : step.cancelled ? `0 0 0 4px #BD5B3E22` : 'none',
                  }}>
                    {step.done
                      ? <span style={{ color: '#fff', display: 'flex' }}>{step.icon}</span>
                      : <span style={{ color: PALETTE.ink400, display: 'flex' }}>{step.icon}</span>
                    }
                  </div>

                  {/* المحتوى */}
                  <div style={M.stepContent}>
                    <p style={{
                      ...M.stepLabel,
                      color: step.cancelled ? '#BD5B3E' : step.done ? PALETTE.ink900 : PALETTE.ink400,
                      fontWeight: step.done ? 700 : 500,
                    }}>{step.label}</p>
                    {step.sublabel && (
                      <p style={{ ...M.stepSub, color: step.cancelled ? '#BD5B3E99' : PALETTE.ink400 }}>
                        {step.sublabel}
                      </p>
                    )}
                  </div>

                  {/* شارة "الآن" */}
                  {step.done && i === steps.filter(s => s.done).length - 1 && !isCancelled && (
                    <span style={M.nowBadge}>الحالة الآن</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={M.divider} />

          {/* ── تفاصيل الحجز ── */}
          <div>
            <h3 style={M.sectionTitle}>تفاصيل الإقامة</h3>
            <div style={M.detailsGrid}>
              {[
                { icon: <CalendarDays size={14} />, label: 'تسجيل الوصول',  val: b.checkIn  },
                { icon: <CalendarDays size={14} />, label: 'المغادرة',       val: b.checkOut },
                { icon: <Clock        size={14} />, label: 'عدد الليالي',    val: `${b.nights} ليالٍ` },
                { icon: <Users        size={14} />, label: 'عدد الضيوف',     val: `${b.guests} ضيف`   },
                {
                  icon: <Coins size={14} />,
                  label: 'الإجمالي المدفوع',
                  val:  `$${b.amount.toLocaleString()} ≈ ${formatSYP(b.amount)} ل.س`,
                  highlight: true,
                },
                { icon: <FileText size={14} />, label: 'رقم الحجز', val: `#${b.id}` },
              ].map((d, i) => (
                <div key={i} style={M.detailItem}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: PALETTE.ink400, marginBottom: 4 }}>
                    {d.icon}
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{d.label}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700,
                    color: (d as any).highlight ? PALETTE.teal : PALETTE.ink900 }}>
                    {d.val}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* سبب الإلغاء */}
          {b.reason && (
            <div style={M.cancelReason}>
              <XCircle size={14} color="#BD5B3E" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#BD5B3E' }}>
                  سبب الإلغاء: {b.reason}
                </p>
                {b.decidedByName && (
                  <p style={{ margin: '3px 0 0', fontSize: 11.5, color: '#BD5B3E99' }}>
                    بواسطة: {b.decidedByName}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {(canCancel || (b.status === 'accepted_waiting_payment')) && (
          <div style={M.footer}>
            {b.status === 'accepted_waiting_payment' && (
              <button
                style={{
                  ...M.cancelBtn,
                  background: b.paymentNotifiedAt ? '#E1EEE7' : '#F6EBCB',
                  color: b.paymentNotifiedAt ? '#0A4437' : '#9C7825',
                  border: `1px solid ${b.paymentNotifiedAt ? '#bbf7d0' : '#E8C766'}`,
                  cursor: b.paymentNotifiedAt ? 'default' : 'pointer',
                }}
                onClick={() => { if (!b.paymentNotifiedAt) onNotifyPayment(b); }}
                disabled={!!b.paymentNotifiedAt || cancelling === b.id}
              >
                <CreditCard size={14} />
                {cancelling === b.id
                  ? 'جاري الإرسال...'
                  : b.paymentNotifiedAt
                    ? 'تم إبلاغ الإدارة ✓'
                    : 'أبلغ عن إتمام الدفع'}
              </button>
            )}
            {canCancel && (
              <button style={M.cancelBtn}
                onClick={() => onCancel(b)}
                disabled={cancelling === b.id}>
                {cancelling === b.id
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> جاري الإلغاء...</>
                  : <><XCircle size={14} /> إلغاء الحجز</>}
              </button>
            )}
            <button style={M.closeFooterBtn} onClick={onClose}>
              <ChevronLeft size={14} /> إغلاق
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page Component ────────────────────────────────────────────────────────
export default function MyBookingsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { hasRated, getRatingForBooking } = useRatingsStore();

  const [bookings,       setBookings]       = useState<Booking[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [tab,            setTab]            = useState('all');
  const [ratingBooking,  setRatingBooking]  = useState<Booking | null>(null);
  const [cancelling,     setCancelling]     = useState<string | null>(null);
  const [notifying,      setNotifying]      = useState<string | null>(null);
  const [notifyToast,    setNotifyToast]    = useState<string | null>(null);
  const [detailBooking,  setDetailBooking]  = useState<Booking | null>(null);

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
        setDetailBooking(prev => prev?.id === b.id ? { ...prev, status: 'cancelled_by_user' } : prev);
      } else { alert(res.message); }
    } catch { alert('تعذّر الاتصال بالخادم.'); }
    finally { setCancelling(null); }
  };

  // ── إبلاغ عن الدفع ────────────────────────────────────────────────────────
  const handleNotifyPayment = async (b: Booking) => {
    setNotifying(b.id);
    try {
      const res = await bookingsApi.notifyPayment(Number(b.id));
      if (res.success) {
        const now = Date.now();
        setBookings(prev => prev.map(x => x.id === b.id ? { ...x, paymentNotifiedAt: now } : x));
        setDetailBooking(prev => prev?.id === b.id ? { ...prev, paymentNotifiedAt: now } : prev);
        setNotifyToast('تم إرسال إشعار الدفع للإدارة ✅');
        setTimeout(() => setNotifyToast(null), 4000);
      } else { alert(res.message); }
    } catch { alert('تعذّر الاتصال بالخادم.'); }
    finally { setNotifying(null); }
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

        {/* Toast إبلاغ عن الدفع */}
        {notifyToast && (
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9000, background: PALETTE.teal, color: '#fff',
            padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700,
            fontFamily: "'Tajawal',sans-serif", boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            direction: 'rtl',
          }}>
            {notifyToast}
          </div>
        )}

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
                  <div key={b.id} className="booking-card-lux" style={{ ...S.card, cursor: 'pointer' }}
                    onClick={() => setDetailBooking(b)}>
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
                              onClick={e => { e.stopPropagation(); handleCancel(b); }} disabled={cancelling === b.id}>
                              {cancelling === b.id ? 'جاري الإلغاء...' : 'إلغاء الحجز'}
                            </button>
                          )}
                          {b.status === 'accepted_waiting_payment' && (
                            <button
                              style={{
                                ...S.rateBtn,
                                background: b.paymentNotifiedAt ? '#E1EEE7' : '#F6EBCB',
                                color:      b.paymentNotifiedAt ? '#0A4437'  : '#9C7825',
                                opacity: notifying === b.id ? 0.6 : 1,
                                cursor: b.paymentNotifiedAt ? 'default' : 'pointer',
                              }}
                              onClick={e => { e.stopPropagation(); if (!b.paymentNotifiedAt) handleNotifyPayment(b); }}
                              disabled={!!b.paymentNotifiedAt || notifying === b.id}
                            >
                              <CreditCard size={13} color={b.paymentNotifiedAt ? '#0A4437' : '#9C7825'} />
                              {notifying === b.id
                                ? 'جاري الإرسال...'
                                : b.paymentNotifiedAt
                                  ? 'تم إبلاغ الإدارة ✓'
                                  : 'أبلغ عن الدفع'}
                            </button>
                          )}
                          {(isConfirmedStatus(b.status) || isCompletedStatus(b.status)) && (
                            <button style={{ ...S.rateBtn, background: hasRated(b.id) ? '#E1EEE7' : '#F6EBCB', color: hasRated(b.id) ? '#0A4437' : '#9C7825' }}
                              onClick={e => { e.stopPropagation(); setRatingBooking(b); }}>
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

      {detailBooking && (
        <BookingDetailModal
          booking={detailBooking}
          onClose={() => setDetailBooking(null)}
          onCancel={handleCancel}
          onNotifyPayment={handleNotifyPayment}
          cancelling={cancelling}
        />
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

// ── Modal Styles ──────────────────────────────────────────────────────────────
const M: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(13,22,38,0.45)',
    backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 9999, padding: 16, direction: 'rtl',
  },
  card: {
    background: '#FAFAF7', borderRadius: 20, width: '100%', maxWidth: 580,
    maxHeight: '90vh', overflowY: 'auto', position: 'relative',
    boxShadow: '0 32px 64px rgba(13,22,38,0.18), 0 0 0 1px rgba(198,154,61,0.15)',
    animation: 'modalIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
  },
  goldTopline: {
    height: 3, borderRadius: '20px 20px 0 0',
    background: `linear-gradient(90deg, transparent, ${PALETTE.brass}, ${PALETTE.brassLight}, ${PALETTE.brass}, transparent)`,
  },
  closeBtn: {
    position: 'absolute', top: 7, left: 1, width: 32, height: 32,
    borderRadius: '50%',  background: `linear-gradient(to bottom, ${PALETTE.teal}88, ${PALETTE.brass}55, ${PALETTE.line})`, border: 'none',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color:'white' ,transition: 'background 0.2s',
  },
  
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 12, padding: '20px 22px 16px', flexWrap: 'wrap' as const,
  },
  hotelIcon: {
    width: 40, height: 40, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  hotelName: {
    margin: '0 0 2px', fontSize: 20, fontWeight: 700,
    color: PALETTE.ink900, fontFamily: "'Amiri',serif", lineHeight: 1.3,
  },
  hotelLoc: {
    margin: 0, fontSize: 12, color: PALETTE.ink400,
    display: 'flex', alignItems: 'center', gap: 3,
    fontFamily: "'Tajawal',sans-serif",
  },
  pill: {
    display: 'inline-flex', alignItems: 'center', gap: 5,marginLeft:20,
    padding: '5px 14px' , borderRadius: 20, fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  body: { padding: '0 22px 20px' },
  timelineWrap: { marginBottom: 20 },
  sectionTitle: {
    margin: '0 0 14px', fontSize: 13, fontWeight: 700,
    color: PALETTE.ink600, letterSpacing: '0.05em',
    textTransform: 'uppercase' as const, fontFamily: "'Tajawal',sans-serif",
    display: 'flex', alignItems: 'center', gap: 8,
  },
  timelineLine: {
    position: 'absolute', top: 12, bottom: 12, right: 11,
    width: 2,
    background: `linear-gradient(to bottom, ${PALETTE.teal}88, ${PALETTE.brass}55, ${PALETTE.line})`,
    borderRadius: 2,
  },
  stepRow: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    marginBottom: 18, position: 'relative',
  },
  stepNode: {
    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.3s',
  },
  stepContent: { flex: 1, paddingTop: 2 },
  stepLabel: {
    margin: '0 0 2px', fontSize: 14,
    fontFamily: "'Tajawal',sans-serif", lineHeight: 1.4,
  },
  stepSub: {
    margin: 0, fontSize: 11.5,
    fontFamily: "'Tajawal',sans-serif",
  },
  nowBadge: {
    background: `${PALETTE.brass}22`, color: PALETTE.brass,
    border: `1px solid ${PALETTE.brass}44`,
    fontSize: 10, fontWeight: 700, padding: '2px 8px',
    borderRadius: 20, flexShrink: 0, marginTop: 4,
    fontFamily: "'Tajawal',sans-serif",
  },
  divider: {
    height: 1, background: PALETTE.line, margin: '0 0 20px',
  },
  detailsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12,
  },
  detailItem: {
    background: '#fff', border: `1px solid ${PALETTE.line}`,
    borderRadius: 12, padding: '12px 14px',
  },
  cancelReason: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: 10, padding: '12px 14px', marginTop: 16,
  },
  footer: {
    display: 'flex', gap: 10, padding: '14px 22px 20px',
    borderTop: `1px solid ${PALETTE.line}`, justifyContent: 'flex-end',
  },
  cancelBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '9px 18px', background: '#fef2f2', color: '#dc2626',
    border: '1px solid #fecaca', borderRadius: 10,
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Tajawal',sans-serif",
  },
  closeFooterBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '9px 18px', background: PALETTE.page, color: PALETTE.ink600,
    border: `1px solid ${PALETTE.line}`, borderRadius: 10,
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Tajawal',sans-serif",
  },
};