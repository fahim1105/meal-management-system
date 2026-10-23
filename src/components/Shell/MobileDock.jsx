import { NavLink } from 'react-router';
import { useState, useEffect } from 'react';
import { FaHome, FaUtensils, FaChartLine, FaShoppingBasket, FaCalendarCheck, FaComments } from 'react-icons/fa';

/**
 * MobileDock - Bottom floating navigation dock for mobile screens
 * Shows different items based on shell state (A, B, or C)
 * Hides on scroll down, shows on scroll up
 */
const MobileDock = ({ state, userData, onChatClick, hasUnreadMessages }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlDock = () => {
      const currentScrollY = window.scrollY;
      
      // Show dock if at top of page
      if (currentScrollY < 10) {
        setIsVisible(true);
      }
      // Hide dock on scroll down, show on scroll up
      else if (currentScrollY > lastScrollY) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', controlDock);
    return () => window.removeEventListener('scroll', controlDock);
  }, [lastScrollY]);

  const navLinkClass = ({ isActive }) =>
    `flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
      isActive
        ? 'bg-primary text-white shadow-lg scale-105 font-semibold'
        : 'text-neutral-content/60 hover:text-neutral-content hover:bg-neutral-content/5 active:scale-95'
    }`;

  // State A: Logged out - show only Home
  if (state === 'A') {
    return (
      <div className={`lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-32'
      }`}>
        <div className="bg-neutral rounded-3xl shadow-lg border border-neutral-content/10 px-6 py-3">
          <div className="flex justify-center items-center">
            <NavLink
              to="/"
              className={navLinkClass}
            >
              <FaHome size={22} />
              <span className="text-xs font-medium">Home</span>
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  // State B: Logged in, no group - show Home + Group Setup
  if (state === 'B') {
    return (
      <div className={`lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-32'
      }`}>
        <div className="bg-neutral rounded-3xl shadow-lg border border-neutral-content/10 px-6 py-3">
          <div className="flex justify-around items-center gap-2">
            <NavLink
              to="/"
              className={navLinkClass}
            >
              <FaHome size={22} />
              <span className="text-xs font-medium">Home</span>
            </NavLink>
            <NavLink
              to="/group-setup"
              className={navLinkClass}
            >
              <FaCalendarCheck size={22} />
              <span className="text-xs font-medium">Setup</span>
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  // State C: Logged in + in group - show main navigation items
  return (
    <div className={`lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : 'translate-y-32'
    }`}>
      <div className="bg-neutral rounded-3xl shadow-lg border border-neutral-content/10 px-2 py-3">
        <div className="flex justify-around items-center">
          <NavLink
            to="/"
            className={navLinkClass}
          >
            <FaHome size={20} />
            <span className="text-xs font-medium">Home</span>
          </NavLink>
          <NavLink
            to="/meals"
            className={navLinkClass}
          >
            <FaUtensils size={20} />
            <span className="text-xs font-medium">Meals</span>
          </NavLink>
          <NavLink
            to="/finance"
            className={navLinkClass}
          >
            <FaChartLine size={20} />
            <span className="text-xs font-medium">Finance</span>
          </NavLink>
          <NavLink
            to="/bazar"
            className={navLinkClass}
          >
            <FaShoppingBasket size={20} />
            <span className="text-xs font-medium">Bazar</span>
          </NavLink>
          {/* Chat button */}
          <button
            onClick={onChatClick}
            className="relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 text-neutral-content/60 hover:text-neutral-content hover:bg-neutral-content/5 active:scale-95"
          >
            <FaComments size={20} />
            <span className="text-xs font-medium">Chat</span>
            {hasUnreadMessages && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileDock;
