import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** اسم القسم للـ error reporting — يساعد في التشخيص */
  section?: string;
}

interface State {
  hasError: boolean;
  error:    Error | null;
}

/**
 * ErrorBoundary — يمسك أي خطأ غير متوقع في React tree
 * ويعرض fallback UI بدل ما يكسر الصفحة كاملة
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // لو أضفت Sentry لاحقاً هون تحط: Sentry.captureException(error)
    console.error(`[ErrorBoundary${this.props.section ? ':' + this.props.section : ''}]`, error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // نرجع للصفحة الرئيسية بدل الـ reload عشان نتجنب infinite loop
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={S.wrap}>
        <style>{`
          @keyframes errFloat {
            0%,100% { transform: translateY(0); }
            50%      { transform: translateY(-8px); }
          }
        `}</style>

        {/* أيقونة */}
        <div style={S.icon}>🏨</div>

        {/* العنوان */}
        <h1 style={S.title}>عذراً، حدث خطأ غير متوقع</h1>
        <p style={S.sub}>
          واجهنا مشكلة في تحميل هذه الصفحة.
          <br />
          فريقنا يعمل على حلها في أقرب وقت.
        </p>

        {/* تفاصيل الخطأ — للـ development فقط */}
        {process.env.NODE_ENV === 'development' && this.state.error && (
          <details style={S.details}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 8 }}>
              تفاصيل الخطأ (dev mode)
            </summary>
            <pre style={S.pre}>
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack?.slice(0, 600)}
            </pre>
          </details>
        )}

        {/* الأزرار */}
        <div style={S.btns}>
          <button style={S.primaryBtn} onClick={this.handleReset}>
            العودة للصفحة الرئيسية
          </button>
          <button style={S.secondaryBtn} onClick={() => window.location.reload()}>
            إعادة تحميل الصفحة
          </button>
        </div>
      </div>
    );
  }
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    direction: 'rtl',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 20px',
    background: '#F1F4EF',
    fontFamily: "'Tajawal', sans-serif",
    textAlign: 'center',
    gap: 16,
  },
  icon: {
    fontSize: 64,
    animation: 'errFloat 3s ease-in-out infinite',
    lineHeight: 1,
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: '#1C2B27',
    fontFamily: "'Amiri', serif",
  },
  sub: {
    margin: 0,
    fontSize: 15,
    color: '#52655F',
    lineHeight: 1.8,
  },
  details: {
    background: '#fff',
    border: '1px solid #E1E6DC',
    borderRadius: 12,
    padding: '12px 16px',
    maxWidth: 560,
    width: '100%',
    textAlign: 'right',
  },
  pre: {
    margin: 0,
    fontSize: 11,
    color: '#BD5B3E',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    fontFamily: 'monospace',
    direction: 'ltr',
    textAlign: 'left',
  },
  btns: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtn: {
    padding: '12px 28px',
    background: 'linear-gradient(135deg, #0E5C4A, #0A4437)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Tajawal', sans-serif",
    boxShadow: '0 6px 18px rgba(14,92,74,0.25)',
  },
  secondaryBtn: {
    padding: '12px 24px',
    background: 'transparent',
    color: '#52655F',
    border: '1.5px solid #E1E6DC',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Tajawal', sans-serif",
  },
};
