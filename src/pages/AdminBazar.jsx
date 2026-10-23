import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays, parseISO } from 'date-fns';
import axios from 'axios';
import burgerToast from '../components/BurgerToast';
import LottieLoader from '../components/LottieLoader';
import { queryKeys, fetchGroup, fetchSchedule } from '../lib/queries';
import { FaCalendarCheck, FaSave } from 'react-icons/fa';
import PageTitle from '../components/Admin/PageTitle';
import MemberAvatar from '../components/Admin/MemberAvatar';
import StickySaveBar from '../components/Admin/StickySaveBar';

const AdminBazar = () => {
  const [scheduleMonth, setScheduleMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [ranges, setRanges] = useState({});
  const [savingSchedule, setSavingSchedule] = useState(false);

  const { userData, getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();

  const API_URL = import.meta.env.VITE_API_URL;

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: queryKeys.group(),
    queryFn: () => fetchGroup(getAuthHeaders),
    enabled: !!userData?.groupId,
    refetchInterval: 1000 * 15,
  });

  const { data: existingSchedule } = useQuery({
    queryKey: queryKeys.schedule(scheduleMonth),
    queryFn: () => fetchSchedule(getAuthHeaders, scheduleMonth),
    enabled: !!group,
    refetchInterval: 1000 * 10, // Auto-refresh every 10 seconds
  });

  useEffect(() => {
    if (existingSchedule?.ranges?.length) {
      const prefilled = {};
      existingSchedule.ranges.forEach(r => {
        prefilled[r.userId] = {
          fromDate: format(new Date(r.fromDate), 'yyyy-MM-dd'),
          toDate: format(new Date(r.toDate), 'yyyy-MM-dd'),
        };
      });
      setRanges(prefilled);
    } else {
      setRanges({});
    }
  }, [existingSchedule, scheduleMonth]);

  const activeMembers = group?.members?.filter(m => m.status === 'active') || [];
  const assignedCount = activeMembers.filter(m => ranges[m.userId]?.fromDate && ranges[m.userId]?.toDate).length;
  const totalCount = activeMembers.length;

  const handleRangeChange = (userId, field, value) => {
    setRanges(prev => ({ ...prev, [userId]: { ...prev[userId], [field]: value } }));
  };

  const handleSaveSchedule = async () => {
    const filled = activeMembers.filter(m => ranges[m.userId]?.fromDate && ranges[m.userId]?.toDate);
    if (!filled.length) { 
      burgerToast.error('Please set at least one member range'); 
      return; 
    }
    for (const m of filled) {
      if (ranges[m.userId].toDate < ranges[m.userId].fromDate) {
        burgerToast.error(`${m.name}: End date must be after start date`); 
        return;
      }
    }
    setSavingSchedule(true);
    try {
      const headers = await getAuthHeaders();
      const payload = filled.map(m => ({ 
        userId: m.userId, 
        fromDate: ranges[m.userId].fromDate, 
        toDate: ranges[m.userId].toDate 
      }));
      await axios.post(`${API_URL}/bazar-schedule`, { 
        month: scheduleMonth, 
        ranges: payload 
      }, { headers });
      burgerToast.success('Schedule saved');
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule(scheduleMonth) });
    } catch (error) {
      burgerToast.error(error.response?.data?.error || 'Failed to save schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  if (groupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <LottieLoader size={270} />
      </div>
    );
  }

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 820);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 820);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="container mx-auto px-3.5 lg:px-5 py-[14px] lg:py-[22px] max-w-[1040px]" style={{ paddingBottom: 'calc(168px + env(safe-area-inset-bottom, 0px))' }}>
      <PageTitle 
        icon={FaCalendarCheck}
        title="Set Bazar Schedule"
        subtitle="Assign bazar duty date ranges to members"
      />

      {/* Select Month */}
      <div className="mb-[18px]">
        <label htmlFor="schedule-month" className="block text-[14.5px] font-[600] text-base-content mb-2">
          Select Month
        </label>
        <input
          id="schedule-month"
          type="month"
          className="w-full lg:max-w-[280px] px-[14px] py-[12px] rounded-xl border-[1.5px] text-base-content cursor-pointer focus:outline-none focus:ring-3"
          style={{ 
            borderColor: 'var(--ad-line)',
            background: 'var(--ad-field)',
            '--tw-ring-color': 'color-mix(in oklab, var(--color-neutral) 28%, transparent)'
          }}
          value={scheduleMonth}
          onChange={e => setScheduleMonth(e.target.value)}
        />
      </div>

      {/* Member Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px] mb-[22px]">
        {[...activeMembers].sort((a, b) => {
          const aDate = ranges[a.userId]?.fromDate || '';
          const bDate = ranges[b.userId]?.fromDate || '';
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;
          return aDate.localeCompare(bDate);
        }).map((member) => {
          const hasRange = ranges[member.userId]?.fromDate && ranges[member.userId]?.toDate;
          const isCurrentUser = member.userId === userData?.uid;
          let dayCount = 0;
          if (hasRange) {
            try {
              const from = parseISO(ranges[member.userId].fromDate);
              const to = parseISO(ranges[member.userId].toDate);
              dayCount = differenceInDays(to, from) + 1;
            } catch {}
          }

          return (
            <div 
              key={member.userId} 
              className="bg-base-200 border rounded-[18px] p-[16px_18px]"
              style={{ 
                borderColor: isCurrentUser ? 'var(--color-neutral)' : 'var(--ad-line)',
                borderWidth: isCurrentUser ? '1.5px' : '1px'
              }}
            >
              <div className="grid gap-[14px]">
                {/* Top Row: Avatar + Name + Status */}
                <div className="flex items-center gap-3">
                  <MemberAvatar 
                    photoURL={member.photoURL}
                    name={member.name}
                    isYou={isCurrentUser}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-[700] text-base-content">{member.name}</span>
                    </div>
                    <p className="text-[13px] text-base-content/70 truncate">{member.email}</p>
                  </div>
                  {hasRange && (
                    <span 
                      className="text-[12px] font-[700] rounded-full px-[10px] py-[2px] shrink-0"
                      style={{ 
                        background: 'var(--color-neutral)',
                        color: 'var(--ad-on-strong)'
                      }}
                    >
                      set
                    </span>
                  )}
                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-2 gap-[10px]">
                  <div>
                    <label htmlFor={`from-${member.userId}`} className="block text-[13px] font-[600] text-base-content/70 mb-1.5">
                      From Date
                    </label>
                    <input
                      id={`from-${member.userId}`}
                      type="date"
                      className="w-full px-[12px] py-[10px] rounded-xl border-[1.5px] text-sm focus:outline-none focus:ring-3"
                      style={{ 
                        borderColor: 'var(--ad-line)',
                        background: 'var(--ad-field)',
                        '--tw-ring-color': 'color-mix(in oklab, var(--color-neutral) 28%, transparent)'
                      }}
                      value={ranges[member.userId]?.fromDate || ''}
                      onChange={e => handleRangeChange(member.userId, 'fromDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor={`to-${member.userId}`} className="block text-[13px] font-[600] text-base-content/70 mb-1.5">
                      To Date
                    </label>
                    <input
                      id={`to-${member.userId}`}
                      type="date"
                      className="w-full px-[12px] py-[10px] rounded-xl border-[1.5px] text-sm focus:outline-none focus:ring-3"
                      style={{ 
                        borderColor: 'var(--ad-line)',
                        background: 'var(--ad-field)',
                        '--tw-ring-color': 'color-mix(in oklab, var(--color-neutral) 28%, transparent)'
                      }}
                      value={ranges[member.userId]?.toDate || ''}
                      min={ranges[member.userId]?.fromDate || ''}
                      onChange={e => handleRangeChange(member.userId, 'toDate', e.target.value)}
                    />
                  </div>
                </div>

                {/* Optional Day Count */}
                {hasRange && dayCount > 0 && (
                  <p className="text-[13px] text-base-content/70">
                    {dayCount} day{dayCount !== 1 ? 's' : ''} of bazar duty
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Save Bar */}
      <StickySaveBar 
        mobile={isMobile}
        statusContent={
          <div>
            <p className="text-[13px] text-base-content/70 mb-1.5">
              {assignedCount} of {totalCount} members assigned
            </p>
            <div 
              className="h-2 rounded-full overflow-hidden"
              style={{ background: 'var(--ad-line)' }}
            >
              <div 
                className="h-full transition-all duration-300"
                style={{ 
                  width: `${totalCount > 0 ? (assignedCount / totalCount) * 100 : 0}%`,
                  background: 'var(--color-neutral)'
                }}
              />
            </div>
          </div>
        }
        button={
          <button
            onClick={handleSaveSchedule}
            disabled={savingSchedule}
            className="w-full px-5 py-3 rounded-xl text-[15px] font-[700] flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-110"
            style={{
              background: savingSchedule ? 'var(--ad-tile)' : 'var(--color-neutral)',
              color: savingSchedule ? 'var(--color-base-content)' : 'var(--ad-on-strong)'
            }}
          >
            {savingSchedule ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FaSave />
                Save Schedule ({assignedCount}/{totalCount} set)
              </>
            )}
          </button>
        }
      />
    </div>
  );
};

export default AdminBazar;
