import { Link, NavLink } from 'react-router';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import BottomDock from './BottomDock';
import { FaHome, FaSignInAlt, FaUserPlus, FaSignOutAlt, FaTachometerAlt, FaUsers, FaHistory } from 'react-icons/fa';

const Navbar = () => {
  const { currentUser, logout, userData, userDataLoading } = useAuth();

  const linkClass = ({ isActive }) =>
    `flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-[#D6BD98] text-[#5C7057] shadow-sm'
        : 'text-[#D6BD98]/80 hover:text-[#D6BD98] hover:bg-[#D6BD98]/15'
    }`;

  return (
    <>
      {/* ── Top Navbar (large screens only) - Fixed color, no toggle ── */}
      <nav className="hidden lg:flex items-center justify-between bg-[#5C7057] shadow-xl sticky top-0 z-50 px-6 h-16">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity shrink-0">
          <div className="bg-[#D6BD98]/20 p-2 rounded-lg backdrop-blur-sm">
            <FaHome className="text-[#D6BD98] text-lg" />
          </div>
          <span className="text-[#D6BD98] text-xl font-bold tracking-wide">Mess Manager</span>
        </Link>

        {/* Center pill container */}
        <div className="flex items-center gap-1 bg-[#D6BD98]/10 border border-[#D6BD98]/20 rounded-full px-2 py-1.5">
          <NavLink to="/" className={linkClass}>
            <FaHome className="text-xs" /> Home
          </NavLink>

          {currentUser && (
            userDataLoading ? (
              <span className="flex items-center gap-[3px] px-4 py-1.5 text-[#D6BD98]/60 text-sm font-semibold">
                Loading
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="inline-block w-[3px] h-[3px] rounded-full bg-[#D6BD98]/60 ml-[2px]"
                    style={{ animation: `dock-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </span>
            ) : userData?.groupId ? (
              <>
                <NavLink to="/dashboard" className={linkClass}>
                  <FaTachometerAlt className="text-xs" /> Dashboard
                </NavLink>
                <NavLink to="/my-history" className={linkClass}>
                  <FaHistory className="text-xs" /> My History
                </NavLink>
              </>
            ) : (
              <NavLink to="/group-setup" className={linkClass}>
                <FaUsers className="text-xs" /> Join / Create Group
              </NavLink>
            )
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          {currentUser ? (
            <>
              <span className="text-[#D6BD98]/80 text-sm font-medium">{userData?.name}</span>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#D6BD98] text-[#5C7057] rounded-full text-sm font-bold hover:bg-[#D6BD98]/90 transition-all shadow-sm"
              >
                <FaSignOutAlt /> Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  isActive ? 'bg-[#D6BD98]/25 text-[#D6BD98]' : 'text-[#D6BD98]/80 hover:text-[#D6BD98] hover:bg-[#D6BD98]/15'
                }`
              }>
                <FaSignInAlt /> Sign In
              </NavLink>
              <NavLink to="/register" className="flex items-center gap-1.5 px-4 py-1.5 bg-[#D6BD98] text-[#5C7057] rounded-full text-sm font-bold hover:bg-[#D6BD98]/90 transition-all shadow-sm">
                <FaUserPlus /> Sign Up
              </NavLink>
            </>
          )}
        </div>
      </nav>

      {/* ── Bottom Dock (mobile/tablet only) ── */}
      <BottomDock />
    </>
  );
};

export default Navbar;
