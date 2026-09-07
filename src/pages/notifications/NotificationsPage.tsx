import { useEffect, useState, useCallback } from 'react';
import { CalendarCheck, Star, AlertCircle, CheckCircle, Trash2, Bell, Loader2 } from 'lucide-react';
import Layout from '../../components/Layout';
import { notificationsApi } from '../../services/api';

interface Notif {
  id: number;
  type: string;
  title: string;
  description?: string;
  is_read: boolean;
  dismissed: boolean;
  createdAt: string;
}

const ICONS: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  booking_created:   { icon: <CalendarCheck size={16} />, bg: '#E1EEE7', color: '#0A4437' },
  booking_accepted:  { icon: <CheckCircle   size={16} />, bg: '#DFF3EC', color: '#0E5C4A' },
  booking_cancelled: { icon: <AlertCircle   size={16} />, bg: '#FAEAE2', color: '#BD5B3E' },
  booking_paid:      { icon: <CheckCircle   size={16} />, bg: '#F6EBCB', color: '#9C7825' },
  booking_completed: { icon: <Star          size={16} />, bg: '#E1EEE7', color: '#0A4437' },
  booking_rated:     { icon: <Star          size={16} />, bg: '#F6EBCB', color: '#9C7825' },
  support_message:   { icon: <Bell          size={16} />, bg: '#eef2ff', color: '#4338ca' },
  default:           { icon: <Bell          size={16} />, bg: '#F3EEDD', color: '#52655F' },
};

function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

export default function NotificationsPage() {
  const [notifs,   setNotifs]   = useState<Notif[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [unread,   setUnread]   = useState(0);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.list();
      if (res.success) {
        setNotifs(res.notifications);
        setUnread(res.unread_count);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchNotifs();
    // تعليم الكل مقروء عند الفتح
    notificationsApi.markAllRead().catch(() => {});
  }, [fetchNotifs]);

  const handleDismiss = async (id: number) => {
    await notificationsApi.dismiss(id).catch(() => {});
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
  };

  return (
    <Layout>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>الإشعارات</h1>
          <p style={S.sub}>{notifs.length} إشعار بالإجمالي</p>
        </div>
        {unread > 0 && (
          <button style={S.markBtn} onClick={handleMarkAllRead}>تعليم الكل كمقروء</button>
        )}
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, gap: 10, color: '#0E5C4A' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontFamily: "'Tajawal',sans-serif" }}>جاري التحميل...</span>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {!loading && (
        <div style={S.list}>
          {notifs.length === 0 ? (
            <div style={S.empty}>
              <Bell size={36} color="#93A29B" />
              <p style={{ color: '#52655F', margin: '12px 0 0' }}>لا توجد إشعارات بعد</p>
            </div>
          ) : notifs.map(n => {
            const cfg = ICONS[n.type] ?? ICONS.default;
            return (
              <div key={n.id} style={{ ...S.item, background: !n.is_read ? '#FAF9F2' : '#fff' }}>
                <div style={{ ...S.iconBox, background: cfg.bg, color: cfg.color }}>
                  {cfg.icon}
                </div>
                <div style={S.content}>
                  <p style={S.itemTitle}>{n.title}</p>
                  {n.description && <p style={S.desc}>{n.description}</p>}
                  <p style={S.time}>{timeAgo(n.createdAt)}</p>
                </div>
                <button style={S.dismissBtn} onClick={() => handleDismiss(n.id)} title="حذف">
                  <Trash2 size={14} />
                </button>
                {!n.is_read && <span style={S.unreadDot} />}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

const S: Record<string, React.CSSProperties> = {
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, direction: 'rtl' },
  title:      { margin: 0, fontSize: 28, fontWeight: 700, color: '#1C2B27', fontFamily: "'Amiri',serif" },
  sub:        { margin: '4px 0 0', fontSize: 13, color: '#52655F' },
  markBtn:    { padding: '8px 16px', background: '#E1EEE7', color: '#0A4437', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal',sans-serif" },
  list:       { display: 'flex', flexDirection: 'column', gap: 8, direction: 'rtl' },
  item:       { display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px', borderRadius: 14, border: '1px solid #E5DFC8', position: 'relative' },
  iconBox:    { width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  content:    { flex: 1 },
  itemTitle:  { margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#1C2B27', fontFamily: "'Tajawal',sans-serif" },
  desc:       { margin: '0 0 4px', fontSize: 12, color: '#52655F', fontFamily: "'Tajawal',sans-serif" },
  time:       { margin: 0, fontSize: 11, color: '#93A29B' },
  dismissBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', padding: 4, flexShrink: 0 },
  unreadDot:  { position: 'absolute', top: 14, left: 14, width: 8, height: 8, borderRadius: '50%', background: '#0E5C4A' },
  empty:      { textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#93A29B', fontFamily: "'Tajawal',sans-serif" },
};
