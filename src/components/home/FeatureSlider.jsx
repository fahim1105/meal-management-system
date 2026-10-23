import { useState, useEffect, useRef, useCallback } from 'react';
import { FaShieldAlt, FaUtensils, FaChartLine, FaUsers } from 'react-icons/fa';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const FEATURES = [
  {
    id: 1,
    icon: FaShieldAlt,
    title: 'Role-Based Access',
    text: 'Managers get full control. Members get read-only view. Secure Firebase authentication for everyone.',
    accent: 'var(--color-icon)',
    bg: 'var(--color-primary)',
  },
  {
    id: 2,
    icon: FaUtensils,
    title: 'Meal Tracking',
    text: 'Track daily breakfast, lunch and dinner for every member. Support for guest meals with automatic count.',
    accent: 'var(--color-icon)',
    bg: 'var(--color-primary)',
  },
  {
    id: 3,
    icon: FaChartLine,
    title: 'Finance Management',
    text: 'Record deposits and bazar costs. Auto-calculate meal rates and each member\'s balance with visual charts.',
    accent: 'var(--color-icon)',
    bg: 'var(--color-primary)',
  },
  {
    id: 4,
    icon: FaUsers,
    title: 'Group Management',
    text: 'Create or join a mess group with a unique code. Manager can activate/deactivate members and transfer roles.',
    accent: 'var(--color-icon)',
    bg: 'var(--color-primary)',
  },
];

const FeatureSlider = () => {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef(null);
  const reduced = useReducedMotion();
  const total = FEATURES.length;

  const next = useCallback(() => setActive(p => (p + 1) % total), [total]);
  const prev = useCallback(() => setActive(p => (p - 1 + total) % total), [total]);

  // Autoplay
  useEffect(() => {
    if (reduced || hovered) return;
    timerRef.current = setInterval(next, 5000);
    return () => clearInterval(timerRef.current);
  }, [next, hovered, reduced]);

  // Keyboard
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft')  prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev]);

  return (
    <section
      className="py-20 px-5"
      style={{ background: 'var(--bg)', fontFamily: 'var(--font-body)' }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-14">
          <h2 className="mb-3" style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 800,
            letterSpacing: '-0.015em',
            lineHeight: 1.1,
            color: 'var(--text)',
          }}>
            Everything a shared mess needs
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 16, maxWidth: '46ch', margin: '0 auto' }}>
            Simple, fast and organized for people who live and eat together.
          </p>
        </div>

        {/* ── Desktop: 3-D coverflow ── */}
        <div
          className="hidden md:flex items-center justify-center gap-0 relative"
          role="region"
          aria-roledescription="carousel"
          aria-label="Features"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{ perspective: '1200px', minHeight: 320 }}
        >
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const offset = i - active;
            const wrapped = ((offset % total) + total) % total;
            const pos = wrapped <= total / 2 ? wrapped : wrapped - total; // −1, 0, 1, 2 …

            const isActive = pos === 0;
            const isLeft   = pos === -1;
            const isRight  = pos === 1;
            const isHidden = Math.abs(pos) > 1;

            const transform = isActive
              ? 'rotateY(0deg) scale(1) translateZ(0)'
              : isLeft
              ? 'rotateY(20deg) scale(0.88) translateX(-60px) translateZ(-80px)'
              : isRight
              ? 'rotateY(-20deg) scale(0.88) translateX(60px) translateZ(-80px)'
              : 'scale(0.75) translateZ(-160px)';

            return (
              <div
                key={f.id}
                aria-hidden={!isActive}
                onClick={() => !isActive && setActive(i)}
                className="absolute transition-all duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: reduced ? `scale(${isActive ? 1 : 0.88})` : transform,
                  opacity: isHidden ? 0 : isActive ? 1 : 0.55,
                  zIndex: isActive ? 10 : isLeft || isRight ? 5 : 0,
                  pointerEvents: isHidden ? 'none' : 'auto',
                  cursor: isActive ? 'default' : 'pointer',
                  width: 300,
                }}
              >
                <div
                  className="rounded-[18px] p-7 flex flex-col gap-4"
                  style={{
                    background: 'var(--surface)',
                    border: isActive ? `2px solid var(--color-primary)` : `1.5px solid var(--line)`,
                    boxShadow: isActive ? '0 12px 40px rgba(92,112,87,0.18)' : '0 2px 12px rgba(0,0,0,0.06)',
                  }}
                >
                  {/* Icon tile */}
                  <div
                    className="w-12 h-12 flex items-center justify-center rounded-[var(--radius-md)]"
                    style={{ background: f.bg, border: `1.5px solid var(--color-accent-1)` }}
                  >
                    <Icon style={{ color: f.accent, fontSize: 20 }} />
                  </div>
                  <h3 style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    fontSize: 20,
                    color: 'var(--text)',
                    margin: 0,
                  }}>{f.title}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
                    {f.text}
                  </p>
                  {/* bottom accent bar */}
                  <div className="h-1 w-12 rounded-full mt-auto"
                    style={{ background: f.accent }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop nav arrows */}
        <div className="hidden md:flex items-center justify-center gap-4 mt-56">
          <button
            onClick={prev}
            className="hg-focus w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-150"
            style={{ border: '1.5px solid var(--line)', color: 'var(--muted)', background: 'var(--surface)' }}
            aria-label="Previous feature"
          >‹</button>
          {FEATURES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="hg-focus rounded-full transition-all duration-200"
              style={{
                width: i === active ? 24 : 8,
                height: 8,
                background: i === active ? 'var(--color-primary)' : 'var(--color-accent-1)',
              }}
              aria-label={`Go to feature ${i + 1}`}
            />
          ))}
          <button
            onClick={next}
            className="hg-focus w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-150"
            style={{ border: '1.5px solid var(--line)', color: 'var(--muted)', background: 'var(--surface)' }}
            aria-label="Next feature"
          >›</button>
        </div>

        {/* ── Mobile: scroll-snap ── */}
        <div
          className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 px-1 scroll-smooth"
          style={{ scrollbarWidth: 'none' }}
          role="region"
          aria-roledescription="carousel"
          aria-label="Features"
        >
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.id}
                className="snap-center shrink-0 rounded-[18px] p-6 flex flex-col gap-4"
                style={{
                  width: 'calc(88vw)',
                  background: 'var(--surface)',
                  border: '1.5px solid var(--color-accent-1)',
                  boxShadow: '0 2px 16px rgba(92,112,87,0.10)',
                }}
              >
                <div
                  className="w-12 h-12 flex items-center justify-center rounded-[var(--radius-md)]"
                  style={{ background: f.bg }}
                >
                  <Icon style={{ color: f.accent, fontSize: 20 }} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 19, color: 'var(--text)' }}>
                  {f.title}
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.65 }}>{f.text}</p>
                <div className="h-1 w-12 rounded-full mt-auto" style={{ background: f.accent }} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeatureSlider;
