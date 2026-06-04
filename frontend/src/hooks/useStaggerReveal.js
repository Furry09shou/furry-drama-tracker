import { useEffect, useRef, useState } from 'react';

const useStaggerReveal = (itemCount, options = {}) => {
  const { threshold = 0.1, rootMargin = '0px', staggerDelay = 60, once = true } = options;
  const containerRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          for (let i = 0; i < itemCount; i++) {
            setTimeout(() => setVisibleCount(i + 1), i * staggerDelay);
          }
          if (once) observer.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [itemCount, threshold, rootMargin, staggerDelay, once]);

  return [containerRef, visibleCount];
};

export default useStaggerReveal;
