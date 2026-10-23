import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import axios from 'axios';
import burgerToast from '../components/BurgerToast';
import Swal from 'sweetalert2';
import LottieLoader from '../components/LottieLoader';
import PendingRequestsList from '../components/PendingRequestsList';
import { queryKeys, fetchGroup } from '../lib/queries';
import { FaUsers, FaCrown, FaCheckCircle, FaUserSlash, FaToggleOn, FaToggleOff } from 'react-icons/fa';

const AdminMembers = () => {
  const [togglingMember, setTogglingMember] = useState(null);
  const { userData, getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();

  const API_URL = import.meta.env.VITE_API_URL;

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: queryKeys.group(),
    queryFn: () => fetchGroup(getAuthHeaders),
    enabled: !!userData?.groupId,
    refetchInterval: 1000 * 15,
  });

  const handleUpdate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.group() });
  };

  const handleToggleMemberStatus = async (member) => {
    const isActive = member.status === 'active';
    const action = isActive ? 'deactivate' : 'reactivate';

    const result = await Swal.fire({
      title: `${isActive ? 'Deactivate' : 'Reactivate'} Member?`,
      html: `<p>Are you sure you want to <strong>${action}</strong> <strong>${member.name}</strong>?</p>
        ${isActive ? '<p class="text-warning mt-2">⚠️ They will be marked as inactive and cannot have meals edited.</p>' : '<p class="text-success mt-2">✓ They will be marked as active again.</p>'}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: isActive ? '#d33' : '#3085d6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${action}`,
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: { popup: 'rounded-2xl' }
    });

    if (!result.isConfirmed) return;

    setTogglingMember(member.userId);
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_URL}/group/toggle-member-status`, { memberId: member.userId }, { headers });
      burgerToast.success(`Member ${action}d successfully`);
      handleUpdate();
    } catch (error) {
      burgerToast.error(error.response?.data?.error || `Failed to ${action} member`);
    } finally {
      setTogglingMember(null);
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
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <FaUsers className="text-primary" />
        Manage Members
      </h1>

      {/* Group Members Card */}
      <div className="card bg-base-100 shadow-xl border-t-4 border-t-primary mb-6">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <FaUsers className="text-2xl text-primary" />
            </div>
            <div>
              <h3 className="card-title text-primary">Group Members</h3>
              <p className="text-sm text-base-content/60">All members in your group</p>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="font-bold">Name</th>
                  <th className="font-bold">Email</th>
                  <th className="font-bold text-center">Role</th>
                  <th className="font-bold text-center">Status</th>
                  <th className="font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {group?.members.map(member => {
                  const isInactive = member.status === 'inactive';
                  const leftDate = member.leftAt ? format(new Date(member.leftAt), 'dd MMM yyyy') : null;
                  const rejoinDate = member.rejoinedAt ? format(new Date(member.rejoinedAt), 'dd MMM yyyy') : null;
                  const isMgr = member.userId === group.managerId;
                  const isMe = member.userId === userData?.uid;
                  return (
                    <tr 
                      key={member.userId} 
                      className={`${isMgr ? 'bg-warning/5 border-l-4 border-l-warning' : ''} ${isInactive ? 'opacity-60' : ''} hover:bg-primary/5 transition-colors`}
                    >
                      <td className="font-medium">
                        {member.name}
                        {isMe && <span className="badge badge-sm badge-primary ml-2">You</span>}
                      </td>
                      <td className="text-base-content/70 text-sm">{member.email}</td>
                      <td className="text-center">
                        {isMgr ? (
                          <span className="badge badge-warning gap-1 font-semibold">
                            <FaCrown className="text-xs" />
                            Manager
                          </span>
                        ) : (
                          <span className="badge badge-ghost">Member</span>
                        )}
                      </td>
                      <td className="text-center">
                        {isInactive ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="badge badge-error gap-1">
                              <FaUserSlash className="text-xs" />
                              Inactive
                            </span>
                            {leftDate && <span className="text-xs text-base-content/60">Left: {leftDate}</span>}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="badge badge-success gap-1">
                              <FaCheckCircle className="text-xs" />
                              Active
                            </span>
                            {rejoinDate && <span className="text-xs text-base-content/60">Rejoined: {rejoinDate}</span>}
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        {!isMe && !isMgr && (
                          <button 
                            className={`btn btn-xs ${isInactive ? 'btn-success' : 'btn-error'} gap-1`} 
                            onClick={() => handleToggleMemberStatus(member)} 
                            disabled={togglingMember === member.userId}
                          >
                            {togglingMember === member.userId ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : isInactive ? (
                              <>
                                <FaToggleOn />
                                Activate
                              </>
                            ) : (
                              <>
                                <FaToggleOff />
                                Deactivate
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {group?.members.map(member => {
              const isInactive = member.status === 'inactive';
              const isMgr = member.userId === group.managerId;
              const isMe = member.userId === userData?.uid;
              return (
                <div 
                  key={member.userId} 
                  className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    isMgr ? 'border-warning/40 bg-warning/5'
                    : isInactive ? 'border-base-300 bg-base-200/50 opacity-60'
                    : 'border-base-300 bg-base-200/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 font-bold text-sm ${
                        isMgr ? 'bg-warning/20 text-warning' : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {member.photoURL ? (
                        <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        member.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-base-content">{member.name}</span>
                        {isMe && <span className="badge badge-xs badge-primary">You</span>}
                        {isMgr ? (
                          <span className="badge badge-xs badge-warning gap-0.5">
                            <FaCrown className="text-[9px]" />
                            Manager
                          </span>
                        ) : (
                          <span className="badge badge-xs badge-ghost">Member</span>
                        )}
                      </div>
                      <span className={`badge badge-xs mt-0.5 ${isInactive ? 'badge-error' : 'badge-success'}`}>
                        {isInactive ? 'Inactive' : 'Active'}
                      </span>
                    </div>
                  </div>
                  {!isMe && !isMgr && (
                    <button
                      className={`btn btn-xs shrink-0 ml-2 ${isInactive ? 'btn-success' : 'btn-error'}`}
                      onClick={() => handleToggleMemberStatus(member)}
                      disabled={togglingMember === member.userId}
                    >
                      {togglingMember === member.userId ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : isInactive ? (
                        <FaToggleOn />
                      ) : (
                        <FaToggleOff />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pending Join Requests */}
      <PendingRequestsList />
    </div>
  );
};

export default AdminMembers;
