import { useState } from 'react';
import { User, Bell, Lock, Globe, Palette, Save, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Layout from '../../components/Layout';
import { useAuthStore } from '../../store/authStore';

const TABS = [
  { id: 'profile',  label: 'الملف الشخصي', icon: User },
  { id: 'notif',    label: 'الإشعارات',     icon: Bell },
  { id: 'security', label: 'الأمان',        icon: Lock },
  { id: 'prefs',    label: 'التفضيلات',     icon: Palette },
];

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'مدير النظام الرئيسي',
  manager:    'مدير الفندق',
  support:    'موظف الدعم',
  user:       'عميل',
};

import { BACKEND_URL } from '../../config';
const API = `${BACKEND_URL}/api/auth`;

export default function SettingsPage() {
  const { currentUser, loginWithToken } = useAuthStore();
  const [tab, setTab] = useState('profile');

  // ── profile tab ──────────────────────────────────────────────────────────
  const [name, setName]   = useState(currentUser?.name  ?? '');
  const [saving, setSaving]   = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── security tab ─────────────────────────────────────────────────────────
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [showCur, setShowCur]       = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwMsg, setPwMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── notif tab ─────────────────────────────────────────────────────────────
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush,  setNotifPush]  = useState(true);
  const [notifSms,   setNotifSms]   = useState(false);

  const roleKey = (currentUser?.role as string) ?? 'user';

  // ── حفظ الاسم ────────────────────────────────────────────────────────────
  const handleSaveName = async () => {
    if (!name.trim()) { setProfileMsg({ type: 'err', text: 'الاسم لا يمكن أن يكون فارغاً.' }); return; }
    setSaving(true);
    setProfileMsg(null);
    try {
      const token = localStorage.getItem('nuzul_token') ?? '';
      const res   = await fetch(`${API}/profile`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.token) localStorage.setItem('nuzul_token', data.token);
        loginWithToken(data.user);
        setProfileMsg({ type: 'ok', text: 'تم تحديث الاسم بنجاح.' });
      } else {
        setProfileMsg({ type: 'err', text: data.message });
      }
    } catch {
      setProfileMsg({ type: 'err', text: 'تعذّر الاتصال بالخادم.' });
    } finally {
      setSaving(false);
    }
  };

  // ── حفظ كلمة السر ────────────────────────────────────────────────────────
  const handleSavePw = async () => {
    if (!currentPw || !newPw || !confirmPw) { setPwMsg({ type: 'err', text: 'يرجى ملء جميع الحقول.' }); return; }
    if (newPw !== confirmPw)  { setPwMsg({ type: 'err', text: 'كلمة المرور الجديدة وتأكيدها غير متطابقين.' }); return; }
    if (newPw.length < 6)     { setPwMsg({ type: 'err', text: 'كلمة المرور الجديدة 6 أحرف على الأقل.' }); return; }
    setPwSaving(true);
    setPwMsg(null);
    try {
      const token = localStorage.getItem('nuzul_token') ?? '';
      const res   = await fetch(`${API}/profile`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.token) localStorage.setItem('nuzul_token', data.token);
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
        setPwMsg({ type: 'ok', text: 'تم تغيير كلمة المرور بنجاح.' });
      } else {
        setPwMsg({ type: 'err', text: data.message });
      }
    } catch {
      setPwMsg({ type: 'err', text: 'تعذّر الاتصال بالخادم.' });
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <Layout>
      <h1 style={S.title}>الإعدادات</h1>
      <p style={S.sub}>إدارة حسابك وتفضيلاتك</p>

      <div style={S.layout}>
        {/* تبويبات */}
        <div style={S.tabsCol}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} style={{ ...S.tabBtn, ...(tab === id ? S.tabActive : {}) }} onClick={() => setTab(id)}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* محتوى */}
        <div style={S.content}>

          {/* ── الملف الشخصي ── */}
          {tab === 'profile' && (
            <div style={S.card}>
              <p style={S.cardTitle}>معلومات الملف الشخصي</p>
              <div style={S.field}>
                <label style={S.label}>الاسم الكامل</label>
                <input style={S.input} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div style={S.field}>
                <label style={S.label}>البريد الإلكتروني</label>
                <input style={{ ...S.input, background: '#F3EEDD', color: '#93A29B' }} value={currentUser?.email ?? ''} disabled />
              </div>
              <div style={S.field}>
                <label style={S.label}>الصلاحية</label>
                <input style={{ ...S.input, background: '#F3EEDD', color: '#93A29B' }} value={ROLE_LABEL[roleKey] ?? roleKey} disabled />
              </div>
              {profileMsg && <Msg type={profileMsg.type} text={profileMsg.text} />}
              <button style={S.saveBtn} onClick={handleSaveName} disabled={saving}>
                <Save size={15} /> {saving ? 'جارٍ الحفظ…' : 'حفظ الاسم'}
              </button>
            </div>
          )}

          {/* ── الإشعارات ── */}
          {tab === 'notif' && (
            <div style={S.card}>
              <p style={S.cardTitle}>تفضيلات الإشعارات</p>
              {[
                { label: 'إشعارات البريد الإلكتروني', desc: 'استلام تحديثات الحجوزات عبر البريد', val: notifEmail, set: setNotifEmail },
                { label: 'الإشعارات الفورية',         desc: 'تلقي الإشعارات مباشرة على هذا الجهاز', val: notifPush,  set: setNotifPush  },
                { label: 'تنبيهات الرسائل النصية',    desc: 'تنبيهات هامة عبر رسالة نصية',         val: notifSms,  set: setNotifSms   },
              ].map((item) => (
                <div key={item.label} style={S.toggleRow}>
                  <div>
                    <p style={S.toggleLabel}>{item.label}</p>
                    <p style={S.toggleDesc}>{item.desc}</p>
                  </div>
                  <button style={{ ...S.toggle, background: item.val ? '#0E5C4A' : '#E5DFC8' }}
                    onClick={() => item.set(!item.val)} aria-pressed={item.val}>
                    <span style={{ ...S.toggleDot, transform: item.val ? 'translateX(-18px)' : 'translateX(-2px)' }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── الأمان ── */}
          {tab === 'security' && (
            <div style={S.card}>
              <p style={S.cardTitle}>تغيير كلمة المرور</p>

              <div style={S.field}>
                <label style={S.label}>كلمة المرور الحالية</label>
                <div style={S.pwWrap}>
                  <input type={showCur ? 'text' : 'password'} style={{ ...S.input, paddingLeft: 40 }}
                    placeholder="••••••••" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
                  <button type="button" style={S.eyeBtn} onClick={() => setShowCur((v) => !v)}>
                    {showCur ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div style={S.field}>
                <label style={S.label}>كلمة المرور الجديدة</label>
                <div style={S.pwWrap}>
                  <input type={showNew ? 'text' : 'password'} style={{ ...S.input, paddingLeft: 40 }}
                    placeholder="6 أحرف على الأقل" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                  <button type="button" style={S.eyeBtn} onClick={() => setShowNew((v) => !v)}>
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div style={S.field}>
                <label style={S.label}>تأكيد كلمة المرور الجديدة</label>
                <input type="password" style={S.input} placeholder="••••••••"
                  value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
              </div>

              {pwMsg && <Msg type={pwMsg.type} text={pwMsg.text} />}
              <button style={S.saveBtn} onClick={handleSavePw} disabled={pwSaving}>
                <Save size={15} /> {pwSaving ? 'جارٍ الحفظ…' : 'تغيير كلمة المرور'}
              </button>
            </div>
          )}

          {/* ── التفضيلات ── */}
          {tab === 'prefs' && (
            <div style={S.card}>
              <p style={S.cardTitle}>التفضيلات</p>
              <div style={S.field}>
                <label style={S.label}><Globe size={13} style={{ verticalAlign: 'middle', marginLeft: 6 }} />اللغة</label>
                <select style={S.input}>
                  <option>العربية</option>
                  <option>English</option>
                  <option>Français</option>
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>العملة</label>
                <select style={S.input}>
                  <option>ل.س (الليرة السورية)</option>
                  <option>USD ($)</option>
                  <option>EUR (€)</option>
                  <option>AED (د.إ)</option>
                </select>
              </div>
              <p style={{ fontSize: 12, color: '#93A29B', marginTop: 8 }}>
                سيتم ربط هذه التفضيلات بحسابك في تحديث قادم.
              </p>
            </div>
          )}

          {/* ── تصفير البيانات — للأدمن والدعم فقط ── */}
          {(currentUser?.role === 'superadmin' || currentUser?.role === 'support') && (
            <ResetDataSection role={currentUser.role} />
          )}
        </div>
      </div>
    </Layout>
  );
}

// ── مكوّن تصفير البيانات ─────────────────────────────────────────────────────
function ResetDataSection({ role }: { role: string }) {
  const { logout } = useAuthStore();
  const [loading,  setLoading]  = useState(false);
  const [confirm1, setConfirm1] = useState(false);
  const [msg,      setMsg]      = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleReset = async () => {
    if (!confirm1) { setConfirm1(true); return; }
    setLoading(true);
    setMsg(null);
    try {
      const token = localStorage.getItem('nuzul_token') ?? '';
      const res   = await fetch(`${BACKEND_URL}/api/reset`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        // الـ reset حذف الـ tokens — نعيد تسجيل الدخول تلقائياً لنحصل على token جديد
        logout();
        setMsg({ type: 'ok', text: 'تم التصفير. يتم إعادة تسجيل الدخول...' });
        // لا نعرف كلمة المرور هنا — نوجّه لصفحة الدخول
        setTimeout(() => { window.location.href = '/login'; }, 1500);
      } else {
        setMsg({ type: 'err', text: data.message });
      }
      setConfirm1(false);
    } catch {
      setMsg({ type: 'err', text: 'تعذّر الاتصال بالخادم.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ ...S.card, borderColor: '#fecaca', marginTop: 12 }}>
      <p style={{ ...S.cardTitle, color: '#dc2626' }}>⚠️ منطقة الخطر</p>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, fontFamily: "'Tajawal',sans-serif" }}>
        تصفير جميع بيانات التطبيق (حجوزات، مستخدمين، إشعارات، دعم، تقييمات) مع الحفاظ على حسابات الأدمن وموظفي الدعم.
        {role !== 'superadmin' && ' (سيتم تنفيذ الأمر بصلاحية الأدمن)'}
      </p>
      {msg && <Msg type={msg.type} text={msg.text} />}
      {confirm1 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: '#dc2626', fontFamily: "'Tajawal',sans-serif" }}>
          ⚠️ هل أنت متأكد؟ هذا الإجراء لا يمكن التراجع عنه. اضغط مرة أخرى للتأكيد.
        </div>
      )}
      <button
        onClick={handleReset}
        disabled={loading}
        style={{
          padding: '10px 20px',
          background: confirm1 ? '#dc2626' : '#fef2f2',
          color:      confirm1 ? '#fff'    : '#dc2626',
          border:     '1px solid #fecaca',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: "'Tajawal',sans-serif",
          opacity: loading ? 0.7 : 1,
          transition: 'all 0.2s',
        }}
      >
        {loading ? 'جاري التصفير...' : confirm1 ? 'نعم، صفّر البيانات نهائياً' : '🗑️ تصفير جميع البيانات'}
      </button>
      {confirm1 && (
        <button
          onClick={() => setConfirm1(false)}
          style={{ marginRight: 10, padding: '10px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, cursor: 'pointer', fontFamily: "'Tajawal',sans-serif", color: '#475569' }}
        >
          إلغاء
        </button>
      )}
    </div>
  );
}

// ── مكوّن رسائل النجاح/الخطأ ──────────────────────────────────────────────
function Msg({ type, text }: { type: 'ok' | 'err'; text: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderRadius: 10, marginBottom: 12,
      background: type === 'ok' ? '#EAF5EF' : '#FCEEE9',
      border:     `1px solid ${type === 'ok' ? '#BFE3D1' : '#F3D2C2'}`,
      color:      type === 'ok' ? '#0E5C4A'  : '#96432B',
      fontSize: 13, fontFamily: "'Tajawal', sans-serif",
    }}>
      {type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
      {text}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  title:      { margin: 0, fontSize: 28, fontWeight: 700, color: '#1C2B27', fontFamily: "'Amiri', serif" },
  sub:        { margin: '6px 0 24px', fontSize: 13, color: '#52655F', fontFamily: "'Tajawal', sans-serif" },
  layout:     { display: 'flex', gap: 24, flexWrap: 'wrap', direction: 'rtl' },
  tabsCol:    { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 200 },
  tabBtn:     { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#52655F', borderRadius: 8, textAlign: 'right', fontFamily: "'Tajawal', sans-serif" },
  tabActive:  { background: '#E1EEE7', color: '#0A4437', fontWeight: 700 },
  content:    { flex: 1, minWidth: 280 },
  card:       { background: '#fff', border: '1px solid #E5DFC8', borderRadius: 16, padding: '24px', marginBottom: 16 },
  cardTitle:  { margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#1C2B27', fontFamily: "'Tajawal', sans-serif" },
  field:      { marginBottom: 16 },
  label:      { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, fontFamily: "'Tajawal', sans-serif" },
  input:      { width: '100%', padding: '10px 12px', border: '1.5px solid #E5DFC8', borderRadius: 8, fontSize: 14, color: '#1C2B27', outline: 'none', boxSizing: 'border-box', background: '#FAF6EC', fontFamily: "'Tajawal', sans-serif" },
  pwWrap:     { position: 'relative' },
  eyeBtn:     { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8A968F', padding: 4, display: 'flex', alignItems: 'center' },
  toggleRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F3EEDD' },
  toggleLabel:{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#1C2B27', fontFamily: "'Tajawal', sans-serif" },
  toggleDesc: { margin: 0, fontSize: 12, color: '#93A29B' },
  toggle:     { width: 38, height: 22, borderRadius: 20, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 },
  toggleDot:  { position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  saveBtn:    { display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', background: 'linear-gradient(135deg,#0E5C4A,#0A4437)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif" },
};
