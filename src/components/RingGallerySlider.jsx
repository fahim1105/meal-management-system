import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FaUtensils, FaChartLine, FaCalendarCheck, FaFileAlt, FaUsers, FaCog,
} from 'react-icons/fa';

const FEATURES = [
  {
    id: 1,
    title: 'Meal Tracking',
    description: 'Track breakfast, lunch, and dinner for every member. Log guest meals and get accurate meal counts instantly.',
    icon: FaUtensils,
  },
  {
    id: 2,
    title: 'Finance Management',
    description: 'Real-time meal rate, deposits, bazar costs, and each member’s balance — all in one place.',
    icon: FaChartLine,
  },
  {
    id: 3,
    title: 'Bazar Schedule',
    description: 'Assign bazar duty date ranges to members. Everyone stays informed about their responsibilities.',
    icon: FaCalendarCheck,
  },
  {
    id: 4,
    title: 'PDF Reports',
    description: 'Download detailed monthly financial reports with complete meal and cost breakdowns anytime.',
    icon: FaFileAlt,
  },
  {
    id: 5,
    title: 'Member Management',
    description: 'Add or remove members, manage permissions, and keep your group organized effortlessly.',
    icon: FaUsers,
  },
  {
    id: 6,
    title: 'Smart Configuration',
    description: 'Customize meal types, set group rules, and configure your mess management preferences.',
    icon: FaCog,
  },
];

const wrapOffset = (index, active, total) => {
  let diff = index - active;
  const half = Math.floor(total / 2);
  if (diff > half) diff -= total;
  if (diff < -half) diff += total;
  return diff;
};

const RingGallerySlider = ({ autoplay = true, interval = 3000 }) => {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = FEATURES.length;
  const dragRef = useRef({ startX: 0, startY: 0, dragging: false, moved: false });

  const next = useCallback(() => setActive((p) => (p + 1) % total), [total]);
  const prev = useCallback(() => setActive((p) => (p - 1 + total) % total), [total]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') return; // No modal to close
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Infinite scroll - always active unless paused
  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, interval);
    return () => clearInterval(t);
  }, [paused, interval, next]);

  const handleDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = { 
      startX: clientX, 
      startY: clientY, 
      dragging: true, 
      moved: false 
    };
  };

  const handleDragMove = (e) => {
    if (!dragRef.current.dragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const dx = Math.abs(clientX - dragRef.current.startX);
    if (dx > 5) {
      dragRef.current.moved = true;
    }
  };

  const handleDragEnd = (e) => {
    if (!dragRef.current.dragging) return;
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const dx = clientX - dragRef.current.startX;
    const wasMoved = dragRef.current.moved;
    
    dragRef.current = { startX: 0, startY: 0, dragging: false, moved: false };
    
    if (wasMoved) {
      if (dx > 50) prev();
      else if (dx < -50) next();
    }
  };

  return (
    <div
      className="relative w-full select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Features"
    >
      <div
        className="relative h-[420px] md:h-[480px] flex items-center justify-center overflow-visible cursor-grab active:cursor-grabbing"
        style={{ perspective: '1400px' }}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {FEATURES.map((feature, index) => {
          const offset = wrapOffset(index, active, total);
          const abs = Math.abs(offset);
          const Icon = feature.icon;
          const hidden = abs > 2;
          const rotate = offset * 18;
          const x = offset * 165;
          const y = abs * 28;
          const scale = 1 - abs * 0.12;
          const isCenter = offset === 0;

          return (
            <button
              type="button"
              key={feature.id}
              aria-hidden={hidden}
              tabIndex={isCenter ? 0 : -1}
              onClick={() => {
                if (!isCenter) setActive(index);
              }}
              className="absolute top-1/2 left-1/2 w-[210px] sm:w-[240px] md:w-[280px] h-[280px] md:h-[320px] rounded-2xl border-2 bg-base-200 text-left overflow-hidden shadow-xl transition-all duration-500 ease-out"
              style={{
                transform: `translate(-50%, -50%) translateX(${x}px) translateY(${y}px) rotate(${rotate}deg) scale(${scale})`,
                zIndex: 20 - abs,
                opacity: hidden ? 0 : isCenter ? 1 : 0.72,
                pointerEvents: hidden ? 'none' : 'auto',
                borderColor: isCenter ? 'var(--color-primary)' : 'color-mix(in srgb, var(--color-primary) 25%, transparent)',
              }}
            >
              <div className="h-full flex flex-col items-center justify-center p-7 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
                  <Icon className="text-2xl text-accent" />
                </div>
                <h3 className="text-xl md:text-2xl font-black text-base-content">{feature.title}</h3>
                {isCenter && (
                  <p className="text-sm text-base-content/80 leading-relaxed line-clamp-3">
                    {feature.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 mt-4">
        {FEATURES.map((f, i) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActive(i)}
            className={`h-2 rounded-full transition-all ${i === active ? 'w-8 bg-primary' : 'w-2 bg-primary/30'}`}
            aria-label={`Go to ${f.title}`}
            aria-current={i === active}
          />
        ))}
      </div>
    </div>
  );
};

export default RingGallerySlider;
