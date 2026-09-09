import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Calendar, CheckCircle, Clock, XCircle, Eye, Trash2, Download, Mail, Loader2 } from 'lucide-react';
import Layout from '../../components/Layout';
import { useAuthStore } from '../../store/authStore';
import { bookingsApi } from '../../services/api';
import type { Booking } from '../../store/bookingsStore';

import { BACKEND_URL } from '../../config';
const BACKEND = BACKEND_URL;
const OTP_DOMAINS = ['gmail.com','yahoo.com','yahoo.co.uk','outlook.com','hotmail.com','live.com'];
function isOtpEmail(email = '') { return OTP_DOMAINS.includes(email.split('@')[1]?.toLowerCase() ?? ''); }

// ── تصدير CSV ─────────────────────────────────────────────────────────────
function exportBookingsCSV(bookings: Booking[]) {
  const headers = ['ID','المستخدم','الفندق','المدينة','وصول','مغادرة','ليالي','ضيوف','المبلغ','الحالة','قرار بواسطة','السبب','تاريخ الإنشاء'];
  const rows = bookings.map((b) => [
    b.id, b.userName, b.hotelName, b.city, b.checkIn, b.checkOut,
    b.nights, b.guests, `$${b.amount}`, b.status,
    b.decidedByName ?? '', b.reason ?? '',
    new Date(b.createdAt).toLocaleDateString('ar-EG'),
  ]);
  const csv  = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a    = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `bookings-${new Date().toISOString().slice(0,10)}.csv` });
  a.click(); URL.revokeObjectURL(a.href);
}

const STATUS: Record<BookingStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  pending_admin:            { label: 'بانتظار القرار',         bg: '#fffbeb', text: '#b45309', icon: <Clock size={13} /> },
  accepted_waiting_payment: { label: 'مقبول - بانتظار الدفع', bg: '#eef2ff', text: '#4338ca', icon: <Calendar size={13} /> },
  paid_confirmed:           { label: 'مؤكد ومدفوع',           bg: '#f0fdf4', text: '#15803d', icon: <CheckCircle size={13} /> },
  completed:                { label: 'مكتمل',                  bg: '#e6f7f1', text: '#0d6b4b', icon: <CheckCircle size={13} /> },
  cancelled_by_admin:       { label: 'ملغى من الإدارة',        bg: '#fef2f2', text: '#dc2626', icon: <XCircle size={13} /> },
  cancelled_by_user:        { label: 'ملغى من المستخدم',       bg: '#fef2f2', text: '#dc2626', icon: <XCircle size={13} /> },
};

type BookingStatus = Booking['status'];

const TABS: { key: 'all' | BookingStatus; label: string }[] = [
  { key: 'all',                      label: 'الكل' },
  { key: 'pending_admin',            label: 'بانتظار القرار' },
  { key: 'accepted_waiting_payment', label: 'بانتظار الدفع' },
  { key: 'paid_confirmed',           label: 'مؤكد ومدفوع' },
  { key: 'completed',                label: 'مكتمل' },
  { key: 'cancelled_by_admin',       label: 'ملغى بالإدارة' },
  { key: 'cancelled_by_user',        label: 'ملغى بالمستخدم' },
];

// تحويل بيانات الباك اند
function mapBooking(b: any): Booking {
  return {
    id:            String(b.id),
    userId:        String(b.userId  ?? b.user_id  ?? ''),
    userEmail:     b.userEmail  ?? b.user_email  ?? '',
    userName:      b.userName   ?? b.user_name   ?? '',
    hotelId:       Number(b.hotelId  ?? b.hotel_id  ?? 0),
    hotelName:     b.hotelName  ?? b.hotel_name  ?? '',
    country:       b.country    ?? 'سوريا',
    city:          b.city       ?? '',
    checkIn:       b.checkIn    ?? b.check_in    ?? '',
    checkOut:      b.checkOut   ?? b.check_out   ?? '',
    nights:        Number(b.nights  ?? 1),
    guests:        Number(b.guests  ?? 1),
    amount:        Number(b.amount  ?? 0),
    status:        b.status     as Booking['status'],
    createdAt:     b.createdAt  ?? b.created_at  ? new Date(b.createdAt ?? b.created_at).getTime() : Date.now(),
    decidedAt:     b.decidedAt  ?? b.decided_at  ? new Date(b.decidedAt ?? b.decided_at).getTime() : undefined,
    paidAt:        b.paidAt     ?? b.paid_at     ? new Date(b.paidAt    ?? b.paid_at).getTime()    : undefined,
    decidedById:   String(b.decidedById  ?? b.decided_by_id  ?? ''),
    decidedByName: b.decidedByName ?? b.decided_by_name ?? '',
    reason:        b.reason ?? '',
    paymentNotifiedAt: b.paymentNotifiedAt ?? b.payment_notified_at
      ? new Date(b.paymentNotifiedAt ?? b.payment_notified_at).getTime()
      : undefined,
  };
}

export default function BookingsPage() {
  const { currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'superadmin';

  const [bookings,     setBookings]     = useState<Booking[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState<'all' | BookingStatus>('all');
  const [search,       setSearch]       = useState('');
  const [reason,       setReason]       = useState('');
  const [cancelModal,  setCancelModal]  = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [emailToast,   setEmailToast]   = useState<{ ok: boolean; msg: string } | null>(null);
  const [actionLoading,setActionLoading]= useState<string | null>(null);

  const showEmailToast = (ok: boolean, msg: string) => {
    setEmailToast({ ok, msg });
    setTimeout(() => setEmailToast(null), 4000);
  };

  // ── جلب الحجوزات من الباك اند ──────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.list();
      if (res.success) setBookings(res.bookings.map(mapBooking));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const filtered = useMemo(() =>
    bookings
      .filter(b => tab === 'all' || b.status === tab)
      .filter(b => [b.id, b.userName, b.hotelName].some(v => v.toLowerCase().includes(search.toLowerCase()))),
    [bookings, tab, search]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: bookings.length };
    TABS.slice(1).forEach(({ key }) => { c[key] = bookings.filter(b => b.status === key).length; });
    return c;
  }, [bookings]);

  // ── Optimistic update helper ───────────────────────────────────────────
  const updateBooking = (id: string, changes: Partial<Booking>) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, ...changes } : b));
  };

  const removeBooking = (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
  };

  // ── إجراءات الأدمن — optimistic updates ────────────────────────────────
  const handleAccept = async (b: Booking) => {
    const prev = b.status;
    updateBooking(b.id, { status: 'accepted_waiting_payment', decidedByName: currentUser?.name });
    setActionLoading(b.id);
    try {
      const res = await bookingsApi.accept(Number(b.id));
      if (!res.success) updateBooking(b.id, { status: prev }); // rollback
    } catch {
      updateBooking(b.id, { status: prev });
      alert('تعذّر الاتصال بالخادم.');
    } finally { setActionLoading(null); }
  };

  const handleCancelConfirm = async (b: Booking) => {
    if (!reason.trim()) return;
    const reasonText = reason.trim();
    const prev = b.status;
    setCancelModal(null);
    setReason('');
    updateBooking(b.id, {
      status: 'cancelled_by_admin',
      reason: reasonText,
      decidedByName: currentUser?.name,
    });
    setActionLoading(b.id);
    try {
      const res = await bookingsApi.cancel(Number(b.id), reasonText);
      if (!res.success) updateBooking(b.id, { status: prev, reason: '' });
    } catch {
      updateBooking(b.id, { status: prev, reason: '' });
      alert('تعذّر الاتصال بالخادم.');
    } finally { setActionLoading(null); }
  };

  const handleMarkPaid = async (b: Booking) => {
    const prev = b.status;
    updateBooking(b.id, { status: 'paid_confirmed', decidedByName: currentUser?.name });
    setActionLoading(b.id);
    try {
      const res = await bookingsApi.markPaid(Number(b.id));
      if (!res.success) updateBooking(b.id, { status: prev });
    } catch {
      updateBooking(b.id, { status: prev });
      alert('تعذّر الاتصال بالخادم.');
    } finally { setActionLoading(null); }
  };

  const handleMarkCompleted = async (b: Booking) => {
    const prev = b.status;
    updateBooking(b.id, { status: 'completed', decidedByName: currentUser?.name });
    setActionLoading(b.id);
    try {
      const res = await bookingsApi.complete(Number(b.id));
      if (!res.success) updateBooking(b.id, { status: prev });
    } catch {
      updateBooking(b.id, { status: prev });
      alert('تعذّر الاتصال بالخادم.');
    } finally { setActionLoading(null); }
  };

  const handleDelete = async (b: Booking) => {
    if (!window.confirm('حذف هذا السجل نهائياً؟')) return;
    removeBooking(b.id); // حذف فوري
    try {
      const res = await bookingsApi.delete(Number(b.id));
      if (!res.success) {
        // rollback — أعد الحجز للقائمة
        setBookings(prev => [b, ...prev]);
        alert(res.message);
      }
    } catch {
      setBookings(prev => [b, ...prev]);
      alert('تعذّر الاتصال بالخادم.');
    }
  };

  const handleSendConfirmation = async (b: Booking) => {
    if (!b.userEmail) { showEmailToast(false, 'لا يوجد إيميل مسجّل.'); return; }
    if (!isOtpEmail(b.userEmail)) { showEmailToast(false, 'إيميل المستخدم ليس Gmail/Yahoo/Outlook.'); return; }
    setSendingEmail(b.id);
    try {
      const res = await bookingsApi.sendConfirmation(Number(b.id), b.userEmail);
      showEmailToast(res.success, res.message);
    } catch { showEmailToast(false, 'تعذّر الاتصال.'); }
    finally { setSendingEmail(null); }
  };

  return (
    <Layout>
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, gap: 10, color: '#0E5C4A' }}>
          <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontFamily: "'Tajawal',sans-serif" }}>جاري تحميل الحجوزات...</span>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      {!loading && (<>
      {/* Email Toast */}
      {emailToast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 2000,
          background: emailToast.ok ? '#0E5C4A' : '#ef4444', color: '#fff', padding: '12px 24px',
          borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: "'Tajawal',sans-serif",
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', direction: 'rtl' }}>
          {emailToast.ok ? '✅ ' : '❌ '}{emailToast.msg}
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (() => {
        const b = bookings.find((x) => x.id === cancelModal)!;
        return (
          <div style={S.modalOverlay}>
            <div style={S.modalBox}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, fontFamily: "'Tajawal',sans-serif", direction: 'rtl' }}>سبب الإلغاء</h3>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: '#64748b', direction: 'rtl' }}>الحجز: {b.hotelName} — {b.userName}</p>
              <textarea
                rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="أدخل سبب الإلغاء…"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, resize: 'vertical', fontFamily: "'Tajawal',sans-serif", boxSizing: 'border-box', direction: 'rtl' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                <button onClick={() => { setCancelModal(null); setReason(''); }} style={{ ...S.actionBtn, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>إلغاء</button>
                <button onClick={() => handleCancelConfirm(b)} disabled={!reason.trim()}
                  style={{ ...S.actionBtn, background: '#ef4444', color: '#fff', opacity: reason.trim() ? 1 : 0.5 }}>تأكيد الإلغاء</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={S.title}>الحجوزات</h1>
          <p style={S.sub}>{bookings.length} حجز إجمالي</p>
        </div>
        {isAdmin && (
          <button style={S.exportBtn} onClick={() => exportBookingsCSV(filtered)}>
            <Download size={14} /> تصدير CSV
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {TABS.map(({ key, label }) => (
          <button key={key} style={{ ...S.tab, ...(tab === key ? S.tabActive : {}) }} onClick={() => setTab(key)}>
            {label}
            <span style={{ ...S.tabCount, ...(tab === key ? S.tabCountActive : {}) }}>
              {counts[key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={S.searchBox}>
        <Search size={15} color="#94a3b8" />
        <input style={S.searchIn} placeholder="ابحث بالاسم أو الفندق أو رقم الحجز…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              {['رقم الحجز','المستخدم','الفندق','التواريخ','الضيوف','المبلغ','الحالة','القرار','الإجراءات'].map((h) => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: 14 }}>لا توجد حجوزات مطابقة</td></tr>
            ) : filtered.map((b) => {
              const st = STATUS[b.status];
              return (
                <tr key={b.id} style={{
                  ...S.tr,
                  background: b.paymentNotifiedAt && b.status === 'accepted_waiting_payment'
                    ? '#fffdf0' : undefined,
                }}>
                  <td style={{ ...S.td, fontWeight: 700, color: '#4f46e5', direction: 'ltr' }}>{b.id}</td>
                  <td style={S.td}>{b.userName}</td>
                  <td style={{ ...S.td, color: '#64748b' }}>{b.hotelName}<br /><span style={{ fontSize: 11, color: '#94a3b8' }}>{b.city}</span></td>
                  <td style={{ ...S.td, direction: 'ltr', fontSize: 12 }}>{b.checkIn}<br />→ {b.checkOut}</td>
                  <td style={{ ...S.td, textAlign: 'center' }}>{b.guests}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>${b.amount.toLocaleString()}</td>
                  <td style={S.td}>
                    <span style={{ ...S.pill, background: st.bg, color: st.text }}>{st.icon} {st.label}</span>
                    {b.reason && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>السبب: {b.reason}</p>}
                    {b.paymentNotifiedAt && b.status === 'accepted_waiting_payment' && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        marginTop: 5, background: '#fffbeb', border: '1px solid #fcd34d',
                        borderRadius: 8, padding: '3px 8px', fontSize: 11, fontWeight: 700,
                        color: '#b45309', fontFamily: "'Tajawal',sans-serif",
                      }}>
                        💳 أبلغ عن الدفع
                      </div>
                    )}
                  </td>
                  <td style={{ ...S.td, fontSize: 12 }}>
                    {b.decidedByName
                      ? <><span style={{ fontWeight: 600 }}>الإدارة</span><br /><span style={{ color: '#64748b' }}>{b.decidedByName}</span></>
                      : <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* تفاصيل */}
                      <button style={S.smallBtn} title="تفاصيل" onClick={() => alert(`${b.id}\n${b.userName}\n${b.hotelName}\n${b.checkIn} → ${b.checkOut}\nالضيوف: ${b.guests}\n$${b.amount}\n${b.status}${b.reason ? '\nالسبب: ' + b.reason : ''}`)}>
                        <Eye size={14} />
                      </button>

                      {isAdmin && (
                        <>
                          {b.status === 'pending_admin' && (
                            <>
                              <button onClick={() => handleAccept(b)} style={{ ...S.actionBtn, background: '#10b981', color: '#fff' }}>قبول</button>
                              <button onClick={() => setCancelModal(b.id)} style={{ ...S.actionBtn, background: '#ef4444', color: '#fff' }}>رفض</button>
                            </>
                          )}
                          {b.status === 'accepted_waiting_payment' && (
                            <>
                              <button onClick={() => handleMarkPaid(b)} style={{ ...S.actionBtn, background: '#4f46e5', color: '#fff' }}>تأكيد الدفع</button>
                              <button onClick={() => setCancelModal(b.id)} style={{ ...S.actionBtn, background: '#ef4444', color: '#fff' }}>إلغاء</button>
                            </>
                          )}
                          {b.status === 'paid_confirmed' && (
                            <>
                              <button onClick={() => handleMarkCompleted(b)} style={{ ...S.actionBtn, background: '#0d6b4b', color: '#fff' }}>إنهاء الإقامة</button>
                              {b.userEmail && isOtpEmail(b.userEmail) && (
                                <button
                                  onClick={() => handleSendConfirmation(b)}
                                  disabled={sendingEmail === b.id}
                                  style={{ ...S.actionBtn, background: '#C69A3A', color: '#fff', opacity: sendingEmail === b.id ? 0.6 : 1 }}
                                  title={`إرسال تأكيد الحجز إلى ${b.userEmail}`}
                                >
                                  <Mail size={12} style={{ display: 'inline', marginLeft: 4 }} />
                                  {sendingEmail === b.id ? 'جارٍ الإرسال…' : 'إرسال تأكيد'}
                                </button>
                              )}
                            </>
                          )}
                          {(b.status === 'cancelled_by_admin' || b.status === 'cancelled_by_user' || b.status === 'completed') && (
                            <button onClick={() => handleDelete(b)}
                              style={{ ...S.smallBtn, color: '#ef4444', borderColor: '#fca5a5' }} title="حذف">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>)}
    </Layout>
  );
}

const S: Record<string, React.CSSProperties> = {
  title:      { fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', fontFamily: "'Tajawal',sans-serif", direction: 'rtl' },
  sub:        { fontSize: 14, color: '#64748b', margin: 0, fontFamily: "'Tajawal',sans-serif" },
  exportBtn:  { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#0A4437', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal',sans-serif" },
  tabs:       { display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, marginBottom: 16, borderBottom: '1px solid #e2e8f0' },
  tab:        { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9999, borderWidth: '1px', borderStyle: 'solid', borderColor: '#e2e8f0', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Tajawal',sans-serif" },
  tabActive:  { background: '#0f172a', color: '#fff', borderColor: '#0f172a' },
  tabCount:   { fontSize: 11, padding: '2px 6px', borderRadius: 8, background: '#f1f5f9', color: '#64748b', fontWeight: 700 },
  tabCountActive: { background: 'rgba(255,255,255,0.2)', color: '#fff' },
  searchBox:  { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', marginBottom: 20 },
  searchIn:   { flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#0f172a', background: 'transparent', fontFamily: "'Tajawal',sans-serif" },
  tableWrap:  { background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  table:      { width: '100%', borderCollapse: 'collapse', textAlign: 'right', direction: 'rtl' },
  th:         { padding: '14px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 12, fontWeight: 700, fontFamily: "'Tajawal',sans-serif", whiteSpace: 'nowrap' },
  tr:         { borderBottom: '1px solid #f1f5f9' },
  td:         { padding: '14px 16px', fontSize: 13, color: '#0f172a', verticalAlign: 'middle', fontFamily: "'Tajawal',sans-serif" },
  pill:       { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
  smallBtn:   { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, borderWidth: '1px', borderStyle: 'solid', borderColor: '#e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' },
  actionBtn:  { padding: '6px 12px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal',sans-serif", whiteSpace: 'nowrap' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modalBox:   { background: '#fff', borderRadius: 16, padding: '24px', width: '100%', maxWidth: 420, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' },
};
