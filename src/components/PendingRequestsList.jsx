import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { FaUserPlus, FaCheck, FaTimes, FaClock, FaInbox } from 'react-icons/fa';
import burgerToast from './BurgerToast';
import Swal from 'sweetalert2';
import { queryKeys, fetchJoinRequests } from '../lib/queries';

const PendingRequestsList = () => {
  const { getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const API_URL = import.meta.env.VITE_API_URL;
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  // Fetch pending join requests
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.joinRequests('pending'),
    queryFn: () => fetchJoinRequests(getAuthHeaders, 'pending'),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Auto-refetch every minute
  });

  // Approve request mutation
  const approveMutation = useMutation({
    mutationFn: async (requestId) => {
      const headers = await getAuthHeaders();
      const res = await axios.post(
        `${API_URL}/group/approve-request`,
        { requestId },
        { headers }
      );
      return res.data;
    },
    onMutate: async (requestId) => {
      setApprovingId(requestId);
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.joinRequests('pending') 
      });
      
      // Snapshot previous value
      const previousRequests = queryClient.getQueryData(
        queryKeys.joinRequests('pending')
      );
      
      // Optimistically update
      queryClient.setQueryData(
        queryKeys.joinRequests('pending'),
        (old) => ({
          ...old,
          joinRequests: old.joinRequests.filter(r => r._id !== requestId),
          count: old.count - 1,
        })
      );
      
      return { previousRequests };
    },
    onError: (err, requestId, context) => {
      // Rollback on error
      queryClient.setQueryData(
        queryKeys.joinRequests('pending'),
        context.previousRequests
      );
      const message = err.response?.data?.error || 'Failed to approve request';
      burgerToast.error(message);
      setApprovingId(null);
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.joinRequests() 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.group() 
      });
      burgerToast.success('Request approved!');
      setApprovingId(null);
    },
  });

  // Reject request mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }) => {
      const headers = await getAuthHeaders();
      const res = await axios.post(
        `${API_URL}/group/reject-request`,
        { requestId, reason },
        { headers }
      );
      return res.data;
    },
    onMutate: async ({ requestId }) => {
      setRejectingId(requestId);
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.joinRequests('pending') 
      });
      
      const previousRequests = queryClient.getQueryData(
        queryKeys.joinRequests('pending')
      );
      
      queryClient.setQueryData(
        queryKeys.joinRequests('pending'),
        (old) => ({
          ...old,
          joinRequests: old.joinRequests.filter(r => r._id !== requestId),
          count: old.count - 1,
        })
      );
      
      return { previousRequests };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(
        queryKeys.joinRequests('pending'),
        context.previousRequests
      );
      const message = err.response?.data?.error || 'Failed to reject request';
      burgerToast.error(message);
      setRejectingId(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.joinRequests() 
      });
      burgerToast.success('Request rejected');
      setRejectingId(null);
    },
  });

  const handleApprove = (requestId) => {
    approveMutation.mutate(requestId);
  };

  const handleReject = async (requestId) => {
    const result = await Swal.fire({
      title: 'Reject Join Request?',
      text: 'Are you sure you want to reject this join request?',
      input: 'textarea',
      inputLabel: 'Rejection Reason (Optional)',
      inputPlaceholder: 'Enter reason for rejection...',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Reject',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: { 
        popup: 'rounded-2xl', 
        confirmButton: 'btn btn-error', 
        cancelButton: 'btn btn-ghost' 
      }
    });

    if (result.isConfirmed) {
      rejectMutation.mutate({ 
        requestId, 
        reason: result.value || null 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  const requests = data?.joinRequests || [];

  if (requests.length === 0) {
    return (
      <div className="card bg-base-100 shadow-xl border-t-4 border-t-primary">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <FaUserPlus className="text-2xl text-primary" />
            </div>
            <div>
              <h2 className="card-title text-primary">Pending Join Requests</h2>
              <p className="text-sm text-base-content/60">Review and approve membership requests</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-base-content/40">
            <FaInbox className="text-6xl mb-4" />
            <p className="text-lg font-semibold">No pending requests</p>
            <p className="text-sm">New join requests will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl border-t-4 border-t-primary">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-3 rounded-full">
              <FaUserPlus className="text-2xl text-primary" />
            </div>
            <div>
              <h2 className="card-title text-primary">
                Pending Join Requests
                <span className="badge badge-primary badge-lg">{requests.length}</span>
              </h2>
              <p className="text-sm text-base-content/60">Review and approve membership requests</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {requests.map((request) => (
            <div 
              key={request._id} 
              className="card bg-base-200 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <div className="card-body p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="avatar placeholder">
                      <div className="bg-primary text-primary-content rounded-full w-12 h-12">
                        {request.userPhotoURL ? (
                          <img src={request.userPhotoURL} alt={request.userName} />
                        ) : (
                          <span className="text-xl font-bold">
                            {request.userName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base-content text-lg">
                        {request.userName}
                      </p>
                      <p className="text-sm text-base-content/60 truncate">
                        {request.userEmail}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <FaClock className="text-xs text-base-content/40" />
                        <span className="text-xs text-base-content/40">
                          {format(new Date(request.requestedAt), 'MMM dd, yyyy • hh:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 shrink-0">
                    <button
                      className={`btn btn-success btn-sm gap-2 ${
                        approvingId === request._id ? 'loading' : ''
                      }`}
                      onClick={() => handleApprove(request._id)}
                      disabled={approvingId === request._id || rejectingId === request._id}
                    >
                      {approvingId !== request._id && (
                        <>
                          <FaCheck className="text-sm" />
                          Approve
                        </>
                      )}
                    </button>
                    <button
                      className={`btn btn-error btn-sm gap-2 ${
                        rejectingId === request._id ? 'loading' : ''
                      }`}
                      onClick={() => handleReject(request._id)}
                      disabled={approvingId === request._id || rejectingId === request._id}
                    >
                      {rejectingId !== request._id && (
                        <>
                          <FaTimes className="text-sm" />
                          Reject
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PendingRequestsList;
