import { useTheme } from '../context/ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';

const DURATION = 600;
const EASING = 'cubic-bezier(0.76, 0, 0.24, 1)';

// Suppress CSS transitions during view transition to prevent color flash
const withNoTransitions = (fn) => {
  document.documentElement.classList.add('theme-switching');
  const result = fn();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('theme-switching');
    });
  });
  return result;
};

// Fallback ripple for browsers without startViewTransition (e.g. mobile Safari/Firefox)
const rippleFallback = (x, y, isDark, toggleTheme) => {
  const ripple = document.createElement('div');
  const maxRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  Object.assign(ripple.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '99999',
    background: isDark ? '#ffffff' : '#0f172a',
    borderRadius: '50%',
    transform: `translate(${x - window.innerWidth / 2}px, ${y - window.innerHeight / 2}px) scale(0)`,
    transformOrigin: 'center center',
    clipPath: `circle(0px at ${x}px ${y}px)`,
  });

  document.body.appendChild(ripple);

  // Expand ripple
  ripple.animate(
    [
      { clipPath: `circle(0px at ${x}px ${y}px)` },
      { clipPath: `circle(${maxRadius}px at ${x}px ${y}px)` },
    ],
    { duration: DURATION / 2, easing: EASING, fill: 'forwards' }
  ).finished.then(() => {
    // Flip theme while ripple is fully covering screen
    withNoTransitions(() => toggleTheme());

    // Shrink ripple away
    ripple.animate(
      [
        { clipPath: `circle(${maxRadius}px at ${x}px ${y}px)` },
        { clipPath: `circle(0px at ${x}px ${y}px)` },
      ],
      { duration: DURATION / 2, easing: EASING, fill: 'forwards' }
    ).finished.then(() => {
      ripple.remove();
    });
  });
};

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleToggle = (e) => {
    const x = e.clientX;
    const y = e.clientY;
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Fallback for mobile / browsers without View Transition API
    if (!document.startViewTransition) {
      rippleFallback(x, y, isDark, toggleTheme);
      return;
    }

    const root = document.documentElement;

    if (isDark) {
      // dark → light: dark layer shrinks away via CSS keyframe
      root.style.setProperty('--vt-clip-from', `circle(${maxRadius}px at ${x}px ${y}px)`);
      root.style.setProperty('--vt-clip-to',   `circle(0px at ${x}px ${y}px)`);
      root.setAttribute('data-transitioning', 'dark-to-light');

      const t = document.startViewTransition(() => withNoTransitions(() => toggleTheme()));
      t.finished.finally(() => {
        root.removeAttribute('data-transitioning');
        root.style.removeProperty('--vt-clip-from');
        root.style.removeProperty('--vt-clip-to');
      });
    } else {
      // light → dark: dark layer expands from click point
      const t = document.startViewTransition(() => withNoTransitions(() => toggleTheme()));
      t.ready.then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`] },
          { duration: DURATION, easing: EASING, pseudoElement: '::view-transition-new(root)' }
        );
      });
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="btn btn-ghost btn-circle hover:bg-white/20"
      aria-label="Toggle theme"
      style={{ transition: 'transform 0.2s ease' }}
    >
      <span
        key={isDark ? 'moon' : 'sun'}
        style={{ display: 'inline-flex', animation: 'icon-spin-in 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
      >
        {isDark
          ? <FaMoon className="text-[#D1EDD3] text-xl" />
          : <FaSun  className="text-[#ACC5A6] text-xl" />
        }
      </span>
    </button>
  );
};

export default ThemeToggle;
