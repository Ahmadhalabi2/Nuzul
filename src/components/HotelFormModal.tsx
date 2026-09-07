import { useState, useEffect, useRef } from 'react';
import { X, Save, Plus, Trash2, Image, Loader2, Upload } from 'lucide-react';
import { BACKEND_URL } from '../config';
import { SYRIA_PROVINCES } from '../data/syria';
import type { DisplayHotel } from './HotelBookingFlow';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface HotelFormData {
  name: string;
  city: string;
  province_id: number | '';
  stars: number;
  price_per_night: number;
  discount_price: number | '';
  rating: number;
  rooms: number;
  status: 'active' | 'inactive';
  tag: string;
  image_url: string;
  amenities: string[];
  offer_text: string;
  description: string;
}

interface Props {
  mode: 'add' | 'edit';
  hotel?: DisplayHotel | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY_FORM: HotelFormData = {
  name: '', city: '', province_id: '',
  stars: 3, price_per_night: 0, discount_price: '',
  rating: 4.0, rooms: 10, status: 'active',
  tag: '', image_url: '', amenities: [], offer_text: '', description: '',
};

const PALETTE = {
  primary:  '#0E5C4A',
  danger:   '#ef4444',
  border:   '#e2e8f0',
  bg:       '#f8fafc',
  ink:      '#1e293b',
  muted:    '#64748b',
  surface:  '#ffffff',
};

// ─── Province lookup ──────────────────────────────────────────────────────────
function getProvinceId(provinceId: string): number | '' {
  // نحوّل province string ID مثل "syr-damascus" لرقم ترتيبي
  const idx = SYRIA_PROVINCES.findIndex(p => p.id === provinceId);
  return idx >= 0 ? idx + 1 : '';
}

export default function HotelFormModal({ mode, hotel, onClose, onSaved }: Props) {
  const [form, setForm]           = useState<HotelFormData>(EMPTY_FORM);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [newAmenity, setNewAmenity] = useState('');
  const [uploading, setUploading] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  // ملء البيانات عند التعديل
  useEffect(() => {
    if (mode === 'edit' && hotel) {
      setForm({
        name:           hotel.name,
        city:           hotel.city,
        province_id:    getProvinceId(hotel.provinceId),
        stars:          hotel.stars,
        price_per_night: hotel.originalPrice ?? hotel.price,
        discount_price: hotel.originalPrice ? hotel.price : '',
        rating:         hotel.rating,
        rooms:          10,
        status:         'active',
        tag:            '',
        image_url:      hotel.image,
        amenities:      [...(hotel.amenities ?? [])],
        offer_text:     hotel.offerText ?? '',
        description:    '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setTimeout(() => firstInputRef.current?.focus(), 100);
  }, [mode, hotel]);

  const token = () => localStorage.getItem('nuzul_token') ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim())          { setError('اسم الفندق مطلوب.'); return; }
    if (!form.city.trim())          { setError('المدينة مطلوبة.'); return; }
    if (!form.province_id)          { setError('المحافظة مطلوبة.'); return; }
    if (form.price_per_night <= 0)  { setError('السعر يجب أن يكون أكبر من صفر.'); return; }

    setLoading(true);

    const payload: Record<string, unknown> = {
      name:            form.name.trim(),
      city:            form.city.trim(),
      province_id:     form.province_id,
      stars:           form.stars,
      price_per_night: form.price_per_night,
      discount_price:  form.discount_price === '' ? null : form.discount_price,
      rating:          form.rating,
      rooms:           form.rooms,
      status:          form.status,
      tag:             form.tag.trim() || null,
      image_url:       form.image_url.trim() || null,
      amenities:       form.amenities,
      offer_text:      form.offer_text.trim() || null,
      description:     form.description.trim() || null,
    };

    try {
      const url    = mode === 'edit' && hotel
        ? `${BACKEND_URL}/api/hotels/${hotel.id}`
        : `${BACKEND_URL}/api/hotels`;
      const method = mode === 'edit' ? 'PATCH' : 'POST';

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message ?? 'حدث خطأ.');
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError('تعذّر الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${BACKEND_URL}/api/hotels/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('nuzul_token') ?? ''}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) set('image_url', data.imageUrl);
      else setError(data.message ?? 'فشل الرفع.');
    } catch {
      setError('تعذّر رفع الصورة.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addAmenity = () => {    const val = newAmenity.trim();
    if (!val || form.amenities.includes(val)) return;
    setForm(f => ({ ...f, amenities: [...f.amenities, val] }));
    setNewAmenity('');
  };

  const removeAmenity = (a: string) =>
    setForm(f => ({ ...f, amenities: f.amenities.filter(x => x !== a) }));

  const set = (key: keyof HotelFormData, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }));

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: PALETTE.surface, borderRadius: 20, width: '100%', maxWidth: 600,
          maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          direction: 'rtl',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${PALETTE.border}`,
          position: 'sticky', top: 0, background: PALETTE.surface, zIndex: 10,
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: PALETTE.ink, fontFamily: "'Tajawal',sans-serif" }}>
            {mode === 'add' ? '➕ إضافة فندق جديد' : `✏️ تعديل: ${hotel?.name}`}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}>
            <X size={20} color={PALETTE.muted} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ── صف 1: الاسم ── */}
          <Field label="اسم الفندق *">
            <input
              ref={firstInputRef}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="مثال: فندق فور سيزونز دمشق"
              style={inp}
            />
          </Field>

          {/* ── صف 2: المحافظة + المدينة ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="المحافظة *">
              <select value={form.province_id} onChange={e => set('province_id', Number(e.target.value))} style={inp}>
                <option value="">اختر...</option>
                {SYRIA_PROVINCES.map((p, i) => (
                  <option key={p.id} value={i + 1}>{p.name}</option>
                ))}
              </select>
            </Field>
            <Field label="المدينة *">
              <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="مثال: دمشق" style={inp} />
            </Field>
          </div>

          {/* ── صف 3: النجوم + التقييم + الغرف ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="النجوم">
              <select value={form.stars} onChange={e => set('stars', Number(e.target.value))} style={inp}>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ⭐</option>)}
              </select>
            </Field>
            <Field label="التقييم (0-5)">
              <input type="number" min={0} max={5} step={0.1} value={form.rating}
                onChange={e => set('rating', parseFloat(e.target.value))} style={inp} />
            </Field>
            <Field label="عدد الغرف">
              <input type="number" min={1} value={form.rooms}
                onChange={e => set('rooms', parseInt(e.target.value))} style={inp} />
            </Field>
          </div>

          {/* ── صف 4: السعر + السعر بعد الخصم ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="السعر الأساسي ($/ليلة) *">
              <input type="number" min={1} value={form.price_per_night}
                onChange={e => set('price_per_night', parseFloat(e.target.value))} style={inp} />
            </Field>
            <Field label="سعر الخصم (اختياري)">
              <input type="number" min={1} value={form.discount_price}
                onChange={e => set('discount_price', e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="اتركه فارغاً إن لم يكن هناك خصم" style={inp} />
            </Field>
          </div>

          {/* ── الحالة والـ Tag ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="الحالة">
              <select value={form.status} onChange={e => set('status', e.target.value as 'active'|'inactive')} style={inp}>
                <option value="active">نشط ✅</option>
                <option value="inactive">غير نشط ⏸️</option>
              </select>
            </Field>
            <Field label="التصنيف (Tag)">
              <input value={form.tag} onChange={e => set('tag', e.target.value)}
                placeholder="مثال: فاخر / بحري / تراثي" style={inp} />
            </Field>
          </div>

          {/* ── رابط الصورة + رفع من الجهاز ── */}
          <Field label="صورة الفندق">
            {/* معاينة */}
            {form.image_url && (
              <div style={{ borderRadius: 10, overflow: 'hidden', height: 130, marginBottom: 8 }}>
                <img src={form.image_url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            {/* رابط URL */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                value={form.image_url}
                onChange={e => set('image_url', e.target.value)}
                placeholder="https://images.unsplash.com/... (رابط من الإنترنت)"
                style={{ ...inp, flex: 1 }}
              />
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f8fafc', border: `1px solid ${PALETTE.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Image size={16} color={PALETTE.muted} />
              </div>
            </div>
            {/* أو رفع من الجهاز */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, fontWeight: 600, color: PALETTE.primary, cursor: 'pointer', fontFamily: "'Tajawal',sans-serif" }}
              >
                {uploading
                  ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> جاري الرفع...</>
                  : <><Upload size={13} /> رفع من الجهاز</>}
              </button>
              <span style={{ fontSize: 11, color: PALETTE.muted }}>JPEG / PNG / WebP — حتى 5MB</span>
            </div>
          </Field>

          {/* ── نص العرض ── */}
          <Field label="نص العرض (اختياري)">
            <input value={form.offer_text} onChange={e => set('offer_text', e.target.value)}
              placeholder="مثال: خصم 10% للحجوزات المبكرة!" style={inp} />
          </Field>

          {/* ── الوصف ── */}
          <Field label="الوصف (اختياري)">
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} placeholder="وصف مختصر للفندق..." style={{ ...inp, resize: 'vertical' }} />
          </Field>

          {/* ── المرافق ── */}
          <Field label="المرافق والخدمات">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {form.amenities.map(a => (
                <span key={a} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 20, padding: '3px 10px', fontSize: 12,
                  color: PALETTE.primary, fontFamily: "'Tajawal',sans-serif",
                }}>
                  {a}
                  <button type="button" onClick={() => removeAmenity(a)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#16a34a' }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newAmenity} onChange={e => setNewAmenity(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAmenity(); }}}
                placeholder="أضف ميزة (مثال: مسبح، واي فاي...)" style={{ ...inp, flex: 1 }} />
              <button type="button" onClick={addAmenity} style={{
                background: PALETTE.primary, color: '#fff', border: 'none',
                borderRadius: 8, padding: '0 14px', cursor: 'pointer', display: 'flex', alignItems: 'center',
              }}>
                <Plus size={16} />
              </button>
            </div>
          </Field>

          {/* Error */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: PALETTE.danger, fontSize: 13, fontFamily: "'Tajawal',sans-serif" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '10px 20px', background: PALETTE.bg, border: `1px solid ${PALETTE.border}`, borderRadius: 10, fontSize: 14, cursor: 'pointer', color: PALETTE.muted, fontFamily: "'Tajawal',sans-serif" }}>
              إلغاء
            </button>
            <button type="submit" disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px',
                background: loading ? '#94a3b8' : `linear-gradient(135deg,${PALETTE.primary},#16a37a)`,
                color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Tajawal',sans-serif",
              }}>
              {loading
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> جاري الحفظ...</>
                : <><Save size={15} /> {mode === 'add' ? 'إضافة الفندق' : 'حفظ التعديلات'}</>
              }
            </button>
          </div>
        </form>

        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    </div>
  );
}

// ── Helper Components ──────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', fontFamily: "'Tajawal',sans-serif" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: `1px solid ${PALETTE.border}`,
  borderRadius: 8, fontSize: 13, outline: 'none', background: PALETTE.bg,
  color: PALETTE.ink, fontFamily: "'Tajawal',sans-serif", direction: 'rtl',
  boxSizing: 'border-box',
};
