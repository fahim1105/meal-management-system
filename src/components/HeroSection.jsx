import { Link } from 'react-router';
import { FaSignInAlt, FaUserPlus } from 'react-icons/fa';
import FoodScene from './FoodScene';
import { useAuth } from '../context/AuthContext';

const HeroSection = () => {
  const { currentUser, userData } = useAuth();

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#5C7057] dark:bg-[#89A482]">
      <div className="container mx-auto px-4 py-8 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-center">
          {/* Text Content - Order 2 on mobile, Order 1 on desktop */}
          <div className="text-left order-2 lg:order-1">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#c5e8d5] dark:text-[#242b28] mb-4 lg:mb-6">
              Mess Manager
            </h1>

            {currentUser ? (
              <>
                <p className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#c5e8d5] dark:text-[#242b28] mb-3 lg:mb-4">
                  Welcome, {userData?.name}!
                </p>
                <p className="text-base sm:text-lg text-[#c5e8d5]/80 dark:text-[#242b28]/80 mb-6 lg:mb-8 max-w-2xl">
                  You're almost there! Just one more step to get started.
                </p>
              </>
            ) : (
              <>
                <p className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#c5e8d5] dark:text-[#242b28] mb-3 lg:mb-4">
                  Simplify Your Mess Management
                </p>
                <p className="text-base sm:text-lg text-[#c5e8d5]/80 dark:text-[#242b28]/80 mb-6 lg:mb-8 max-w-2xl">
                  Track meals, manage expenses, and organize your mess with our powerful and easy-to-use platform
                </p>
                <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
                  <Link to="/register" className="btn btn-md sm:btn-lg bg-[#89A482] hover:bg-[#ACC5A6] dark:bg-[#5C7057] dark:hover:bg-[#4a5c46] text-[#54634d] dark:text-[#D6BD98] border-none">
                    <FaUserPlus className="mr-2" />
                    Create Account
                  </Link>
                  <Link to="/login" className="btn btn-md sm:btn-lg btn-outline border-[#c5e8d5] dark:border-[#242b28] text-[#c5e8d5] dark:text-[#242b28]">
                    <FaSignInAlt className="mr-2" />
                    Sign In
                  </Link>
                </div>
              </>
            )}
          </div>
          
          {/* 3D Animation - Order 1 on mobile, Order 2 on desktop */}
          <div className="w-full h-[300px] sm:h-[400px] lg:h-[520px] order-1 lg:order-2 flex items-center justify-center">
            <div className="w-full h-full max-w-[500px] mx-auto">
              <FoodScene motionEnabled={true} interactive={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
