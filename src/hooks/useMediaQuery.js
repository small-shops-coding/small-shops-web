import { useEffect, useMemo, useState } from 'react';

// Breakpoints: align with common defaults
// - mobile: < 768px
// - tablet: 768px - 1023px
// - desktop: >= 1024px
const MOBILE_MAX = 767;
const TABLET_MIN = 768;
const TABLET_MAX = 1023;
const DESKTOP_MIN = 1024;

const getSafeWindowWidth = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.innerWidth;
};

const useMediaQuery = () => {
  const [width, setWidth] = useState(getSafeWindowWidth());

  useEffect(() => {
    // Skip on server
    if (typeof window === 'undefined') return;

    let frameId = null;
    const handleResize = () => {
      // Use rAF to avoid flooding state updates during resize
      if (frameId != null) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        setWidth(window.innerWidth);
      });
    };

    // Initialize on mount to ensure accurate value after hydration
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      if (frameId != null) cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const { isMobile, isTablet, isDesktop, breakpoint } = useMemo(() => {
    const w = width ?? DESKTOP_MIN; // assume desktop width during SSR to avoid flashing mobile layout
    const mobile = w <= MOBILE_MAX;
    const tablet = w >= TABLET_MIN && w <= TABLET_MAX;
    const desktop = w >= DESKTOP_MIN;
    const bp = mobile ? 'mobile' : tablet ? 'tablet' : 'desktop';
    return { isMobile: mobile, isTablet: tablet, isDesktop: desktop, breakpoint: bp };
  }, [width]);

  return { isMobile, isTablet, isDesktop, breakpoint, width };
};

export default useMediaQuery;
