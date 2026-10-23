import { FaUserPlus, FaUsers, FaChartLine, FaArrowRight } from 'react-icons/fa';

const steps = [
  { number: '01', icon: FaUserPlus, title: 'Create an Account', desc: 'Sign up for free in seconds. No credit card required.' },
  { number: '02', icon: FaUsers, title: 'Create or Join a Group', desc: 'Start a new mess group or join an existing one with a unique group code.' },
  { number: '03', icon: FaChartLine, title: 'Track & Manage', desc: 'Log daily meals, record bazar costs, manage deposits, and download monthly reports.' },
];

const HowItWorks = () => (
  <section className="py-20 px-4 bg-base-100">
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-14">
        <span className="inline-block px-5 py-2 rounded-full bg-primary/15 text-neutral text-sm font-bold mb-4 uppercase tracking-wider">How It Works</span>
        <h2 className="text-3xl md:text-4xl font-black text-base-content mb-3">Get started in 3 simple steps</h2>
        <p className="text-base-content max-w-md mx-auto text-sm md:text-base">No complicated setup. Just sign up, join your group, and start managing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="flex flex-col md:flex-row items-start gap-4 md:gap-0">
              <div className="flex flex-col items-center md:items-start w-full">
                <div className="w-full rounded-3xl bg-base-200 border border-base-300 hover:border-primary/30 hover:shadow-xl transition-all duration-300 p-6 md:p-7 group">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-5 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="text-base-200 text-2xl" />
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl font-black text-primary/30">{step.number}</span>
                    <h3 className="text-base md:text-lg font-bold text-base-content">{step.title}</h3>
                  </div>
                  <p className="text-sm text-base-content leading-relaxed">{step.desc}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden md:flex items-center justify-center px-2 mt-10 shrink-0">
                  <FaArrowRight className="text-base-content/20 text-xl" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

export default HowItWorks;
