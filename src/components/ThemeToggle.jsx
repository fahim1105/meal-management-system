import { useTheme } from '../context/ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';

const DURATION = 600;
const EASING = 'cubic-bezier(0.76, 0, 0.24, 1)';

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

    if (!document.startViewTransition) {
      toggleTheme();
      return;
    }

    const root = document.documentElement;

    if (isDark) {
      // dark → light: dark layer shrinks away via CSS keyframe
      root.style.setProperty('--vt-clip-from', `circle(${maxRadius}px at ${x}px ${y}px)`);
      root.style.setProperty('--vt-clip-to',   `circle(0px at ${x}px ${y}px)`);
      root.setAttribute('data-transitioning', 'dark-to-light');

      const t = document.startViewTransition(() => toggleTheme());
      t.finished.finally(() => {
        root.removeAttribute('data-transitioning');
        root.style.removeProperty('--vt-clip-from');
        root.style.removeProperty('--vt-clip-to');
      });
    } else {
      // light → dark: dark layer expands from click point
      const t = document.startViewTransition(() => toggleTheme());
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
          ? <FaMoon className="text-yellow-300 text-xl" />
          : <FaSun  className="text-white text-xl opacity-90" />
        }
      </span>
    </button>
  );
};

export default ThemeToggle;
