import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit2, Trash2, Globe2, Loader2 } from 'lucide-react';
import Layout from '../../components/Layout';
import { useAuthStore } from '../../store/authStore';
import { SYRIA_PROVINCES } from '../../data/syria';
import {
  PALETTE, useHotelBookingFlow,
  HotelDetailsModal, HotelCard,
  HotelBookingFlowStyles, themeStyles, type DisplayHotel,
} from '../../components/HotelBookingFlow';
import HotelFormModal from '../../components/HotelFormModal';
import { BACKEND_URL } from '../../config';

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({
  hotel,
  onConfirm,
  onClose,
  loading,
}: {
  hotel: DisplayHotel;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%', direction: 'rtl', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Trash2 size={24} color="#ef4444" />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, fontFamily: "'Tajawal',sans-serif", color: '#1e293b' }}>
            حذف الفندق
          </h3>
          <p style={{ margin: 0, fontSize: 14, color: '#64748b', fontFamily: "'Tajawal',sans-serif", lineHeight: 1.6 }}>
            هل أنت متأكد من حذف <strong>{hotel.name}</strong>؟<br />
            هذا الإجراء لا يمكن التراجع عنه.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontFamily: "'Tajawal',sans-serif", color: '#475569', fontWeight: 600 }}>
            إلغاء
          </button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: '10px', background: '#ef4444', border: 'none', borderRadius: 10, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Tajawal',sans-serif", color: '#fff', fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'جاري الحذف...' : 'نعم، احذف'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HotelsPage() {
  useNavigate();
  const { currentUser } = useAuthStore();
  const isStaff = currentUser?.role === 'superadmin';

  const [search,     setSearch]     = useState('');
  const [provinceId, setProvinceId] = useState('all');
  const [city,       setCity]       = useState('all');

  // Modal states
  const [formMode,       setFormMode]       = useState<'add' | 'edit'>('add');
  const [editHotel,      setEditHotel]      = useState<DisplayHotel | null>(null);
  const [showForm,       setShowForm]       = useState(false);
  const [deleteHotel,    setDeleteHotel]    = useState<DisplayHotel | null>(null);
  const [deleteLoading,  setDeleteLoading]  = useState(false);
  const [deleteError,    setDeleteError]    = useState('');
  const [hotels,         setHotels]         = useState<DisplayHotel[]>([]);
  const [loadingHotels,  setLoadingHotels]  = useState(true);
  const [toast,          setToast]          = useState('');

  const flow = useHotelBookingFlow();
  const token = () => localStorage.getItem('nuzul_token') ?? '';

  // ── جلب الفنادق من الباك اند ──────────────────────────────────────────────
  const fetchHotels = useCallback(async () => {
    setLoadingHotels(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/hotels`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success) {
        const mapped: DisplayHotel[] = data.hotels.map((h: any) => ({
          id:           String(h.id),
          name:         h.name,
          provinceId:   String(h.province_id ?? ''),
          provinceName: h.province_name ?? '',
          city:         h.city,
          country:      h.country ?? 'سوريا',
          image:        h.image ?? h.image_url ?? '',
          rating:       h.rating ?? 4.0,
          stars:        h.stars ?? 3,
          price:        h.price ?? h.price_per_night,
          originalPrice: (h.price_per_night && h.price_per_night !== h.price) ? h.price_per_night : undefined,
          amenities:    h.amenities ?? [],
          offerText:    h.offer_text ?? undefined,
          features:     h.amenities ?? [],
          status:       h.status,
          tag:          h.tag,
        }));
        setHotels(mapped);
      }
    } catch {} finally { setLoadingHotels(false); }
  }, []);

  useEffect(() => { fetchHotels(); }, [fetchHotels]);

  // ── فلترة ────────────────────────────────────────────────────────────────────
  const filteredByProvince = provinceId === 'all'
    ? hotels
    : hotels.filter(h => h.provinceId === provinceId);

  const filteredByCity = city === 'all'
    ? filteredByProvince
    : filteredByProvince.filter(h => h.city === city);

  const filtered = filteredByCity.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.city.toLowerCase().includes(search.toLowerCase())
  );

  const availableCities = useMemo(
    () => Array.from(new Set(filteredByProvince.map(h => h.city))),
    [filteredByProvince]
  );

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }, []);

  // ── Refresh بعد الحفظ ────────────────────────────────────────────────────────
  const handleSaved = useCallback(async () => {
    await fetchHotels();
    showToast(formMode === 'add' ? '✅ تم إضافة الفندق بنجاح' : '✅ تم تحديث الفندق بنجاح');
  }, [formMode, fetchHotels, showToast]);

  // ── حذف ──────────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteHotel) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res  = await fetch(`${BACKEND_URL}/api/hotels/${deleteHotel.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (!data.success) { setDeleteError(data.message); return; }
      setHotels(prev => prev.filter(h => h.id !== deleteHotel.id));
      setDeleteHotel(null);
      showToast('🗑️ تم حذف الفندق بنجاح');
    } catch {
      setDeleteError('تعذّر الاتصال بالخادم.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Layout>
      <HotelBookingFlowStyles />

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#0E5C4A', color: '#fff', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: "'Tajawal',sans-serif", boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 2000, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>{isStaff ? 'إدارة الفنادق' : 'تصفح الفنادق في سوريا'}</h1>
          <p style={S.pageSub}>{isStaff ? `${hotels.length} فندق` : `${filtered.length} فندق متاح`}</p>
        </div>
        {isStaff && (
          <button style={S.addBtn} onClick={() => { setFormMode('add'); setEditHotel(null); setShowForm(true); }}>
            <Plus size={16} /> إضافة فندق جديد
          </button>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div style={S.toolbar}>
        <div style={S.searchBox}>
          <Search size={15} color="#93A29B" />
          <input style={S.searchIn} placeholder="ابحث باسم الفندق أو المدينة..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={S.selectWrap}>
          <Globe2 size={15} color="#93A29B" />
          <select style={S.select} value={provinceId} onChange={e => { setProvinceId(e.target.value); setCity('all'); }}>
            <option value="all">كل المحافظات</option>
            {SYRIA_PROVINCES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div style={S.selectWrap}>
          <select style={S.select} value={city} onChange={e => setCity(e.target.value)}>
            <option value="all">كل المدن</option>
            {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* ── Grid ── */}
      {loadingHotels ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, gap: 10, color: '#0E5C4A' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontFamily: "'Tajawal',sans-serif" }}>جاري تحميل الفنادق...</span>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
      <div style={themeStyles.hotelsGrid}>
        {filtered.map(hotel =>
          isStaff ? (
            <StaffHotelCard
              key={hotel.id}
              hotel={hotel}
              onEdit={() => { setFormMode('edit'); setEditHotel(hotel); setShowForm(true); }}
              onDelete={() => setDeleteHotel(hotel)}
            />
          ) : (
            <HotelCard key={hotel.id} hotel={hotel} onViewDetails={() => flow.openDetails(hotel)} />
          )
        )}
      </div>
      )}
      {filtered.length === 0 && (
        <div style={S.empty}>
          <p style={{ fontSize: 32 }}>🏨</p>
          <p style={{ color: '#52655F', fontWeight: 700 }}>لم نجد أي فنادق تطابق معايير البحث.</p>
        </div>
      
      )}

      {/* ── Modals ── */}
      {flow.viewHotel && (
        <HotelDetailsModal hotel={flow.viewHotel} onClose={flow.closeDetails}
          onBook={() => flow.startBooking(flow.viewHotel!)} />
      )}

      {showForm && (
        <HotelFormModal
          mode={formMode}
          hotel={editHotel}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    
      {deleteHotel && (
        <DeleteConfirmModal
          hotel={deleteHotel}
          onConfirm={handleDelete}
          onClose={() => { setDeleteHotel(null); setDeleteError(''); }}
          loading={deleteLoading}
        />
      )}
      {deleteError && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#ef4444', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontFamily: "'Tajawal',sans-serif", zIndex: 2001 }}>
          ❌ {deleteError}
        </div>
      )}
    </Layout>
  );
}

// ── Staff Card ────────────────────────────────────────────────────────────────
function StaffHotelCard({
  hotel, onEdit, onDelete,
}: {
  hotel: DisplayHotel;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={themeStyles.hotelCard}>
      {/* صورة بدون onClick */}
      <div style={themeStyles.hotelImageContainer}>
        <img src={hotel.image} alt={hotel.name} style={themeStyles.hotelImg} loading="lazy" />
        <span style={themeStyles.hotelTagBadge}>{'⭐'.repeat(Math.min(hotel.stars, 5))}</span>
      </div>

      <div style={{ padding: 20 }}>
        <p style={themeStyles.hotelCardName}>{hotel.name}</p>
        <p style={themeStyles.hotelCardLocation}>{hotel.city}، {hotel.provinceName}</p>
        <div style={themeStyles.hotelCardMetaRow}>
          <span style={themeStyles.hotelRatingContainer}>★ {hotel.rating}</span>
          <span style={themeStyles.hotelPriceContainer}>
            ${hotel.price}
            <span style={themeStyles.currencyText}>/ليلة</span>
          </span>
        </div>

        {/* أزرار الإدارة — تعديل وحذف فقط */}
        <div style={S.adminRow}>
          <button onClick={onEdit} style={S.btnEdit} title="تعديل الفندق">
            <Edit2 size={13} /> تعديل
          </button>
          <button onClick={onDelete} style={S.btnDelete} title="حذف الفندق">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  pageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12, direction: 'rtl' },
  pageTitle:  { margin: 0, fontSize: 28, fontWeight: 700, color: '#1C2B27', fontFamily: "'Amiri','Cairo',serif" },
  pageSub:    { margin: '6px 0 0', fontSize: 13, color: '#52655F', fontFamily: "'Tajawal',sans-serif" },
  addBtn:     { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: 'linear-gradient(135deg,#0E5C4A,#0A4437)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal',sans-serif" },
  toolbar:    { display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', direction: 'rtl' },
  searchBox:  { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E5DFC8', borderRadius: 8, padding: '8px 12px', flex: 1, minWidth: 200 },
  searchIn:   { background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#1C2B27', width: '100%', fontFamily: "'Tajawal',sans-serif" },
  selectWrap: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E5DFC8', borderRadius: 8, padding: '8px 12px' },
  select:     { background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#1C2B27', cursor: 'pointer', fontFamily: "'Tajawal',sans-serif" },
  empty:      { textAlign: 'center', padding: '60px 0', direction: 'rtl', fontFamily: "'Tajawal',sans-serif" },

  adminRow:   { display: 'flex', gap: 7, marginTop: 14, borderTop: `1px solid ${PALETTE.line}`, paddingTop: 12 },
  btnView:    { flex: 1, padding: '8px', background: PALETTE.page, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, color: PALETTE.ink600, cursor: 'pointer', fontFamily: "'Tajawal',sans-serif" },
  btnEdit:    { flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px', background: '#eef2ff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#4338ca', cursor: 'pointer', fontFamily: "'Tajawal',sans-serif" },
  btnDelete:  { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: '#fef2f2', border: 'none', borderRadius: 8, fontSize: 12, color: '#ef4444', cursor: 'pointer' },
};
