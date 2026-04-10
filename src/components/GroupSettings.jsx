import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import axios from 'axios';
import burgerToast from './BurgerToast';
import Swal from 'sweetalert2';
import { FaSignOutAlt, FaTrash, FaExclamationTriangle, FaUser, FaEnvelope, FaCalendarAlt, FaEdit, FaCamera, FaLock, FaSave, FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';

const GroupSettings = ({ group, isManager, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [newName, setNewName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const fileInputRef = useRef(null);
  const { getAuthHeaders, userData, fetchUserData, currentUser, updateProfileData, changePassword } = useAuth();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL;

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
      if (onUpdate) onUpdate();
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

  // Get current user's member info from group
  const myMemberInfo = group?.members?.find(m => m.userId === userData?.uid);
  const joinedDate = myMemberInfo?.joinedAt
    ? new Date(myMemberInfo.joinedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';

  // Get financial summary for current user
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
    // Get financial status
    const financialStatus = await getUserFinancialStatus();
    
    let warningMessage = '';
    if (financialStatus.balance < 0) {
      warningMessage = `<p class="text-error font-bold mt-2">⚠️ You have ৳${Math.abs(financialStatus.balance).toFixed(2)} outstanding!</p>`;
    } else if (financialStatus.balance > 0) {
      warningMessage = `<p class="text-success font-bold mt-2">✓ You will receive ৳${financialStatus.balance.toFixed(2)}</p>`;
    }

    // Show confirmation dialog
    const result = await Swal.fire({
      title: 'Leave Group?',
      html: `
        <p>Are you sure you want to leave <strong>${group?.name}</strong>?</p>
        ${warningMessage}
        <div class="mt-4 p-3 bg-base-200 rounded-lg text-left">
          <p class="text-sm"><strong>Your Summary:</strong></p>
          <p class="text-sm">Total Meals: ${financialStatus.totalMeals}</p>
          <p class="text-sm">Deposit: ৳${financialStatus.deposit.toFixed(2)}</p>
          <p class="text-sm">Cost: ৳${financialStatus.cost.toFixed(2)}</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Leave Group',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'btn btn-error',
        cancelButton: 'btn btn-ghost'
      }
    });

    if (!result.isConfirmed) {
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_URL}/group/leave`, {}, { headers });
      
      await Swal.fire({
        title: 'Success!',
        text: response.data.groupDeleted ? 'Group deleted successfully' : 'You have left the group',
        icon: 'success',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'btn btn-primary'
        }
      });

      await fetchUserData(currentUser);
      navigate('/group-setup');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to leave group';
      
      if (errorMessage === 'Manager must transfer role before leaving') {
        Swal.fire({
          title: 'Cannot Leave!',
          text: 'Manager must transfer role to another member before leaving',
          icon: 'error',
          confirmButtonColor: '#3085d6',
          customClass: {
            popup: 'rounded-2xl',
            confirmButton: 'btn btn-primary'
          }
        });
      } else {
        burgerToast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    const result = await Swal.fire({
      title: 'Delete Group?',
      html: `
        <p>Are you sure you want to permanently delete <strong>${group?.name}</strong>?</p>
        <p class="text-error font-bold mt-2">⚠️ This action cannot be undone!</p>
        <p class="text-sm mt-2">All data will be deleted (meal records, finances, etc.)</p>
      `,
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'btn btn-error',
        cancelButton: 'btn btn-ghost'
      }
    });

    if (!result.isConfirmed) {
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_URL}/group/delete`, { headers });
      
      await Swal.fire({
        title: 'Deleted!',
        text: 'Group has been deleted successfully',
        icon: 'success',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'btn btn-primary'
        }
      });

      await fetchUserData(currentUser);
      navigate('/group-setup');
    } catch (error) {
      burgerToast.error(error.response?.data?.error || 'Failed to delete group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
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
              <button className="btn btn-sm btn-outline btn-primary gap-1" onClick={() => { setEditingProfile(true); setNewName(userData?.name || ''); }}>
                <FaEdit /> Edit
              </button>
            )}
          </div>

          {/* Avatar — shown only when not editing */}
          {!editingProfile && (
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/30 bg-primary/10 flex items-center justify-center">
                {userData?.photoURL ? (
                  <img src={userData?.photoURL} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-primary">{userData?.name?.charAt(0)?.toUpperCase()}</span>
                )}
              </div>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

          {!editingProfile ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-lg border border-primary/20">
                <FaUser className="text-primary text-lg flex-shrink-0" />
                <div>
                  <p className="text-xs text-base-content/60 mb-0.5">Full Name</p>
                  <p className="font-bold text-base-content">{userData?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-lg border border-primary/20">
                <FaEnvelope className="text-primary text-lg flex-shrink-0" />
                <div>
                  <p className="text-xs text-base-content/60 mb-0.5">Email</p>
                  <p className="font-bold text-base-content text-sm break-all">{userData?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-lg border border-primary/20">
                <FaCalendarAlt className="text-primary text-lg flex-shrink-0" />
                <div>
                  <p className="text-xs text-base-content/60 mb-0.5">Joined Group</p>
                  <p className="font-bold text-base-content">{joinedDate}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Avatar upload area */}
              <div className="flex flex-col items-center gap-3 p-5 bg-gradient-to-b from-primary/5 to-transparent rounded-2xl border border-primary/10">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/40 shadow-lg shadow-primary/20 bg-primary/10 flex items-center justify-center transition-all group-hover:border-primary">
                    {(photoPreview || userData?.photoURL) ? (
                      <img src={photoPreview || userData?.photoURL} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold text-primary">{userData?.name?.charAt(0)?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <FaCamera className="text-white text-xl" />
                  </div>
                </div>
                <p className="text-xs text-base-content/50">Click to change photo · Max 2MB</p>
              </div>

              {/* Name input */}
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Full Name</span></label>
                <div className="relative">
                  <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 text-sm" />
                  <input
                    type="text"
                    className="input input-bordered w-full pl-10 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  className={`btn btn-primary flex-1 shadow-md gap-2 ${profileSaving ? 'loading' : ''}`}
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                >
                  {!profileSaving && <FaSave />} Save Changes
                </button>
                <button className="btn btn-ghost gap-1" onClick={() => { setEditingProfile(false); setPhotoPreview(null); setPhotoFile(null); }}>
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
          <div className="flex items-center justify-between mb-2">
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
              <button className="btn btn-sm btn-primary gap-1.5 shadow-md" onClick={() => setEditingPassword(true)}>
                <FaEdit className="text-xs" /> Change
              </button>
            )}
          </div>

          {!editingPassword ? (
            <div className="flex items-center gap-2 mt-3 p-3 bg-base-200 rounded-xl">
              <FaLock className="text-base-content/30 text-sm" />
              <div className="flex gap-1 items-center">
                {[...Array(10)].map((_, i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-base-content/25"></span>)}
              </div>
              <span className="text-xs text-base-content/40 ml-1">Password protected</span>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  className="input input-bordered w-full pl-10 pr-10 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                />
                <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 text-sm" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors" onClick={() => setShowCurrentPass(p => !p)}>
                  {showCurrentPass ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    className="input input-bordered w-full pl-10 pr-10 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="New password (min 6)"
                  />
                  <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 text-sm" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors" onClick={() => setShowNewPass(p => !p)}>
                    {showNewPass ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    className={`input input-bordered w-full pl-10 pr-10 transition-all focus:ring-2 ${
                      confirmPassword && newPassword !== confirmPassword
                        ? 'border-error focus:border-error focus:ring-error/20'
                        : 'focus:border-primary focus:ring-primary/20'
                    }`}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 text-sm" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors" onClick={() => setShowConfirmPass(p => !p)}>
                    {showConfirmPass ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-error flex items-center gap-1">
                  <span>⚠</span> Passwords do not match
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  className={`btn btn-primary flex-1 shadow-md gap-2 ${passwordSaving ? 'loading' : ''}`}
                  onClick={handleChangePassword}
                  disabled={passwordSaving}
                >
                  {!passwordSaving && <FaSave />} Update Password
                </button>
                <button
                  className="btn btn-ghost gap-1"
                  onClick={() => { setEditingPassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
                >
                  <FaTimes /> Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leave Group Card */}
      <div className="card bg-base-100 shadow-xl border-2 border-error/30 hover:border-error transition-all duration-300">
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

          <div className="alert alert-warning shadow-lg mb-4">
            <FaExclamationTriangle className="text-xl" />
            <div className="text-sm">
              <p className="font-semibold">Before leaving, make sure:</p>
              <ul className="list-disc list-inside mt-1">
                <li>You have settled all outstanding payments</li>
                <li>You have received any refunds due</li>
                {isManager && <li className="text-error font-bold">If you're the manager, transfer role first</li>}
              </ul>
            </div>
          </div>

          <button 
            onClick={handleLeaveGroup}
            className={`btn btn-error w-full shadow-md ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Processing...' : (
              <>
                <FaSignOutAlt />
                Leave Group
              </>
            )}
          </button>
        </div>
      </div>

      {/* Delete Group Card - Only for Manager with single member */}
      {isManager && group?.members?.length === 1 && (
        <div className="card bg-base-100 shadow-xl border-2 border-error hover:border-error transition-all duration-300">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-error/10 p-3 rounded-full">
                <FaTrash className="text-2xl text-error" />
              </div>
              <div>
                <h3 className="card-title text-error">Delete Group</h3>
                <p className="text-sm text-base-content/60">Permanently delete this group</p>
              </div>
            </div>

            <div className="alert alert-error shadow-lg mb-4">
              <FaExclamationTriangle className="text-xl" />
              <div className="text-sm">
                <p className="font-semibold">Warning!</p>
                <p>This action cannot be undone. All data will be permanently deleted.</p>
              </div>
            </div>

            <button 
              onClick={handleDeleteGroup}
              className={`btn btn-error w-full shadow-md ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? 'Deleting...' : (
                <>
                  <FaTrash />
                  Delete Group
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupSettings;
