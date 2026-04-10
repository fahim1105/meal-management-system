import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import burgerToast from './BurgerToast';
import Swal from 'sweetalert2';
import { format, isWithinInterval } from 'date-fns';
import { FaCalendarCheck, FaTrash, FaChevronLeft, FaChevronRight, FaCalendarAlt, FaUser, FaFilePdf } from 'react-icons/fa';

const BazarSchedule = ({ group, isManager }) => {
  const { getAuthHeaders, userData } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchSchedule();
  }, [currentMonth, group]);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(`${API_URL}/bazar-schedule/${currentMonth}`, { headers });
      setSchedule(res.data.schedule);
    } catch {
      setSchedule(null);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (dir) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + dir, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Delete Schedule?',
      text: 'This will remove the entire bazar schedule for this month.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: { popup: 'rounded-2xl', confirmButton: 'btn btn-error', cancelButton: 'btn btn-ghost' }
    });
    if (!result.isConfirmed) return;
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_URL}/bazar-schedule/${currentMonth}`, { headers });
      burgerToast.success('Schedule deleted');
      setSchedule(null);
    } catch {
      burgerToast.error('Failed to delete schedule');
    }
  };

  const handleDownloadPDF = async () => {
    if (!schedule?.ranges?.length) {
      burgerToast.error('No schedule to download');
      return;
    }
    setDownloading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(`${API_URL}/bazar-schedule/${currentMonth}/pdf`, {
        headers,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bazar-schedule-${currentMonth}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      burgerToast.success('PDF downloaded');
    } catch {
      burgerToast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isTodayInRange = (fromDate, toDate) => {
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const fromStr = format(new Date(fromDate), 'yyyy-MM-dd');
      const toStr = format(new Date(toDate), 'yyyy-MM-dd');
      return todayStr >= fromStr && todayStr <= toStr;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-6 rounded-2xl shadow-lg">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">Bazar Schedule</h2>
            <p className="text-white/80 text-sm">Who does bazar on which day</p>
          </div>
          <div className="flex items-center gap-2 w-full">
            <label className="text-white text-sm font-medium flex items-center gap-2 shrink-0">
              <FaCalendarAlt className="text-lg" />Month:
            </label>
            <button type="button" onClick={() => navigateMonth(-1)} className="btn btn-ghost btn-sm btn-circle text-white hover:bg-white/20 shrink-0">
              <FaChevronLeft />
            </button>
            <div className="relative flex-1 min-w-0">
              <input
                type="month"
                id="scheduleMonthPicker"
                className="input input-bordered bg-white text-gray-800 font-medium shadow-md w-full cursor-pointer"
                value={currentMonth}
                onChange={e => setCurrentMonth(e.target.value)}
              />
            </div>
            <button type="button" onClick={() => navigateMonth(1)} className="btn btn-ghost btn-sm btn-circle text-white hover:bg-white/20 shrink-0">
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* Schedule display */}
      <div className="card bg-base-100 shadow-xl border-t-4 border-t-teal-500">
        <div className="card-body">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-teal-500/10 p-3 rounded-full shrink-0">
                <FaCalendarAlt className="text-xl text-teal-600" />
              </div>
              <div>
                <h3 className="font-bold text-teal-600 text-base leading-tight">
                  {format(new Date(currentMonth + '-01'), 'MMM yyyy')} Schedule
                </h3>
                <p className="text-xs text-base-content/60 mt-0.5">{schedule?.ranges?.length || 0} members assigned</p>
              </div>
            </div>
            {schedule?.ranges?.length > 0 && (
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  className={`btn btn-xs bg-teal-500 hover:bg-teal-600 text-white border-none gap-1 w-full ${downloading ? 'loading' : ''}`}
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                >
                  {!downloading && <FaFilePdf />} PDF
                </button>
                {isManager && (
                  <button className="btn btn-xs btn-error btn-outline gap-1 w-full" onClick={handleDelete}>
                    <FaTrash /> Delete
                  </button>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md text-teal-500"></span>
            </div>
          ) : !schedule?.ranges?.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-base-content/40">
              <FaCalendarCheck className="text-5xl mb-3" />
              <p className="text-lg font-semibold">No schedule for this month</p>
              {isManager && <p className="text-sm mt-1">Set schedule from Manager Settings</p>}
              {!isManager && <p className="text-sm mt-1">Manager hasn't set a schedule yet</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {[...schedule.ranges].sort((a, b) => new Date(a.fromDate) - new Date(b.fromDate)).map((entry, i) => {
                const isMe = entry.userId === userData?.uid;
                const isActive = isTodayInRange(entry.fromDate, entry.toDate);
                const groupMember = group?.members?.find(m => m.userId === entry.userId);
                const memberPhoto = groupMember?.photoURL;
                const displayName = groupMember?.name || entry.name;
                return (
                  <div
                    key={i}
                    className={`rounded-xl p-4 border-2 transition-all ${
                      isActive ? 'border-warning bg-warning/10'
                      : isMe ? 'border-teal-400 bg-teal-500/5'
                      : 'border-base-300 bg-base-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full shrink-0 overflow-hidden flex items-center justify-center font-bold text-sm ${isActive ? 'bg-warning/20 text-warning' : 'bg-teal-500/10 text-teal-600'}`}>
                          {memberPhoto
                            ? <img src={memberPhoto} alt={displayName} className="w-full h-full object-cover" />
                            : displayName.charAt(0).toUpperCase()
                          }
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base-content truncate">{displayName}</span>
                            {isMe && <span className="badge badge-sm badge-primary shrink-0">You</span>}
                            {isActive && <span className="badge badge-sm badge-warning shrink-0">On Duty</span>}
                          </div>
                          <p className="text-xs text-base-content/50 mt-0.5">Member #{i + 1}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`badge badge-md font-semibold shrink-0 ${isActive ? 'badge-warning' : 'badge-outline border-teal-400 text-teal-600'}`}>
                        {format(new Date(entry.fromDate), 'dd MMM yyyy')}
                      </span>
                      <span className="text-base-content/40 text-sm font-bold shrink-0">→</span>
                      <span className={`badge badge-md font-semibold shrink-0 ${isActive ? 'badge-warning' : 'badge-outline border-teal-400 text-teal-600'}`}>
                        {format(new Date(entry.toDate), 'dd MMM yyyy')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BazarSchedule;
