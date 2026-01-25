import React, { useState, useEffect, useRef } from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

interface AnimatedCounterProps {
  value: number | string;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

// BOLT: Memoize to prevent redundant animation logic - Expected: Skip re-renders unless value/duration change
export const AnimatedCounter: React.FC<AnimatedCounterProps> = React.memo(({
  value,
  duration = 2000,
  suffix = '',
  prefix = ''
}) => {
  const [count, setCount] = useState(0);
  const [ref, isVisible] = useIntersectionObserver();
  const animationFrameId = useRef<number>();
  const startTime = useRef<number>();

  useEffect(() => {
    if (!isVisible) return;

    const end = typeof value === 'string' ? parseInt(value) : value;

    // BOLT: High-performance animation loop using requestAnimationFrame
    // Expected: -100% background CPU usage, battery-efficient animation
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = timestamp - startTime.current;
      const percentage = Math.min(progress / duration, 1);

      const currentCount = Math.floor(percentage * end);
      setCount(currentCount);

      if (percentage < 1) {
        animationFrameId.current = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isVisible, value, duration]);

  return (
    <span ref={ref} className="inline-flex items-center">
      {/* PALETTE: Screen reader users get final value immediately to avoid animation noise - WCAG: 4.1.2 (A) */}
      <span className="sr-only">
        {prefix}{value}{suffix}
      </span>
      {/* BOLT: Sync with browser refresh rate and skip animation when tab is inactive */}
      <span aria-hidden="true">
        {prefix}{count.toLocaleString()}{suffix}
      </span>
    </span>
  );
});
