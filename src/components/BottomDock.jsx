import { NavLink } from 'react-router';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import {
  FaHome, FaTachometerAlt, FaHistory, FaUsers,
  FaSignInAlt, FaPowerOff,
} from 'react-icons/fa';

const ITEM_W = 52;

const DockItem = ({ to, icon: Icon, label, onClick, invisible }) => {
  if (invisible) {
    return <div style={{ width: ITEM_W }} className="flex flex-col items-center gap-0.5 py-1" />;
  }

  const inner = (isActive = false) => (
    <div className="flex flex-col items-center gap-0.5 py-1" style={{ width: ITEM_W }}>
      <div
        className={`flex items-center justify-center rounded-xl transition-all duration-300
          ${isActive
            ? 'bg-white/30 text-white shadow-lg shadow-white/20 scale-110 -translate-y-0.5'
            : 'text-white/70 hover:text-white hover:bg-white/15'
          }
        `}
        style={{ width: 40, height: 40 }}
      >
        <Icon className="text-lg" />
      </div>
      <span className={`text-[10px] font-semibold leading-none transition-colors duration-200 ${isActive ? 'text-white' : 'text-white/60'}`}>
        {label}
      </span>
      {isActive && (
        <div className="w-1 h-1 rounded-full bg-white mt-0.5" />
      )}
    </div>
  );

  if (onClick) {
    return <button onClick={onClick}>{inner(false)}</button>;
  }

  return (
    <NavLink to={to}>
      {({ isActive }) => inner(isActive)}
    </NavLink>
  );
};

const DockSeparator = () => (
  <div className="w-px h-10 bg-white/20 mx-1 self-center" />
);

const BottomDock = () => {
  const { currentUser, logout, userData, userDataLoading } = useAuth();
  const hasGroup = !!userData?.groupId;

  return (
    <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-end gap-2 px-5 py-2 rounded-2xl bg-gradient-to-r from-primary to-blue-600 shadow-2xl shadow-primary/30 border border-white/10">

        {/* Slot 1 — Home (always) */}
        <DockItem to="/" icon={FaHome} label="Home" />

        {/* Slot 2 */}
        {currentUser
          ? userDataLoading
            ? <div className="flex flex-col items-center justify-center py-1" style={{ width: ITEM_W, height: 56 }}>
                <div className="flex items-center justify-center gap-[3px]">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-white/70"
                      style={{ animation: `dock-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            : hasGroup
              ? <DockItem to="/dashboard"   icon={FaTachometerAlt} label="Dashboard" />
              : <DockItem to="/group-setup" icon={FaUsers}         label="Group" />
          : <DockItem invisible />
        }

        {/* Slot 3 */}
        {currentUser && !userDataLoading && hasGroup
          ? <DockItem to="/my-history" icon={FaHistory} label="History" />
          : <DockItem invisible />
        }

        <DockSeparator />

        {/* Theme toggle */}
        <div className="flex flex-col items-center gap-0.5 py-1" style={{ width: ITEM_W }}>
          <div className="flex items-center justify-center" style={{ width: 40, height: 40 }}>
            <ThemeToggle />
          </div>
          <span className="text-[10px] font-semibold text-white/60 leading-none">Theme</span>
        </div>

        {/* Slot 4 — Logout or Sign In */}
        {currentUser
          ? <DockItem icon={FaPowerOff}  label="Logout"  onClick={logout} />
          : <DockItem to="/login" icon={FaSignInAlt} label="Sign In" />
        }
      </div>
    </div>
  );
};

export default BottomDock;
