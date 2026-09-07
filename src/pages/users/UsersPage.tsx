import { useState, useEffect } from 'react';
import { Search, ShieldCheck, Shield, User as UserIcon, Trash2, RefreshCw } from 'lucide-react';
import Layout from '../../components/Layout';
import { useAuthStore } from '../../store/authStore';
import { BACKEND_URL } from '../../config';

const ROLE_INFO: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  superadmin: { label: 'مدير النظام', bg: '#F6EBCB', text: '#9C7825', icon: <ShieldCheck size={13} /> },
  support:    { label: 'موظف الدعم', bg: '#EDF4FF', text: '#0078D4', icon: <Shield size={13} /> },
  user:       { label: 'مستخدم',     bg: '#F3EEDD', text: '#52655F', icon: <UserIcon size={13} /> },
};

interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  createdAt?: string;
}

export default function UsersPage() {
  const { currentUser } = useAuthStore();
  const [users,       setUsers]       = useState<BackendUser[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [roleFilter,  setRoleFilter]  = useState('all');
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [toast,       setToast]       = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('nuzul_token') ?? '';
      const res   = await fetch(`${BACKEND_URL}/api/auth/users`, { headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();
      if (data.success) setUsers(data.users);
    } catch { setToast('تعذّر جلب المستخدمين.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`حذف مستخدم "${name}" نهائياً؟`)) return;
    setDeletingId(id);
    try {
      const token = localStorage.getItem('nuzul_token') ?? '';
      const res   = await fetch(`${BACKEND_URL}/api/auth/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();
      if (data.success) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setToast('تم حذف المستخدم.');
      } else {
        setToast(data.message);
      }
    } catch { setToast('تعذّر حذف المستخدم.'); }
    finally { setDeletingId(null); setTimeout(() => setToast(null), 3000); }
  };

  const filtered = users
    .filter((u) => roleFilter === 'all' || u.role === roleFilter)
    .filter((u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    );

  const userCount    = users.filter((u) => u.role === 'user').length;
  const supportCount = users.filter((u) => u.role === 'support').length;
  const adminCount   = users.filter((u) => u.role === 'superadmin').length;

  return (
    <Layout>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0E5C4A', color: '#fff', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 2000, fontFamily: "'Tajawal',sans-serif" }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, direction: 'rtl' }}>
        <div>
          <h1 style={S.title}>المستخدمون</h1>
          <p style={S.sub}>
            {users.length} حساب مسجّل — {userCount} عميل · {supportCount} دعم · {adminCount} مدير
          </p>
        </div>
        <button style={S.refreshBtn} onClick={fetchUsers} disabled={loading}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          تحديث
        </button>
      </div>

      <div style={S.toolbar}>
        <div style={S.searchBox}>
          <Search size={15} color="#93A29B" />
          <input style={S.searchIn} placeholder="ابحث عن مستخدم…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={S.filterGroup}>
          {['all', 'superadmin', 'support', 'user'].map((r) => (
            <button key={r} style={{ ...S.filterBtn, ...(roleFilter === r ? S.filterActive : {}) }} onClick={() => setRoleFilter(r)}>
              {r === 'all' ? 'الكل' : (ROLE_INFO[r]?.label ?? r)}
            </button>
          ))}
        </div>
      </div>

      <div style={S.tableWrap}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#93A29B', padding: '40px 0', fontFamily: "'Tajawal',sans-serif" }}>جارٍ التحميل…</p>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                {['المستخدم', 'البريد الإلكتروني', 'الصلاحية', 'تاريخ التسجيل', ''].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const r      = ROLE_INFO[u.role] ?? ROLE_INFO.user;
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} style={S.tr}>
                    <td style={S.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {u.avatar
                          ? <img src={`${BACKEND_URL}${u.avatar}`} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
                          : <div style={S.avatar}>{u.name.slice(0, 2).toUpperCase()}</div>}
                        <span style={{ fontWeight: 700 }}>
                          {u.name}
                          {isSelf && <span style={S.youTag}>أنت</span>}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...S.td, color: '#52655F', direction: 'ltr' }}>{u.email}</td>
                    <td style={S.td}>
                      <span style={{ ...S.pill, background: r.bg, color: r.text }}>{r.icon} {r.label}</span>
                    </td>
                    <td style={{ ...S.td, color: '#93A29B', fontSize: 12 }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : '—'}
                    </td>
                    <td style={S.td}>
                      {u.role === 'user' && !isSelf && (
                        <button
                          style={{ ...S.actionBtn, opacity: deletingId === u.id ? 0.5 : 1 }}
                          disabled={deletingId === u.id}
                          onClick={() => handleDelete(u.id, u.name)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: '#93A29B', padding: '40px 0', fontFamily: "'Tajawal',sans-serif" }}>لم يتم العثور على مستخدمين.</p>
        )}
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </Layout>
  );
}

const S: Record<string, React.CSSProperties> = {
  title:      { margin: 0, fontSize: 28, fontWeight: 700, color: '#1C2B27', fontFamily: "'Amiri', serif" },
  sub:        { margin: '6px 0 0', fontSize: 13, color: '#52655F', fontFamily: "'Tajawal', sans-serif" },
  refreshBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#E1EEE7', color: '#0A4437', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Tajawal',sans-serif" },
  toolbar:    { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', direction: 'rtl' },
  searchBox:  { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E5DFC8', borderRadius: 8, padding: '8px 12px', flex: 1, minWidth: 200 },
  searchIn:   { background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#1C2B27', width: '100%', fontFamily: "'Tajawal',sans-serif" },
  filterGroup:{ display: 'flex', gap: 6, flexWrap: 'wrap' },
  filterBtn:  { padding: '8px 14px', borderRadius: 8, borderWidth: '1px', borderStyle: 'solid', borderColor: '#E5DFC8', background: '#fff', color: '#52655F', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Tajawal',sans-serif" },
  filterActive:{ background: '#E1EEE7', color: '#0A4437', borderColor: '#0E5C4A' },
  tableWrap:  { background: '#fff', border: '1px solid #E5DFC8', borderRadius: 14, overflow: 'auto', direction: 'rtl' },
  table:      { width: '100%', borderCollapse: 'collapse', minWidth: 600, fontFamily: "'Tajawal',sans-serif" },
  th:         { padding: '13px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#52655F', background: '#F3EEDD', borderBottom: '1px solid #E5DFC8', whiteSpace: 'nowrap' },
  tr:         { borderBottom: '1px solid #F3EEDD' },
  td:         { padding: '13px 16px', fontSize: 13, color: '#1C2B27' },
  avatar:     { width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#0E5C4A,#0A4437)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 },
  youTag:     { marginRight: 8, fontSize: 10, fontWeight: 700, color: '#0A4437', background: '#E1EEE7', padding: '2px 6px', borderRadius: 6 },
  pill:       { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  actionBtn:  { background: '#fff', border: '1px solid #FAEAE2', borderRadius: 7, padding: '6px 9px', color: '#BD5B3E', display: 'flex', cursor: 'pointer' },
};
