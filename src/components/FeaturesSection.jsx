import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import { FaUtensils, FaChartLine, FaUsers, FaCalendarCheck, FaMoneyBillWave, FaShieldAlt } from 'react-icons/fa';

const features = [
  {
    icon: FaUtensils,
    title: 'Meal Tracking',
    description: 'Track daily breakfast, lunch, and dinner for every member. Support for guest meals with automatic count.',
    gradient: 'from-blue-500 to-blue-700',
    glow: 'shadow-blue-500/40',
  },
  {
    icon: FaChartLine,
    title: 'Finance Management',
    description: 'Record deposits and bazar costs. Auto-calculate meal rates and each member\'s balance with visual charts.',
    gradient: 'from-purple-500 to-purple-700',
    glow: 'shadow-purple-500/40',
  },
  {
    icon: FaUsers,
    title: 'Group Management',
    description: 'Create or join a mess group with a unique code. Manager can activate/deactivate members and transfer roles.',
    gradient: 'from-emerald-500 to-green-700',
    glow: 'shadow-emerald-500/40',
  },
  {
    icon: FaCalendarCheck,
    title: 'Monthly Reports',
    description: 'Download detailed PDF reports for any month — financial summary, meal breakdown, and bazar history.',
    gradient: 'from-orange-500 to-orange-700',
    glow: 'shadow-orange-500/40',
  },
  {
    icon: FaMoneyBillWave,
    title: 'Deposit History',
    description: 'Full log of who deposited how much and when. Manager can add or delete entries with complete audit trail.',
    gradient: 'from-teal-500 to-teal-700',
    glow: 'shadow-teal-500/40',
  },
  {
    icon: FaShieldAlt,
    title: 'Role-Based Access',
    description: 'Managers get full control. Members get read-only view. Secure Firebase authentication for everyone.',
    gradient: 'from-rose-500 to-rose-700',
    glow: 'shadow-rose-500/40',
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-12 px-4 bg-gradient-to-b from-base-100 to-base-200">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="badge badge-primary badge-lg mb-4 px-5 py-3 text-sm font-semibold">Features</span>
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-4">
            Everything You Need
          </h2>
          <p className="text-base-content/60 text-lg max-w-xl mx-auto">
            A complete mess management system built for shared living — simple, fast, and organized.
          </p>
        </div>

        {/* Swiper Coverflow */}
        <div className="overflow-hidden">
        <Swiper
          effect="coverflow"
          grabCursor={true}
          centeredSlides={true}
          slidesPerView="auto"
          coverflowEffect={{
            rotate: 30,
            stretch: 0,
            depth: 120,
            modifier: 1.5,
            slideShadows: true,
          }}
          autoplay={{
            delay: 2500,
            disableOnInteraction: false,
          }}
          pagination={false}
          loop={true}
          modules={[EffectCoverflow, Autoplay]}
          className="pb-14"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <SwiperSlide
                key={feature.title}
                style={{ width: '300px' }}
              >
                <div className={`rounded-3xl bg-gradient-to-br ${feature.gradient} p-0.5 shadow-2xl ${feature.glow} h-full`}>
                  <div className="bg-base-100 rounded-3xl p-8 h-full flex flex-col gap-5">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg ${feature.glow}`}>
                      <Icon className="text-white text-3xl" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-base-content mb-2">{feature.title}</h3>
                      <p className="text-base-content/60 text-sm leading-relaxed">{feature.description}</p>
                    </div>
                    <div className={`mt-auto h-1 w-16 rounded-full bg-gradient-to-r ${feature.gradient}`}></div>
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
