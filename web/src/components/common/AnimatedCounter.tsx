import React, { useState, useEffect } from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

interface AnimatedCounterProps {
  value: number | string;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 2000,
  suffix = '',
  prefix = ''
}) => {
  const [count, setCount] = useState(0);
  const [ref, isVisible] = useIntersectionObserver();

  useEffect(() => {
    if (!isVisible) return;
    let start = 0;
    const end = typeof value === 'string' ? parseInt(value) : value;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isVisible, value, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
};
