import { useLocation } from 'react-router';
import { FaEllipsisV } from 'react-icons/fa';
import { useState, useEffect } from 'react';

/**
 * MobileHeader - Sticky greeting header for mobile screens
 * Only shown in states B and C (when user is logged in)
 * Hidden on Home page (greeting card acts as header there)
 */
const MobileHeader = ({ state, userData, onOpenDrawer }) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  // Dynamic time update - MUST be at top before any returns
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute - MUST be at top before any returns
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 14) return 'Good noon';
    if (hour >= 14 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    return 'Good night';
  };

  // Only show in states B and C
  if (state === 'A') {
    return null;
  }

  // Hide on Home page - greeting card acts as header
  if (isHomePage) {
    return null;
  }

  // Extract first name from full name
  const firstName = userData?.name?.split(' ')[0] || 'User';

  return (
    <div className="lg:hidden sticky top-0 z-30 bg-base-100 border-b border-base-300">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-base-content/60">{getGreeting()}</p>
            <h1 className="text-lg font-semibold text-base-content">
              {firstName}
            </h1>
          </div>
          
          {/* Menu button - only show in state C (when in group) */}
          {state === 'C' && (
            <button
              onClick={onOpenDrawer}
              className="btn btn-ghost btn-circle"
              aria-label="Open menu"
            >
              <FaEllipsisV size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileHeader;
