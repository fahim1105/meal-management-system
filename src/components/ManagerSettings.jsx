import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import burgerToast from './BurgerToast';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { FaCrown, FaUsers, FaExchangeAlt, FaInfoCircle, FaShieldAlt, FaUserTie, FaUserSlash, FaCheckCircle, FaDownload, FaFileDownload, FaToggleOn, FaToggleOff, FaCalendarCheck, FaSave, FaUser, FaMoneyBillWave, FaShoppingCart } from 'react-icons/fa';
import { queryKeys, fetchSchedule } from '../lib/queries';
import PendingRequestsList from './PendingRequestsList';

const ManagerSettings = ({ group, onUpdate }) => {
  const [selectedMember, setSelectedMember] = useState('');
  const [loading, setLoading] = useState(false);
  const [togglingMember, setTogglingMember] = useState(null);
  const [downloadMonth, setDownloadMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [downloading, setDownloading] = useState(false);
  const { getAuthHeaders, userData } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentMonth = format(new Date(), 'yyyy-MM');

  const invalidateFinance = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.finance(currentMonth) });
    queryClient.invalidateQueries({ queryKey: queryKeys.summary(currentMonth) });
  };

  // Bazar schedule state
  const [scheduleMonth, setScheduleMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [ranges, setRanges] = useState({});
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Fetch existing schedule for selected month and pre-fill ranges
  const { data: existingSchedule } = useQuery({
    queryKey: queryKeys.schedule(scheduleMonth),
    queryFn: () => fetchSchedule(getAuthHeaders, scheduleMonth),
    enabled: !!group,
  });

  useEffect(() => {
    if (existingSchedule?.ranges?.length) {
      const prefilled = {};
      existingSchedule.ranges.forEach(r => {
        prefilled[r.userId] = {
          fromDate: format(new Date(r.fromDate), 'yyyy-MM-dd'),
          toDate: format(new Date(r.toDate), 'yyyy-MM-dd'),
        };
      });
      setRanges(prefilled);
    } else {
      setRanges({});
    }
  }, [existingSchedule, scheduleMonth]);

  // Deposit & Bazar state
  const [depositUserId, setDepositUserId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [bazarAmount, setBazarAmount] = useState('');
  const [bazarDescription, setBazarDescription] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [bazarLoading, setBazarLoading] = useState(false);

  const [activeManagerTab, setActiveManagerTab] = useState('members');

  const API_URL = import.meta.env.VITE_API_URL;
  const activeMembers = group?.members?.filter(m => m.status === 'active') || [];

  const handleRangeChange = (userId, field, value) => {
    setRanges(prev => ({ ...prev, [userId]: { ...prev[userId], [field]: value } }));
  };

  const handleAddDeposit = async (e) => {
    e.preventDefault();
    setDepositLoading(true);
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_URL}/finance/deposit`, { month: currentMonth, userId: depositUserId, amount: parseFloat(depositAmount) }, { headers });
      burgerToast.success('Deposit added successfully');
      setDepositUserId('');
      setDepositAmount('');
      invalidateFinance();
    } catch { burgerToast.error('Failed to add deposit'); }
    finally { setDepositLoading(false); }
  };

  const handleAddBazar = async (e) => {
    e.preventDefault();
    setBazarLoading(true);
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_URL}/finance/bazar`, { month: currentMonth, amount: parseFloat(bazarAmount), description: bazarDescription }, { headers });
      burgerToast.success('Bazar cost added successfully');
      setBazarAmount('');
      setBazarDescription('');
      invalidateFinance();
    } catch { burgerToast.error('Failed to add bazar cost'); }
    finally { setBazarLoading(false); }
  };

  const handleSaveSchedule = async () => {
    const filled = activeMembers.filter(m => ranges[m.userId]?.fromDate && ranges[m.userId]?.toDate);
    if (!filled.length) { burgerToast.error('Please set at least one member range'); return; }
    for (const m of filled) {
      if (ranges[m.userId].toDate < ranges[m.userId].fromDate) {
        burgerToast.error(`${m.name}: End date must be after start date`); return;
      }
    }
    setSavingSchedule(true);
    try {
      const headers = await getAuthHeaders();
      const payload = filled.map(m => ({ userId: m.userId, fromDate: ranges[m.userId].fromDate, toDate: ranges[m.userId].toDate }));
      await axios.post(`${API_URL}/bazar-schedule`, { month: scheduleMonth, ranges: payload }, { headers });
      burgerToast.success('Schedule saved');
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule(scheduleMonth) });
    } catch (error) {
      burgerToast.error(error.response?.data?.error || 'Failed to save schedule');
    } finally {
      setSavingSchedule(false);
    }
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

  const tabs = [
    { id: 'members', label: 'Members', icon: FaUsers },
    { id: 'finance', label: 'Finance', icon: FaMoneyBillWave },
    { id: 'schedule', label: 'Schedule', icon: FaCalendarCheck },
    { id: 'settings', label: 'Settings', icon: FaShieldAlt },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
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

      {/* Tab Bar */}
      <div className="bg-base-200/60 rounded-2xl p-1.5 flex gap-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveManagerTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
              activeManagerTab === id
                ? 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-md shadow-primary/30 scale-[1.02]'
                : 'text-base-content/50 hover:text-primary hover:bg-primary/10'
            }`}
          >
            <Icon className="text-sm flex-shrink-0" />
            <span className="hidden xs:inline">{label}</span>
          </button>
        ))}
      </div>
      {/* Tab Content */}

      {/* Members Tab */}
      {activeManagerTab === 'members' && (
      <>
      {/* Pending Join Requests */}
      <PendingRequestsList />

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

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
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
                  const isMgr = member.userId === group.managerId;
                  const isMe = member.userId === userData?.uid;
                  return (
                    <tr key={member.userId} className={`${isMgr ? 'bg-warning/5 border-l-4 border-l-warning' : ''} ${isInactive ? 'opacity-60' : ''} hover:bg-primary/5 transition-colors`}>
                      <td className="font-medium">{member.name}{isMe && <span className="badge badge-sm badge-primary ml-2">You</span>}</td>
                      <td className="text-base-content/70 text-sm">{member.email}</td>
                      <td className="text-center">{isMgr ? <span className="badge badge-warning gap-1 font-semibold"><FaCrown className="text-xs" />Manager</span> : <span className="badge badge-ghost">Member</span>}</td>
                      <td className="text-center">
                        {isInactive
                          ? <div className="flex flex-col items-center gap-1"><span className="badge badge-error gap-1"><FaUserSlash className="text-xs" />Inactive</span>{leftDate && <span className="text-xs text-base-content/60">Left: {leftDate}</span>}</div>
                          : <div className="flex flex-col items-center gap-1"><span className="badge badge-success gap-1"><FaCheckCircle className="text-xs" />Active</span>{rejoinDate && <span className="text-xs text-base-content/60">Rejoined: {rejoinDate}</span>}</div>
                        }
                      </td>
                      <td className="text-center">
                        {!isMe && !isMgr && (
                          <button className={`btn btn-xs ${isInactive ? 'btn-success' : 'btn-error'} gap-1`} onClick={() => handleToggleMemberStatus(member)} disabled={togglingMember === member.userId}>
                            {togglingMember === member.userId ? <span className="loading loading-spinner loading-xs"></span> : isInactive ? <><FaToggleOn />Activate</> : <><FaToggleOff />Deactivate</>}
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
                <div key={member.userId} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                  isMgr ? 'border-warning/40 bg-warning/5'
                  : isInactive ? 'border-base-300 bg-base-200/50 opacity-60'
                  : 'border-base-300 bg-base-200/50'
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 font-bold text-sm ${isMgr ? 'bg-warning/20 text-warning' : 'bg-primary/10 text-primary'}`}>
                      {member.photoURL
                        ? <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" />
                        : member.name.charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-base-content">{member.name}</span>
                        {isMe && <span className="badge badge-xs badge-primary">You</span>}
                        {isMgr
                          ? <span className="badge badge-xs badge-warning gap-0.5"><FaCrown className="text-[9px]" />Manager</span>
                          : <span className="badge badge-xs badge-ghost">Member</span>
                        }
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
                      {togglingMember === member.userId
                        ? <span className="loading loading-spinner loading-xs"></span>
                        : isInactive ? <FaToggleOn /> : <FaToggleOff />
                      }
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </>)}

      {/* Finance Tab */}
      {activeManagerTab === 'finance' && (
      <>{/* Add Deposit & Bazar Cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-xl border-2 border-primary/20 hover:border-primary transition-all duration-300">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <FaMoneyBillWave className="text-2xl text-primary" />
              </div>
              <div>
                <h3 className="card-title text-primary">Add Deposit</h3>
                <p className="text-sm text-base-content/60">Record member deposits</p>
              </div>
            </div>
            <form onSubmit={handleAddDeposit} className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Select Member</span></label>
                <select className="select select-bordered w-full focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" value={depositUserId} onChange={(e) => setDepositUserId(e.target.value)} required>
                  <option value="">Choose a member...</option>
                  {group?.members.filter(m => m.status === 'active').map(member => (
                    <option key={member.userId} value={member.userId}>{member.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Amount (৳)</span></label>
                <input type="number" min="0.01" step="0.01" placeholder="Enter amount..." className="input input-bordered w-full focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required />
              </div>
              <button type="submit" className={`btn btn-primary w-full shadow-md ${depositLoading ? 'loading' : ''}`} disabled={depositLoading}>
                {!depositLoading && 'Add Deposit'}
              </button>
            </form>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl border-2 border-primary/20 hover:border-primary transition-all duration-300">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <FaShoppingCart className="text-2xl text-primary" />
              </div>
              <div>
                <h3 className="card-title text-primary">Add Bazar Cost</h3>
                <p className="text-sm text-base-content/60">Record shopping expenses</p>
              </div>
            </div>
            <form onSubmit={handleAddBazar} className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Amount (৳)</span></label>
                <input type="number" min="0.01" step="0.01" placeholder="Enter amount..." className="input input-bordered w-full focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" value={bazarAmount} onChange={(e) => setBazarAmount(e.target.value)} required />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Description</span></label>
                <input type="text" placeholder="e.g., Rice, vegetables, fish..." className="input input-bordered w-full focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" value={bazarDescription} onChange={(e) => setBazarDescription(e.target.value)} />
              </div>
              <button type="submit" className={`btn btn-primary w-full shadow-md ${bazarLoading ? 'loading' : ''}`} disabled={bazarLoading}>
                {!bazarLoading && 'Add Bazar Cost'}
              </button>
            </form>
          </div>
        </div>
      </div>
      </>)}

      {/* Schedule Tab */}
      {activeManagerTab === 'schedule' && (
      <>{/* Bazar Schedule Card */}
      <div className="card bg-base-100 shadow-xl border-2 border-primary/30 hover:border-primary transition-all duration-300">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <FaCalendarCheck className="text-2xl text-primary" />
            </div>
            <div>
              <h3 className="card-title text-primary">Set Bazar Schedule</h3>
              <p className="text-sm text-base-content/60">Assign bazar duty date ranges to members</p>
            </div>
          </div>

          <div className="form-control mb-6">
            <label className="label"><span className="label-text font-semibold">Select Month</span></label>
            <input
              type="month"
              className="input input-bordered w-full sm:max-w-xs focus:border-primary cursor-pointer"
              value={scheduleMonth}
              onChange={e => setScheduleMonth(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {[...activeMembers].sort((a, b) => {
              const aDate = ranges[a.userId]?.fromDate || '';
              const bDate = ranges[b.userId]?.fromDate || '';
              if (!aDate && !bDate) return 0;
              if (!aDate) return 1;
              if (!bDate) return -1;
              return aDate.localeCompare(bDate);
            }).map((member, idx) => (
              <div key={member.userId} className="bg-base-200 hover:bg-primary/5 border border-base-300 hover:border-primary/30 rounded-2xl p-4 transition-all duration-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-primary/10 font-bold text-primary text-sm">
                    {member.photoURL
                      ? <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" />
                      : member.name.charAt(0).toUpperCase()
                    }
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base-content">{member.name}</span>
                      {member.userId === userData?.uid && <span className="badge badge-sm badge-primary">You</span>}
                    </div>
                    <p className="text-xs text-base-content/50">{member.email}</p>
                  </div>
                  {ranges[member.userId]?.fromDate && ranges[member.userId]?.toDate && (
                    <span className="badge badge-success badge-sm ml-auto">Set</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs font-semibold text-base-content/60">From Date</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered input-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={ranges[member.userId]?.fromDate || ''}
                      onChange={e => handleRangeChange(member.userId, 'fromDate', e.target.value)}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs font-semibold text-base-content/60">To Date</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered input-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={ranges[member.userId]?.toDate || ''}
                      min={ranges[member.userId]?.fromDate || ''}
                      onChange={e => handleRangeChange(member.userId, 'toDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            className={`btn btn-primary w-full gap-2 shadow-md ${savingSchedule ? 'loading' : ''}`}
            onClick={handleSaveSchedule}
            disabled={savingSchedule}
          >
            {!savingSchedule && <FaSave />}
            Save Schedule ({activeMembers.filter(m => ranges[m.userId]?.fromDate && ranges[m.userId]?.toDate).length}/{activeMembers.length} set)
          </button>
        </div>
      </div>
      </>)}

      {/* Settings Tab */}
      {activeManagerTab === 'settings' && (
      <>{/* Download Report Card */}
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
      </>)}

    </div>
  );
};

export default ManagerSettings;
