import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import burgerToast from './BurgerToast';
import {
  FaGavel, FaChevronLeft, FaChevronRight, FaImage,
  FaTimes, FaUser, FaBolt, FaUpload,
  FaCheckCircle, FaTrash, FaCheck, FaClock,
} from 'react-icons/fa';
import { queryKeys, fetchFines, fetchFineSummary } from '../lib/queries';
import { compressImage, uploadImageToImgbb } from '../lib/imageCompress';

const AMOUNT_OPTIONS = [2, 5, 10, 15, 20];

const Jorimana = ({ group, isManager }) => {
  const { getAuthHeaders, userData } = useAuth();
  const queryClient = useQueryClient();
  const API_URL = import.meta.env.VITE_API_URL;
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));

  const [targetUserId, setTargetUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);

  const activeMembers = group?.members?.filter((m) => m.status === 'active') || [];

  const { data: fineData, isLoading } = useQuery({
    queryKey: queryKeys.fines(currentMonth),
    queryFn: () => fetchFines(getAuthHeaders, currentMonth),
    enabled: !!group,
    refetchInterval: 1000 * 10,
  });

  const { data: summary = [] } = useQuery({
    queryKey: queryKeys.fineSummary(currentMonth),
    queryFn: () => fetchFineSummary(getAuthHeaders, currentMonth),
    enabled: !!group,
    refetchInterval: 1000 * 10,
  });

  const fines = fineData?.fines || [];
  const pendingFines = fineData?.pending || [];

  const navigateMonth = (dir) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.fines(currentMonth) });
    queryClient.invalidateQueries({ queryKey: queryKeys.fineSummary(currentMonth) });
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const resetForm = () => {
    setTargetUserId('');
    setAmount('');
    setReason('');
    removeImage();
  };

  const uploadImageIfNeeded = async () => {
    if (!imageFile) return null;
    const compressed = await compressImage(imageFile);
    return uploadImageToImgbb(compressed);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetUserId || !amount || !reason.trim()) {
      burgerToast.error('Member, amount and reason are required');
      return;
    }
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const imageUrl = await uploadImageIfNeeded();
      const endpoint = isManager ? `${API_URL}/fine` : `${API_URL}/fine/request`;
      await axios.post(
        endpoint,
        { month: currentMonth, targetUserId, amount: Number(amount), reason: reason.trim(), imageUrl },
        { headers }
      );
      burgerToast.success(isManager ? 'Fine added successfully' : 'Fine request sent — manager will review');
      resetForm();
      invalidate();
    } catch (err) {
      burgerToast.error(err.response?.data?.error || err.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (fineId) => {
    setReviewingId(fineId);
    try {
      const headers = await getAuthHeaders();
      await axios.patch(`${API_URL}/fine/${fineId}/approve`, {}, { headers });
      burgerToast.success('Fine approved — email sent');
      invalidate();
    } catch (err) {
      burgerToast.error(err.response?.data?.error || 'Approve failed');
    } finally {
      setReviewingId(null);
    }
  };

  const handleReject = async (fine) => {
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
    setReviewingId(fine._id);
    try {
      const headers = await getAuthHeaders();
      await axios.patch(`${API_URL}/fine/${fine._id}/reject`, { rejectReason: result.value || '' }, { headers });
      burgerToast.success('Request rejected — email sent');
      invalidate();
    } catch (err) {
      burgerToast.error(err.response?.data?.error || 'Reject failed');
    } finally {
      setReviewingId(null);
    }
  };

  const handleDelete = async (fineId, fineName, fineAmount) => {
    const result = await Swal.fire({
      title: 'Delete Fine?',
      html: `<p>Remove <strong>${fineName}</strong>'s fine of <strong>৳${Number(fineAmount).toFixed(2)}</strong>?</p><p class="text-sm text-gray-500 mt-1">This action cannot be undone.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: { popup: 'rounded-2xl' },
    });
    if (!result.isConfirmed) return;

    setDeletingId(fineId);
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_URL}/fine/${fineId}`, { headers });
      burgerToast.success('Fine deleted');
      invalidate();
    } catch (err) {
      burgerToast.error(err.response?.data?.error || 'Failed to delete fine');
    } finally {
      setDeletingId(null);
    }
  };

  const selectedMember = activeMembers.find((m) => m.userId === targetUserId);
  const formatMoney = (n) => `৳${Number(n).toFixed(2)}`;
  const formatFineDate = (d) => format(new Date(d), 'dd MMM');
  const isFormReady = targetUserId && amount && reason.trim();

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="bg-linear-to-r from-red-500 to-orange-600 p-6 rounded-2xl shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-2">
              <FaGavel /> Fines
            </h2>
            <p className="text-white/80 text-sm mt-1">Separate from balance — independent record</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigateMonth(-1)} className="btn btn-ghost btn-sm btn-circle text-white">
              <FaChevronLeft />
            </button>
            <input
              type="month"
              className="input input-bordered bg-white text-gray-800 font-medium"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
            />
            <button type="button" onClick={() => navigateMonth(1)} className="btn btn-ghost btn-sm btn-circle text-white">
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* ── Add Fine Form ── */}
      <div className="rounded-2xl overflow-hidden shadow-xl border border-base-200">

        {/* Form header strip */}
        <div className="bg-linear-to-r from-red-600 to-orange-500 px-6 py-4 flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <FaGavel className="text-white text-lg" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg leading-tight">
              {isManager ? 'Issue a Fine' : 'Request a Fine'}
            </h3>
            <p className="text-white/70 text-xs">
              {isManager ? 'Fine will be applied immediately' : 'Manager will review your request'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-base-100 p-6 space-y-6">

          {/* Step 1 — Select member */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <span className="font-semibold text-base-content text-sm">Who gets the fine?</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activeMembers.map((m) => (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => setTargetUserId(m.userId)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                    targetUserId === m.userId
                      ? 'border-red-500 bg-red-50 shadow-md shadow-red-100'
                      : 'border-base-300 bg-base-200/50 hover:border-red-300 hover:bg-red-50/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 font-bold text-sm ${
                    targetUserId === m.userId ? 'bg-red-500 text-white' : 'bg-base-300 text-base-content/60'
                  }`}>
                    {m.photoURL
                      ? <img src={m.photoURL} alt={m.name} className="w-full h-full object-cover" />
                      : m.name.charAt(0).toUpperCase()
                    }
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${targetUserId === m.userId ? 'text-red-700' : 'text-base-content'}`}>
                      {m.name}
                    </p>
                    {m.userId === userData?.uid && (
                      <p className="text-[10px] text-base-content/40">You</p>
                    )}
                  </div>
                  {targetUserId === m.userId && (
                    <FaCheckCircle className="text-red-500 text-sm ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-base-200" />

          {/* Step 2 — Amount */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <span className="font-semibold text-base-content text-sm">Fine amount</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {AMOUNT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAmount(String(opt))}
                  className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all ${
                    amount === String(opt)
                      ? 'bg-red-500 border-red-500 text-white shadow-md shadow-red-200 scale-105'
                      : 'border-base-300 bg-base-200/60 text-base-content hover:border-red-400 hover:bg-red-50'
                  }`}
                >
                  ৳{opt}
                </button>
              ))}
              {/* Custom amount */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 font-bold text-sm">৳</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  className={`input input-bordered input-sm pl-7 w-24 rounded-xl border-2 transition-all bg-base-100 text-base-content ${
                    amount && !AMOUNT_OPTIONS.includes(Number(amount))
                      ? 'border-red-500'
                      : 'border-base-300'
                  }`}
                  value={AMOUNT_OPTIONS.includes(Number(amount)) ? '' : amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Other"
                />
              </div>
            </div>
            {amount && (
              <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-3 py-1 rounded-full">
                <FaBolt className="text-[10px]" />
                Fine amount: ৳{Number(amount).toFixed(2)}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-base-200" />

          {/* Step 3 — Reason */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
              <span className="font-semibold text-base-content text-sm">Reason</span>
            </div>
            <textarea
              className="textarea textarea-bordered w-full h-20 rounded-xl border-2 focus:border-red-400 resize-none text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the reason for this fine..."
              required
            />
          </div>

          {/* Divider */}
          <div className="border-t border-base-200" />

          {/* Step 4 — Photo */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-base-300 text-base-content/60 text-xs font-bold flex items-center justify-center shrink-0">4</span>
              <span className="font-semibold text-base-content text-sm">Evidence photo <span className="text-base-content/40 font-normal">(optional)</span></span>
            </div>

            {imagePreview ? (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-28 w-auto rounded-xl border-2 border-red-300 object-cover shadow-md"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                >
                  <FaTimes className="text-[10px]" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-base-300 hover:border-red-400 rounded-xl p-5 cursor-pointer transition-all hover:bg-red-50/50 group">
                <div className="w-10 h-10 rounded-full bg-base-200 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                  <FaUpload className="text-base-content/40 group-hover:text-red-400 transition-colors" />
                </div>
                <p className="text-xs text-base-content/50 group-hover:text-red-400 transition-colors font-medium">Click to upload photo</p>
                <p className="text-[10px] text-base-content/30">Image will be compressed automatically</p>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-base-200" />

          {/* Preview + Submit */}
          {isFormReady && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                  <FaUser className="text-red-500 text-sm" />
                </div>
                <div>
                  <p className="text-xs text-base-content/50">Issuing fine to</p>
                  <p className="font-bold text-base-content text-sm">{selectedMember?.name}</p>
                </div>
                <div className="w-px h-8 bg-red-200 mx-1" />
                <div>
                  <p className="text-xs text-base-content/50">Amount</p>
                  <p className="font-bold text-red-600 text-sm">৳{Number(amount).toFixed(2)}</p>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn bg-red-500 hover:bg-red-600 text-white border-0 shadow-md shadow-red-200 gap-2 min-w-32"
              >
                {submitting
                  ? <span className="loading loading-spinner loading-sm" />
                  : <>
                      <FaGavel className="text-sm" />
                      {isManager ? 'Issue Fine' : 'Send Request'}
                    </>
                }
              </button>
            </div>
          )}

          {!isFormReady && (
            <button
              type="submit"
              disabled={submitting || !isFormReady}
              className="btn btn-block bg-red-500/40 text-white border-0 cursor-not-allowed"
            >
              <FaGavel className="text-sm" />
              {isManager ? 'Issue Fine' : 'Send Request'}
            </button>
          )}

        </form>
      </div>

      {/* ── Pending Fine Requests (Manager only) ── */}
      {isManager && pendingFines.length > 0 && (
        <div className="rounded-2xl overflow-hidden shadow-xl border border-orange-200">
          <div className="bg-linear-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <FaClock className="text-white text-lg" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg leading-tight">Pending Requests</h3>
                <p className="text-white/70 text-xs">Review and approve or reject</p>
              </div>
            </div>
            <span className="bg-white text-orange-600 font-bold text-sm px-3 py-1 rounded-full">
              {pendingFines.length}
            </span>
          </div>

          <div className="bg-base-100 divide-y divide-base-200">
            {pendingFines.map((f) => (
              <div key={f._id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-base-content">{f.targetUserName}</span>
                    <span className="badge badge-error badge-sm font-bold">{formatMoney(f.amount)}</span>
                    <span className="text-xs text-base-content/40">{formatFineDate(f.createdAt)}</span>
                  </div>
                  <p className="text-sm text-base-content/70 mb-1">{f.reason}</p>
                  <p className="text-xs text-base-content/40">
                    Requested by: <span className="font-medium text-base-content/60">{f.requestedByName}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {f.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setModalImageUrl(f.imageUrl)}
                      className="btn btn-xs btn-outline btn-warning gap-1"
                    >
                      <FaImage /> Photo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleApprove(f._id)}
                    disabled={reviewingId === f._id}
                    className="btn btn-xs bg-emerald-500 hover:bg-emerald-600 text-white border-0 gap-1"
                  >
                    {reviewingId === f._id
                      ? <span className="loading loading-spinner loading-xs" />
                      : <><FaCheck /> Approve</>
                    }
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(f)}
                    disabled={reviewingId === f._id}
                    className="btn btn-xs btn-error gap-1"
                  >
                    {reviewingId === f._id
                      ? <span className="loading loading-spinner loading-xs" />
                      : <><FaTimes /> Reject</>
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Fine List ── */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Fine List — {format(new Date(currentMonth + '-01'), 'MMM yyyy')}</h3>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md text-red-500" />
            </div>
          ) : fines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-base-content/30">
              <FaGavel className="text-4xl mb-2" />
              <p className="font-semibold">No fines this month</p>
            </div>
          ) : (
            <>
              {/* ── Desktop: Table ── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th className="w-24">Date</th>
                      <th className="w-32">Member</th>
                      <th className="w-28">Amount</th>
                      <th>Reason</th>
                      <th className="w-32">Issued by</th>
                      <th className="w-24">Photo</th>
                      {isManager && <th className="w-12"></th>}
                    </tr>
                  </thead>
                </table>
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="table table-zebra w-full">
                    <colgroup>
                      <col className="w-24" />
                      <col className="w-32" />
                      <col className="w-28" />
                      <col />
                      <col className="w-32" />
                      <col className="w-24" />
                      {isManager && <col className="w-12" />}
                    </colgroup>
                    <tbody>
                      {fines.map((f) => (
                        <tr key={f._id}>
                          <td className="text-sm">{formatFineDate(f.createdAt)}</td>
                          <td className="font-medium">{f.targetUserName}</td>
                          <td>
                            <span className="badge badge-error font-bold">{formatMoney(f.amount)}</span>
                          </td>
                          <td className="max-w-xs truncate text-sm text-base-content/70" title={f.reason}>{f.reason}</td>
                          <td className="text-sm text-base-content/60 whitespace-nowrap">{f.requestedByName || '—'}</td>
                          <td>
                            {f.imageUrl ? (
                              <button type="button" onClick={() => setModalImageUrl(f.imageUrl)} className="btn btn-xs btn-outline btn-error gap-1">
                                <FaImage /> View
                              </button>
                            ) : <span className="text-base-content/30">—</span>}
                          </td>
                          {isManager && (
                            <td>
                              <button
                                type="button"
                                onClick={() => handleDelete(f._id, f.targetUserName, f.amount)}
                                disabled={deletingId === f._id}
                                className="btn btn-xs btn-ghost text-error hover:bg-error/10"
                              >
                                {deletingId === f._id
                                  ? <span className="loading loading-spinner loading-xs" />
                                  : <FaTrash className="text-xs" />
                                }
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Mobile: Card layout with fixed height + scroll ── */}
              <div className="md:hidden max-h-[420px] overflow-y-auto space-y-3 pr-1">
                {fines.map((f) => (
                  <div key={f._id} className="bg-base-200 rounded-xl p-4 border border-base-300">
                    {/* Top row: member + amount + delete */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-base-content truncate">{f.targetUserName}</span>
                        <span className="badge badge-error badge-sm font-bold shrink-0">{formatMoney(f.amount)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-base-content/50">{formatFineDate(f.createdAt)}</span>
                        {isManager && (
                          <button
                            type="button"
                            onClick={() => handleDelete(f._id, f.targetUserName, f.amount)}
                            disabled={deletingId === f._id}
                            className="btn btn-xs btn-ghost text-error hover:bg-error/10"
                          >
                            {deletingId === f._id
                              ? <span className="loading loading-spinner loading-xs" />
                              : <FaTrash className="text-xs" />
                            }
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Reason — full text, wraps naturally */}
                    <p className="text-sm text-base-content/70 mb-2 leading-relaxed">{f.reason}</p>

                    {/* Bottom row: issued by + photo */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-base-content/50">
                        Issued by: <span className="font-medium text-base-content/70">{f.requestedByName || '—'}</span>
                      </p>
                      {f.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setModalImageUrl(f.imageUrl)}
                          className="btn btn-xs btn-outline btn-error gap-1"
                        >
                          <FaImage /> Photo
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Monthly Summary ── */}
      {summary.some((s) => s.total > 0) && (
        <div className="card bg-base-100 shadow-lg border border-orange-100">
          <div className="card-body">
            <h3 className="card-title text-orange-600">Monthly Summary</h3>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th className="text-right">Total Fine</th>
                    <th className="text-center">Times</th>
                  </tr>
                </thead>
                <tbody>
                  {summary
                    .filter((s) => s.total > 0)
                    .map((s) => (
                      <tr key={s.userId}>
                        <td>{s.name}{s.userId === userData?.uid ? ' (You)' : ''}</td>
                        <td className="text-right font-bold text-red-600">{formatMoney(s.total)}</td>
                        <td className="text-center">{s.count}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Image Modal ── */}
      {modalImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setModalImageUrl(null)}
        >
          <div
            className="relative bg-base-100 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-base-200">
              <div className="flex items-center gap-2">
                <FaImage className="text-red-500" />
                <span className="font-semibold text-sm">Evidence Photo</span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => setModalImageUrl(null)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-4">
              <img
                src={modalImageUrl}
                alt="Fine evidence"
                className="w-full max-h-[65vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Jorimana;
