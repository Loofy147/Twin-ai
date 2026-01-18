import { useState, useEffect, useRef } from 'react';

export const useIntersectionObserver = (options: any = {}): [React.RefObject<any>, boolean] => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1, ...options });

    const el = elementRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [options.root, options.rootMargin, options.threshold]);

  return [elementRef, isVisible];
};
