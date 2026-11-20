import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import burgerToast from '../components/BurgerToast';
import { format } from 'date-fns';
import { FaUsers, FaUserPlus, FaKey, FaArrowLeft, FaCheckCircle, FaLock, FaClock, FaTimes, FaHourglassHalf, FaLightbulb } from 'react-icons/fa';
import { queryKeys, fetchMyRequestStatus } from '../lib/queries';
import Swal from 'sweetalert2';

const GroupSetup = () => {
  const [mode, setMode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { getAuthHeaders, fetchUserData, currentUser, userData, userDataLoading, refreshUserToken } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const API_URL = import.meta.env.VITE_API_URL;
  const lastHandledApprovedIdRef = useRef(null);
  const lastHandledRejectIdRef = useRef(null);
  const wasWaitingForApprovalRef = useRef(false);

  // If user is ALREADY active in a group, redirect to Home
  useEffect(() => {
    if (!userDataLoading && userData?.groupId && userData?.isActive) {
      navigate('/', { replace: true });
    }
  }, [userData, userDataLoading, navigate]);

  // Check for pending join request — poll every 2s while on GroupSetup
  const { data: requestStatus, isLoading: requestLoading, refetch: refetchRequestStatus } = useQuery({
    queryKey: queryKeys.myRequestStatus(),
    queryFn: () => fetchMyRequestStatus(getAuthHeaders),
    enabled: !!currentUser,
    staleTime: 0,
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  // Dedicated interval to guarantee polling in all tab states
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      refetchRequestStatus();
    }, 2000);
    return () => clearInterval(interval);
  }, [currentUser, refetchRequestStatus]);

  const hasPendingRequest = requestStatus?.hasRequest && requestStatus?.request?.status === 'pending';

  if (hasPendingRequest && !wasWaitingForApprovalRef.current) {
    wasWaitingForApprovalRef.current = true;
  }

  // Auto-handle when request gets approved or rejected
  useEffect(() => {
    if (!requestStatus?.request) return;

    const request = requestStatus.request;

    if (request.status === 'approved') {
      // If the user was NEVER waiting for an approval, this is an old stale request from a previous group!
      if (!wasWaitingForApprovalRef.current) {
        // Silently clear the stale request from backend so it never causes loops
        const requestId = request._id;
        getAuthHeaders().then((headers) => {
          axios.delete(`${API_URL}/group/cancel-request`, { headers, data: { requestId } })
            .catch(() => { })
            .finally(() => {
              queryClient.removeQueries({ queryKey: queryKeys.myRequestStatus() });
              queryClient.invalidateQueries({ queryKey: queryKeys.myRequestStatus() });
            });
        });
        return;
      }

      if (lastHandledApprovedIdRef.current === request._id) return;
      lastHandledApprovedIdRef.current = request._id;

      burgerToast.success('Your join request was approved! Welcome to the group 🎉');
      wasWaitingForApprovalRef.current = false;

      // Clean up the approved request in backend safely
      const requestId = request._id;
      getAuthHeaders().then((headers) => {
        axios.delete(`${API_URL}/group/cancel-request`, { headers, data: { requestId } })
          .catch(() => { });
      });

      // Clear the query from cache so it doesn't re-trigger
      queryClient.removeQueries({ queryKey: queryKeys.myRequestStatus() });

      // Refresh user token and data, then navigate to Home dashboard ("/")
      (async () => {
        try {
          if (currentUser) {
            await currentUser.getIdToken(true);
            await fetchUserData(currentUser);
          }
          await queryClient.invalidateQueries({ queryKey: queryKeys.group() });
          navigate('/', { replace: true });
        } catch (err) {
          console.error('Failed to refresh after approval:', err);
          navigate('/', { replace: true });
        }
      })();
    } else if (request.status === 'rejected') {
      if (lastHandledRejectIdRef.current === request._id) return;
      lastHandledRejectIdRef.current = request._id;
      wasWaitingForApprovalRef.current = false;

      const reason = request.rejectionReason;
      const rejectMessage = reason
        ? `Join request was rejected: ${reason}`
        : 'Your join request was not approved by the group manager.';
      burgerToast.error(rejectMessage);

      // Clean up the rejected request from backend and cache
      const requestId = request._id;
      getAuthHeaders().then((headers) => {
        axios.delete(`${API_URL}/group/cancel-request`, { headers, data: { requestId } })
          .catch((err) => console.error('Failed to clear rejected request:', err))
          .finally(() => {
            queryClient.removeQueries({ queryKey: queryKeys.myRequestStatus() });
            queryClient.invalidateQueries({ queryKey: queryKeys.myRequestStatus() });
            setMode('');
            navigate('/group-setup', { replace: true });
          });
      });
    }
  }, [requestStatus]);

  // Cancel request mutation
  const cancelMutation = useMutation({
    mutationFn: async (requestId) => {
      const headers = await getAuthHeaders();
      const res = await axios.delete(
        `${API_URL}/group/cancel-request`,
        { headers, data: { requestId } }
      );
      return res.data;
    },
    onSuccess: () => {
      wasWaitingForApprovalRef.current = false;
      queryClient.invalidateQueries({
        queryKey: queryKeys.myRequestStatus()
      });
      burgerToast.success('Request cancelled');
      setMode(''); // Reset to mode selection
    },
    onError: () => {
      burgerToast.error('Failed to cancel request');
    },
  });

  const handleCancelRequest = async () => {
    const result = await Swal.fire({
      title: 'Cancel Join Request?',
      text: 'Are you sure you want to cancel your join request?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Cancel',
      cancelButtonText: 'Keep Request',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'btn btn-error',
        cancelButton: 'btn btn-ghost'
      }
    });

    if (result.isConfirmed) {
      cancelMutation.mutate(requestStatus.request._id);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();

    // Check if user has pending request
    if (hasPendingRequest) {
      burgerToast.error('You have a pending join request. Cancel it first to create a group.');
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_URL}/group/create`, { name: groupName }, { headers });

      // Refresh token to get updated custom claims
      await refreshUserToken();

      burgerToast.success('Group created successfully!');
      navigate('/');
    } catch (error) {
      burgerToast.error(error.response?.data?.error || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();

    // Check if user has pending request
    if (hasPendingRequest) {
      burgerToast.error('You already have a pending join request. Cancel it first to join another group.');
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_URL}/group/request-join`, { groupCode }, { headers });

      wasWaitingForApprovalRef.current = true;
      burgerToast.success('Join request submitted! Waiting for manager approval.');

      // Invalidate request status to show pending state
      queryClient.invalidateQueries({
        queryKey: queryKeys.myRequestStatus()
      });

      setMode(''); // Reset to show pending state
    } catch (error) {
      burgerToast.error(error.response?.data?.error || 'Failed to submit join request');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <div className="min-h-screen bg-base-100 py-12 px-4">
      <div className="w-full max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8 animate-fadeIn">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-3">
            Group Setup
          </h1>
          <p className="text-base-content/70 text-lg">
            {hasPendingRequest ? 'Your join request is pending approval' : 'Create a new group or join an existing one to get started'}
          </p>
        </div>

        {/* Pending Request State */}
        {hasPendingRequest && (
          <div className="card bg-base-100 shadow-2xl border-t-4 border-t-warning max-w-2xl mx-auto animate-fadeIn mb-6">
            <div className="card-body p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-warning/10 p-3 rounded-full">
                  <FaHourglassHalf className="text-3xl text-warning animate-pulse" />
                </div>
                <div>
                  <h2 className="card-title text-2xl font-bold text-warning">Join Request Pending</h2>
                  <p className="text-sm text-base-content/70">Waiting for manager approval</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="alert bg-warning/10 border-warning/30">
                  <FaClock className="text-warning" />
                  <div className="text-sm">
                    <p className="font-semibold text-warning">Request Status: Pending</p>
                    <p className="text-base-content/70">
                      Requested: {format(new Date(requestStatus.request.requestedAt), 'MMM dd, yyyy • hh:mm a')}
                    </p>
                  </div>
                </div>

                <div className="bg-base-200 p-4 rounded-xl">
                  <p className="text-sm text-base-content/70 mb-3">
                    ⚠️ While your request is pending, you cannot:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2 text-base-content/60">
                      <FaTimes className="text-error" />
                      <span>Create a new group</span>
                    </li>
                    <li className="flex items-center gap-2 text-base-content/60">
                      <FaTimes className="text-error" />
                      <span>Join another group</span>
                    </li>
                  </ul>
                  <p className="text-sm text-base-content/70 mt-3">
                    ✓ You can cancel your request to take other actions
                  </p>
                </div>

                <button
                  className={`btn btn-error btn-block ${cancelMutation.isPending ? 'loading' : ''}`}
                  onClick={handleCancelRequest}
                  disabled={cancelMutation.isPending}
                >
                  {!cancelMutation.isPending && (
                    <>
                      <FaTimes />
                      Cancel Join Request
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mode Selection - Disabled if pending request */}
        {!mode && !hasPendingRequest && (
          <div className="grid md:grid-cols-2 gap-6 animate-fadeIn">
            {/* Create Group Card */}
            <div
              className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-primary/20 hover:border-primary cursor-pointer group"
              onClick={() => setMode('create')}
            >
              <div className="card-body items-center text-center p-8">
                <div className="bg-primary p-6 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  <FaUsers className="text-5xl text-white" />
                </div>
                <h2 className="card-title text-2xl font-bold text-primary mb-2">
                  Create New Group
                </h2>
                <p className="text-base-content/70 mb-4">
                  Start your own mess group and invite members to join
                </p>
                <ul className="text-left space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm">
                    <FaCheckCircle className="text-success" />
                    <span>You'll be the group manager</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <FaCheckCircle className="text-success" />
                    <span>Get a unique group code</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <FaCheckCircle className="text-success" />
                    <span>Full control over settings</span>
                  </li>
                </ul>
                <button className="btn bg-gradient-to-br from-primary to-primary/80 border-none text-white btn-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                  <FaUserPlus className="text-lg" />
                  Create Group
                </button>
              </div>
            </div>

            {/* Join Group Card */}
            <div
              className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-secondary/20 hover:border-secondary cursor-pointer group"
              onClick={() => setMode('join')}
            >
              <div className="card-body items-center text-center p-8">
                <div className="bg-secondary p-6 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  <FaKey className="text-5xl text-white" />
                </div>
                <h2 className="card-title text-2xl font-bold text-secondary mb-2">
                  Join Existing Group
                </h2>
                <p className="text-base-content/70 mb-4">
                  Enter a group code to join an existing mess group
                </p>
                <ul className="text-left space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm">
                    <FaCheckCircle className="text-success" />
                    <span>Quick and easy setup</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <FaCheckCircle className="text-success" />
                    <span>Join with a code</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <FaCheckCircle className="text-success" />
                    <span>Start tracking meals instantly</span>
                  </li>
                </ul>
                <button className="btn bg-gradient-to-br from-secondary to-secondary/80 border-none text-white btn-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                  <FaKey className="text-lg" />
                  Join Group
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Group Form */}
        {mode === 'create' && (
          <div className="relative max-w-2xl mx-auto animate-fadeIn group-setup-form">
            {/* Premium Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl blur-2xl"></div>

            <div className="relative card bg-base-100 shadow-2xl border-2 border-primary/30 max-w-2xl mx-auto overflow-hidden rounded-3xl">
              {/* Decorative Top Border Gradient */}
              <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary"></div>

              <div className="card-body p-8 md:p-10">
                {/* Header with Premium Icon */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-lg animate-pulse"></div>
                    <div className="relative bg-gradient-to-br from-primary via-primary to-[var(--group-setup-primary-light)] p-4 rounded-2xl shadow-xl">
                      <FaUsers className="text-4xl text-white drop-shadow-lg" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-[var(--group-setup-text)] mb-1">
                      Create New Group
                    </h2>
                    <p className="text-sm text-[var(--group-setup-text-muted)]">Set up your mess management group</p>
                  </div>
                </div>

                <form onSubmit={handleCreateGroup} className="space-y-6">
                  {/* Premium Input Field */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-base flex items-center gap-2 text-[var(--group-setup-text)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        Group Name
                      </span>
                      <span className="label-text-alt badge badge-error badge-sm">Required</span>
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        placeholder="e.g., Dhaka Mess, Bachelor's Paradise"
                        className="input input-bordered input-lg w-full focus:input-primary focus:shadow-lg focus:shadow-primary/20 transition-all duration-300 pr-12 bg-base-100 border-2 text-[var(--group-setup-text)]"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        required
                      />
                      {groupName && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <FaCheckCircle className="text-success text-xl animate-fadeIn" />
                        </div>
                      )}
                    </div>
                    <label className="label">
                      <span className="label-text-alt text-[var(--group-setup-text-muted)] flex items-center gap-1.5">
                        <FaLightbulb className="text-primary/70" />
                        Choose a memorable name for your group
                      </span>
                    </label>
                  </div>

                  {/* Premium Info Card */}
                  <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent p-5">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/15 rounded-full blur-3xl"></div>
                    <div className="relative flex items-start gap-4">
                      <div className="bg-primary/25 p-3 rounded-xl flex-shrink-0 shadow-md">
                        <FaLock className="text-primary text-xl" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[var(--group-setup-text)] mb-1 flex items-center gap-2">
                          You'll be the manager
                          <span className="badge bg-primary/80 text-white border-none badge-xs shadow-sm">Admin</span>
                        </p>
                        <p className="text-sm text-[var(--group-setup-text-muted)]">
                          You'll receive a unique code to share with members
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Premium Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      className="btn btn-lg flex-1 bg-base-200 hover:bg-base-300 border-2 border-base-300 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-[var(--group-setup-text)]"
                      onClick={() => setMode('')}
                    >
                      <FaArrowLeft className="text-lg" />
                      <span className="hidden sm:inline">Back</span>
                    </button>
                    <button
                      type="submit"
                      className={`btn btn-lg flex-[2] bg-gradient-to-br from-[var(--group-setup-primary)] via-primary to-[var(--group-setup-primary-light)] border-none text-white shadow-xl hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] ${loading ? 'loading' : ''}`}
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="loading loading-spinner loading-md"></span>
                      ) : (
                        <>
                          <FaUserPlus className="text-lg drop-shadow" />
                          Create Group
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Bottom Decorative Pattern */}
              <div className="h-2 bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
            </div>
          </div>
        )}

        {/* Join Group Form */}
        {mode === 'join' && (
          <div className="relative max-w-2xl mx-auto animate-fadeIn group-setup-form">
            {/* Premium Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-secondary/10 to-transparent rounded-3xl blur-2xl"></div>

            <div className="relative card bg-base-100 shadow-2xl border-2 border-secondary/30 max-w-2xl mx-auto overflow-hidden rounded-3xl">
              {/* Decorative Top Border Gradient */}
              <div className="h-2 bg-gradient-to-r from-secondary via-secondary/80 to-secondary"></div>

              <div className="card-body p-8 md:p-10">
                {/* Header with Premium Icon */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-secondary/30 rounded-2xl blur-lg animate-pulse"></div>
                    <div className="relative bg-gradient-to-br from-secondary via-secondary to-[var(--group-setup-secondary-light)] p-4 rounded-2xl shadow-xl">
                      <FaKey className="text-4xl text-white drop-shadow-lg" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-[var(--group-setup-text)] mb-1">
                      Join Existing Group
                    </h2>
                    <p className="text-sm text-[var(--group-setup-text-muted)]">Enter the group code to join</p>
                  </div>
                </div>

                <form onSubmit={handleJoinGroup} className="space-y-6">
                  {/* Premium Code Input Field */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-base flex items-center gap-2 text-[var(--group-setup-text)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                        Group Code
                      </span>
                      <span className="label-text-alt badge badge-error badge-sm">Required</span>
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        placeholder="ABC123"
                        className="input input-bordered input-lg w-full focus:input-secondary focus:shadow-lg focus:shadow-secondary/20 transition-all duration-300 font-mono text-center text-3xl tracking-[0.5em] uppercase bg-base-100 border-2 font-bold text-[var(--group-setup-text)]"
                        value={groupCode}
                        onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        required
                        style={{ letterSpacing: groupCode.length > 0 ? '0.5em' : '0.2em' }}
                      />
                      {groupCode.length === 6 && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <FaCheckCircle className="text-success text-2xl animate-fadeIn drop-shadow" />
                        </div>
                      )}
                      {/* Code Length Indicator */}
                      {groupCode.length > 0 && groupCode.length < 6 && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--group-setup-text-muted)] text-sm font-normal">
                          {groupCode.length}/6
                        </div>
                      )}
                    </div>
                    <label className="label">
                      <span className="label-text-alt text-[var(--group-setup-text-muted)] flex items-center gap-1.5">
                        <FaLightbulb className="text-secondary/70" />
                        Ask your group manager for the 6-character code
                      </span>
                    </label>
                  </div>

                  {/* Premium Info Card */}
                  <div className="relative overflow-hidden rounded-2xl border-2 border-secondary/30 bg-gradient-to-br from-secondary/15 via-secondary/8 to-transparent p-5">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/15 rounded-full blur-3xl"></div>
                    <div className="relative flex items-start gap-4">
                      <div className="bg-secondary/25 p-3 rounded-xl flex-shrink-0 shadow-md">
                        <FaCheckCircle className="text-secondary text-xl" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[var(--group-setup-text)] mb-1 flex items-center gap-2">
                          Manager Approval Required
                          <span className="badge bg-secondary/80 text-white border-none badge-xs shadow-sm">Pending</span>
                        </p>
                        <p className="text-sm text-[var(--group-setup-text-muted)]">
                          Your request will be reviewed by the group manager
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Premium Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      className="btn btn-lg flex-1 bg-base-200 hover:bg-base-300 border-2 border-base-300 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-[var(--group-setup-text)]"
                      onClick={() => setMode('')}
                    >
                      <FaArrowLeft className="text-lg" />
                      <span className="hidden sm:inline">Back</span>
                    </button>
                    <button
                      type="submit"
                      className={`btn btn-lg flex-[2] bg-gradient-to-br from-[var(--group-setup-secondary)] via-secondary to-[var(--group-setup-secondary-light)] border-none text-white shadow-xl hover:shadow-2xl hover:shadow-secondary/40 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] ${loading ? 'loading' : ''}`}
                      disabled={loading || groupCode.length !== 6}
                    >
                      {loading ? (
                        <span className="loading loading-spinner loading-md"></span>
                      ) : (
                        <>
                          <FaKey className="text-lg drop-shadow" />
                          Request to Join
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Bottom Decorative Pattern */}
              <div className="h-2 bg-gradient-to-r from-transparent via-secondary/40 to-transparent"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupSetup;
