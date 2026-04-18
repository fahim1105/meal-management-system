import { Link } from 'react-router';
import { FaUserPlus, FaSignInAlt, FaArrowRight } from 'react-icons/fa';

const CTABanner = () => (
  <section className="py-20 px-4 bg-base-200">
    <div className="max-w-4xl mx-auto">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-blue-600 to-blue-700 shadow-2xl shadow-primary/30 p-1">
        {/* Inner card */}
        <div className="relative rounded-[22px] bg-gradient-to-br from-primary/90 to-blue-700 px-8 py-14 md:px-16 md:py-16 text-center overflow-hidden">
          {/* Decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/3 rounded-full pointer-events-none"></div>

          <div className="relative z-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/15 text-white/90 text-xs font-semibold uppercase tracking-widest mb-6 border border-white/20">
              Free to use · No credit card
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
              Ready to simplify your<br className="hidden md:block" /> mess management?
            </h2>
            <p className="text-white/70 mb-10 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              Join hundreds of groups already using Mess Manager to track meals, manage finances, and stay organized.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="btn btn-lg bg-white text-primary hover:bg-white/90 border-none shadow-xl shadow-black/20 gap-2 font-bold px-8 group"
              >
                <FaUserPlus />
                Create Free Account
                <FaArrowRight className="text-xs group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="btn btn-lg border-2 border-white/30 text-[#2563eb] bg-base-200 hover:text-xl hover:border-white/60 gap-2 px-8 backdrop-blur-sm"
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
