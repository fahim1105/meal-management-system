import { Link } from 'react-router';
import { FaUserPlus, FaSignInAlt, FaArrowRight } from 'react-icons/fa';

const CTABanner = () => (
  <section className="py-20 px-4 bg-base-100">
    <div className="max-w-4xl mx-auto">
      <div className="relative rounded-3xl overflow-hidden bg-primary shadow-2xl p-1">
        <div className="relative rounded-[22px] bg-primary px-8 py-14 md:px-16 md:py-16 text-center overflow-hidden">
          <div className="relative z-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-base-200/20 text-base-200 dark:text-neutral text-xs font-bold uppercase tracking-widest mb-6 border border-base-200/30">
              Free to use · No credit card
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-base-200 dark:text-neutral mb-4 leading-tight">
              Ready to simplify your<br className="hidden md:block" /> mess management?
            </h2>
            <p className="text-base-200/90 dark:text-neutral/90 mb-10 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              Join hundreds of groups already using Mess Manager to track meals, manage finances, and stay organized.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-base-200 hover:bg-base-100 text-primary rounded-full text-lg font-bold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200 group"
              >
                <FaUserPlus />
                Create Free Account
                <FaArrowRight className="text-xs group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-base-200 dark:text-neutral border-2 border-base-200 dark:border-neutral hover:bg-base-200/10 rounded-full text-lg font-bold hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
              >
                <FaSignInAlt /> Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default CTABanner;
