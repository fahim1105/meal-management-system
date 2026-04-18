import { Link } from 'react-router';
import { FaSignInAlt, FaUserPlus, FaTachometerAlt, FaUsers, FaCheckCircle, FaUtensils, FaChartLine, FaCalendarCheck, FaFileDownload, FaArrowRight } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import FeaturesSection from '../components/FeaturesSection';
import HowItWorks from '../components/HowItWorks';
import StatsStrip from '../components/StatsStrip';
import CTABanner from '../components/CTABanner';
import HomeDashboard from '../components/HomeDashboard';

const Home = () => {
  const { currentUser, userData, userDataLoading } = useAuth();

  // Logged-in + has group → show HomeDashboard directly
  if (currentUser && !userDataLoading && userData?.groupId) {
    return <HomeDashboard />;
  }

  return (
    <>
      {/* Hero Section */}
      <div className="hero min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary/10 to-blue-600/10">
        <div className="hero-content text-center max-w-5xl">
          <div>
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-6">
              Mess Manager
            </h1>

            {currentUser ? (
              <>
                <p className="text-2xl md:text-3xl font-semibold text-base-content mb-4">
                  Welcome, {userData?.name}!
                </p>
                {userDataLoading ? (
                  <div className="flex flex-col items-center gap-3 mb-8">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <p className="text-base-content/70 text-sm">Loading your group info...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-lg text-base-content/80 mb-8 max-w-2xl mx-auto">
                      You're almost there! Just one more step to get started.
                    </p>
                    <Link to="/group-setup" className="btn btn-primary btn-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all mb-12">
                      <FaUsers className="mr-2" />
                      Create or Join Group
                    </Link>
                  </>
                )}
              </>
            ) : (
              <>
                <p className="text-2xl md:text-3xl font-semibold text-base-content mb-4">
                  Simplify Your Mess Management
                </p>
                <p className="text-lg text-base-content/80 mb-8 max-w-2xl mx-auto">
                  Track meals, manage expenses, and organize your mess with our powerful and easy-to-use platform
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/register" className="btn btn-primary btn-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all">
                    <FaUserPlus className="mr-2" />
                    Create Account
                  </Link>
                  <Link to="/login" className="btn btn-outline btn-primary btn-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
                    <FaSignInAlt className="mr-2" />
                    Sign In
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Features Section — only for non-logged-in users */}
      {!currentUser && <FeaturesSection />}
      {!currentUser && <HowItWorks />}
      {!currentUser && <StatsStrip />}
      {!currentUser && <CTABanner />}

      {/* Step Guide + What's Next — only for logged-in users without a group */}
      {currentUser && !userDataLoading && !userData?.groupId && (
        <div className="max-w-5xl mx-auto px-4 pb-20 space-y-16">

          {/* Step Guide */}
          <div>
            <div className="text-center mb-10">
              <span className="badge badge-primary badge-lg mb-3">Getting Started</span>
              <h2 className="text-3xl font-bold text-base-content">You're almost there!</h2>
              <p className="text-base-content/60 mt-2">Complete these steps to unlock your mess management dashboard</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
              {/* Connector line — desktop only */}
              <div className="hidden sm:block absolute top-10 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-success via-primary to-base-300 z-0"></div>

              {/* Step 1 — Done */}
              <div className="card bg-base-100 shadow-xl border-2 border-success/50 hover:shadow-2xl transition-all hover:-translate-y-1 relative z-10">
                <div className="card-body items-center text-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center shadow-inner">
                    <FaCheckCircle className="text-3xl text-success" />
                  </div>
                  <div className="badge badge-success gap-1 font-semibold">✓ Completed</div>
                  <h3 className="font-bold text-base-content text-lg">Create Account</h3>
                  <p className="text-sm text-base-content/60 leading-relaxed">You've successfully registered and logged in to Mess Manager.</p>
                </div>
              </div>

              {/* Step 2 — Active */}
              <div className="card shadow-2xl border-2 border-primary bg-gradient-to-b from-primary/5 to-base-100 hover:-translate-y-2 transition-all relative z-10">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="badge badge-primary shadow-lg shadow-primary/30 font-bold px-4">Next Step</span>
                </div>
                <div className="card-body items-center text-center gap-3 pt-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shadow-inner">
                    <FaUsers className="text-3xl text-primary" />
                  </div>
                  <h3 className="font-bold text-base-content text-lg">Create or Join Group</h3>
                  <p className="text-sm text-base-content/60 leading-relaxed">Create a new mess group or join an existing one using a group code.</p>
                  <Link to="/group-setup" className="btn btn-primary w-full gap-2 shadow-lg shadow-primary/30 mt-1">
                    Get Started <FaArrowRight />
                  </Link>
                </div>
              </div>

              {/* Step 3 — Upcoming */}
              <div className="card bg-base-100 shadow-xl border-2 border-base-300 opacity-50 relative z-10">
                <div className="card-body items-center text-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-base-200 flex items-center justify-center">
                    <FaTachometerAlt className="text-3xl text-base-content/30" />
                  </div>
                  <div className="badge badge-ghost font-semibold">Upcoming</div>
                  <h3 className="font-bold text-base-content text-lg">Start Tracking</h3>
                  <p className="text-sm text-base-content/60 leading-relaxed">Track meals, manage finances, and schedule bazar duties with your group.</p>
                </div>
              </div>
            </div>
          </div>

          {/* What's Next */}
          <div>
            <div className="text-center mb-10">
              <span className="badge badge-outline badge-lg mb-3">Preview</span>
              <h2 className="text-3xl font-bold text-base-content">What you'll unlock</h2>
              <p className="text-base-content/60 mt-2">Everything you need to manage your mess in one place</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { icon: FaUtensils, gradient: 'from-blue-500 to-blue-600', light: 'bg-blue-500/10', title: 'Meal Tracking', desc: 'Log breakfast, lunch & dinner for every member including guest meals.' },
                { icon: FaChartLine, gradient: 'from-emerald-500 to-green-600', light: 'bg-emerald-500/10', title: 'Finance Summary', desc: 'Real-time meal rate, deposits, costs and balance for each member.' },
                { icon: FaCalendarCheck, gradient: 'from-teal-500 to-teal-600', light: 'bg-teal-500/10', title: 'Bazar Schedule', desc: 'Assign bazar duty date ranges to members — everyone stays informed.' },
                { icon: FaFileDownload, gradient: 'from-purple-500 to-purple-600', light: 'bg-purple-500/10', title: 'PDF Reports', desc: 'Download monthly financial reports with full breakdown anytime.' },
              ].map(({ icon: Icon, gradient, light, title, desc }) => (
                <div key={title} className="card bg-base-100 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-base-300/50">
                  <div className="card-body p-6 gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="text-xl text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base-content">{title}</h3>
                      <p className="text-sm text-base-content/60 mt-1 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </>
  );
};

export default Home;
