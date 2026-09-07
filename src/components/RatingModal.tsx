/**
 * RatingModal.tsx
 * ─────────────────────────────────────────────────────
 * Modal تقييم الفندق — يُفتح من MyBookingsPage
 * ─────────────────────────────────────────────────────
 */

import { useState } from 'react';
import { X, Star, Send, CheckCircle } from 'lucide-react';
import { useRatingsStore } from '../store/ratingsStore';
import { useAuthStore } from '../store/authStore';
import { ratingsApi } from '../services/api';
import type { Booking } from '../store/bookingsStore';

interface Props {
  booking: Booking;
  onClose: () => void;
}

export default function RatingModal({ booking, onClose }: Props) {
  const { addRating, hasRated, getRatingForBooking } = useRatingsStore();
  const { currentUser } = useAuthStore();

  const existing     = getRatingForBooking(booking.id);
  const alreadyRated = hasRated(booking.id);

  const [stars,   setStars]   = useState(existing?.stars   ?? 0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [done,    setDone]    = useState(alreadyRated);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const STAR_LABELS = ['', 'سيء', 'مقبول', 'جيد', 'رائع', 'ممتاز'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stars === 0 || !currentUser) return;
    setSaving(true);
    setError('');
    try {
      // إرسال للباك اند
      const res = await ratingsApi.create({
        booking_id: Number(booking.id),
        stars,
        comment: comment.trim() || undefined,
      });
      if (!res.success) { setError(res.message ?? 'حدث خطأ.'); return; }
      // حفظ محلي للتوافق
      addRating({
        bookingId: booking.id,
        userId:    currentUser.id,
        userName:  currentUser.name,
        hotelId:   booking.hotelId,
        hotelName: booking.hotelName,
        stars,
        comment: comment.trim(),
      });
      setDone(true);
    } catch {
      setError('تعذّر الاتصال بالخادم.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <style>{`
          @keyframes modalIn {
            from { opacity: 0; transform: translateY(20px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
          .rating-modal-inner { animation: modalIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }
          .star-btn { transition: transform 0.15s ease; }
          .star-btn:hover { transform: scale(1.2); }
        `}</style>

        <div className="rating-modal-inner" style={S.inner}>
          {/* Header */}
          <div style={S.header}>
            <div>
              <h3 style={S.title}>تقييم إقامتك</h3>
              <p style={S.sub}>{booking.hotelName} · {booking.city}</p>
            </div>
            <button style={S.closeBtn} onClick={onClose} aria-label="إغلاق">
              <X size={18} />
            </button>
          </div>

          {done ? (
            /* ── شكراً ── */
            <div style={S.thankBox}>
              <div style={S.thankIcon}><CheckCircle size={36} color="#0E5C4A" /></div>
              <p style={S.thankTitle}>شكراً على تقييمك!</p>
              <p style={S.thankSub}>تقييمك يساعدنا على تحسين تجربة الإقامة للجميع.</p>
              {existing && (
                <div style={S.existingStars}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={22} fill={i < (existing.stars ?? stars) ? '#C69A3A' : 'none'} stroke="#C69A3A" />
                  ))}
                </div>
              )}
              <button style={S.closeAfterBtn} onClick={onClose}>إغلاق</button>
            </div>
          ) : (
            /* ── نموذج التقييم ── */
            <form onSubmit={handleSubmit} style={S.form}>
              {/* النجوم */}
              <div style={S.starsSection}>
                <p style={S.starsLabel}>كيف كانت إقامتك؟</p>
                <div style={S.starsRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="star-btn"
                      style={S.starBtn}
                      onMouseEnter={() => setHovered(n)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setStars(n)}
                      aria-label={`${n} نجمة`}
                    >
                      <Star
                        size={36}
                        fill={(hovered || stars) >= n ? '#C69A3A' : 'none'}
                        stroke={(hovered || stars) >= n ? '#C69A3A' : '#C7BFA0'}
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>
                {(hovered > 0 || stars > 0) && (
                  <p style={S.starHint}>{STAR_LABELS[hovered || stars]}</p>
                )}
              </div>

              {/* التعليق */}
              <div style={S.field}>
                <label style={S.fieldLabel}>تعليقك (اختياري)</label>
                <textarea
                  rows={3}
                  style={S.textarea}
                  placeholder="شاركنا تجربتك، ما الذي أعجبك أو لم يعجبك…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={400}
                />
                <p style={S.charCount}>{comment.length}/400</p>
              </div>

              {stars === 0 && (
                <p style={S.hint}>اختر عدد النجوم للمتابعة</p>
              )}

              <button
                type="submit"
                style={{ ...S.submitBtn, opacity: stars === 0 ? 0.5 : 1 }}
                disabled={stars === 0 || saving}
              >
                <Send size={15} />
                {saving ? 'جارٍ الإرسال…' : 'إرسال التقييم'}
              </button>
              {error && <p style={{ color: '#ef4444', fontSize: 12, textAlign: 'center', margin: '6px 0 0', fontFamily: "'Tajawal',sans-serif" }}>{error}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(28,43,39,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16, backdropFilter: 'blur(4px)',
  },
  modal: { width: '100%', maxWidth: 460 },
  inner: {
    background: '#fff', borderRadius: 20, overflow: 'hidden',
    boxShadow: '0 25px 50px rgba(28,43,39,0.2)',
    border: '1px solid #E5DFC8', direction: 'rtl',
    fontFamily: "'Tajawal', sans-serif",
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '20px 22px 16px',
    borderBottom: '1px solid #F3EEDD',
    background: 'linear-gradient(135deg, #F8F4EA, #EDE6D6)',
  },
  title:    { margin: 0, fontSize: 17, fontWeight: 800, color: '#1C2B27', fontFamily: "'Amiri', serif" },
  sub:      { margin: '4px 0 0', fontSize: 12, color: '#52655F' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#93A29B', padding: 4, borderRadius: 8, display: 'flex' },

  form:         { padding: '22px' },
  starsSection: { textAlign: 'center', marginBottom: 20 },
  starsLabel:   { margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#1C2B27' },
  starsRow:     { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 8 },
  starBtn:      { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' },
  starHint:     { margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: '#C69A3A' },

  field:      { marginBottom: 14 },
  fieldLabel: { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 },
  textarea:   {
    width: '100%', padding: '10px 12px',
    border: '1.5px solid #E5DFC8', borderRadius: 10,
    fontSize: 13, color: '#1C2B27', outline: 'none',
    resize: 'vertical', background: '#FAF6EC',
    boxSizing: 'border-box', fontFamily: "'Tajawal', sans-serif",
    minHeight: 80,
  },
  charCount: { margin: '4px 0 0', fontSize: 11, color: '#93A29B', textAlign: 'left' },
  hint:      { fontSize: 12, color: '#C69A3A', textAlign: 'center', margin: '0 0 12px' },

  submitBtn: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '12px', background: 'linear-gradient(135deg,#0E5C4A,#0A4437)',
    color: '#fff', border: 'none', borderRadius: 12,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Tajawal', sans-serif",
    transition: 'opacity 0.2s',
  },

  thankBox:    { padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  thankIcon:   { width: 64, height: 64, background: '#E1EEE7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  thankTitle:  { margin: 0, fontSize: 18, fontWeight: 800, color: '#1C2B27', fontFamily: "'Amiri', serif" },
  thankSub:    { margin: 0, fontSize: 13, color: '#52655F', lineHeight: 1.6 },
  existingStars: { display: 'flex', gap: 4, margin: '8px 0' },
  closeAfterBtn: {
    marginTop: 8, padding: '10px 28px',
    background: '#E1EEE7', color: '#0A4437',
    border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Tajawal', sans-serif",
  },
};
