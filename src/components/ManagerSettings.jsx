import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import axios from 'axios';
import burgerToast from './BurgerToast';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { FaCrown, FaUsers, FaExchangeAlt, FaInfoCircle, FaShieldAlt, FaUserTie, FaUserSlash, FaCheckCircle, FaDownload, FaFileDownload, FaToggleOn, FaToggleOff } from 'react-icons/fa';

const ManagerSettings = ({ group, onUpdate }) => {
  const [selectedMember, setSelectedMember] = useState('');
  const [loading, setLoading] = useState(false);
  const [togglingMember, setTogglingMember] = useState(null);
  const [downloadMonth, setDownloadMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [downloading, setDownloading] = useState(false);
  const { getAuthHeaders, userData } = useAuth();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL;

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
      onUpdate();
    } catch (error) {
      burgerToast.error(error.response?.data?.error || `Failed to ${action} member`);
    } finally {
      setTogglingMember(null);
    }
  };

  const handleTransferManager = async (e) => {
    e.preventDefault();
    
    if (!selectedMember) {
      burgerToast.error('Please select a member');
      return;
    }

    if (selectedMember === userData?.uid) {
      burgerToast.error('You are already the manager');
      return;
    }

    // Get selected member name
    const selectedMemberData = group?.members.find(m => m.userId === selectedMember);
    const memberName = selectedMemberData?.name || 'this member';

    // Show SweetAlert confirmation
    const result = await Swal.fire({
      title: 'Transfer Manager Role?',
      html: `
        <p>Are you sure you want to transfer the manager role to <strong>${memberName}</strong>?</p>
        <p class="text-warning mt-2">⚠️ You will lose all manager privileges!</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Transfer Role',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'btn btn-primary',
        cancelButton: 'btn btn-ghost'
      }
    });

    // If cancelled, stay on current page
    if (!result.isConfirmed) {
      return;
    }

    // If confirmed, proceed with transfer
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      await axios.post(
        `${API_URL}/group/transfer-manager`,
        { newManagerId: selectedMember },
        { headers }
      );
      
      // Show success message
      await Swal.fire({
        title: 'Success!',
        text: 'Manager role transferred successfully',
        icon: 'success',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'btn btn-primary'
        }
      });

      // Navigate to home page
      navigate('/');
    } catch (error) {
      burgerToast.error('Failed to transfer manager role');
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(
        `${API_URL}/report/download/${downloadMonth}`,
        { 
          headers,
          responseType: 'blob' // Important for file download
        }
      );

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${downloadMonth}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      burgerToast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      burgerToast.error('Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary to-blue-600 p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-full">
            <FaShieldAlt className="text-3xl text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">Manager Settings</h2>
            <p className="text-white/80 text-sm">Manage your group and transfer roles</p>
          </div>
        </div>
      </div>



      {/* Download Report Card */}
      <div className="card bg-base-100 shadow-xl border-2 border-primary/30 hover:border-primary transition-all duration-300">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <FaFileDownload className="text-2xl text-primary" />
            </div>
            <div>
              <h3 className="card-title text-primary">Download Monthly Report</h3>
              <p className="text-sm text-base-content/60">Generate and download detailed PDF report</p>
            </div>
          </div>

          <div className="alert alert-info shadow-lg mb-4">
            <FaInfoCircle className="text-xl" />
            <span className="text-sm">
              Report includes: Financial summary, member details, meal breakdown, and bazar history.
            </span>
          </div>

          <div className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold flex items-center gap-2">
                  <FaDownload />
                  Select Month
                </span>
              </label>
              <input
                type="month"
                className="input input-bordered w-full focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={downloadMonth}
                onChange={(e) => setDownloadMonth(e.target.value)}
              />
            </div>
            
            <button 
              onClick={handleDownloadReport}
              className={`btn btn-primary w-full shadow-md ${downloading ? 'loading' : ''}`}
              disabled={downloading}
            >
              {downloading ? 'Generating PDF...' : (
                <>
                  <FaFileDownload />
                  Download PDF Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Transfer Manager Role Card */}
      <div className="card bg-base-100 shadow-xl border-2 border-warning/30 hover:border-warning transition-all duration-300">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-warning/10 p-3 rounded-full">
              <FaExchangeAlt className="text-2xl text-warning" />
            </div>
            <div>
              <h3 className="card-title text-warning">Transfer Manager Role</h3>
              <p className="text-sm text-base-content/60">Assign manager privileges to another member</p>
            </div>
          </div>

          <div className="alert alert-warning shadow-lg mb-4">
            <FaInfoCircle className="text-xl" />
            <span className="text-sm">
              Warning: You will lose all manager privileges after transferring this role.
            </span>
          </div>

          <form onSubmit={handleTransferManager} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold flex items-center gap-2">
                  <FaUserTie />
                  Select New Manager
                </span>
              </label>
              <select
                className="select select-bordered w-full focus:outline-none focus:border-warning focus:ring-2 focus:ring-warning/20"
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                required
              >
                <option value="">Choose a member...</option>
                {group?.members
                  .filter(member => member.userId !== userData?.uid && member.status === 'active')
                  .map(member => (
                    <option key={member.userId} value={member.userId}>
                      {member.name} ({member.email})
                    </option>
                  ))}
              </select>
            </div>
            <button 
              type="submit" 
              className={`btn btn-warning w-full shadow-md ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? 'Transferring...' : (
                <>
                  <FaExchangeAlt />
                  Transfer Manager Role
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Group Members Card */}
      <div className="card bg-base-100 shadow-xl border-t-4 border-t-primary">
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
          
          <div className="overflow-x-auto hidden sm:block">
            <table className="table table-zebra">
              <thead>
                <tr className="bg-gradient-to-r from-primary to-blue-600 text-white">
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
                  return (
                    <tr
                      key={member.userId}
                      className={`${member.userId === group.managerId ? 'bg-warning/5 border-l-4 border-l-warning' : ''} ${
                        isInactive ? 'opacity-60' : ''
                      } hover:bg-primary/5 transition-colors`}
                    >
                      <td className="font-medium">
                        {member.name}
                        {member.userId === userData?.uid && (
                          <span className="badge badge-sm badge-primary ml-2">You</span>
                        )}
                      </td>
                      <td className="text-base-content/70">{member.email}</td>
                      <td className="text-center">
                        {member.userId === group.managerId ? (
                          <span className="badge badge-warning gap-2 font-semibold"><FaCrown />Manager</span>
                        ) : (
                          <span className="badge badge-ghost">Member</span>
                        )}
                      </td>
                      <td className="text-center">
                        {isInactive ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="badge badge-error gap-1"><FaUserSlash className="text-xs" />Inactive</span>
                            {leftDate && <span className="text-xs text-base-content/60">Left: {leftDate}</span>}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="badge badge-success gap-1"><FaCheckCircle className="text-xs" />Active</span>
                            {rejoinDate && <span className="text-xs text-base-content/60">Rejoined: {rejoinDate}</span>}
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        {member.userId !== userData?.uid && member.userId !== group.managerId && (
                          <button
                            className={`btn btn-xs ${isInactive ? 'btn-success' : 'btn-error'} gap-1`}
                            onClick={() => handleToggleMemberStatus(member)}
                            disabled={togglingMember === member.userId}
                          >
                            {togglingMember === member.userId ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : isInactive ? (
                              <><FaToggleOn /> Activate</>
                            ) : (
                              <><FaToggleOff /> Deactivate</>
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

          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {group?.members.map(member => {
              const isInactive = member.status === 'inactive';
              const leftDate = member.leftAt ? format(new Date(member.leftAt), 'dd MMM yyyy') : null;
              const rejoinDate = member.rejoinedAt ? format(new Date(member.rejoinedAt), 'dd MMM yyyy') : null;
              return (
                <div
                  key={member.userId}
                  className={`card bg-base-200 shadow-md border-l-4 ${
                    member.userId === group.managerId ? 'border-l-warning' : 'border-l-primary/30'
                  } ${isInactive ? 'opacity-60' : ''}`}
                >
                  <div className="card-body p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-base-content">
                          {member.name}
                          {member.userId === userData?.uid && (
                            <span className="badge badge-sm badge-primary ml-2">You</span>
                          )}
                        </p>
                        <p className="text-xs text-base-content/60 mt-0.5">{member.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {member.userId === group.managerId ? (
                          <span className="badge badge-warning gap-1 text-xs"><FaCrown className="text-xs" />Manager</span>
                        ) : (
                          <span className="badge badge-ghost text-xs">Member</span>
                        )}
                        {isInactive ? (
                          <span className="badge badge-error gap-1 text-xs"><FaUserSlash className="text-xs" />Inactive</span>
                        ) : (
                          <span className="badge badge-success gap-1 text-xs"><FaCheckCircle className="text-xs" />Active</span>
                        )}
                      </div>
                    </div>
                    {(leftDate || rejoinDate) && (
                      <p className="text-xs text-base-content/60 mt-1">
                        {leftDate && `Left: ${leftDate}`}{rejoinDate && ` · Rejoined: ${rejoinDate}`}
                      </p>
                    )}
                    {member.userId !== userData?.uid && member.userId !== group.managerId && (
                      <div className="mt-3">
                        <button
                          className={`btn btn-xs w-full ${isInactive ? 'btn-success' : 'btn-error'} gap-1`}
                          onClick={() => handleToggleMemberStatus(member)}
                          disabled={togglingMember === member.userId}
                        >
                          {togglingMember === member.userId ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : isInactive ? (
                            <><FaToggleOn /> Activate</>
                          ) : (
                            <><FaToggleOff /> Deactivate</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerSettings;
