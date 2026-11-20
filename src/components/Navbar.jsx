import { Link, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import BottomDock from './BottomDock';
import { FaHome, FaSignInAlt, FaUserPlus, FaSignOutAlt, FaTachometerAlt, FaUsers, FaHistory, FaEllipsisV, FaUser, FaPalette, FaTimes } from 'react-icons/fa';
import { useState } from 'react';
import Swal from 'sweetalert2';

const Navbar = () => {
  const { currentUser, logout, userData, userDataLoading } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setDrawerOpen(false);
    const result = await Swal.fire({
      title: 'Logout?',
      text: 'Are you sure you want to logout?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#8b4a44',
      cancelButtonColor: '#89A482',
      confirmButtonText: 'Yes, Logout',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        popup: 'swal-logout-popup',
        icon: 'swal-logout-icon',
        confirmButton: 'swal-logout-confirm',
        cancelButton: 'swal-logout-cancel',
      }
    });

    if (result.isConfirmed) {
      await logout();
      navigate('/login');
    }
  };

  const handleProfileClick = () => {
    setDrawerOpen(false);
    navigate('/profile');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-[#D6BD98] text-[#5C7057] shadow-sm'
        : 'text-[#D6BD98]/80 hover:text-[#D6BD98] hover:bg-[#D6BD98]/15'
    }`;

  return (
    <>
      <div className="drawer drawer-end">
        <input id="navbar-drawer" type="checkbox" className="drawer-toggle" checked={drawerOpen} onChange={(e) => setDrawerOpen(e.target.checked)} />
        
        {/* Drawer Content (Main Page) */}
        <div className="drawer-content">
          {/* ── Top Navbar (large screens only) ── */}
          <nav className="hidden lg:flex items-center justify-between bg-[#5C7057] shadow-xl sticky top-0 z-40 px-6 h-16">
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
                ) : userData?.groupId && userData?.isActive ? (
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
              {!currentUser && <ThemeToggle />}
              {currentUser ? (
                <>
                  {/* 3-dot Menu Button for logged-in users */}
                  <label htmlFor="navbar-drawer" className="btn btn-ghost btn-circle hover:bg-[#D6BD98]/20 cursor-pointer">
                    <FaEllipsisV className="text-[#D6BD98] text-xl" />
                  </label>
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
        </div>

        {/* Drawer Sidebar */}
        <div className="drawer-side z-50">
          <label htmlFor="navbar-drawer" className="drawer-overlay"></label>
          <div className="min-h-full w-80 bg-base-100 flex flex-col shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-base-300">
              <h2 className="text-xl font-bold text-base-content">Menu</h2>
              <label htmlFor="navbar-drawer" className="btn btn-ghost btn-circle btn-sm hover:bg-base-200">
                <FaTimes className="text-xl" />
              </label>
            </div>

            {/* Profile Section */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 p-5 border-b border-base-300">
              <div className="flex items-center gap-4">
                <div className="avatar">
                  <div className="w-14 h-14 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 shadow-lg">
                    {userData?.photoURL ? (
                      <img src={userData.photoURL} alt={userData.name || userData.email} />
                    ) : (
                      <div className="bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center">
                        <span className="text-2xl font-bold">
                          {(userData?.name || userData?.email || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base-content text-lg truncate">
                    {userData?.name || userData?.displayName || 'User'}
                  </p>
                  <p className="text-sm text-base-content/60 truncate">{userData?.email}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="flex-1 p-4 space-y-2">
              {/* Profile Button */}
              <button 
                onClick={handleProfileClick}
                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-base-200 transition-all duration-200 group"
              >
                <div className="bg-primary/10 p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <FaUser className="text-primary text-xl" />
                </div>
                <span className="font-semibold text-base-content text-lg">Profile</span>
              </button>

              {/* Theme Changer */}
              <div className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-base-200 transition-all duration-200 group">
                <div className="bg-secondary/10 p-3 rounded-lg group-hover:bg-secondary/20 transition-colors">
                  <FaPalette className="text-secondary text-xl" />
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className="font-semibold text-base-content text-lg">Theme</span>
                  <ThemeToggle />
                </div>
              </div>
            </div>

            {/* Logout Button (Bottom) */}
            <div className="p-4 border-t border-base-300">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-error/5 hover:bg-error/10 transition-all duration-200 group border-2 border-error/20 hover:border-error/40"
              >
                <div className="bg-error/10 p-3 rounded-lg group-hover:bg-error/20 transition-colors">
                  <FaSignOutAlt className="text-error text-xl" />
                </div>
                <span className="font-semibold text-error text-lg">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
