'use client';

import { useEffect, useRef } from 'react';

/**
 * Adds `.revealed` class to children when they enter the viewport.
 * Use with CSS animations keyed on `.revealed`.
 *
 * @param staggerMs — delay between each child reveal (ms)
 */
export function useRevealOnScroll<T extends HTMLElement>(staggerMs = 120) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const children = Array.from(el.children) as HTMLElement[];
    children.forEach((child) => child.classList.add('reveal-item'));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const child = entry.target as HTMLElement;
          const idx = children.indexOf(child);
          const delay = idx * staggerMs;
          child.style.transitionDelay = `${delay}ms`;
          child.style.animationDelay = `${delay}ms`;
          child.classList.add('revealed');
          observer.unobserve(child);
        });
      },
      { threshold: 0.15 },
    );

    children.forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [staggerMs]);

  return ref;
}
