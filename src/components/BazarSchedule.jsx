import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import burgerToast from './BurgerToast';
import Swal from 'sweetalert2';
import { format, getDaysInMonth, isToday, startOfMonth, isBefore, isAfter, differenceInDays } from 'date-fns';
import { FaCalendarCheck, FaTrash, FaChevronLeft, FaChevronRight, FaCalendarAlt, FaFilePdf } from 'react-icons/fa';
import { queryKeys, fetchSchedule } from '../lib/queries';

const BazarSchedule = ({ group, isManager }) => {
  const { getAuthHeaders, userData } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [downloading, setDownloading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  const { data: schedule, isLoading: loading } = useQuery({
    queryKey: queryKeys.schedule(currentMonth),
    queryFn: () => fetchSchedule(getAuthHeaders, currentMonth),
    enabled: !!group,
    refetchInterval: 1000 * 10,
  });

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
      customClass: { 
        popup: 'swal-bazar-popup rounded-2xl',
        title: 'swal-bazar-title',
        htmlContainer: 'swal-bazar-text',
        icon: 'swal-bazar-icon',
        confirmButton: 'swal-bazar-confirm',
        cancelButton: 'swal-bazar-cancel'
      }
    });
    if (!result.isConfirmed) return;
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_URL}/bazar-schedule/${currentMonth}`, { headers });
      burgerToast.success('Schedule deleted');
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule(currentMonth) });
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

  const getDateStatus = (date, sortedRanges) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    for (const entry of sortedRanges) {
      const fromStr = format(new Date(entry.fromDate), 'yyyy-MM-dd');
      const toStr = format(new Date(entry.toDate), 'yyyy-MM-dd');
      
      if (dateStr >= fromStr && dateStr <= toStr) {
        if (dateStr < todayStr) return 'done';
        if (dateStr === todayStr) return 'today';
        return 'upcoming';
      }
    }
    return 'none';
  };

  const getMemberName = (userId) => {
    const member = group?.members?.find(m => m.userId === userId);
    return member?.name || 'Unknown';
  };

  // Derived data for summary cards
  const sortedRanges = schedule?.ranges ? [...schedule.ranges].sort((a, b) => new Date(a.fromDate) - new Date(b.fromDate)) : [];
  const today = new Date();
  
  // On duty now
  const onDutyMember = sortedRanges.find(entry => isTodayInRange(entry.fromDate, entry.toDate));
  const onDutyName = onDutyMember ? getMemberName(onDutyMember.userId) : null;
  const onDutyPhoto = onDutyMember ? group?.members?.find(m => m.userId === onDutyMember.userId)?.photoURL : null;
  const onDutyDayNum = onDutyMember ? differenceInDays(today, new Date(onDutyMember.fromDate)) + 1 : null;
  const onDutyTotalDays = onDutyMember ? differenceInDays(new Date(onDutyMember.toDate), new Date(onDutyMember.fromDate)) + 1 : null;
  
  // Your turn
  const myEntry = sortedRanges.find(entry => entry.userId === userData?.uid);
  const myStatus = myEntry 
    ? (isTodayInRange(myEntry.fromDate, myEntry.toDate) ? 'active' 
       : (isBefore(new Date(myEntry.toDate), today) ? 'done' 
          : 'upcoming'))
    : null;
  const myDaysUntil = myEntry && myStatus === 'upcoming' ? differenceInDays(new Date(myEntry.fromDate), today) : null;
  
  // Progress
  const doneCount = sortedRanges.filter(entry => isBefore(new Date(entry.toDate), today)).length;
  const totalCount = sortedRanges.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 5.1 Header */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-[26px] sm:text-[32px] font-extrabold text-base-content tracking-tight leading-none">
              Bazar Schedule
            </h1>
            <p className="text-sm text-base-content/70 mt-1">Who does bazar on which day</p>
          </div>
          
          {/* Month control - desktop: right side, mobile: full width */}
          <div className="sm:min-w-[320px]">
            <div className="bg-base-200 border border-base-content/15 rounded-xl p-1 flex items-center gap-1">
              <button 
                type="button" 
                onClick={() => navigateMonth(-1)} 
                className="w-9 h-9 rounded-[9px] flex items-center justify-center transition-colors focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
                style={{ background: 'var(--bz-tile)' }}
                aria-label="Previous month"
              >
                <FaChevronLeft className="text-base-content" />
              </button>
              <input
                type="month"
                className="flex-1 bg-transparent text-center font-semibold text-base-content cursor-pointer focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 px-2"
                value={currentMonth}
                onChange={e => setCurrentMonth(e.target.value)}
                aria-label="Select month"
              />
              <button 
                type="button" 
                onClick={() => navigateMonth(1)} 
                className="w-9 h-9 rounded-[9px] flex items-center justify-center transition-colors focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
                style={{ background: 'var(--bz-tile)' }}
                aria-label="Next month"
              >
                <FaChevronRight className="text-base-content" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-neutral"></span>
        </div>
      ) : !schedule?.ranges?.length ? (
        <div className="bg-base-200 border border-base-content/15 rounded-[18px] p-8 sm:p-12 flex flex-col items-center justify-center text-center">
          <FaCalendarCheck className="text-5xl sm:text-6xl text-base-content/40 mb-4" />
          <p className="text-lg sm:text-xl font-bold text-base-content/70 mb-2">No schedule for this month</p>
          {isManager && <p className="text-sm text-base-content/60">Set schedule from Manager Settings</p>}
          {!isManager && <p className="text-sm text-base-content/60">Manager hasn't set a schedule yet</p>}
        </div>
      ) : (
        <>
          {/* 5.2 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] gap-3">
            {/* Card 1: On duty now */}
            <div 
              className="bg-neutral border border-neutral rounded-[18px] p-[18px] space-y-3"
              style={{ color: 'var(--bz-on-strong)' }}
            >
              <p className="text-[13px] opacity-90 font-medium">On duty now</p>
              {onDutyMember ? (
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center shrink-0 border-2 border-white/20" style={{ background: 'var(--bz-tile)' }}>
                    {onDutyPhoto ? (
                      <img src={onDutyPhoto} alt={onDutyName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-base-content">{onDutyName?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[24px] font-extrabold leading-tight truncate">{onDutyName}</p>
                    <p className="text-[13px] opacity-80 mt-0.5">
                      {format(new Date(onDutyMember.fromDate), 'dd MMM')} to {format(new Date(onDutyMember.toDate), 'dd MMM')}, day {onDutyDayNum} of {onDutyTotalDays}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[20px] font-bold opacity-80">Nobody today</p>
                  {sortedRanges[0] && isAfter(new Date(sortedRanges[0].fromDate), today) && (
                    <p className="text-[13px] opacity-75 mt-1">
                      Next: {getMemberName(sortedRanges[0].userId)} on {format(new Date(sortedRanges[0].fromDate), 'dd MMM')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Card 2: Your turn */}
            <div className="bg-base-200 border border-base-content/15 rounded-[18px] p-[18px] space-y-2">
              <p className="text-[13px] text-base-content/70 font-medium">Your turn</p>
              {myEntry ? (
                <>
                  <p className="text-[18px] sm:text-[20px] font-bold text-base-content leading-tight">
                    {format(new Date(myEntry.fromDate), 'dd MMM')} to {format(new Date(myEntry.toDate), 'dd MMM')}
                  </p>
                  <p className="text-[13px] text-base-content/70">
                    {myStatus === 'done' && '✓ Completed'}
                    {myStatus === 'active' && '● It is your turn today'}
                    {myStatus === 'upcoming' && `In ${myDaysUntil} ${myDaysUntil === 1 ? 'day' : 'days'}`}
                  </p>
                </>
              ) : (
                <p className="text-[18px] font-semibold text-base-content/60">Not assigned</p>
              )}
            </div>

            {/* Card 3: Progress */}
            <div className="bg-base-200 border border-base-content/15 rounded-[18px] p-[18px] space-y-2">
              <p className="text-[13px] text-base-content/70 font-medium">Progress</p>
              <p className="text-[20px] font-bold text-base-content leading-tight">
                {doneCount} of {totalCount} turns done
              </p>
              <div className="space-y-1.5">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bz-line)' }}>
                  <div className="h-full bg-neutral transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
                </div>
                <p className="text-[13px] text-base-content/70">{progressPct}% of the schedule</p>
              </div>
            </div>
          </div>

          {/* 5.3 Month at a Glance */}
          <div className="bg-base-200 border border-base-content/15 rounded-[18px] p-4 sm:p-5 space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-base-content">Month at a glance</h3>
            
            <div>
              <div 
                className="grid gap-[3px] mb-2"
                style={{ gridTemplateColumns: `repeat(${getDaysInMonth(new Date(currentMonth + '-01'))}, 1fr)` }}
              >
                {Array.from({ length: getDaysInMonth(new Date(currentMonth + '-01')) }, (_, i) => {
                  const day = i + 1;
                  const date = new Date(currentMonth + `-${String(day).padStart(2, '0')}`);
                  const status = getDateStatus(date, sortedRanges);
                  const memberForDay = sortedRanges.find(entry => {
                    const fromStr = format(new Date(entry.fromDate), 'yyyy-MM-dd');
                    const toStr = format(new Date(entry.toDate), 'yyyy-MM-dd');
                    const dateStr = format(date, 'yyyy-MM-dd');
                    return dateStr >= fromStr && dateStr <= toStr;
                  });
                  const memberName = memberForDay ? getMemberName(memberForDay.userId) : 'No bazar';
                  const isTodayCell = isToday(date);
                  
                  return (
                    <div
                      key={day}
                      className="h-[22px] sm:h-[26px] rounded-md transition-colors"
                      style={{
                        background: status === 'done' ? 'var(--bz-done)' 
                                  : status === 'today' ? 'var(--color-neutral)'
                                  : status === 'upcoming' ? 'var(--bz-tile)'
                                  : 'var(--bz-alt)',
                        border: status === 'done' ? 'none' 
                              : status === 'upcoming' ? '1px solid var(--color-neutral)'
                              : '1px solid var(--bz-line)',
                        boxShadow: isTodayCell ? '0 0 0 2px var(--color-base-100), 0 0 0 4px var(--color-base-content)' : 'none'
                      }}
                      title={`${day} ${format(date, 'EEE')}: ${memberName}`}
                      aria-label={`${day} ${format(date, 'EEEE')}: ${memberName}`}
                    ></div>
                  );
                })}
              </div>
              
              {/* Day numbers */}
              <div 
                className="grid gap-[3px] mb-3"
                style={{ gridTemplateColumns: `repeat(${getDaysInMonth(new Date(currentMonth + '-01'))}, 1fr)` }}
              >
                {Array.from({ length: getDaysInMonth(new Date(currentMonth + '-01')) }, (_, i) => {
                  const day = i + 1;
                  const show = day === 1 || day % 5 === 0;
                  return (
                    <div key={day} className="text-center text-[10px] text-base-content/60">
                      <span className={show ? '' : 'hidden sm:inline'}>{day}</span>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-base-content/70">
                <div className="flex items-center gap-1.5">
                  <div className="w-[10px] h-[10px] rounded-sm" style={{ background: 'var(--bz-done)' }}></div>
                  <span>Done</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-[10px] h-[10px] rounded-sm bg-neutral"></div>
                  <span>On duty</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-[10px] h-[10px] rounded-sm border border-neutral" style={{ background: 'var(--bz-tile)' }}></div>
                  <span>Upcoming</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-[10px] h-[10px] rounded-sm border" style={{ background: 'var(--bz-alt)', borderColor: 'var(--bz-line)' }}></div>
                  <span>No bazar</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5.4 Schedule Card */}
          <div className="bg-base-200 border border-base-content/15 rounded-[18px] overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:px-5 sm:py-4 border-b flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4" style={{ borderColor: 'var(--bz-line)' }}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center shrink-0" style={{ background: 'var(--bz-tile)' }}>
                  <FaCalendarAlt className="text-lg text-base-content" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[19px] font-bold text-base-content leading-tight">
                    {format(new Date(currentMonth + '-01'), 'MMM yyyy')} Schedule
                  </h3>
                  <p className="text-[13px] text-base-content/70 mt-0.5">
                    {sortedRanges.length} {sortedRanges.length === 1 ? 'member' : 'members'} assigned
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 sm:shrink-0 sm:ml-auto">
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                  className="bg-neutral rounded-[10px] px-3.5 py-2 text-sm font-semibold flex items-center gap-2 transition-opacity hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-50"
                  style={{ color: 'var(--bz-on-strong)' }}
                  aria-label="Download PDF"
                >
                  {downloading ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <FaFilePdf />
                  )}
                  <span className="hidden xs:inline">PDF</span>
                </button>
                {isManager && (
                  <button
                    onClick={handleDelete}
                    className="bg-transparent rounded-[10px] px-3.5 py-2 text-sm font-semibold flex items-center gap-2 transition-colors hover:opacity-80 focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
                    style={{ 
                      color: 'var(--bz-neg)',
                      border: '1.5px solid color-mix(in oklab, var(--bz-neg) 55%, transparent)'
                    }}
                    aria-label="Delete schedule"
                  >
                    <FaTrash />
                    <span className="hidden xs:inline">Delete</span>
                  </button>
                )}
              </div>
            </div>

            {/* Member Rows */}
            <ul className="p-2.5 sm:p-4 space-y-2.5" role="list">
              {sortedRanges.map((entry, i) => {
                const isMe = entry.userId === userData?.uid;
                const isActive = isTodayInRange(entry.fromDate, entry.toDate);
                const groupMember = group?.members?.find(m => m.userId === entry.userId);
                const memberPhoto = groupMember?.photoURL;
                const displayName = groupMember?.name || entry.name;
                const duration = differenceInDays(new Date(entry.toDate), new Date(entry.fromDate)) + 1;
                const statusText = isBefore(new Date(entry.toDate), today) ? 'done' 
                                 : (isActive ? 'active' : 'upcoming');
                
                return (
                  <li
                    key={`${entry.userId}-${i}`}
                    className="rounded-[14px] p-3 sm:p-4 transition-all"
                    style={{
                      background: isMe ? 'var(--bz-you)' : 'var(--bz-alt)',
                      border: `1.5px solid ${isMe ? 'var(--color-neutral)' : 'var(--bz-line)'}`,
                      boxShadow: isActive ? '0 0 0 3px color-mix(in oklab, var(--color-neutral) 28%, transparent)' : 'none'
                    }}
                  >
                    {/* Desktop Grid */}
                    <div className="hidden sm:grid sm:grid-cols-[34px_minmax(180px,1.3fr)_minmax(250px,1.5fr)_80px_120px] sm:gap-3.5 sm:items-center">
                      {/* Order badge */}
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold text-base-content" style={{ background: 'var(--bz-tile)' }}>
                        {i + 1}
                      </div>

                      {/* Avatar + Name */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div 
                          className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 border"
                          style={{ 
                            background: 'var(--bz-tile)',
                            borderColor: 'var(--bz-line)',
                            borderWidth: '1.5px'
                          }}
                        >
                          {memberPhoto ? (
                            <img src={memberPhoto} alt={displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-semibold text-base-content">
                              {displayName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base-content truncate">{displayName}</span>
                            {isMe && (
                              <span 
                                className="bg-neutral rounded-full text-[11px] font-semibold px-2 py-0.5"
                                style={{ color: 'var(--bz-on-strong)' }}
                              >
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] text-base-content/70">Member #{i + 1}</p>
                        </div>
                      </div>

                      {/* Date Range */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          className="rounded-lg px-2.5 py-0.5 text-[13px] font-semibold text-base-content"
                          style={{ background: 'var(--bz-tile)' }}
                        >
                          {format(new Date(entry.fromDate), 'dd MMM yyyy')}
                        </span>
                        <span className="text-base-content/60 text-sm">→</span>
                        <span 
                          className="rounded-lg px-2.5 py-0.5 text-[13px] font-semibold text-base-content"
                          style={{ background: 'var(--bz-tile)' }}
                        >
                          {format(new Date(entry.toDate), 'dd MMM yyyy')}
                        </span>
                      </div>

                      {/* Duration */}
                      <div className="text-[13px] text-base-content/70">
                        {duration} {duration === 1 ? 'day' : 'days'}
                      </div>

                      {/* Status */}
                      <div>
                        {statusText === 'done' && (
                          <span 
                            className="rounded-full text-[13px] font-semibold px-3 py-1 inline-block"
                            style={{ background: 'var(--bz-tile)', color: 'var(--bz-pos)' }}
                          >
                            ✓ Done
                          </span>
                        )}
                        {statusText === 'active' && (
                          <span 
                            className="bg-neutral rounded-full text-[13px] font-semibold px-3 py-1 inline-block"
                            style={{ color: 'var(--bz-on-strong)' }}
                          >
                            ● On duty
                          </span>
                        )}
                        {statusText === 'upcoming' && (
                          <span 
                            className="bg-transparent rounded-full text-[13px] font-semibold px-3 py-1 inline-block text-base-content"
                            style={{ border: '1.5px solid var(--color-neutral)' }}
                          >
                            Upcoming
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mobile Grid */}
                    <div className="grid sm:hidden grid-cols-[30px_1fr_auto] gap-2.5" style={{ gridTemplateAreas: '"n who status" ". dates dates"' }}>
                      {/* Order badge */}
                      <div 
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold text-base-content"
                        style={{ background: 'var(--bz-tile)', gridArea: 'n' }}
                      >
                        {i + 1}
                      </div>

                      {/* Avatar + Name */}
                      <div className="flex items-center gap-2 min-w-0" style={{ gridArea: 'who' }}>
                        <div 
                          className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 border"
                          style={{ 
                            background: 'var(--bz-tile)',
                            borderColor: 'var(--bz-line)',
                            borderWidth: '1.5px'
                          }}
                        >
                          {memberPhoto ? (
                            <img src={memberPhoto} alt={displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-semibold text-base-content">
                              {displayName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-base-content truncate text-sm">{displayName}</span>
                            {isMe && (
                              <span 
                                className="bg-neutral rounded-full text-[10px] font-semibold px-1.5 py-0.5"
                                style={{ color: 'var(--bz-on-strong)' }}
                              >
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-base-content/70">Member #{i + 1}</p>
                        </div>
                      </div>

                      {/* Status */}
                      <div style={{ gridArea: 'status' }}>
                        {statusText === 'done' && (
                          <span 
                            className="rounded-full text-[11px] font-semibold px-2 py-1 inline-block"
                            style={{ background: 'var(--bz-tile)', color: 'var(--bz-pos)' }}
                          >
                            ✓ Done
                          </span>
                        )}
                        {statusText === 'active' && (
                          <span 
                            className="bg-neutral rounded-full text-[11px] font-semibold px-2 py-1 inline-block"
                            style={{ color: 'var(--bz-on-strong)' }}
                          >
                            ● On duty
                          </span>
                        )}
                        {statusText === 'upcoming' && (
                          <span 
                            className="bg-transparent rounded-full text-[11px] font-semibold px-2 py-1 inline-block text-base-content"
                            style={{ border: '1.5px solid var(--color-neutral)' }}
                          >
                            Upcoming
                          </span>
                        )}
                      </div>

                      {/* Date Range */}
                      <div className="flex items-center gap-2 flex-wrap" style={{ gridArea: 'dates' }}>
                        <span 
                          className="rounded-lg px-2 py-0.5 text-[12px] font-semibold text-base-content"
                          style={{ background: 'var(--bz-tile)' }}
                        >
                          {format(new Date(entry.fromDate), 'dd MMM yyyy')}
                        </span>
                        <span className="text-base-content/60 text-xs">→</span>
                        <span 
                          className="rounded-lg px-2 py-0.5 text-[12px] font-semibold text-base-content"
                          style={{ background: 'var(--bz-tile)' }}
                        >
                          {format(new Date(entry.toDate), 'dd MMM yyyy')}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default BazarSchedule;
