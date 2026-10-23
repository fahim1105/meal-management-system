import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { format } from 'date-fns';
import axios from 'axios';
import burgerToast from '../components/BurgerToast';
import Swal from 'sweetalert2';
import LottieLoader from '../components/LottieLoader';
import { queryKeys, fetchGroup } from '../lib/queries';
import { FaGavel, FaFileDownload, FaExchangeAlt, FaInfoCircle, FaDownload, FaEnvelope, FaUserTie, FaCog } from 'react-icons/fa';
import PageTitle from '../components/Admin/PageTitle';

const AdminControl = () => {
  const [togglingFine, setTogglingFine] = useState(false);
  const [downloadMonth, setDownloadMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [downloading, setDownloading] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [selectedMember, setSelectedMember] = useState('');
  const [loading, setLoading] = useState(false);

  const { userData, getAuthHeaders, refreshUserToken } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL;

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: queryKeys.group(),
    queryFn: () => fetchGroup(getAuthHeaders),
    enabled: !!userData?.groupId,
    refetchInterval: 1000 * 15,
  });

  const fineEnabled = group?.fineEnabled !== false;

  const handleToggleFine = async () => {
    setTogglingFine(true);
    try {
      const headers = await getAuthHeaders();
      await axios.patch(`${API_URL}/group/toggle-fine`, {}, { headers });
      burgerToast.success(`Fine feature ${fineEnabled ? 'disabled' : 'enabled'}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.group() });
    } catch (err) {
      burgerToast.error(err.response?.data?.error || 'Failed to toggle fine feature');
    } finally {
      setTogglingFine(false);
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
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${downloadMonth}-${Date.now()}.pdf`);
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

  const handleSendReportEmail = async () => {
    // Get current theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    const result = await Swal.fire({
      html: `
        <div style="text-align: center; padding: 20px 0;">
          <div style="
            width: 80px;
            height: 80px;
            border: 3px solid ${isDark ? '#ef9a9a' : '#a05959'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
          ">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6h18v12H3V6z" fill="none" stroke="${isDark ? '#ef9a9a' : '#a05959'}" stroke-width="2"/>
              <path d="M3 6l9 6 9-6" stroke="${isDark ? '#ef9a9a' : '#a05959'}" stroke-width="2"/>
            </svg>
          </div>
          <h2 style="
            color: ${isDark ? '#e8d4a2' : '#3d4c3a'};
            font-size: 28px;
            font-weight: 600;
            margin: 0 0 16px 0;
          ">Send Monthly Report?</h2>
          <p style="
            color: ${isDark ? '#b0b0b0' : '#6b7280'};
            font-size: 15px;
            margin: 0;
            line-height: 1.6;
          ">This will send the <strong style="color: ${isDark ? '#e8d4a2' : '#3d4c3a'};">${downloadMonth}</strong> report PDF to all active group members via email.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 8px;"><path d="M3 6h18v12H3V6z" fill="none" stroke="white" stroke-width="2"/><path d="M3 6l9 6 9-6" stroke="white" stroke-width="2"/></svg>Yes, Send Emails',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      confirmButtonColor: isDark ? '#b4877e' : '#8b5a50',
      cancelButtonColor: isDark ? 'transparent' : 'transparent',
      background: isDark ? '#1a1f1a' : '#e8e5dc',
      customClass: { 
        popup: 'swal2-custom-popup',
        confirmButton: 'swal2-custom-confirm',
        cancelButton: 'swal2-custom-cancel',
        htmlContainer: 'swal2-custom-html',
        actions: 'swal2-custom-actions'
      },
      width: '500px',
      padding: '40px',
      didOpen: () => {
        const style = document.createElement('style');
        style.innerHTML = `
          .swal2-custom-popup {
            border-radius: 24px !important;
          }
          .swal2-custom-html {
            margin: 0 !important;
            padding: 0 !important;
          }
          .swal2-custom-actions {
            margin-top: 32px !important;
            gap: 12px !important;
          }
          .swal2-custom-confirm {
            border-radius: 12px !important;
            padding: 12px 32px !important;
            font-size: 15px !important;
            font-weight: 500 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .swal2-custom-cancel {
            border-radius: 12px !important;
            padding: 12px 32px !important;
            font-size: 15px !important;
            font-weight: 500 !important;
            border: 2px solid ${isDark ? '#4a5a4a' : '#b8b5a8'} !important;
            color: ${isDark ? '#b0b0b0' : '#5a5a5a'} !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .swal2-custom-cancel:hover {
            background: ${isDark ? '#2a3a2a' : '#d4d1c4'} !important;
          }
        `;
        document.head.appendChild(style);
      }
    });

    if (!result.isConfirmed) return;

    setSendingReport(true);
    try {
      const headers = await getAuthHeaders();
      await axios.post(
        `${API_URL}/report/send-email/${downloadMonth}`,
        {},
        { headers }
      );
      burgerToast.success('Report sent to all members successfully');
    } catch (error) {
      console.error('Send email error:', error);
      burgerToast.error('Failed to send report emails');
    } finally {
      setSendingReport(false);
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

    const selectedMemberData = group?.members.find(m => m.userId === selectedMember);
    const memberName = selectedMemberData?.name || 'this member';

    // Get current theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    const result = await Swal.fire({
      html: `
        <div style="text-align: center; padding: 20px 0;">
          <div style="
            width: 80px;
            height: 80px;
            border: 3px solid ${isDark ? '#ef9a9a' : '#a05959'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
          ">
            <span style="
              font-size: 48px;
              font-weight: bold;
              color: ${isDark ? '#ef9a9a' : '#a05959'};
              line-height: 1;
            ">!</span>
          </div>
          <h2 style="
            color: ${isDark ? '#e8d4a2' : '#3d4c3a'};
            font-size: 28px;
            font-weight: 600;
            margin: 0 0 16px 0;
          ">Transfer Manager Role?</h2>
          <p style="
            color: ${isDark ? '#b0b0b0' : '#6b7280'};
            font-size: 15px;
            margin: 0 0 20px 0;
            line-height: 1.6;
          ">You are about to transfer the manager role to <strong style="color: ${isDark ? '#e8d4a2' : '#3d4c3a'};">${memberName}</strong>.</p>
          
          <div style="
            background: ${isDark ? '#2a2220' : '#e8e0d8'};
            border-radius: 12px;
            padding: 14px 18px;
            display: flex;
            align-items: center;
            gap: 12px;
            text-align: left;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
              <path d="M12 2L2 22h20L12 2z" fill="${isDark ? '#b4877e' : '#8b5a50'}" stroke="${isDark ? '#b4877e' : '#8b5a50'}" stroke-width="1.5"/>
              <path d="M12 9v5M12 17h.01" stroke="${isDark ? '#1a1f1a' : '#e8e5dc'}" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span style="
              color: ${isDark ? '#b0b0b0' : '#6b7280'};
              font-size: 14px;
              font-weight: 500;
            ">You will lose all manager privileges immediately.</span>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, Transfer Role',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      confirmButtonColor: isDark ? '#b4877e' : '#8b5a50',
      cancelButtonColor: isDark ? 'transparent' : 'transparent',
      background: isDark ? '#1a1f1a' : '#e8e5dc',
      customClass: { 
        popup: 'swal2-custom-popup',
        confirmButton: 'swal2-custom-confirm',
        cancelButton: 'swal2-custom-cancel',
        htmlContainer: 'swal2-custom-html',
        actions: 'swal2-custom-actions'
      },
      width: '500px',
      padding: '40px',
      didOpen: () => {
        const style = document.createElement('style');
        style.innerHTML = `
          .swal2-custom-popup {
            border-radius: 24px !important;
          }
          .swal2-custom-html {
            margin: 0 !important;
            padding: 0 !important;
          }
          .swal2-custom-actions {
            margin-top: 32px !important;
            gap: 12px !important;
          }
          .swal2-custom-confirm {
            border-radius: 12px !important;
            padding: 12px 32px !important;
            font-size: 15px !important;
            font-weight: 500 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .swal2-custom-cancel {
            border-radius: 12px !important;
            padding: 12px 32px !important;
            font-size: 15px !important;
            font-weight: 500 !important;
            border: 2px solid ${isDark ? '#4a5a4a' : '#b8b5a8'} !important;
            color: ${isDark ? '#b0b0b0' : '#5a5a5a'} !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .swal2-custom-cancel:hover {
            background: ${isDark ? '#2a3a2a' : '#d4d1c4'} !important;
          }
        `;
        document.head.appendChild(style);
      }
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      await axios.post(
        `${API_URL}/group/transfer-manager`,
        { newManagerId: selectedMember },
        { headers }
      );

      queryClient.invalidateQueries({ queryKey: queryKeys.group() });
      await queryClient.refetchQueries({ queryKey: queryKeys.group() });
      await refreshUserToken();

      await Swal.fire({
        html: `
          <div style="text-align: center; padding: 24px 0 8px 0;">
            <div style="
              width: 64px;
              height: 64px;
              background: ${isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(209, 250, 229, 1)'};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 20px auto;
            ">
              <span style="font-size: 32px;">✓</span>
            </div>
            <h2 style="
              color: ${isDark ? '#f3f4f6' : '#111827'};
              font-size: 24px;
              font-weight: 700;
              margin: 0 0 12px 0;
            ">Success!</h2>
            <p style="
              color: ${isDark ? '#d1d5db' : '#6b7280'};
              font-size: 15px;
              margin: 0;
            ">Manager role transferred successfully</p>
          </div>
        `,
        confirmButtonColor: isDark ? '#10b981' : '#059669',
        confirmButtonText: 'OK',
        background: isDark ? '#1f2937' : '#ffffff',
        customClass: { 
          popup: 'rounded-2xl',
          confirmButton: 'rounded-xl px-6 py-2.5 font-semibold',
          htmlContainer: 'mt-0',
        },
        width: '400px',
      });

      navigate('/', { replace: true });
    } catch (error) {
      burgerToast.error('Failed to transfer manager role');
    } finally {
      setLoading(false);
    }
  };

  if (groupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LottieLoader size={270} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <PageTitle 
        icon={FaCog}
        title="Control Panel"
        subtitle="Manage group settings and administrative functions"
      />

      <div className="space-y-5">
        {/* Fine Feature Toggle Card */}
        <div className="card bg-base-100 border border-base-300 hover:border-base-content/20 transition-all duration-200">
          <div className="card-body">
            <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
              <div className="flex items-center gap-3 flex-1">
                <div className="bg-base-200 p-3 rounded-xl">
                  <FaGavel className="text-xl text-base-content" />
                </div>
                <div>
                  <h3 className="font-bold text-base-content">Fine Feature</h3>
                  <p className="text-sm text-base-content/60 mt-0.5">Enable or disable the fines system</p>
                </div>
              </div>
              
              <label className="switch" title={fineEnabled ? 'Disable fine feature' : 'Enable fine feature'}>
                <input
                  type="checkbox"
                  checked={fineEnabled}
                  disabled={togglingFine}
                  onChange={handleToggleFine}
                />
                <span className="slider">
                  <span className="glow"></span>
                  <span className="icon-on">✓</span>
                  <span className="icon-off">✕</span>
                </span>
              </label>
            </div>
            
            <div className={`mt-4 p-3 rounded-xl ${fineEnabled ? 'bg-success/10' : 'bg-warning/10'}`}>
              <p className="text-sm text-base-content/80">
                {fineEnabled
                  ? '✓ Fine feature is enabled. Members can request fines and manager can issue them.'
                  : '⚠ Fine feature is disabled. The Fines tab is hidden from all members.'}
              </p>
            </div>
            
            {!fineEnabled && (
              <p className="text-xs text-base-content/50 mt-2">
                All existing fine records are preserved and will reappear when re-enabled.
              </p>
            )}
          </div>
        </div>

        {/* Download Report Card */}
        <div className="card bg-base-100 border border-base-300 hover:border-base-content/20 transition-all duration-200">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-base-200 p-3 rounded-xl">
                <FaFileDownload className="text-xl text-base-content" />
              </div>
              <div>
                <h3 className="font-bold text-base-content">Monthly Report</h3>
                <p className="text-sm text-base-content/60 mt-0.5">Generate and download detailed PDF report</p>
              </div>
            </div>

            <div className="bg-info/15 border border-info/30 p-3 rounded-xl mb-4 flex items-start gap-3">
              <FaInfoCircle className="text-info mt-0.5 flex-shrink-0" />
              <span className="text-sm text-base-content font-medium">
                Report includes: Financial summary, member details, meal breakdown, and bazar history.
              </span>
            </div>

            <div className="space-y-3">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <FaDownload className="text-sm" />
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
                className={`btn btn-primary w-full text-white ${downloading ? 'loading' : ''}`}
                disabled={downloading}
              >
                {downloading ? 'Generating PDF...' : (
                  <>
                    <FaFileDownload />
                    Download PDF Report
                  </>
                )}
              </button>

              <button
                onClick={handleSendReportEmail}
                className={`btn btn-neutral w-full ${sendingReport ? 'loading' : ''}`}
                disabled={sendingReport || downloading}
              >
                {sendingReport ? 'Sending Emails...' : (
                  <>
                    <FaEnvelope />
                    Send Report to All Members
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Transfer Manager Role Card */}
        <div className="card bg-base-100 border border-base-300 hover:border-base-content/20 transition-all duration-200">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-base-200 p-3 rounded-xl">
                <FaExchangeAlt className="text-xl text-base-content" />
              </div>
              <div>
                <h3 className="font-bold text-base-content">Transfer Manager Role</h3>
                <p className="text-sm text-base-content/60 mt-0.5">Assign manager privileges to another member</p>
              </div>
            </div>

            <div className="bg-warning/10 p-3 rounded-xl mb-4 flex items-start gap-3">
              <FaInfoCircle className="text-warning mt-0.5 flex-shrink-0" />
              <span className="text-sm text-base-content/80">
                Warning: You will lose all manager privileges after transferring this role.
              </span>
            </div>

            <form onSubmit={handleTransferManager} className="space-y-3">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <FaUserTie className="text-sm" />
                    Select New Manager
                  </span>
                </label>
                <select
                  className="select select-bordered w-full focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                className={`btn btn-error w-full ${loading ? 'loading' : ''}`}
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
      </div>
    </div>
  );
};

export default AdminControl;
