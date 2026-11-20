import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import burgerToast from '../components/BurgerToast';
import Swal from 'sweetalert2';
import LottieLoader from '../components/LottieLoader';
import { queryKeys, fetchGroup } from '../lib/queries';
import { FaSignOutAlt, FaExclamationTriangle, FaUser, FaEnvelope, FaCalendarAlt, FaEdit, FaCamera, FaLock, FaSave, FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';

const Profile = () => {
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [newName, setNewName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const queryClient = useQueryClient();
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const fileInputRef = useRef(null);
  
  const { getAuthHeaders, userData, fetchUserData, currentUser, updateProfileData, changePassword, refreshUserToken } = useAuth();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL;

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: queryKeys.group(),
    queryFn: () => fetchGroup(getAuthHeaders),
    enabled: !!userData?.groupId,
    refetchInterval: 1000 * 15,
  });

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      burgerToast.error('Photo must be under 2MB');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    if (!newName.trim() && !photoFile) return;
    setProfileSaving(true);
    try {
      await updateProfileData({ name: newName.trim() || userData?.name, photoFile });
      setEditingProfile(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      setNewName('');
    } catch {
      // error handled in context
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      burgerToast.error('Please fill all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      burgerToast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      burgerToast.error('Password must be at least 6 characters');
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setEditingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      // error handled in context
    } finally {
      setPasswordSaving(false);
    }
  };

  const myMemberInfo = group?.members?.find(m => m.userId === userData?.uid);
  const joinedDate = (userData?.groupId && myMemberInfo?.status === 'active' && myMemberInfo?.joinedAt)
    ? new Date(myMemberInfo.joinedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';

  const getUserFinancialStatus = async () => {
    try {
      const headers = await getAuthHeaders();
      const currentMonth = new Date().toISOString().slice(0, 7);
      const response = await axios.get(`${API_URL}/finance/summary/${currentMonth}`, { headers });
      
      const userStats = response.data.memberStats?.[userData?.uid];
      return userStats || { balance: 0, deposit: 0, cost: 0, totalMeals: 0 };
    } catch (error) {
      return { balance: 0, deposit: 0, cost: 0, totalMeals: 0 };
    }
  };

  const handleLeaveGroup = async () => {
    const financialStatus = await getUserFinancialStatus();
    
    let alertBanner = '';
    if (financialStatus.balance < 0) {
      alertBanner = `
        <div class="swal-leave-alert swal-leave-alert-error">
          <span style="font-size: 1.2rem; flex-shrink: 0;">⚠️</span>
          <div>
            <strong>Outstanding Balance:</strong> You have an unpaid amount of <strong>৳${Math.abs(financialStatus.balance).toFixed(2)}</strong>. Please settle before leaving.
          </div>
        </div>
      `;
    } else if (financialStatus.balance > 0) {
      alertBanner = `
        <div class="swal-leave-alert swal-leave-alert-success">
          <span style="font-size: 1.2rem; flex-shrink: 0;">✓</span>
          <div>
            <strong>Refund Due:</strong> You have a surplus balance of <strong>৳${financialStatus.balance.toFixed(2)}</strong> to receive from the mess.
          </div>
        </div>
      `;
    } else {
      alertBanner = `
        <div class="swal-leave-alert swal-leave-alert-neutral">
          <span style="font-size: 1.2rem; flex-shrink: 0;">✓</span>
          <div>
            <strong>Account Balanced:</strong> Your mess finances are fully settled (৳0.00).
          </div>
        </div>
      `;
    }

    const result = await Swal.fire({
      title: 'Leave Group?',
      html: `
        <p style="margin-bottom: 0.25rem;">Are you sure you want to leave <strong>${group?.name || 'this group'}</strong>?</p>
        ${alertBanner}
        <div class="swal-leave-stats-grid">
          <div class="swal-leave-stat-card">
            <span class="swal-leave-stat-label">Total Meals</span>
            <span class="swal-leave-stat-val">${financialStatus.totalMeals || 0}</span>
          </div>
          <div class="swal-leave-stat-card">
            <span class="swal-leave-stat-label">Deposit</span>
            <span class="swal-leave-stat-val">৳${Number(financialStatus.deposit || 0).toFixed(2)}</span>
          </div>
          <div class="swal-leave-stat-card">
            <span class="swal-leave-stat-label">Cost</span>
            <span class="swal-leave-stat-val">৳${Number(financialStatus.cost || 0).toFixed(2)}</span>
          </div>
        </div>
        <p class="swal-leave-notice">⚠️ You will immediately lose access to meal bookings, bazar schedule, and group features.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Leave Group',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        popup: 'swal-leave-popup',
        title: 'swal-leave-title',
        htmlContainer: 'swal-leave-html',
        icon: 'swal-leave-icon',
        actions: 'swal-leave-actions',
        confirmButton: 'swal-leave-confirm',
        cancelButton: 'swal-leave-cancel',
      }
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_URL}/group/leave`, {}, { headers });
      
      // Clear all cached group & request queries from TanStack Query
      queryClient.removeQueries({ queryKey: queryKeys.myRequestStatus() });
      queryClient.removeQueries({ queryKey: queryKeys.group() });
      queryClient.clear();

      await Swal.fire({
        title: 'Successfully Left Group',
        text: 'You have left the group successfully.',
        icon: 'success',
        iconColor: 'var(--color-success)',
        confirmButtonText: 'OK',
        customClass: {
          popup: 'swal-leave-popup',
          title: 'swal-leave-title',
          htmlContainer: 'swal-leave-html',
          icon: 'swal-leave-icon',
          actions: 'swal-leave-actions',
          confirmButton: 'swal-leave-confirm-primary',
        }
      });

      // Refresh auth tokens and user data so userData.groupId becomes null
      await refreshUserToken();
      await fetchUserData(currentUser);

      // Now navigate to /group-setup with fresh null group state
      navigate('/group-setup');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to leave group';
      
      if (errorMessage === 'Manager must transfer role before leaving') {
        Swal.fire({
          title: 'Cannot Leave!',
          text: 'Manager must transfer role to another member before leaving',
          icon: 'error',
          confirmButtonText: 'OK',
          customClass: {
            popup: 'swal-leave-popup',
            title: 'swal-leave-title',
            htmlContainer: 'swal-leave-html',
            icon: 'swal-leave-icon',
            actions: 'swal-leave-actions',
            confirmButton: 'swal-leave-confirm-primary',
          }
        });
      } else {
        burgerToast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (groupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <LottieLoader size={270} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-6">
      {/* My Profile Card */}
      <div className="card bg-base-100 shadow-xl border-t-4 border-t-primary">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-full">
                <FaUser className="text-2xl text-primary" />
              </div>
              <div>
                <h3 className="card-title text-primary">My Profile</h3>
                <p className="text-sm text-base-content/60">Your account information</p>
              </div>
            </div>
            {!editingProfile && (
              <button 
                className="btn btn-sm btn-outline btn-primary gap-1" 
                onClick={() => { 
                  setEditingProfile(true); 
                  setNewName(userData?.name || ''); 
                }}
              >
                <FaEdit /> Edit
              </button>
            )}
          </div>

          {/* Avatar */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary ring-4 ring-primary/20 bg-base-200 flex items-center justify-center">
                {editingProfile && photoPreview ? (
                  <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                ) : userData?.photoURL ? (
                  <img src={userData?.photoURL} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl font-bold text-primary">
                    {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              
              {/* Camera button overlay - only in edit mode */}
              {editingProfile && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 btn btn-circle btn-primary btn-sm shadow-lg hover:scale-110 transition-transform"
                  title="Change photo"
                >
                  <FaCamera size={14} />
                </button>
              )}
            </div>
          </div>
          
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

          {!editingProfile ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-lg border border-primary/20">
                <FaUser className="text-primary text-lg flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-base-content/60 mb-0.5">Full Name</p>
                  <p className="font-bold text-base-content truncate">{userData?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-lg border border-primary/20">
                <FaEnvelope className="text-primary text-lg flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-base-content/60 mb-0.5">Email</p>
                  <p className="font-bold text-base-content text-sm truncate">{userData?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-lg border border-primary/20">
                <FaCalendarAlt className="text-primary text-lg flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-base-content/60 mb-0.5">Joined Group</p>
                  <p className="font-bold text-base-content truncate">{joinedDate}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Full Name</span></label>
                <input 
                  type="text" 
                  className="input input-bordered input-primary" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  placeholder="Enter name" 
                />
              </div>
              
              {photoFile && (
                <div className="alert alert-success">
                  <FaCamera />
                  <span>New photo selected - click Save to update</span>
                </div>
              )}
              
              <div className="flex gap-2">
                <button 
                  className={`btn btn-primary flex-1 shadow-md gap-2 ${profileSaving ? 'loading' : ''}`} 
                  onClick={handleSaveProfile} 
                  disabled={profileSaving || (!newName.trim() && !photoFile)}
                >
                  {!profileSaving && <FaSave />}
                  {profileSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  className="btn btn-ghost flex-1" 
                  onClick={() => {
                    setEditingProfile(false);
                    setPhotoFile(null);
                    setPhotoPreview(null);
                    setNewName('');
                  }}
                  disabled={profileSaving}
                >
                  <FaTimes /> Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Card */}
      <div className="card bg-base-100 shadow-xl border-t-4 border-t-primary">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-full">
                <FaLock className="text-2xl text-primary" />
              </div>
              <div>
                <h3 className="card-title text-primary">Change Password</h3>
                <p className="text-sm text-base-content/60">Update your account password</p>
              </div>
            </div>
            {!editingPassword && (
              <button 
                className="btn btn-sm btn-outline btn-primary gap-1" 
                onClick={() => setEditingPassword(true)}
              >
                <FaEdit /> Change
              </button>
            )}
          </div>

          {editingPassword ? (
            <div className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Current Password</span></label>
                <div className="relative">
                  <input 
                    type={showCurrentPass ? 'text' : 'password'} 
                    className="input input-bordered w-full pr-12" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    placeholder="Enter current password" 
                  />
                  <button 
                    type="button" 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content" 
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                  >
                    {showCurrentPass ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">New Password</span></label>
                <div className="relative">
                  <input 
                    type={showNewPass ? 'text' : 'password'} 
                    className="input input-bordered w-full pr-12" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="Enter new password (min 6 characters)" 
                  />
                  <button 
                    type="button" 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content" 
                    onClick={() => setShowNewPass(!showNewPass)}
                  >
                    {showNewPass ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Confirm New Password</span></label>
                <div className="relative">
                  <input 
                    type={showConfirmPass ? 'text' : 'password'} 
                    className="input input-bordered w-full pr-12" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="Confirm new password" 
                  />
                  <button 
                    type="button" 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content" 
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                  >
                    {showConfirmPass ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  className={`btn bg-gradient-to-br from-primary via-primary to-primary/80 border-none text-white flex-1 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 gap-2 ${passwordSaving ? 'loading' : ''}`} 
                  onClick={handleChangePassword} 
                  disabled={passwordSaving}
                >
                  {!passwordSaving && <FaSave />}
                  Save Password
                </button>
                <button 
                  className="btn bg-base-200 hover:bg-base-300 border-2 border-base-300 text-base-content flex-1 shadow-md hover:shadow-lg transition-all duration-200" 
                  onClick={() => {
                    setEditingPassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={passwordSaving}
                >
                  <FaTimes /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-success/10 border border-success/30 rounded-lg p-4 flex items-center gap-3">
              <FaLock className="text-success text-xl" />
              <div className="flex-1">
                <p className="font-bold text-success">••••••••••••</p>
                <p className="text-xs text-base-content/60">Password protected</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leave Group Card */}
      {group && (
        <div className="card bg-base-100 shadow-xl border-t-4 border-t-error">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-error/10 p-3 rounded-full">
                <FaSignOutAlt className="text-2xl text-error" />
              </div>
              <div>
                <h3 className="card-title text-error">Leave Group</h3>
                <p className="text-sm text-base-content/60">Exit from this group</p>
              </div>
            </div>

            <div className="alert alert-warning shadow-md">
              <FaExclamationTriangle className="text-xl" />
              <div className="text-sm">
                <p className="font-semibold">Before leaving, make sure:</p>
                <ul className="list-disc list-inside mt-1 text-xs space-y-0.5">
                  <li>You have settled all outstanding payments</li>
                  <li>You have received any refunds due</li>
                  <li>If you're the manager, transfer role first</li>
                </ul>
              </div>
            </div>

            <button 
              className={`btn btn-error w-full gap-2 shadow-md ${loading ? 'loading' : ''}`} 
              onClick={handleLeaveGroup} 
              disabled={loading}
            >
              {!loading && <FaSignOutAlt />}
              Leave Group
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
