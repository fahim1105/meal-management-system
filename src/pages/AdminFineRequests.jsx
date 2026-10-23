import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import axios from 'axios';
import burgerToast from '../components/BurgerToast';
import Swal from 'sweetalert2';
import LottieLoader from '../components/LottieLoader';
import { queryKeys, fetchGroup, fetchFines } from '../lib/queries';
import { FaGavel, FaCheck, FaTimes, FaUser, FaClock, FaImage } from 'react-icons/fa';
import PageTitle from '../components/Admin/PageTitle';
import MemberAvatar from '../components/Admin/MemberAvatar';

const AdminFineRequests = () => {
  const [fineReviewingId, setFineReviewingId] = useState(null);
  const [fineModalImageUrl, setFineModalImageUrl] = useState(null);

  const { userData, getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const currentMonth = format(new Date(), 'yyyy-MM');

  const API_URL = import.meta.env.VITE_API_URL;

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: queryKeys.group(),
    queryFn: () => fetchGroup(getAuthHeaders),
    enabled: !!userData?.groupId,
    refetchInterval: 1000 * 15,
  });

  const { data: fineData, isLoading: finesLoading } = useQuery({
    queryKey: queryKeys.fines(currentMonth),
    queryFn: () => fetchFines(getAuthHeaders, currentMonth),
    enabled: !!group,
    refetchInterval: 1000 * 10,
  });

  const pendingFines = fineData?.pending || [];

  const invalidateFines = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.fines(currentMonth) });
    queryClient.invalidateQueries({ queryKey: queryKeys.fineSummary(currentMonth) });
  };

  const handleFineApprove = async (id) => {
    setFineReviewingId(id);
    try {
      const headers = await getAuthHeaders();
      await axios.patch(`${API_URL}/fine/${id}/approve`, {}, { headers });
      burgerToast.success('Fine approved successfully');
      invalidateFines();
    } catch (err) {
      burgerToast.error(err.response?.data?.error || 'Approve failed');
    } finally {
      setFineReviewingId(null);
    }
  };

  const handleFineReject = async (fine) => {
    const result = await Swal.fire({
      title: 'Reject Fine Request?',
      input: 'textarea',
      inputLabel: 'Note for requester (optional)',
      inputPlaceholder: 'Why rejected...',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Reject',
      customClass: { popup: 'rounded-2xl' },
    });
    if (!result.isConfirmed) return;
    setFineReviewingId(fine._id);
    try {
      const headers = await getAuthHeaders();
      await axios.patch(`${API_URL}/fine/${fine._id}/reject`, { rejectReason: result.value || '' }, { headers });
      burgerToast.success('Request rejected');
      invalidateFines();
    } catch (err) {
      burgerToast.error(err.response?.data?.error || 'Rejection failed');
    } finally {
      setFineReviewingId(null);
    }
  };

  if (groupLoading || finesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <LottieLoader size={270} />
      </div>
    );
  }

  const pendingCount = pendingFines.length;

  return (
    <div className="container mx-auto px-3.5 lg:px-5 py-[14px] lg:py-[22px] max-w-[1040px]" style={{ paddingBottom: 'calc(88px + 24px + env(safe-area-inset-bottom, 0px))' }}>
      <PageTitle 
        icon={FaGavel}
        title="Pending Fine Requests"
        subtitle="Approve or reject fine requests from members"
        badge={
          <span 
            className="text-[12px] font-[700] rounded-full px-[10px] py-[2px] shrink-0"
            style={{ 
              background: pendingCount > 0 ? 'var(--color-neutral)' : 'var(--ad-tile)',
              color: pendingCount > 0 ? 'var(--ad-on-strong)' : 'var(--color-base-content)'
            }}
          >
            {pendingCount} pending
          </span>
        }
      />

      {pendingFines.length === 0 ? (
        <div className="bg-base-200 border border-base-content/15 rounded-[18px] p-[56px_20px] flex flex-col items-center justify-center text-center">
          <div 
            className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center mb-4"
            style={{ background: 'var(--ad-tile)' }}
          >
            <FaGavel className="text-[34px] text-base-content" />
          </div>
          <p className="text-[22px] font-[700] text-base-content mb-1">No pending requests</p>
          <p className="text-base-content/70">All requests have been reviewed</p>
        </div>
      ) : (
        <div className="space-y-[12px]">
          {pendingFines.map((f) => {
            const member = group?.members?.find(m => m.userId === f.targetUserId);
            
            return (
              <div 
                key={f._id} 
                className="bg-base-200 border border-base-content/15 rounded-[18px] p-[16px_18px]"
              >
                <div className="grid gap-[14px] items-center grid-cols-[auto_1fr_auto] lg:grid-cols-[auto_1fr_auto_auto]">
                  {/* Avatar */}
                  <MemberAvatar 
                    photoURL={member?.photoURL}
                    name={f.targetUserName}
                    isYou={false}
                  />

                  {/* Content */}
                  <div className="min-w-0 col-span-2 lg:col-span-1">
                    <div className="font-bold text-base-content mb-0.5">{f.targetUserName}</div>
                    <p className="text-sm text-base-content/70 mb-1">{f.reason}</p>
                    <p className="text-[13px] text-base-content/60 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <FaUser className="shrink-0 text-xs" /> 
                        <span>Requested by: <strong>{f.requestedByName}</strong></span>
                      </span>
                      <span className="flex items-center gap-1">
                        <FaClock className="shrink-0 text-xs" /> 
                        {new Date(f.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </p>
                    {f.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setFineModalImageUrl(f.imageUrl)}
                        className="text-xs text-base-content underline mt-1 inline-flex items-center gap-1 hover:opacity-70"
                      >
                        <FaImage /> View photo
                      </button>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="text-[20px] font-[800] text-base-content tabular-nums lg:text-right">
                    ৳{Number(f.amount).toFixed(2)}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 col-span-3 lg:col-span-1 lg:shrink-0">
                    <button
                      type="button"
                      onClick={() => handleFineReject(f)}
                      disabled={fineReviewingId === f._id}
                      className="flex-1 lg:flex-initial px-5 py-3 rounded-xl text-[15px] font-[700] flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: 'transparent',
                        color: 'var(--ad-neg)',
                        border: '1.5px solid color-mix(in oklab, var(--ad-neg) 55%, transparent)'
                      }}
                    >
                      <FaTimes /> Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFineApprove(f._id)}
                      disabled={fineReviewingId === f._id}
                      className="flex-1 lg:flex-initial px-5 py-3 rounded-xl text-[15px] font-[700] flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-110"
                      style={{
                        background: 'var(--color-neutral)',
                        color: 'var(--ad-on-strong)'
                      }}
                    >
                      {fineReviewingId === f._id ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        <>
                          <FaCheck /> Approve
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Modal */}
      {fineModalImageUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setFineModalImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              className="absolute -top-10 right-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              style={{ color: 'white' }}
              onClick={() => setFineModalImageUrl(null)}
            >
              <FaTimes size={20} />
            </button>
            <img 
              src={fineModalImageUrl} 
              alt="Fine evidence" 
              className="max-w-full max-h-[85vh] rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFineRequests;
