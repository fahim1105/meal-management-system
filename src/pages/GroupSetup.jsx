import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import burgerToast from '../components/BurgerToast';
import { format } from 'date-fns';
import { FaUsers, FaUserPlus, FaKey, FaArrowLeft, FaCheckCircle, FaLock, FaClock, FaTimes, FaHourglassHalf } from 'react-icons/fa';
import { queryKeys, fetchMyRequestStatus } from '../lib/queries';
import Swal from 'sweetalert2';

const GroupSetup = () => {
  const [mode, setMode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { getAuthHeaders, fetchUserData, currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const API_URL = import.meta.env.VITE_API_URL;

  // Check for pending join request
  const { data: requestStatus, isLoading: requestLoading } = useQuery({
    queryKey: queryKeys.myRequestStatus(),
    queryFn: () => fetchMyRequestStatus(getAuthHeaders),
    enabled: !userData?.groupId, // Only check if user has no group
  });

  const hasPendingRequest = requestStatus?.hasRequest && requestStatus?.request?.status === 'pending';

  // Already in a group — redirect to dashboard
  useEffect(() => {
    if (userData?.groupId) navigate('/dashboard');
  }, [userData]);

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
      
      if (currentUser) await fetchUserData(currentUser);
      
      burgerToast.success('Group created successfully!');
      navigate('/dashboard');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-base-200 via-base-100 to-base-200 py-12 px-4">
        <div className="w-full max-w-5xl">
          {/* Header Section */}
          <div className="text-center mb-8 animate-fadeIn">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-3">
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
                  <div className="bg-gradient-to-br from-primary to-blue-600 p-6 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
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
                  <button className="btn btn-primary btn-wide shadow-lg">
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
                  <div className="bg-gradient-to-br from-secondary to-purple-600 p-6 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
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
                  <button className="btn btn-secondary btn-wide shadow-lg">
                    <FaKey className="text-lg" />
                    Join Group
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create Group Form */}
          {mode === 'create' && (
            <div className="card bg-base-100 shadow-2xl border-t-4 border-t-primary max-w-2xl mx-auto animate-fadeIn">
              <div className="card-body p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <FaUsers className="text-3xl text-primary" />
                  </div>
                  <div>
                    <h2 className="card-title text-2xl font-bold text-primary">Create New Group</h2>
                    <p className="text-sm text-base-content/70">Set up your mess management group</p>
                  </div>
                </div>

                <form onSubmit={handleCreateGroup} className="space-y-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-base">Group Name</span>
                      <span className="label-text-alt text-error">Required</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Dhaka Mess, Bachelor's Paradise"
                      className="input input-bordered input-lg focus:input-primary"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      required
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">
                        Choose a memorable name for your group
                      </span>
                    </label>
                  </div>

                  <div className="alert bg-primary/10 border-primary/30">
                    <FaLock className="text-primary" />
                    <div className="text-sm">
                      <p className="font-semibold text-primary">You'll be the manager</p>
                      <p className="text-base-content/70">You'll receive a unique code to share with members</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      className="btn btn-ghost flex-1"
                      onClick={() => setMode('')}
                    >
                      <FaArrowLeft />
                      Back
                    </button>
                    <button 
                      type="submit" 
                      className={`btn btn-primary flex-1 shadow-lg ${loading ? 'loading' : ''}`}
                      disabled={loading}
                    >
                      {loading ? 'Creating...' : (
                        <>
                          <FaUserPlus />
                          Create Group
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Join Group Form */}
          {mode === 'join' && (
            <div className="card bg-base-100 shadow-2xl border-t-4 border-t-secondary max-w-2xl mx-auto animate-fadeIn">
              <div className="card-body p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-secondary/10 p-3 rounded-full">
                    <FaKey className="text-3xl text-secondary" />
                  </div>
                  <div>
                    <h2 className="card-title text-2xl font-bold text-secondary">Join Existing Group</h2>
                    <p className="text-sm text-base-content/70">Enter the group code to join</p>
                  </div>
                </div>

                <form onSubmit={handleJoinGroup} className="space-y-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-base">Group Code</span>
                      <span className="label-text-alt text-error">Required</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter 6-character code (e.g., ABC123)"
                      className="input input-bordered input-lg focus:input-secondary font-mono text-center text-2xl tracking-widest uppercase"
                      value={groupCode}
                      onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      required
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">
                        Ask your group manager for the code
                      </span>
                    </label>
                  </div>

                  <div className="alert bg-secondary/10 border-secondary/30">
                    <FaCheckCircle className="text-secondary" />
                    <div className="text-sm">
                      <p className="font-semibold text-secondary">Manager Approval Required</p>
                      <p className="text-base-content/70">Your request will be reviewed by the group manager</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      className="btn btn-ghost flex-1"
                      onClick={() => setMode('')}
                    >
                      <FaArrowLeft />
                      Back
                    </button>
                    <button 
                      type="submit" 
                      className={`btn btn-secondary flex-1 shadow-lg ${loading ? 'loading' : ''}`}
                      disabled={loading}
                    >
                      {loading ? 'Submitting Request...' : (
                        <>
                          <FaKey />
                          Request to Join
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
  );
};

export default GroupSetup;
