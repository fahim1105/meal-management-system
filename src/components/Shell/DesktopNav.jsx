import { NavLink, Link } from 'react-router';
import ThemeToggle from '../ThemeToggle';
import { FaEllipsisV } from 'react-icons/fa';
import logo from '../../assets/logo.png';

const DesktopNav = ({ state, onOpenDrawer }) => {
  // Active link styling
  const navLinkClass = ({ isActive }) =>
    `px-[18px] py-2 rounded-full text-[14.5px] font-normal transition-all ${
      isActive
        ? 'font-bold'
        : 'hover:bg-white/10'
    }`;

  const getNavLinkStyle = (isActive) => ({
    background: isActive ? 'var(--shell-pill-bg)' : 'transparent',
    color: isActive ? 'var(--shell-pill-text)' : 'var(--shell-on-strong)',
  });

  return (
    <nav 
      className="hidden lg:sticky lg:top-0 lg:z-50 lg:flex items-center justify-between h-[62px] px-6 bg-neutral shadow-lg"
      style={{ color: 'var(--shell-on-strong)' }}
    >
      {/* Left: Logo + Name */}
      <Link 
        to="/" 
        className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
      >
        <img 
          src={logo} 
          alt="Logo" 
          className="w-10 h-10 rounded-lg object-contain"
        />
        <span className="text-lg font-bold tracking-wide">Mess Manager</span>
      </Link>

      {/* Center: Nav Pill */}
      <div 
        className="flex items-center gap-1 rounded-full px-2 py-1.5"
        style={{ background: 'rgba(0,0,0,.16)' }}
      >
        <NavLink 
          to="/" 
          className={navLinkClass}
          style={({ isActive }) => getNavLinkStyle(isActive)}
          aria-current={({ isActive }) => isActive ? 'page' : undefined}
        >
          Home
        </NavLink>

        {state === 'B' && (
          <NavLink 
            to="/group-setup" 
            className={navLinkClass}
            style={({ isActive }) => getNavLinkStyle(isActive)}
            aria-current={({ isActive }) => isActive ? 'page' : undefined}
          >
            Join / Create group
          </NavLink>
        )}

        {state === 'C' && (
          <>
            <NavLink 
              to="/meals" 
              className={navLinkClass}
              style={({ isActive }) => getNavLinkStyle(isActive)}
              aria-current={({ isActive }) => isActive ? 'page' : undefined}
            >
              Meals
            </NavLink>
            <NavLink 
              to="/finance" 
              className={navLinkClass}
              style={({ isActive }) => getNavLinkStyle(isActive)}
              aria-current={({ isActive }) => isActive ? 'page' : undefined}
            >
              Finance
            </NavLink>
            <NavLink 
              to="/bazar" 
              className={navLinkClass}
              style={({ isActive }) => getNavLinkStyle(isActive)}
              aria-current={({ isActive }) => isActive ? 'page' : undefined}
            >
              Bazar
            </NavLink>
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {state === 'A' && (
          <>
            <ThemeToggle />
            <Link
              to="/login"
              className="px-4 py-2 text-[14px] font-semibold rounded-[10px] transition-opacity hover:opacity-90"
              style={{ 
                border: '1.5px solid rgba(255,255,255,.55)',
                color: 'var(--shell-on-strong)'
              }}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-[14px] font-semibold rounded-[10px] transition-opacity hover:opacity-90"
              style={{ 
                background: 'var(--shell-pill-bg)',
                color: 'var(--shell-pill-text)'
              }}
            >
              Sign up
            </Link>
          </>
        )}

        {(state === 'B' || state === 'C') && (
          <button
            onClick={onOpenDrawer}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,.35)' }}
            aria-label="Open menu"
          >
            <FaEllipsisV />
          </button>
        )}
      </div>
    </nav>
  );
};

export default DesktopNav;
