import { Link } from 'react-router';
import { FaSignInAlt, FaUserPlus, FaTachometerAlt, FaUsers } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import FeaturesSection from '../components/FeaturesSection';
import LottieLoader from '../components/LottieLoader';

const Home = () => {
  const { currentUser, userData, userDataLoading } = useAuth();

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
                ) : userData?.groupId ? (
                  <>
                    <p className="text-lg text-base-content/80 mb-8 max-w-2xl mx-auto">
                      Your mess management system is ready. Track meals, manage expenses, and organize your group effortlessly.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link to="/dashboard" className="btn btn-primary btn-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all">
                        <FaTachometerAlt className="mr-2" />
                        Go to Dashboard
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-lg text-base-content/80 mb-8 max-w-2xl mx-auto">
                      Create a new group or join an existing one to start managing your mess
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link to="/group-setup" className="btn btn-primary btn-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all">
                        <FaUsers className="mr-2" />
                        Create or Join Group
                      </Link>
                    </div>
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
    </>
  );
};

export default Home;
