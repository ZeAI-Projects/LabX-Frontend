import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './CipherScreen.css';

// Animate the heading surface, never its text or React-owned children.
// Keep the wrapper stationary so fixed navigation retains its viewport position.
export const CipherScreen = ({ children }) => {
  const root = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const container = root.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations = [];
    let observer;
    const stop = () => {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
    if (motion.matches) return;

    const reveal = () => {
      const headings = [...container.querySelectorAll('h1, h2')]
        .filter((node) => !node.closest('.labx-sidebar, button, a, [role="dialog"]'))
        .filter((node) => node.getBoundingClientRect().top < window.innerHeight)
        .slice(0, 3);
      if (!headings.length) return;
      observer?.disconnect();
      headings.forEach((node, index) => {
        animations.push(node.animate(
          [{ opacity: 0.35, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
          { duration: 420, delay: index * 45, easing: 'cubic-bezier(.22, 1, .36, 1)' }
        ));
      });
    };

    observer = new MutationObserver(reveal);
    observer.observe(container, { childList: true, subtree: true });
    reveal();
    motion.addEventListener('change', stop);
    return () => { stop(); motion.removeEventListener('change', stop); };
  }, [pathname]);

  return <div ref={root} className="cipher-screen-container">{children}</div>;
};
