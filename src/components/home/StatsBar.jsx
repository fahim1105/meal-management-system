import CountUp from 'react-countup';
import { useInView } from '../../hooks/useInView';

const STATS = [
  { value: 500,   suffix: '+', label: 'Groups created' },
  { value: 2000,  suffix: '+', label: 'Active members' },
  { value: 50000, suffix: '+', label: 'Meals tracked' },
  { value: 1000,  suffix: '+', label: 'Reports downloaded' },
];

const StatsBar = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.3 });

  return (
    <section
      ref={ref}
      className="py-14 px-5"
      style={{ background: 'var(--color-primary)', fontFamily: 'var(--font-body)' }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {STATS.map(({ value, suffix, label }) => (
            <div key={label} className="flex flex-col items-center text-center gap-1.5">
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 'clamp(28px,5vw,44px)',
                lineHeight: 1,
                color: 'var(--on-primary)',
              }}>
                {inView
                  ? <CountUp end={value} duration={2.5} separator="," suffix={suffix} />
                  : `0${suffix}`}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: 14, fontWeight: 500 }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
