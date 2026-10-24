import { FaTimes, FaUser, FaExclamationCircle, FaHistory, FaShieldAlt, FaComments, FaPalette, FaSignOutAlt, FaUsers, FaUtensils, FaDollarSign, FaCalendarAlt, FaGavel, FaCog } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ThemeToggle';
import Swal from 'sweetalert2';

/**
 * RightDrawer - Side drawer menu for state C (logged in + in group)
 * Contains: Profile, Fine (if enabled), My History, Admin Panel (managers+), Theme, Logout
 */
const RightDrawer = ({ isOpen, onClose, userData, isManager, group }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Logout?',
      html: '<p style="opacity: 0.7; margin-top: 0.5rem;">Are you sure you want to logout?</p>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Logout',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        popup: 'swal-logout-popup',
        title: 'swal-logout-title',
        htmlContainer: 'swal-logout-html',
        icon: 'swal-logout-icon',
        confirmButton: 'swal-logout-confirm',
        cancelButton: 'swal-logout-cancel',
        actions: 'swal2-actions',
      },
    });

    if (result.isConfirmed) {
      logout();
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-base-100 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-base-300">
            <h2 className="text-lg font-semibold text-base-content">Menu</h2>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Close menu"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-base-300">
            <div className="flex items-center gap-3">
              {/* User Avatar - shows profile pic if available, otherwise first letter */}
              <div className="avatar">
                {userData?.photoURL ? (
                  <div className="w-12 h-12 rounded-full">
                    <img src={userData.photoURL} alt={userData.name} />
                  </div>
                ) : (
                  <div className="placeholder">
                    <div className="bg-neutral text-neutral-content rounded-full w-12 h-12 flex items-center justify-center">
                      <span className="text-lg font-semibold">
                        {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-base-content truncate">
                  {userData?.name || 'User'}
                </p>
                <p className="text-sm text-base-content/60 truncate">
                  {userData?.email || ''}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-1">
              {/* Profile */}
              <button
                onClick={() => handleNavigation('/profile')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  location.pathname === '/profile'
                    ? 'bg-primary text-white'
                    : 'hover:bg-base-200'
                }`}
              >
                <FaUser size={20} />
                <span>Profile</span>
              </button>

              {/* Fine - only show if feature is enabled */}
              {group?.fineEnabled !== false && (
                <button
                  onClick={() => handleNavigation('/fine')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    location.pathname === '/fine'
                      ? 'bg-primary text-white'
                      : 'hover:bg-base-200'
                  }`}
                >
                  <FaExclamationCircle size={20} />
                  <span>Fine</span>
                </button>
              )}

              {/* My History */}
              <button
                onClick={() => handleNavigation('/my-history')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  location.pathname === '/my-history'
                    ? 'bg-primary text-white'
                    : 'hover:bg-base-200'
                }`}
              >
                <FaHistory size={20} />
                <span>My History</span>
              </button>

              {/* Admin Settings - only for managers */}
              {isManager && (
                <>
                  <div className="pt-2 pb-1 px-4">
                    <p className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
                      Admin Settings
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleNavigation('/admin/members')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                      location.pathname === '/admin/members'
                        ? 'bg-primary text-white'
                        : 'hover:bg-base-200'
                    }`}
                  >
                    <FaUsers size={20} />
                    <span>Manage Members</span>
                  </button>

                  <button
                    onClick={() => handleNavigation('/admin/meals')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                      location.pathname === '/admin/meals'
                        ? 'bg-primary text-white'
                        : 'hover:bg-base-200'
                    }`}
                  >
                    <FaUtensils size={20} />
                    <span>Set Meals</span>
                  </button>

                  <button
                    onClick={() => handleNavigation('/admin/costs')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                      location.pathname === '/admin/costs'
                        ? 'bg-primary text-white'
                        : 'hover:bg-base-200'
                    }`}
                  >
                    <FaDollarSign size={20} />
                    <span>Manage Costs</span>
                  </button>

                  <button
                    onClick={() => handleNavigation('/admin/bazar')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                      location.pathname === '/admin/bazar'
                        ? 'bg-primary text-white'
                        : 'hover:bg-base-200'
                    }`}
                  >
                    <FaCalendarAlt size={20} />
                    <span>Set Bazar</span>
                  </button>

                  <button
                    onClick={() => handleNavigation('/admin/fine-requests')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                      location.pathname === '/admin/fine-requests'
                        ? 'bg-primary text-white'
                        : 'hover:bg-base-200'
                    }`}
                  >
                    <FaGavel size={20} />
                    <span>Fine Requests</span>
                  </button>

                  <button
                    onClick={() => handleNavigation('/admin/control')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                      location.pathname === '/admin/control'
                        ? 'bg-primary text-white'
                        : 'hover:bg-base-200'
                    }`}
                  >
                    <FaCog size={20} />
                    <span>Control</span>
                  </button>
                </>
              )}

              <div className="divider my-2"></div>

              {/* Theme Toggle */}
              <div className="flex items-center gap-3 px-4 py-3">
                <FaPalette size={20} />
                <span>Theme</span>
                <div className="ml-auto">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <div className="p-4 border-t border-base-300">
            <button
              onClick={handleLogout}
              className="btn btn-error btn-outline w-full gap-2"
            >
              <FaSignOutAlt size={20} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default RightDrawer;
