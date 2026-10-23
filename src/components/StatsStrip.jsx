import { FaHome, FaUsers, FaUtensils, FaFileAlt } from 'react-icons/fa';
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';

const stats = [
  { icon: FaHome, value: 500, suffix: '+', label: 'Groups Created' },
  { icon: FaUsers, value: 2000, suffix: '+', label: 'Active Members' },
  { icon: FaUtensils, value: 50000, suffix: '+', label: 'Meals Tracked' },
  { icon: FaFileAlt, value: 1000, suffix: '+', label: 'Reports Downloaded' },
];

const StatsStrip = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.3 });

  return (
    <section ref={ref} className="py-16 px-4 relative overflow-hidden bg-base-100">
      {/* Background decoration - removed for clean design */}

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <p className="text-base-content/70 text-sm font-medium uppercase tracking-widest">Trusted by mess groups everywhere</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map(({ icon: Icon, value, suffix, label }) => (
            <div key={label} className="flex flex-col items-center text-center gap-3 group">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20 group-hover:bg-primary/30 transition-all duration-300 shadow-lg">
                <Icon className="text-primary text-xl" />
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-black text-base-content leading-none">
                  {inView ? <CountUp end={value} duration={2.5} separator="," suffix={suffix} /> : '0'}
                </div>
                <div className="text-base-content/70 text-xs md:text-sm font-medium mt-1">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsStrip;
