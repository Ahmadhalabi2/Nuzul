import { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, CreditCard, Wallet, Download, Loader2 } from 'lucide-react';
import Layout from '../../components/Layout';
import { BACKEND_URL } from '../../config';

const ARABIC_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

export default function RevenuePage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nuzul_token') ?? '';
    fetch(`${BACKEND_URL}/api/bookings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.success) setBookings(data.bookings); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const currentMonthLabel = `${ARABIC_MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  // آخر 6 أشهر
  const revenueTrend = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const revenue = bookings
        .filter((b: any) => b.status === 'paid_confirmed' && (b.paidAt ?? b.paid_at))
        .filter((b: any) => {
          const pd = new Date(b.paidAt ?? b.paid_at);
          return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
        })
        .reduce((s: number, b: any) => s + Number(b.amount), 0);
      return { month: ARABIC_MONTHS[d.getMonth()], revenue: Math.round(revenue) };
    });
  }, [bookings]);

  const currentRevenue  = revenueTrend[revenueTrend.length - 1]?.revenue ?? 0;
  const previousRevenue = revenueTrend[revenueTrend.length - 2]?.revenue ?? 0;
  const growthPct = previousRevenue > 0
    ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
    : (currentRevenue > 0 ? 100 : 0);

  const pendingTotal = useMemo(() =>
    bookings.filter((b: any) => b.status === 'accepted_waiting_payment')
            .reduce((s: number, b: any) => s + Number(b.amount), 0),
    [bookings]
  );

  const avgBookingValue = useMemo(() => {
    const confirmed = bookings.filter((b: any) => b.status === 'paid_confirmed');
    if (!confirmed.length) return 0;
    return confirmed.reduce((s: number, b: any) => s + Number(b.amount), 0) / confirmed.length;
  }, [bookings]);

  const payouts = useMemo(() => {
    const map = new Map<string, { hotel: string; amount: number; status: 'paid' | 'pending' }>();
    bookings.forEach((b: any) => {
      if (b.status !== 'paid_confirmed' && b.status !== 'accepted_waiting_payment') return;
      const name = b.hotelName ?? b.hotel_name ?? 'غير معروف';
      const ex = map.get(name) ?? { hotel: name, amount: 0, status: 'paid' as const };
      ex.amount += Number(b.amount);
      if (b.status === 'accepted_waiting_payment') ex.status = 'pending';
      map.set(name, ex);
    });
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }, [bookings]);

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80, gap: 10, color: '#0E5C4A' }}>
        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontFamily: "'Tajawal',sans-serif" }}>جاري تحميل الإيرادات...</span>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>الإيرادات</h1>
          <p style={S.sub}>نظرة مالية عامة — بيانات فعلية من الباك اند</p>
        </div>
        <button style={S.exportBtn} onClick={() => alert('جارٍ تصدير التقرير…')}>
          <Download size={15} /> تصدير التقرير
        </button>
      </div>

      {/* KPIs */}
      <div style={S.kpiGrid}>
        {[
          { icon: <DollarSign size={20} />, label: `إيرادات ${currentMonthLabel}`,         value: `$${Math.round(currentRevenue).toLocaleString()}`,   color: '#0E5C4A' },
          { icon: <TrendingUp size={20} />, label: 'معدل النمو مقارنة بالشهر الماضي',    value: `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%`, color: '#C69A3A' },
          { icon: <CreditCard size={20} />, label: 'مستحقات قيد الانتظار',               value: `$${Math.round(pendingTotal).toLocaleString()}`,       color: '#BD5B3E' },
          { icon: <Wallet size={20} />,     label: 'متوسط قيمة الحجز',                   value: `$${Math.round(avgBookingValue).toLocaleString()}`,    color: '#6E8F86' },
        ].map(k => (
          <div key={k.label} style={S.kpiCard}>
            <div style={{ ...S.kpiIcon, background: k.color + '1a', color: k.color }}>{k.icon}</div>
            <div>
              <p style={S.kpiValue}>{k.value}</p>
              <p style={S.kpiLabel}>{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* مخطط الاتجاه */}
      <div style={S.card}>
        <p style={S.cardTitle}>اتجاه الإيرادات الفعلية — آخر 6 أشهر</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={revenueTrend}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#0E5C4A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0E5C4A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5DFC8" />
            <XAxis dataKey="month" stroke="#93A29B" fontSize={12} />
            <YAxis stroke="#93A29B" fontSize={12} />
            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E5DFC8', fontSize: 13, fontFamily: 'Tajawal,sans-serif' }} />
            <Area type="monotone" dataKey="revenue" stroke="#0E5C4A" strokeWidth={3} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* جدول المستحقات */}
      <div style={S.card}>
        <p style={S.cardTitle}>مستحقات الفنادق</p>
        {payouts.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: '#93A29B', textAlign: 'center', padding: '32px 0', fontFamily: "'Tajawal',sans-serif" }}>
            لا توجد مستحقات مسجّلة بعد.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>{['الفندق','الفترة','المبلغ','الحالة'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {payouts.map((p, i) => (
                  <tr key={i} style={S.tr}>
                    <td style={{ ...S.td, fontWeight: 600, color: '#0E5C4A' }}>{p.hotel}</td>
                    <td style={{ ...S.td, color: '#52655F' }}>{currentMonthLabel}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>${Math.round(p.amount).toLocaleString()}</td>
                    <td style={S.td}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: p.status === 'paid' ? '#E1EEE7' : '#F6EBCB', color: p.status === 'paid' ? '#0A4437' : '#9C7825' }}>
                        {p.status === 'paid' ? 'مدفوع' : 'قيد الانتظار'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

const S: Record<string, React.CSSProperties> = {
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, direction: 'rtl' },
  title:     { margin: 0, fontSize: 28, fontWeight: 700, color: '#1C2B27', fontFamily: "'Amiri',serif" },
  sub:       { margin: '6px 0 0', fontSize: 13, color: '#52655F' },
  exportBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#0A4437', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Tajawal',sans-serif" },
  kpiGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 20, direction: 'rtl' },
  kpiCard:   { background: '#fff', border: '1px solid #E5DFC8', borderRadius: 14, padding: '18px', display: 'flex', gap: 12, alignItems: 'flex-start' },
  kpiIcon:   { width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  kpiValue:  { margin: '0 0 2px', fontSize: 19, fontWeight: 700, color: '#1C2B27', fontFamily: "'Tajawal',sans-serif" },
  kpiLabel:  { margin: 0, fontSize: 11, color: '#52655F' },
  card:      { background: '#fff', border: '1px solid #E5DFC8', borderRadius: 16, padding: '24px', marginBottom: 20, direction: 'rtl' },
  cardTitle: { margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1C2B27', fontFamily: "'Tajawal',sans-serif" },
  table:     { width: '100%', borderCollapse: 'collapse', minWidth: 500, fontFamily: "'Tajawal',sans-serif" },
  th:        { padding: '12px 14px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#52655F', background: '#F3EEDD', borderBottom: '1px solid #E5DFC8' },
  tr:        { borderBottom: '1px solid #F3EEDD' },
  td:        { padding: '13px 14px', fontSize: 13, color: '#1C2B27' },
};
