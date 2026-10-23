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

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.joinRequests('pending'),
    queryFn: () => fetchJoinRequests(getAuthHeaders, 'pending'),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId) => {
      const headers = await getAuthHeaders();
      const res = await axios.post(`${API_URL}/group/approve-request`, { requestId }, { headers });
      return res.data;
    },
    onMutate: async (requestId) => {
      setApprovingId(requestId);
      await queryClient.cancelQueries({ queryKey: queryKeys.joinRequests('pending') });
      const previousRequests = queryClient.getQueryData(queryKeys.joinRequests('pending'));
      queryClient.setQueryData(queryKeys.joinRequests('pending'), (old) => ({
        ...old,
        joinRequests: old.joinRequests.filter((r) => r._id !== requestId),
        count: old.count - 1,
      }));
      return { previousRequests };
    },
    onError: (err, _id, context) => {
      queryClient.setQueryData(queryKeys.joinRequests('pending'), context.previousRequests);
      burgerToast.error(err.response?.data?.error || 'Failed to approve request');
      setApprovingId(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.joinRequests() });
      queryClient.invalidateQueries({ queryKey: queryKeys.group() });
      burgerToast.success('Request approved!');
      setApprovingId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }) => {
      const headers = await getAuthHeaders();
      const res = await axios.post(`${API_URL}/group/reject-request`, { requestId, reason }, { headers });
      return res.data;
    },
    onMutate: async ({ requestId }) => {
      setRejectingId(requestId);
      await queryClient.cancelQueries({ queryKey: queryKeys.joinRequests('pending') });
      const previousRequests = queryClient.getQueryData(queryKeys.joinRequests('pending'));
      queryClient.setQueryData(queryKeys.joinRequests('pending'), (old) => ({
        ...old,
        joinRequests: old.joinRequests.filter((r) => r._id !== requestId),
        count: old.count - 1,
      }));
      return { previousRequests };
    },
    onError: (err, _vars, context) => {
      queryClient.setQueryData(queryKeys.joinRequests('pending'), context.previousRequests);
      burgerToast.error(err.response?.data?.error || 'Failed to reject request');
      setRejectingId(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.joinRequests() });
      burgerToast.success('Request rejected');
      setRejectingId(null);
    },
  });

  const handleApprove = (requestId) => approveMutation.mutate(requestId);

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
      customClass: { popup: 'rounded-2xl' },
    });
    if (result.isConfirmed) {
      rejectMutation.mutate({ requestId, reason: result.value || null });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const requests = data?.joinRequests || [];

  return (
    <div className="rounded-2xl overflow-hidden shadow-xl border border-base-200">
      {/* Header */}
      <div className="bg-primary px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-white/20 p-2.5 rounded-xl shrink-0">
            <FaUserPlus className="text-white text-lg" />
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-bold text-base leading-tight">Pending Join Requests</h3>
            <p className="text-white/70 text-xs mt-0.5">Review and approve membership requests</p>
          </div>
        </div>
        {requests.length > 0 && (
          <span className="bg-white text-primary font-bold text-sm px-3 py-1 rounded-full shrink-0">
            {requests.length}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="bg-base-100">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-base-content/30 px-4">
            <FaInbox className="text-5xl mb-3" />
            <p className="font-semibold text-base">No pending requests</p>
            <p className="text-sm mt-1">New join requests will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-base-200">
            {requests.map((request) => {
              const isBusy = approvingId === request._id || rejectingId === request._id;
              return (
                <div key={request._id} className="p-4">
                  {/* Top row: avatar + info */}
                  <div className="flex items-center gap-3 mb-3">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
                      {request.userPhotoURL
                        ? <img src={request.userPhotoURL} alt={request.userName} className="w-full h-full object-cover" />
                        : request.userName.charAt(0).toUpperCase()
                      }
                    </div>

                    {/* Name + email + time */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base-content text-sm leading-tight truncate">
                        {request.userName}
                      </p>
                      <p className="text-xs text-base-content/50 truncate mt-0.5">
                        {request.userEmail}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <FaClock className="text-[10px] text-base-content/30 shrink-0" />
                        <span className="text-[11px] text-base-content/40">
                          {format(new Date(request.requestedAt), 'MMM dd, yyyy • hh:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom row: full-width action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(request._id)}
                      disabled={isBusy}
                      className="flex-1 btn btn-success btn-sm gap-1.5 text-white"
                    >
                      {approvingId === request._id
                        ? <span className="loading loading-spinner loading-xs" />
                        : <><FaCheck className="text-xs" /> Approve</>
                      }
                    </button>
                    <button
                      onClick={() => handleReject(request._id)}
                      disabled={isBusy}
                      className="flex-1 btn btn-error btn-sm gap-1.5"
                    >
                      {rejectingId === request._id
                        ? <span className="loading loading-spinner loading-xs" />
                        : <><FaTimes className="text-xs" /> Reject</>
                      }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingRequestsList;
