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
  FaCheckCircle, FaTrash,
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

  const handleDelete = async (fineId, fineName, fineAmount) => {
    const result = await Swal.fire({
      title: 'Delete Fine?',
      html: `<p>Remove <strong>${fineName}</strong>'s fine of <strong>৳${Number(fineAmount).toFixed(2)}</strong>?</p><p style="font-size: 0.875rem; color: var(--color-base-content); opacity: 0.5; margin-top: 0.25rem;">This action cannot be undone.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        popup: 'swal-fine-popup',
        title: 'swal-fine-title',
        htmlContainer: 'swal-fine-html',
        icon: 'swal-fine-icon',
        confirmButton: 'swal-fine-confirm',
        cancelButton: 'swal-fine-cancel'
      },
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
    <div className="space-y-4 sm:space-y-6">

      {/* ── Header ── */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-[26px] sm:text-[32px] font-extrabold text-base-content tracking-tight leading-none flex items-center gap-2">
              <FaGavel /> Fines
            </h1>
            <p className="text-sm text-base-content/70 mt-1">Separate from balance — independent record</p>
          </div>
          
          {/* Month control - desktop: right side, mobile: full width */}
          <div className="sm:min-w-[320px]">
            <div className="bg-base-200 border border-base-content/15 rounded-xl p-1 flex items-center gap-1">
              <button 
                type="button" 
                onClick={() => navigateMonth(-1)} 
                className="w-9 h-9 rounded-[9px] flex items-center justify-center transition-colors focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
                style={{ background: 'var(--fine-tile)' }}
                aria-label="Previous month"
              >
                <FaChevronLeft className="text-base-content" />
              </button>
              <input
                type="month"
                className="flex-1 bg-transparent text-center font-semibold text-base-content cursor-pointer focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 px-2"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
                aria-label="Select month"
              />
              <button 
                type="button" 
                onClick={() => navigateMonth(1)} 
                className="w-9 h-9 rounded-[9px] flex items-center justify-center transition-colors focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
                style={{ background: 'var(--fine-tile)' }}
                aria-label="Next month"
              >
                <FaChevronRight className="text-base-content" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Fine Form ── */}
      <div className="bg-base-200 border border-base-content/15 rounded-[18px] overflow-hidden">

        {/* Form header strip */}
        <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--fine-line)' }}>
          <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center shrink-0" style={{ background: 'var(--fine-tile)' }}>
            <FaGavel className="text-base-content text-lg" />
          </div>
          <div>
            <h3 className="text-base-content font-bold text-[19px] leading-tight">
              {isManager ? 'Issue a Fine' : 'Request a Fine'}
            </h3>
            <p className="text-base-content/70 text-[13px]">
              {isManager ? 'Fine will be applied immediately' : 'Manager will review your request'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-base-100 p-5 sm:p-6 space-y-5 sm:space-y-6">

          {/* Step 1 — Select member */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ background: 'var(--fine-primary)' }}>1</span>
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
                      ? 'shadow-md'
                      : 'hover:opacity-80'
                  }`}
                  style={{
                    borderColor: targetUserId === m.userId ? 'var(--fine-primary)' : 'var(--fine-line)',
                    background: targetUserId === m.userId ? 'var(--fine-light)' : 'var(--fine-alt)'
                  }}
                >
                  <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 font-bold text-sm`}
                    style={{
                      background: targetUserId === m.userId ? 'var(--fine-primary)' : 'var(--fine-tile)',
                      color: targetUserId === m.userId ? 'white' : 'var(--color-base-content)'
                    }}
                  >
                    {m.photoURL
                      ? <img src={m.photoURL} alt={m.name} className="w-full h-full object-cover" />
                      : m.name.charAt(0).toUpperCase()
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold truncate`} style={{ color: targetUserId === m.userId ? 'var(--fine-primary)' : 'var(--color-base-content)' }}>
                      {m.name}
                    </p>
                    {m.userId === userData?.uid && (
                      <p className="text-[10px] text-base-content/40">You</p>
                    )}
                  </div>
                  {targetUserId === m.userId && (
                    <FaCheckCircle className="text-sm ml-auto shrink-0" style={{ color: 'var(--fine-primary)' }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t" style={{ borderColor: 'var(--fine-line)' }} />

          {/* Step 2 — Amount */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ background: 'var(--fine-primary)' }}>2</span>
              <span className="font-semibold text-base-content text-sm">Fine amount</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {AMOUNT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAmount(String(opt))}
                  className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all ${
                    amount === String(opt) ? 'shadow-md scale-105' : ''
                  }`}
                  style={{
                    background: amount === String(opt) ? 'var(--fine-primary)' : 'var(--fine-alt)',
                    borderColor: amount === String(opt) ? 'var(--fine-primary)' : 'var(--fine-line)',
                    color: amount === String(opt) ? 'white' : 'var(--color-base-content)'
                  }}
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
                  className={`input input-bordered input-sm pl-7 w-24 rounded-xl border-2 transition-all bg-base-100 text-base-content`}
                  style={{
                    borderColor: amount && !AMOUNT_OPTIONS.includes(Number(amount)) ? 'var(--fine-primary)' : 'var(--fine-line)'
                  }}
                  value={AMOUNT_OPTIONS.includes(Number(amount)) ? '' : amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Other"
                />
              </div>
            </div>
            {amount && (
              <div className="inline-flex items-center gap-1.5 border text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--fine-light)', borderColor: 'var(--fine-primary)', color: 'var(--fine-primary)' }}>
                <FaBolt className="text-[10px]" />
                Fine amount: ৳{Number(amount).toFixed(2)}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t" style={{ borderColor: 'var(--fine-line)' }} />

          {/* Step 3 — Reason */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ background: 'var(--fine-primary)' }}>3</span>
              <span className="font-semibold text-base-content text-sm">Reason</span>
            </div>
            <textarea
              className="textarea textarea-bordered w-full h-20 rounded-xl border-2 resize-none text-sm focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
              style={{ borderColor: 'var(--fine-line)' }}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the reason for this fine..."
              required
            />
          </div>

          {/* Divider */}
          <div className="border-t" style={{ borderColor: 'var(--fine-line)' }} />

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
                  className="h-28 w-auto rounded-xl border-2 object-cover shadow-md"
                  style={{ borderColor: 'var(--fine-primary)' }}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 w-6 h-6 text-white rounded-full flex items-center justify-center shadow-md hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--fine-primary)' }}
                >
                  <FaTimes className="text-[10px]" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all group" style={{ borderColor: 'var(--fine-line)', background: 'var(--fine-alt)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center transition-colors" style={{ background: 'var(--fine-tile)' }}>
                  <FaUpload className="text-base-content/40" />
                </div>
                <p className="text-xs text-base-content/50 transition-colors font-medium">Click to upload photo</p>
                <p className="text-[10px] text-base-content/30">Image will be compressed automatically</p>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>

          {/* Divider */}
          <div className="border-t" style={{ borderColor: 'var(--fine-line)' }} />

          {/* Preview + Submit */}
          {isFormReady && (
            <div className="border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between" style={{ background: 'var(--fine-light)', borderColor: 'var(--fine-primary)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'color-mix(in oklab, var(--fine-primary) 20%, transparent)' }}>
                  <FaUser className="text-sm" style={{ color: 'var(--fine-primary)' }} />
                </div>
                <div>
                  <p className="text-xs text-base-content/50">Issuing fine to</p>
                  <p className="font-bold text-base-content text-sm">{selectedMember?.name}</p>
                </div>
                <div className="w-px h-8 mx-1" style={{ background: 'var(--fine-primary)', opacity: 0.3 }} />
                <div>
                  <p className="text-xs text-base-content/50">Amount</p>
                  <p className="font-bold text-sm" style={{ color: 'var(--fine-primary)' }}>৳{Number(amount).toFixed(2)}</p>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn text-white border-0 shadow-md gap-2 min-w-32 hover:opacity-90"
                style={{ background: 'var(--fine-primary)' }}
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
              className="btn btn-block text-white border-0 cursor-not-allowed opacity-40"
              style={{ background: 'var(--fine-primary)' }}
            >
              <FaGavel className="text-sm" />
              {isManager ? 'Issue Fine' : 'Send Request'}
            </button>
          )}

        </form>
      </div>

      {/* ── Fine List ── */}
      <div className="bg-base-200 border border-base-content/15 rounded-[18px] overflow-hidden">
        <div className="p-4 sm:px-5 sm:py-4 border-b" style={{ borderColor: 'var(--fine-line)' }}>
          <h3 className="text-[19px] font-bold text-base-content">Fine List — {format(new Date(currentMonth + '-01'), 'MMM yyyy')}</h3>
        </div>
        <div className="bg-base-100 p-4 sm:p-5">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md" style={{ color: 'var(--fine-primary)' }}></span>
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
                <table className="table w-full">
                  <thead>
                    <tr style={{ background: 'var(--fine-tile)' }}>
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
                  <table className="table w-full">
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
                            <span className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: 'var(--fine-primary)' }}>{formatMoney(f.amount)}</span>
                          </td>
                          <td className="max-w-xs truncate text-sm text-base-content/70" title={f.reason}>{f.reason}</td>
                          <td className="text-sm text-base-content/60 whitespace-nowrap">{f.requestedByName || '—'}</td>
                          <td>
                            {f.imageUrl ? (
                              <button type="button" onClick={() => setModalImageUrl(f.imageUrl)} className="btn btn-xs border text-xs gap-1 hover:opacity-80" style={{ borderColor: 'var(--fine-primary)', color: 'var(--fine-primary)', background: 'var(--fine-light)' }}>
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
                                className="btn btn-xs btn-ghost hover:bg-error/10"
                                style={{ color: 'var(--fine-primary)' }}
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
                  <div key={f._id} className="rounded-xl p-4 border" style={{ background: 'var(--fine-alt)', borderColor: 'var(--fine-line)' }}>
                    {/* Top row: member + amount + delete */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-base-content truncate">{f.targetUserName}</span>
                        <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white shrink-0" style={{ background: 'var(--fine-primary)' }}>{formatMoney(f.amount)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-base-content/50">{formatFineDate(f.createdAt)}</span>
                        {isManager && (
                          <button
                            type="button"
                            onClick={() => handleDelete(f._id, f.targetUserName, f.amount)}
                            disabled={deletingId === f._id}
                            className="btn btn-xs btn-ghost hover:bg-error/10"
                            style={{ color: 'var(--fine-primary)' }}
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
                          className="btn btn-xs border text-xs gap-1 hover:opacity-80"
                          style={{ borderColor: 'var(--fine-primary)', color: 'var(--fine-primary)', background: 'var(--fine-light)' }}
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
        <div className="bg-base-200 border border-base-content/15 rounded-[18px] overflow-hidden">
          <div className="p-4 sm:px-5 sm:py-4 border-b" style={{ borderColor: 'var(--fine-line)' }}>
            <h3 className="text-[19px] font-bold text-base-content">Monthly Summary</h3>
          </div>
          <div className="bg-base-100 p-4 sm:p-5">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr style={{ background: 'var(--fine-tile)' }}>
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
                        <td className="text-right font-bold" style={{ color: 'var(--fine-primary)' }}>{formatMoney(s.total)}</td>
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
            className="relative bg-base-100 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border"
            style={{ borderColor: 'var(--fine-line)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--fine-line)' }}>
              <div className="flex items-center gap-2">
                <FaImage style={{ color: 'var(--fine-primary)' }} />
                <span className="font-semibold text-sm text-base-content">Evidence Photo</span>
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
