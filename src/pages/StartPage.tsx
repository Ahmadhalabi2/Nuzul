import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../store/authStore';
import { useHotelsStore } from '../store/hotelsStore';
import { SYRIA_PROVINCES } from '../data/syria';
import { ArrowLeft, CalendarCheck, Shield, Wallet, Clock, Hotel } from 'lucide-react';

export default function StartPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { hotels } = useHotelsStore();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  const activeHotelsCount = useMemo(() => hotels.filter((h) => h.status === 'active').length, [hotels]);

  const isLoggedIn = !!currentUser;
  const isAdmin = currentUser?.role === 'superadmin';

  useEffect(() => {
    if (!isLoggedIn) return;
    navigate(isAdmin ? '/home' : '/home', { replace: true });
  }, [isLoggedIn, isAdmin, navigate]);

  return (
        <div style={S.splashRoot}>

      {/* Premium Cinematic Stylesheets, Keyframes & Ultra Responsive Overrides */}
      <style>{`
        @keyframes liquidMeshOne {
          0% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
          33% { transform: translate(40px, -60px) scale(1.2) rotate(120deg); }
          66% { transform: translate(-30px, 20px) scale(0.8) rotate(240deg); }
          100% { transform: translate(0px, 0px) scale(1) rotate(360deg); }
        }
        @keyframes liquidMeshTwo {
          0% { transform: translate(0px, 0px) scale(1.1) rotate(360deg); }
          50% { transform: translate(-50px, 40px) scale(0.9) rotate(180deg); }
          100% { transform: translate(0px, 0px) scale(1.1) rotate(0deg); }
        }
        @keyframes pulsePipeline {
          0% { background-position: 0% 0%; }
          100% { background-position: 0% 200%; }
        }
        @keyframes textReveal {
          from { opacity: 0; transform: translateY(30px); filter: blur(5px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes cardReveal {
          from { opacity: 0; transform: scale(0.96) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes logoBreathe {
          0%, 100% { transform: translateY(0) rotate(0deg); box-shadow: 0 12px 24px rgba(198,154,58,0.18); }
          50% { transform: translateY(-5px) rotate(-2deg); box-shadow: 0 18px 30px rgba(198,154,58,0.28); }
        }
        @keyframes stepReveal {
          from { opacity: 0; transform: translateX(18px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes softGlow {
          0%, 100% { opacity: .55; }
          50% { opacity: 1; }
        }

                html, body, #root { margin: 0; width: 100%; }
        .animate-fade-in {

          animation: textReveal 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-1 { animation-delay: 0.15s; opacity: 0; }
        .delay-2 { animation-delay: 0.3s; opacity: 0; }
        .delay-3 { animation-delay: 0.45s; opacity: 0; }
        .delay-4 { animation-delay: 0.6s; opacity: 0; }
        .delay-5 { animation-delay: 0.75s; opacity: 0; }
        .brand-seal { animation: logoBreathe 3.8s ease-in-out 1s infinite; }

                .premium-glass-card {
          animation: cardReveal 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both;

          transition: cubic-bezier(0.16, 1, 0.3, 1) 0.5s !important;
        }
        .premium-glass-card:hover {
          transform: translateY(-8px) scale(1.005) !important;
          box-shadow: 0 40px 80px rgba(14, 92, 74, 0.1), 
                      0 0 0 1px rgba(14, 92, 74, 0.25) !important;
        }

                .interactive-step {
          opacity: 0;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .interactive-step:nth-of-type(2) { animation: stepReveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.75s forwards; }
        .interactive-step:nth-of-type(3) { animation: stepReveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.92s forwards; }
        .interactive-step:nth-of-type(4) { animation: stepReveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) 1.09s forwards; }
        .interactive-step:nth-of-type(5) { animation: stepReveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) 1.26s forwards; }
        .connector-pulse { animation: softGlow 2.6s ease-in-out 1.1s infinite; }

        .interactive-step:hover {
          background: rgba(255, 255, 255, 0.85) !important;
          box-shadow: 0 12px 24px rgba(28, 43, 39, 0.05) !important;
          transform: translateX(-8px);
        }

                .btn-luxury-primary {
          animation: softGlow 2.8s ease-in-out 1.5s infinite;
          position: relative;

          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .btn-luxury-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 40px rgba(10, 68, 55, 0.4) !important;
          letter-spacing: 0.5px;
        }
        .btn-luxury-primary::after {
          content: '';
          position: absolute;
          top: -50%; left: -60%; width: 30%; height: 200%;
          background: rgba(255, 255, 255, 0.25);
          transform: rotate(30deg);
          transition: none;
        }
        .btn-luxury-primary:hover::after {
          left: 150%;
          transition: all 0.8s ease-in-out;
        }

        .btn-luxury-secondary {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .btn-luxury-secondary:hover {
          background: #FAF6EC !important;
          border-color: #C9A227 !important;
          transform: translateY(-3px);
          color: #1C2B27 !important;
        }

                .stat-box {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .stat-box:nth-child(1) { animation: textReveal 0.7s ease-out 0.85s both; }
        .stat-box:nth-child(2) { animation: textReveal 0.7s ease-out 1s both; }
        .stat-box:nth-child(3) { animation: textReveal 0.7s ease-out 1.15s both; }

        .stat-box:hover {
          transform: translateY(-6px);
          background: #fff !important;
          border-color: rgba(14, 92, 74, 0.25) !important;
          box-shadow: 0 15px 30px rgba(28, 43, 39, 0.04) !important;
        }

                @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }

        /* Responsive Breakpoints & Media Queries */

        .hero-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 40px;
          align-items: center;
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 20px;
          z-index: 1;
        }

        .hero-title {
          margin: 0 0 20px 0;
          font-size: 32px;
          line-height: 1.3;
          color: #1C2B27;
          font-weight: 700;
          font-family: 'Amiri', serif;
        }

        .hero-stats {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 40px;
        }

        @media (min-width: 640px) {
          .hero-stats {
            flex-direction: row;
          }
        }

        @media (min-width: 1024px) {
          .hero-container {
            grid-template-columns: 1.15fr 0.85fr;
            gap: 60px;
            padding: 0 24px;
          }
          .hero-title {
            font-size: 48px;
            line-height: 1.25;
          }
          .hero-stats {
            margin-top: 56px;
          }
        }
      `}</style>

      <div style={S.wrap}>
        {/* Living Ambient Lighting Canvas */}
        <div style={S.ambientContainer}>
          <div style={S.ambientBlobOne} />
          <div style={S.ambientBlobTwo} />
        </div>

        <div className="hero-container">
          {/* Right-To-Left Left Column: High-Impact Typography & Controls */}
          <div style={S.heroLeft}>
            <div className="animate-fade-in brand-lockup" style={S.brandLockup}>
              <div className="brand-seal" style={S.brandSeal}><Hotel size={24} strokeWidth={1.8} /></div>
              <div>
                <strong style={S.brandName}>نُزُل</strong>
                <span style={S.brandCaption}>حجزٌ أوضح، إقامةٌ أهدأ</span>
              </div>
            </div>
            <p className="animate-fade-in delay-1" style={S.eyebrow}>
              منصة سورية لتنظيم الإقامة والحجوزات
            </p>
            <h1 className="animate-fade-in delay-2 hero-title">
              اختر إقامتك بثقة،<br />
              <span style={S.titleAccent}>ودع عناء المتابعة علينا</span>
            </h1>
            <p className="animate-fade-in delay-3" style={S.sub}>
              اكتشف الفنادق والمنتجعات، أرسل طلبك، وتابع حالة الحجز من مكان واحد. تجربة عربية محلية تجمع الوضوح، الموافقة، الدعم، والإشعارات في رحلة بسيطة.
            </p>
            
            <div className="animate-fade-in delay-4" style={S.ctas}>
              <button className="btn-luxury-primary" style={S.primary} onClick={() => navigate('/signup')}>
                أنشئ حسابك الآن 
                <ArrowLeft size={20} style={{ marginRight: 10 }} />
              </button>
              <button className="btn-luxury-secondary" style={S.secondary} onClick={() => navigate('/login')}>
                تسجيل الدخول
              </button>
            </div>

            <div className="animate-fade-in delay-4 hero-stats">
              <div className="stat-box" style={S.stat}>
                <span style={S.statLabel}>منتجعات وفنادق متاحة</span>
                <strong style={S.statNumber}>{activeHotelsCount}</strong>
              </div>
              <div className="stat-box" style={S.stat}>
                <span style={S.statLabel}>وجهات سورية</span>
                <strong style={S.statNumber}>{SYRIA_PROVINCES.length}</strong>
              </div>
              <div className="stat-box" style={S.stat}>
                <span style={S.statLabel}>بوابات تأكيد فورية</span>
                <strong style={S.statNumber}>1</strong>
              </div>
            </div>
          </div>

          {/* Right-To-Left Right Column: Immersive Flow Dashboard */}
          <div style={S.heroRight}>
            <div className="premium-glass-card" style={S.glassCard}>
              
              {/* Dynamic Glowing Pipeline Connector */}
              <div className="connector-pulse" style={S.connectorPipeline} />

              {/* Step 1 */}
              <div className="interactive-step" style={S.stepRow}>
                <div style={{...S.iconWrapper, background: 'linear-gradient(135deg, #E1EEE7 0%, #BFE0D2 100%)'}}>
                  <CalendarCheck size={22} style={{ color: '#0E5C4A' }} />
                </div>
                <div style={S.stepContent}>
                  <strong style={S.stepTitle}>01 / حدد وجهتك المرجوة</strong>
                  <div style={S.small}>تصفح تشكيلة منسقة من الفنادق العصرية وقدم طلبك بلمحة واحدة.</div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="interactive-step" style={S.stepRow}>
                <div style={{...S.iconWrapper, background: 'linear-gradient(135deg, #F6EBCB 0%, #EBD79D 100%)'}}>
                  <Shield size={22} style={{ color: '#9C7825' }} />
                </div>
                <div style={S.stepContent}>
                  <strong style={S.stepTitle}>02 / المصادقة الذكية الفورية</strong>
                  <div style={S.small}>يتولى النظام وفريق الإشراف مراجعة حجزك وتثبيته لضمان الخصوصية.</div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="interactive-step" style={S.stepRow}>
                <div style={{...S.iconWrapper, background: 'linear-gradient(135deg, #FAEAE2 0%, #F0C6B2 100%)'}}>
                  <Wallet size={22} style={{ color: '#BD5B3E' }} />
                </div>
                <div style={S.stepContent}>
                  <strong style={S.stepTitle}>03 / خيارات دفع واضحة</strong>
                  <div style={S.small}>بعد موافقة الإدارة، تظهر لك تعليمات الدفع والحالة المالية للحجز بوضوح.</div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="interactive-step" style={S.stepRow}>
                <div style={{...S.iconWrapper, background: 'linear-gradient(135deg, #F3EEDD 0%, #E5DFC8 100%)'}}>
                  <Clock size={22} style={{ color: '#52655F' }} />
                </div>
                <div style={S.stepContent}>
                  <strong style={S.stepTitle}>04 / تأكيد الحجز ومتابعته</strong>
                  <div style={S.small}>استلم إشعارات التحديث، واحتفظ بتفاصيل حجزك لتصل إلى إقامتك براحة.</div>
                </div>
              </div>

            </div>
            
          </div>
        </div>
      </div>
        </div>

  );
}

const S: Record<string, React.CSSProperties> = {
  splashRoot: {
    width: '100%',
    height: '100vh',
    minHeight: '100vh',
    overflow: 'hidden',
    background: '#FAF6EC'
  },
  wrap: { 
    minHeight: '100vh',
    height: '100vh',
    direction: 'rtl',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    boxSizing: 'border-box',
    padding: '24px 0',
    background: '#FAF6EC',
    fontFamily: "'Tajawal', sans-serif"
  },
  ambientContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    zIndex: 0,
    pointerEvents: 'none'
  },
  ambientBlobOne: {
    position: 'absolute',
    width: 'min(600px, 90vw)',
    height: 'min(600px, 90vw)',
    background: 'radial-gradient(circle, rgba(14,92,74,0.16) 0%, rgba(255,255,255,0) 70%)',
    top: '-10%',
    right: '-5%',
    filter: 'blur(60px)',
    animation: 'liquidMeshOne 25s ease-in-out infinite'
  },
  ambientBlobTwo: {
    position: 'absolute',
    width: 'min(500px, 80vw)',
    height: 'min(500px, 80vw)',
    background: 'radial-gradient(circle, rgba(198,154,58,0.14) 0%, rgba(255,255,255,0) 70%)',
    bottom: '5%',
    left: '5%',
    filter: 'blur(50px)',
    animation: 'liquidMeshTwo 20s ease-in-out infinite'
  },
  heroLeft: { 
    textAlign: 'right',
    display: 'flex',
    flexDirection: 'column',
    width: '100%'
  },
  brandLockup: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
    direction: 'rtl'
  },
  brandSeal: {
    width: 52,
    height: 52,
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8B681B',
    background: 'linear-gradient(135deg, #F6EBCB 0%, #E8D29A 100%)',
    border: '1px solid rgba(198,154,58,0.45)',
    boxShadow: '0 12px 24px rgba(198,154,58,0.18)',
    flexShrink: 0
  },
  brandName: {
    display: 'block',
    color: '#1C2B27',
    fontFamily: "'Amiri', serif",
    fontSize: 27,
    lineHeight: 1.15,
    fontWeight: 700
  },
  brandCaption: {
    display: 'block',
    marginTop: 3,
    color: '#8B681B',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.2px'
  },
  heroRight: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: 20,
    position: 'relative',
    width: '100%'
  },
  eyebrow: { 
    fontSize: '14px', 
    fontWeight: 700, 
    color: '#0A4437', 
    margin: '0 0 16px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.8px'
  },
  titleAccent: {
    background: 'linear-gradient(135deg, #0A4437 0%, #C69A3A 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  sub: { 
    margin: 0, 
    color: '#52655F', 
    fontSize: '16px', 
    lineHeight: 1.9, 
    maxWidth: '600px' 
  },
  ctas: { 
    display: 'flex', 
    gap: 14, 
    marginTop: 36, 
    flexWrap: 'wrap' 
  },
  primary: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 8, 
    padding: '16px 32px', 
    background: 'linear-gradient(135deg, #0E5C4A 0%, #0A4437 100%)', 
    color: '#fff', 
    border: 'none', 
    borderRadius: '16px', 
    cursor: 'pointer', 
    fontSize: '16px',
    fontWeight: 700,
    boxShadow: '0 10px 25px rgba(10, 68, 55, 0.28)',
    fontFamily: "'Tajawal', sans-serif",
    flex: '1 1 auto',
    minWidth: '200px'
  },
  secondary: { 
    padding: '16px 32px', 
    background: '#fff', 
    border: '1px solid #E5DFC8', 
    borderRadius: '16px', 
    cursor: 'pointer', 
    fontSize: '16px',
    fontWeight: 700, 
    color: '#52655F',
    boxShadow: '0 4px 10px rgba(28,43,39,0.02)',
    fontFamily: "'Tajawal', sans-serif",
    flex: '1 1 auto',
    minWidth: '200px'
  },
  stat: { 
    flex: 1,
    padding: '20px 24px', 
    background: 'rgba(255, 255, 255, 0.7)', 
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(229, 223, 200, 0.8)', 
    borderRadius: '20px', 
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    boxShadow: '0 4px 20px rgba(28,43,39,0.015)'
  },
  statLabel: {
    fontSize: '13px',
    color: '#52655F',
    fontWeight: 600
  },
  statNumber: {
    fontSize: '30px',
    color: '#1C2B27',
    fontWeight: 900
  },
  glassCard: { 
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.45) 100%)', 
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.7)', 
    borderRadius: '32px', 
    padding: '32px 24px', 
    boxShadow: '0 30px 60px rgba(28, 43, 39, 0.05)', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: 20,
    position: 'relative'
  },
  connectorPipeline: {
    position: 'absolute',
    right: '43px',
    top: '52px',
    bottom: '52px',
    width: '3px',
    background: 'linear-gradient(to bottom, #0E5C4A, #C69A3A, #BD5B3E, #52655F)',
    backgroundSize: '100% 200%',
    opacity: 0.4,
    zIndex: 0,
    animation: 'pulsePipeline 6s linear infinite'
  },
  stepRow: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 16,
    zIndex: 1,
    padding: '12px 14px',
    borderRadius: '20px',
    background: 'rgba(255, 255, 255, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.3)'
  },
  iconWrapper: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 12px rgba(28,43,39,0.03)',
    flexShrink: 0
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  stepTitle: {
    fontSize: '15px',
    color: '#1C2B27',
    fontWeight: 800
  },
  small: { 
    fontSize: '12px', 
    color: '#52655F', 
    lineHeight: 1.6
  },
  note: { 
    margin: 0, 
    fontSize: '12px', 
    color: '#93A29B',
    paddingRight: 12,
    textAlign: 'right'
  },
};