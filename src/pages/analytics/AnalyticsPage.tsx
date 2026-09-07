import { useMemo, useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, DollarSign, CalendarCheck, Users as UsersIcon, Loader2 } from 'lucide-react';
import Layout from '../../components/Layout';
import { BACKEND_URL } from '../../config';

const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

export default function AnalyticsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [users,    setUsers]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nuzul_token') ?? '';
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${BACKEND_URL}/api/bookings`, { headers: h }).then(r => r.json()),
      fetch(`${BACKEND_URL}/api/auth/users`, { headers: h }).then(r => r.json()),
    ]).then(([bRes, uRes]) => {
      if (bRes.success) setBookings(bRes.bookings);
      if (uRes.success) setUsers(uRes.users);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // ── آخر 6 أشهر ────────────────────────────────────────────────────────────
  const last6 = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const inMonth = bookings.filter((b: any) => {
        const bd = new Date(b.createdAt ?? b.created_at ?? 0);
        return bd.getFullYear() === d.getFullYear() && bd.getMonth() === d.getMonth();
      });
      const revenue = inMonth
        .filter((b: any) => b.status === 'paid_confirmed' || b.status === 'completed')
        .reduce((s: number, b: any) => s + Number(b.amount), 0);
      return { month: AR_MONTHS[d.getMonth()], revenue: Math.round(revenue), bookings: inMonth.length };
    });
  }, [bookings]);

  // ── إيرادات حسب الفندق (أعلى 5) ─────────────────────────────────────────
  const hotelPerf = useMemo(() => {
    const map = new Map<string, number>();
    bookings
      .filter((b: any) => b.status === 'paid_confirmed' || b.status === 'completed')
      .forEach((b: any) => {
        const name = b.hotelName ?? b.hotel_name ?? 'غير معروف';
        map.set(name, (map.get(name) ?? 0) + Number(b.amount));
      });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, revenue]) => ({ name: name.length > 18 ? name.slice(0, 18) + '…' : name, revenue }));
  }, [bookings]);

  // ── توزيع حالات الحجز ─────────────────────────────────────────────────────
  const statusDist = useMemo(() => {
    const total = bookings.length || 1;
    const count = (fn: (b: any) => boolean) => bookings.filter(fn).length;
    return [
      { name: 'مؤكد',         value: Math.round(count(b => b.status === 'paid_confirmed') / total * 100),                                        color: '#0E5C4A' },
      { name: 'قيد الانتظار', value: Math.round(count(b => b.status === 'pending_admin' || b.status === 'accepted_waiting_payment') / total * 100), color: '#C69A3A' },
      { name: 'مكتمل',        value: Math.round(count(b => b.status === 'completed') / total * 100),                                              color: '#6E8F86' },
      { name: 'ملغي',         value: Math.round(count(b => String(b.status).startsWith('cancelled')) / total * 100),                              color: '#BD5B3E' },
    ].filter(s => s.value > 0);
  }, [bookings]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const paid = bookings.filter((b: any) => b.status === 'paid_confirmed' || b.status === 'completed');
    const totalRevenue = paid.reduce((s: number, b: any) => s + Number(b.amount), 0);
    const customers    = users.filter((u: any) => u.role === 'user').length;
    const avgVal       = bookings.length ? Math.round(totalRevenue / bookings.length) : 0;
    return [
      { label: 'إجمالي الإيرادات', value: `$${totalRevenue.toLocaleString()}`, icon: <DollarSign size={20} />,    color: '#0E5C4A' },
      { label: 'إجمالي الحجوزات', value: bookings.length.toString(),           icon: <CalendarCheck size={20} />, color: '#C69A3A' },
      { label: 'عدد العملاء',      value: customers.toString(),                 icon: <UsersIcon size={20} />,    color: '#BD5B3E' },
      { label: 'متوسط قيمة الحجز',value: `$${avgVal.toLocaleString()}`,        icon: <TrendingUp size={20} />,   color: '#6E8F86' },
    ];
  }, [bookings, users]);

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80, gap: 10, color: '#0E5C4A' }}>
        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontFamily: "'Tajawal',sans-serif" }}>جاري تحميل التحليلات...</span>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div style={S.header}>
        <h1 style={S.title}>التحليلات</h1>
        <p style={S.sub}>
          {bookings.length > 0
            ? `نظرة على الإيرادات والحجوزات — بناءً على ${bookings.length} حجز فعلي`
            : 'لا توجد حجوزات بعد — ستظهر البيانات تلقائياً عند إضافة حجوزات'}
        </p>
      </div>

      {/* KPIs */}
      <div style={S.kpiGrid}>
        {kpis.map(k => (
          <div key={k.label} style={S.kpiCard}>
            <div style={{ ...S.kpiIcon, background: k.color + '1a', color: k.color }}>{k.icon}</div>
            <div>
              <p style={S.kpiValue}>{k.value}</p>
              <p style={S.kpiLabel}>{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* مخطط الإيرادات والحجوزات */}
      <div style={S.card}>
        <p style={S.cardTitle}>اتجاه الإيرادات والحجوزات — آخر 6 أشهر</p>
        {bookings.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={last6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5DFC8" />
              <XAxis dataKey="month" stroke="#93A29B" fontSize={12} />
              <YAxis stroke="#93A29B" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E5DFC8', fontSize: 13, fontFamily: 'Tajawal,sans-serif' }} />
              <Legend />
              <Line type="monotone" dataKey="revenue"  stroke="#0E5C4A" strokeWidth={3} name="الإيرادات ($)" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="bookings" stroke="#C69A3A" strokeWidth={3} name="الحجوزات"      dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <Empty />}
      </div>

      <div style={S.twoCol}>
        {/* أداء الفنادق */}
        <div style={S.card}>
          <p style={S.cardTitle}>الإيرادات حسب الفندق (أعلى 5)</p>
          {hotelPerf.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hotelPerf} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5DFC8" horizontal={false} />
                <XAxis type="number" stroke="#93A29B" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#93A29B" fontSize={11} width={120} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E5DFC8', fontSize: 13, fontFamily: 'Tajawal,sans-serif' }} formatter={(v: number) => [`$${v.toLocaleString()}`, 'الإيرادات']} />
                <Bar dataKey="revenue" fill="#0E5C4A" radius={[6, 0, 0, 6]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </div>

        {/* توزيع الحالات */}
        <div style={S.card}>
          <p style={S.cardTitle}>توزيع حالات الحجز</p>
          {statusDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                     label={d => `${d.name} ${d.value}%`} labelLine={false}>
                  {statusDist.map(e => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E5DFC8', fontSize: 13, fontFamily: 'Tajawal,sans-serif' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </div>
      </div>
    </Layout>
  );
}

function Empty() {
  return (
    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#93A29B', fontSize: 13, fontFamily: "'Tajawal',sans-serif" }}>
      لا توجد بيانات كافية بعد
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  header:    { marginBottom: 24, direction: 'rtl' },
  title:     { margin: 0, fontSize: 28, fontWeight: 700, color: '#1C2B27', fontFamily: "'Amiri',serif" },
  sub:       { margin: '6px 0 0', fontSize: 13, color: '#52655F' },
  kpiGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 24, direction: 'rtl' },
  kpiCard:   { background: '#fff', border: '1px solid #E5DFC8', borderRadius: 14, padding: '20px', display: 'flex', gap: 14, alignItems: 'flex-start' },
  kpiIcon:   { width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  kpiValue:  { margin: '0 0 2px', fontSize: 22, fontWeight: 700, color: '#1C2B27', fontFamily: "'Tajawal',sans-serif" },
  kpiLabel:  { margin: 0, fontSize: 12, color: '#52655F' },
  card:      { background: '#fff', border: '1px solid #E5DFC8', borderRadius: 16, padding: '24px', marginBottom: 20, direction: 'rtl' },
  cardTitle: { margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1C2B27', fontFamily: "'Tajawal',sans-serif" },
  twoCol:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))', gap: 20 },
};
