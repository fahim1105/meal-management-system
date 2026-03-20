import { FaUtensils, FaChartLine, FaUsers, FaCalendarCheck, FaMoneyBillWave, FaShieldAlt } from 'react-icons/fa';

const features = [
  {
    icon: FaUtensils,
    title: 'Meal Tracking',
    description: 'Track daily breakfast, lunch, and dinner for every member. Support for guest meals with automatic count.',
    color: 'from-blue-500 to-blue-600',
    border: 'border-blue-500/30',
    iconBg: 'bg-blue-500/10',
    titleColor: 'text-blue-500',
  },
  {
    icon: FaChartLine,
    title: 'Finance Management',
    description: 'Record deposits and bazar costs. Auto-calculate meal rates and each member\'s balance with visual charts.',
    color: 'from-purple-500 to-purple-600',
    border: 'border-purple-500/30',
    iconBg: 'bg-purple-500/10',
    titleColor: 'text-purple-500',
  },
  {
    icon: FaUsers,
    title: 'Group Management',
    description: 'Create or join a mess group with a unique code. Manager can activate/deactivate members and transfer roles.',
    color: 'from-green-500 to-green-600',
    border: 'border-green-500/30',
    iconBg: 'bg-green-500/10',
    titleColor: 'text-green-500',
  },
  {
    icon: FaCalendarCheck,
    title: 'Monthly Reports',
    description: 'Download detailed PDF reports for any month — financial summary, meal breakdown, and bazar history.',
    color: 'from-orange-500 to-orange-600',
    border: 'border-orange-500/30',
    iconBg: 'bg-orange-500/10',
    titleColor: 'text-orange-500',
  },
  {
    icon: FaMoneyBillWave,
    title: 'Deposit History',
    description: 'Full log of who deposited how much and when. Manager can add or delete entries with complete audit trail.',
    color: 'from-emerald-500 to-emerald-600',
    border: 'border-emerald-500/30',
    iconBg: 'bg-emerald-500/10',
    titleColor: 'text-emerald-500',
  },
  {
    icon: FaShieldAlt,
    title: 'Role-Based Access',
    description: 'Managers get full control. Members get read-only view. Secure Firebase authentication for everyone.',
    color: 'from-rose-500 to-rose-600',
    border: 'border-rose-500/30',
    iconBg: 'bg-rose-500/10',
    titleColor: 'text-rose-500',
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-20 px-4 bg-base-200">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-4">
            Everything You Need
          </h2>
          <p className="text-base-content/60 text-lg max-w-xl mx-auto">
            A complete mess management system built for shared living — simple, fast, and organized.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={`card bg-base-100 shadow-lg hover:shadow-xl border-2 ${feature.border} hover:border-primary/40 transition-all duration-300 hover:-translate-y-1`}
              >
                <div className="card-body p-6">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} mb-4 shadow-md`}>
                    <Icon className="text-white text-2xl" />
                  </div>
                  <h3 className={`text-xl font-bold ${feature.titleColor} mb-2`}>
                    {feature.title}
                  </h3>
                  <p className="text-base-content/60 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
