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
        ? 'bg-white text-primary shadow-sm'
        : 'text-white/80 hover:text-white hover:bg-white/15'
    }`;

  return (
    <>
      {/* ── Top Navbar (large screens only) ── */}
      <nav className="hidden lg:flex items-center justify-between bg-gradient-to-r from-primary to-blue-600 shadow-xl sticky top-0 z-50 px-6 h-16">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity shrink-0">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <FaHome className="text-white text-lg" />
          </div>
          <span className="text-white text-xl font-bold tracking-wide">Mess Manager</span>
        </Link>

        {/* Center pill container */}
        <div className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-full px-2 py-1.5">
          <NavLink to="/" className={linkClass}>
            <FaHome className="text-xs" /> Home
          </NavLink>

          {currentUser && (
            userDataLoading ? (
              <span className="flex items-center gap-[3px] px-4 py-1.5 text-white/60 text-sm font-semibold">
                Loading
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="inline-block w-[3px] h-[3px] rounded-full bg-white/60 ml-[2px]"
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
              <span className="text-white/80 text-sm font-medium">{userData?.name}</span>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-primary rounded-full text-sm font-bold hover:bg-white/90 transition-all shadow-sm"
              >
                <FaSignOutAlt /> Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  isActive ? 'bg-white/25 text-white' : 'text-white/80 hover:text-white hover:bg-white/15'
                }`
              }>
                <FaSignInAlt /> Sign In
              </NavLink>
              <NavLink to="/register" className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-primary rounded-full text-sm font-bold hover:bg-white/90 transition-all shadow-sm">
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
