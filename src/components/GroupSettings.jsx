import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import axios from 'axios';
import burgerToast from './BurgerToast';
import Swal from 'sweetalert2';
import { FaSignOutAlt, FaTrash, FaExclamationTriangle, FaUser, FaEnvelope, FaCalendarAlt } from 'react-icons/fa';

const GroupSettings = ({ group, isManager }) => {
  const [loading, setLoading] = useState(false);
  const { getAuthHeaders, userData } = useAuth();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL;

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
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <FaUser className="text-2xl text-primary" />
            </div>
            <div>
              <h3 className="card-title text-primary">My Profile</h3>
              <p className="text-sm text-base-content/60">Your account information</p>
            </div>
          </div>
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
