import { Link } from 'react-router';
import { FaSignInAlt, FaUserPlus, FaTachometerAlt, FaUsers, FaCheckCircle, FaUtensils, FaChartLine, FaCalendarCheck, FaFileDownload, FaArrowRight } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { queryKeys, fetchGroup } from '../lib/queries';
import FeaturesSection from '../components/FeaturesSection';
import HowItWorks from '../components/HowItWorks';
import StatsStrip from '../components/StatsStrip';
import CTABanner from '../components/CTABanner';
import HomeDashboard from '../components/HomeDashboard';
import ChatSidebar from '../components/Chat/ChatSidebar';
import LottieFoodAnimation from '../components/LottieFoodAnimation';

const Home = () => {
  const { currentUser, userData, userDataLoading, getAuthHeaders } = useAuth();

  // Fetch group data to check if user is manager
  const { data: group } = useQuery({
    queryKey: queryKeys.group(),
    queryFn: () => fetchGroup(getAuthHeaders),
    enabled: !!userData?.groupId,
    refetchInterval: 1000 * 10, // Auto-refresh every 10 seconds
  });

  // Check if current user is the manager
  const isManager = group?.managerId === userData?.uid;

  // Logged-in + has group → show HomeDashboard directly
  if (currentUser && !userDataLoading && userData?.groupId) {
    return (
      <>
        <HomeDashboard />
        {/* Desktop Chat Sidebar - only on Home page */}
        <div className="hidden lg:block">
          <ChatSidebar
            groupId={userData.groupId}
            isManager={isManager}
            groupMembers={group?.members || []}
          />
        </div>
      </>
    );
  }

  return (
    <>
      {/* Hero — STATIC colors (logged-out). Nav/dock stay the same. */}
      <div className="relative min-h-[calc(100vh-4rem)] bg-[#3B4F3D] overflow-hidden">
        <div className="relative z-10 container mx-auto px-4 py-12 lg:py-0 lg:min-h-[calc(100vh-4rem)] lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
          <div className="max-w-2xl lg:max-w-none text-left py-8 lg:py-16">
            {currentUser ? (
              <>
                <div className="mb-6">
                  <span className="inline-block px-4 py-2 bg-[#A1BC98] text-[#2d5016] rounded-full text-sm font-semibold mb-4">
                    Welcome back! 
                  </span>
                </div>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-[#FFF5E8] mb-6">
                  Hey, <span className="text-[#778873]">{userData?.name}</span>!
                </h1>
                {userDataLoading ? (
                  <div className="flex flex-col items-start gap-3 mb-8">
                    <span className="loading loading-spinner loading-lg text-[#778873]"></span>
                    <p className="text-[#292720]/80">Loading your group info...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xl md:text-2xl text-[#A1BC98] mb-10 max-w-2xl leading-relaxed">
                      You're almost there! Just one more step to get started.
                    </p>
                    <Link
                      to="/group-setup"
                      className="inline-flex items-center gap-2 px-8 py-4 bg-[#778873] hover:bg-[#6a7866] text-[#FFFFFF] rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                    >
                      <FaUsers />
                      Create or Join Group
                      <FaArrowRight className="ml-1 text-sm" />
                    </Link>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="mb-6">
                  <span className="inline-block px-4 py-2 bg-[#A1BC98] text-[#2d5016] rounded-full text-sm font-bold">
                    Free to use · No credit card needed
                  </span>
                </div>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-[#FFF5E8] mb-6 leading-tight">
                  Every meal counted.<br />
                  Every taka <span className="text-[#A1BC98]">accounted for</span>.
                </h1>
                <p className="text-xl md:text-2xl text-[#FFF5E8] mb-10 max-w-2xl lg:max-w-xl leading-relaxed">
                  Track daily meals, record bazar costs and see each member's balance, all in one shared mess.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-[#778873] hover:bg-[#6a7866] text-[#FFFFFF] rounded-full text-lg font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                  >
                    <FaUserPlus />
                    Create account
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 px-8 py-4 text-[#FFF5E8] text-lg hover:font-bold  transition-all duration-200"
                  >
                    <FaSignInAlt />
                    Sign in
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Desktop Lottie — adjusted for proper proportions */}
          <div className="hidden lg:flex items-center justify-center w-full">
            <div className="w-full max-w-[450px] h-[380px]">
              <LottieFoodAnimation />
            </div>
          </div>
        </div>

        {/* Mobile Lottie */}
        <div className="lg:hidden w-full max-w-[400px] mx-auto h-[350px] px-4 pb-8">
          <LottieFoodAnimation />
        </div>
      </div>

      {/* Features Section — only for non-logged-in users */}
      {!currentUser && <FeaturesSection />}
      {!currentUser && <HowItWorks />}
      {!currentUser && <StatsStrip />}
      {!currentUser && <CTABanner />}

      {/* Step Guide + What's Next — only for logged-in users without a group */}
      {currentUser && !userDataLoading && !userData?.groupId && (
        <div className="bg-base-100 py-20">
          <div className="max-w-5xl mx-auto px-4 space-y-16">

            {/* Step Guide */}
            <div>
              <div className="text-center mb-10">
                <span className="inline-block px-5 py-2 bg-primary/15 text-primary dark:text-neutral rounded-full text-sm font-bold mb-3 uppercase tracking-wider">Getting Started</span>
                <h2 className="text-3xl font-bold text-base-content">You're almost there!</h2>
                <p className="text-base-content/70 mt-2">Complete these steps to unlock your mess management dashboard</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
                {/* Connector line — desktop only */}
                <div className="hidden sm:block absolute top-10 left-1/3 right-1/3 h-0.5 bg-primary z-0"></div>

                {/* Step 1 — Done */}
                <div className="card bg-base-200 shadow-xl border-2 border-success/50 hover:shadow-2xl transition-all hover:-translate-y-1 relative z-10">
                  <div className="card-body items-center text-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-success/20 flex items-center justify-center shadow-inner">
                      <FaCheckCircle className="text-3xl text-success" />
                    </div>
                    <div className="badge badge-success gap-1 font-semibold">✓ Completed</div>
                    <h3 className="font-bold text-base-content text-lg">Create Account</h3>
                    <p className="text-sm text-base-content/70 leading-relaxed">You've successfully registered and logged in to Mess Manager.</p>
                  </div>
                </div>

                {/* Step 2 — Active */}
                <div className="card shadow-2xl border-2 border-primary bg-primary/5 hover:-translate-y-2 transition-all relative z-10">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="badge bg-primary text-white border-primary shadow-lg font-bold px-4">Next Step</span>
                  </div>
                  <div className="card-body items-center text-center gap-3 pt-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/25 flex items-center justify-center shadow-inner">
                      <FaUsers className="text-3xl text-primary" />
                    </div>
                    <h3 className="font-bold text-base-content text-lg">Create or Join Group</h3>
                    <p className="text-sm text-base-content/70 leading-relaxed">Create a new mess group or join an existing one using a group code.</p>
                    <Link to="/group-setup" className="btn bg-primary hover:bg-primary/90 text-white border-primary w-full gap-2 shadow-lg mt-1">
                      Get Started <FaArrowRight />
                    </Link>
                  </div>
                </div>

                {/* Step 3 — Upcoming */}
                <div className="card bg-base-200 shadow-xl border-2 border-base-300/50 opacity-50 relative z-10">
                  <div className="card-body items-center text-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-base-300/20 flex items-center justify-center">
                      <FaTachometerAlt className="text-3xl text-base-content/30" />
                    </div>
                    <div className="badge badge-ghost font-semibold">Upcoming</div>
                    <h3 className="font-bold text-base-content text-lg">Start Tracking</h3>
                    <p className="text-sm text-base-content/70 leading-relaxed">Track meals, manage finances, and schedule bazar duties with your group.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div>
              <div className="text-center mb-10">
                <span className="inline-block px-5 py-2 border-2 border-primary/30 text-primary dark:text-neutral rounded-full text-sm font-bold mb-3 uppercase tracking-wider">Preview</span>
                <h2 className="text-3xl font-bold text-base-content">What you'll unlock</h2>
                <p className="text-base-content/70 mt-2">Everything you need to manage your mess in one place</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { icon: FaUtensils, title: 'Meal Tracking', desc: 'Log breakfast, lunch & dinner for every member including guest meals.' },
                  { icon: FaChartLine, title: 'Finance Summary', desc: 'Real-time meal rate, deposits, costs and balance for each member.' },
                  { icon: FaCalendarCheck, title: 'Bazar Schedule', desc: 'Assign bazar duty date ranges to members — everyone stays informed.' },
                  { icon: FaFileDownload, title: 'PDF Reports', desc: 'Download monthly financial reports with full breakdown anytime.' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="card bg-base-200 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-base-300/50">
                    <div className="card-body p-6 gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary">
                        <Icon className="text-xl text-base-200" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base-content">{title}</h3>
                        <p className="text-sm text-base-content/70 mt-1 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default Home;
