import { useEffect, useRef, useState } from 'react';

/**
 * Lightweight IntersectionObserver hook.
 * @param {IntersectionObserverInit} options
 * @returns {{ ref: React.RefObject, inView: boolean }}
 */
export function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
      // Stop observing once visible if triggerOnce
      if (entry.isIntersecting && options.triggerOnce) {
        observer.unobserve(el);
      }
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, inView };
}
