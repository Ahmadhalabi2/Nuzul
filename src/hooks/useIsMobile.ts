import { useEffect, useState } from 'react';

/**
 * يعيد true لو عرض الشاشة ≤ الـ breakpoint المحدد (default 768px)
 * نستخدمه لتطبيق styles مختلفة على الموبايل بدلاً من @media داخل inline styles
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth <= breakpoint
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}
