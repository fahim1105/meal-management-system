import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import burgerToast from './BurgerToast';
import { format, isToday as isTodayFn, getDay } from 'date-fns';
import { FaUtensils, FaChevronLeft, FaChevronRight, FaMinus, FaPlus } from 'react-icons/fa';
import { queryKeys, fetchMeal, fetchMealConfig } from '../lib/queries';

// Breakfast, Lunch and Dinner
const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
];

const MealSheet = ({ group, isManager, onUpdate }) => {
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [pendingChanges, setPendingChanges] = useState({});
  const [saving, setSaving] = useState(false);
  const [mobileView, setMobileView] = useState('day'); // 'day' | 'month'
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const { getAuthHeaders, userData } = useAuth();
  const queryClient = useQueryClient();
  const API_URL = import.meta.env.VITE_API_URL;

  // Refs for sticky header measurement
  const scrollWrapperRef = useRef(null);
  const headerRow1Ref = useRef(null);
  const [headerRow1Height, setHeaderRow1Height] = useState(49); // Fallback until measured
  const [isScrolledX, setIsScrolledX] = useState(false);

  const { data: mealSheetRaw, isLoading: loading } = useQuery({
    queryKey: queryKeys.meal(currentMonth),
    queryFn: () => fetchMeal(getAuthHeaders, currentMonth),
    enabled: !!group,
    refetchInterval: 1000 * 10,
  });

  const { data: mealConfig, isLoading: configLoading } = useQuery({
    queryKey: queryKeys.mealConfig(currentMonth),
    queryFn: () => fetchMealConfig(getAuthHeaders, currentMonth),
    enabled: !!group,
    refetchInterval: 1000 * 10,
  });

  // Normalize mealSheet data
  const mealSheet = useMemo(() => {
    if (!mealSheetRaw) return null;
    const normalized = { ...mealSheetRaw };
    if (normalized.days instanceof Map) {
      normalized.days = Object.fromEntries(normalized.days);
    }
    if (normalized.days) {
      Object.keys(normalized.days).forEach(day => {
        if (!Array.isArray(normalized.days[day])) normalized.days[day] = [];
      });
    }
    return normalized;
  }, [mealSheetRaw]);

  // Get active members only (who have meal config)
  const activeMembers = useMemo(() => {
    if (!group?.members || !mealConfig?.configs) return [];
    return group.members.filter(member => {
      const cfg = mealConfig.configs.find(c => c.userId === member.userId);
      return cfg && (cfg.breakfast || cfg.lunch || cfg.dinner);
    });
  }, [group, mealConfig]);

  // Get meal types enabled for a specific user
  const getUserMealTypes = (userId) => {
    if (!mealConfig?.configs) return [];
    const cfg = mealConfig.configs.find(c => c.userId === userId);
    if (!cfg) return [];
    return MEAL_TYPES.filter(type => cfg[type.key]);
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!mealSheet?.days || !activeMembers.length) {
      return { totalMeals: 0, totalBreakfast: 0, totalLunch: 0, totalDinner: 0, today: 0 };
    }

    let totalMeals = 0, totalBreakfast = 0, totalLunch = 0, totalDinner = 0, today = 0;
    const todayDay = new Date().getDate();
    const todayMonth = format(new Date(), 'yyyy-MM');

    Object.entries(mealSheet.days).forEach(([day, dayMeals]) => {
      if (!Array.isArray(dayMeals)) return;
      const dayNum = parseInt(day);
      const isToday = dayNum === todayDay && currentMonth === todayMonth;

      dayMeals.forEach(meal => {
        const breakfastCount = meal.breakfast ? (meal.breakfastCount || 1) : 0;
        const lunchCount = meal.lunch ? (meal.lunchCount || 1) : 0;
        const dinnerCount = meal.dinner ? (meal.dinnerCount || 1) : 0;
        totalBreakfast += breakfastCount;
        totalLunch += lunchCount;
        totalDinner += dinnerCount;
        totalMeals += breakfastCount + lunchCount + dinnerCount;
        if (isToday) today += breakfastCount + lunchCount + dinnerCount;
      });
    });

    return { totalMeals, totalBreakfast, totalLunch, totalDinner, today };
  }, [mealSheet, currentMonth, activeMembers]);

  // Measure header row 1 height and set CSS variable
  useEffect(() => {
    if (!headerRow1Ref.current || !scrollWrapperRef.current) return;
    
    const measureAndSet = () => {
      // Use requestAnimationFrame to ensure layout is complete
      requestAnimationFrame(() => {
        if (!headerRow1Ref.current || !scrollWrapperRef.current) return;
        const height = headerRow1Ref.current.getBoundingClientRect().height;
        setHeaderRow1Height(height);
        // Set exact height - Row 2 will overlap Row 1's bottom border
        scrollWrapperRef.current.style.setProperty('--head1-h', `${height}px`);
      });
    };

    const observer = new ResizeObserver(measureAndSet);
    observer.observe(headerRow1Ref.current);
    
    // Also measure on window resize
    window.addEventListener('resize', measureAndSet);
    
    // Also measure on font load
    if (document.fonts) {
      document.fonts.ready.then(measureAndSet);
    }
    
    // Initial measurement with slight delay
    const timer = setTimeout(measureAndSet, 0);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measureAndSet);
      clearTimeout(timer);
    };
  }, []);

  // Handle horizontal scroll for shadow effect
  useEffect(() => {
    const wrapper = scrollWrapperRef.current;
    if (!wrapper) return;

    const handleScroll = () => {
      setIsScrolledX(wrapper.scrollLeft > 0);
    };

    wrapper.addEventListener('scroll', handleScroll);
    return () => wrapper.removeEventListener('scroll', handleScroll);
  }, []);

  // Clear pending changes when month changes
  useEffect(() => {
    setPendingChanges({});
  }, [currentMonth]);

  // Auto-select today if in current month
  useEffect(() => {
    const todayMonth = format(new Date(), 'yyyy-MM');
    if (currentMonth === todayMonth) {
      setSelectedDay(new Date().getDate());
    } else {
      setSelectedDay(1);
    }
  }, [currentMonth]);

  const canEditMealForDate = (member, day) => {
    if (!member) return false;
    if (member.status === 'inactive') return false;
    
    const mealDate = new Date(`${currentMonth}-${day.toString().padStart(2, '0')}`);
    
    if (member.leftAt && member.rejoinedAt) {
      const leftDate = new Date(member.leftAt);
      const rejoinDate = new Date(member.rejoinedAt);
      if (mealDate >= leftDate && mealDate < rejoinDate) return false;
    }
    
    if (member.leftAt && !member.rejoinedAt) {
      const leftDate = new Date(member.leftAt);
      if (mealDate >= leftDate) return false;
    }
    
    return true;
  };

  const toggleMeal = (day, userId, mealType) => {
    if (!isManager) {
      burgerToast.error('Only manager can edit meals');
      return;
    }

    const member = group?.members.find(m => m.userId === userId);
    if (!canEditMealForDate(member, day)) {
      burgerToast.error('Cannot edit meals for this member on this date');
      return;
    }

    const currentStatus = getMealStatus(day, userId, mealType);
    const newStatus = !currentStatus;
    const changeKey = `${day}-${userId}-${mealType}`;

    setPendingChanges(prev => {
      const updated = { ...prev };
      updated[changeKey] = { day, userId, mealType, type: 'set', value: newStatus };
      if (!newStatus) delete updated[`${day}-${userId}-${mealType}-count`];
      return updated;
    });
  };

  const updateMealCount = (day, userId, mealType, count) => {
    if (!isManager) {
      burgerToast.error('Only manager can edit meals');
      return;
    }

    const member = group?.members.find(m => m.userId === userId);
    if (!canEditMealForDate(member, day)) {
      burgerToast.error('Cannot edit meals for this member on this date');
      return;
    }

    const changeKey = `${day}-${userId}-${mealType}-count`;
    setPendingChanges(prev => ({
      ...prev,
      [changeKey]: {
        day, userId, mealType,
        count: Math.max(1, Math.min(10, parseInt(count) || 1)),
        type: 'count',
      },
    }));
  };

  const getMealStatus = (day, userId, mealType) => {
    const toggleKey = `${day}-${userId}-${mealType}`;
    if (pendingChanges[toggleKey]) return pendingChanges[toggleKey].value;

    if (!mealSheet?.days) return false;
    const dayMeals = mealSheet.days[day.toString()];
    if (!dayMeals || !Array.isArray(dayMeals)) return false;
    const userMeal = dayMeals.find(m => m.userId === userId);
    return userMeal?.[mealType] || false;
  };

  const getMealCount = (day, userId, mealType) => {
    const countKey = `${day}-${userId}-${mealType}-count`;
    if (pendingChanges[countKey]) return pendingChanges[countKey].count;

    if (!mealSheet?.days) return 1;
    const dayMeals = mealSheet.days[day.toString()];
    if (!dayMeals || !Array.isArray(dayMeals)) return 1;
    const userMeal = dayMeals.find(m => m.userId === userId);
    return userMeal?.[`${mealType}Count`] || 1;
  };

  const hasPendingChanges = () => Object.keys(pendingChanges).length > 0;

  const hasCellChanged = (day, userId, mealType) => {
    const toggleKey = `${day}-${userId}-${mealType}`;
    const countKey = `${day}-${userId}-${mealType}-count`;
    return !!(pendingChanges[toggleKey] || pendingChanges[countKey]);
  };

  const saveChanges = async () => {
    if (!hasPendingChanges()) {
      burgerToast.error('No changes to save');
      return;
    }

    setSaving(true);
    const headers = await getAuthHeaders();

    try {
      const changesArray = Object.values(pendingChanges);
      const response = await axios.post(
        `${API_URL}/meal/batch-update`,
        { month: currentMonth, changes: changesArray },
        { headers }
      );

      const { successCount, errorCount, errors } = response.data;
      setPendingChanges({});
      queryClient.invalidateQueries({ queryKey: queryKeys.meal(currentMonth) });

      if (errorCount === 0) {
        burgerToast.success(`Successfully saved ${successCount} changes`);
        onUpdate?.();
      } else {
        burgerToast.warning(`Saved ${successCount} changes, ${errorCount} failed`);
        if (errors?.length > 0) console.error('Failed changes:', errors);
      }
    } catch (error) {
      console.error('Save changes error:', error);
      burgerToast.error('Failed to save changes');
      setPendingChanges({});
      queryClient.invalidateQueries({ queryKey: queryKeys.meal(currentMonth) });
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    setPendingChanges({});
    burgerToast.info('Changes discarded');
  };

  const navigateMonth = (direction) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const [year, month] = currentMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  // Check if day is today
  const isToday = (day) => {
    const todayMonth = format(new Date(), 'yyyy-MM');
    const todayDay = new Date().getDate();
    return currentMonth === todayMonth && day === todayDay;
  };

  // Get day name
  const getDayName = (day) => {
    const date = new Date(year, month - 1, day);
    return format(date, 'EEE');
  };

  if (loading || configLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg text-neutral"></span>
      </div>
    );
  }

  if (!mealConfig || activeMembers.length === 0) {
    return (
      <div className="space-y-6 px-3.5 lg:px-5 max-w-[1180px] mx-auto">
        <div className="text-left">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-base-content tracking-tight">Meal Sheet</h1>
          <p className="text-base-content/70 mt-1">Track daily meals for all members</p>
        </div>
        <div className="bg-base-200 border border-base-content/15 rounded-2xl p-16 text-center">
          <FaUtensils className="text-6xl text-base-content/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-base-content">Meal types not configured</h3>
          <p className="text-base-content/60 mt-2 max-w-md mx-auto">
            {isManager
              ? 'Go to Manager Settings → Meals tab to configure each member\'s meal types.'
              : 'Please ask your manager to configure meal types for this month.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-auto pb-[calc(4rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="text-left">
        <h1 className="text-2xl lg:text-3xl font-extrabold text-base-content tracking-tight">Meal Sheet</h1>
        <p className="text-base-content/70 mt-1">Track daily meals for all members</p>
      </div>

      {/* Month Switcher */}
      <div className="bg-base-200 rounded-xl border border-base-content/15 p-2">
        <div className="join w-full">
          <button
            type="button"
            onClick={() => navigateMonth(-1)}
            className="btn btn-sm btn-square join-item bg-base-100 border-base-content/15 hover:bg-base-300 text-base-content"
          >
            <FaChevronLeft />
          </button>
          <div className="join-item flex items-center justify-center flex-1 min-w-[130px] font-semibold text-base-content px-4">
            {format(new Date(year, month - 1), 'MMMM yyyy')}
          </div>
          <button
            type="button"
            onClick={() => navigateMonth(1)}
            className="btn btn-sm btn-square join-item bg-base-100 border-base-content/15 hover:bg-base-300 text-base-content"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {(() => {
        // Get meal types enabled by ANY member in the group
        const groupEnabledMealTypes = new Set();
        if (mealConfig?.configs) {
          mealConfig.configs.forEach(cfg => {
            if (cfg.breakfast) groupEnabledMealTypes.add('breakfast');
            if (cfg.lunch) groupEnabledMealTypes.add('lunch');
            if (cfg.dinner) groupEnabledMealTypes.add('dinner');
          });
        }
        
        // Build stats array - always include Total meals first
        const allStats = [
          { label: 'Total meals', value: stats.totalMeals, color: '--meal-lunch', key: 'total' },
          { label: 'Breakfast', value: stats.totalBreakfast, color: '--meal-breakfast', key: 'breakfast' },
          { label: 'Lunch', value: stats.totalLunch, color: '--meal-lunch', key: 'lunch' },
          { label: 'Dinner', value: stats.totalDinner, color: '--meal-dinner', key: 'dinner' },
          { label: 'Today', value: stats.today, color: '--color-accent', key: 'today' },
        ];
        
        // Filter: show Total + group-enabled meal types + Today
        const filteredStats = allStats.filter(stat => 
          stat.key === 'total' || stat.key === 'today' || groupEnabledMealTypes.has(stat.key)
        );
        
        // Dynamic grid: lg uses card count, mobile uses 2 cols
        const cardCount = filteredStats.length;
        const hasThreeMealTypes = groupEnabledMealTypes.size === 3;
        
        // Grid classes based on card count (for large screens)
        const gridColsLg = cardCount === 3 ? 'lg:grid-cols-3' : 
                          cardCount === 4 ? 'lg:grid-cols-4' : 
                          'lg:grid-cols-5';
        
        return (
          <div className={`grid grid-cols-2 ${gridColsLg} gap-3`}>
            {filteredStats.map(({ label, value, color, key }, idx) => (
              <div 
                key={idx} 
                className={`bg-base-200 border border-base-content/15 rounded-2xl p-4 relative overflow-hidden ${
                  hasThreeMealTypes && idx === 0 ? 'col-span-2 lg:col-span-1' : ''
                }`}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-[5px]"
                  style={{ backgroundColor: `var(${color})` }}
                />
                <p className="text-sm text-base-content/70 mb-1">{label}</p>
                <p className="text-3xl font-extrabold text-base-content tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-base-200 rounded-xl border border-base-content/15 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {(() => {
            // Get meal types enabled by ANY member in the group
            const groupEnabledMealTypes = new Set();
            if (mealConfig?.configs) {
              mealConfig.configs.forEach(cfg => {
                if (cfg.breakfast) groupEnabledMealTypes.add('breakfast');
                if (cfg.lunch) groupEnabledMealTypes.add('lunch');
                if (cfg.dinner) groupEnabledMealTypes.add('dinner');
              });
            }
            
            const legendItems = [
              { key: 'breakfast', label: 'Breakfast', tint: '--meal-breakfast-tint', fill: '--meal-breakfast' },
              { key: 'lunch', label: 'Lunch', tint: '--meal-lunch-tint', fill: '--meal-lunch' },
              { key: 'dinner', label: 'Dinner', tint: '--meal-dinner-tint', fill: '--meal-dinner' },
            ];
            
            // Filter to show only group-enabled meal types
            return legendItems
              .filter(item => groupEnabledMealTypes.has(item.key))
              .map(({ key, label, tint, fill }) => (
                <span key={key} className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px]"
                    style={{ backgroundColor: `var(${tint})`, borderColor: 'var(--meal-cell-border)' }}
                  >
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: `var(${fill})` }} />
                  </span>
                  <span className="text-sm font-semibold text-base-content">{label}</span>
                </span>
              ));
          })()}
          
          <span className="text-xs text-base-content/60 block sm:inline mt-2 sm:mt-0">
            Number = meal count. 1 is own, 2 or more means guests.
          </span>
        </div>
        {/* View Switch - Show on ALL devices */}
        <div className="join">
          <button
            type="button"
            className={`btn btn-sm join-item ${mobileView === 'day' ? '' : 'btn-ghost'}`}
            style={mobileView === 'day' ? { backgroundColor: 'var(--meal-lunch)', color: 'var(--meal-lunch-content)' } : {}}
            onClick={() => setMobileView('day')}
          >
            Day
          </button>
          <button
            type="button"
            className={`btn btn-sm join-item ${mobileView === 'month' ? '' : 'btn-ghost'}`}
            style={mobileView === 'month' ? { backgroundColor: 'var(--meal-lunch)', color: 'var(--meal-lunch-content)' } : {}}
            onClick={() => setMobileView('month')}
          >
            Month
          </button>
        </div>
      </div>

      {/* Save Changes Bar */}
      {hasPendingChanges() && (
        <div className="bg-warning/20 border-2 border-warning rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <span className="text-warning font-bold text-sm sm:text-base block">
              {Object.keys(pendingChanges).length} unsaved change{Object.keys(pendingChanges).length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-error btn-sm" onClick={discardChanges} disabled={saving}>
              Discard
            </button>
            <button className="btn btn-success btn-sm" onClick={saveChanges} disabled={saving}>
              {saving ? <span className="loading loading-spinner loading-xs"></span> : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Mobile Day View */}
      {mobileView === 'day' && (
        <div className="space-y-4">
          {/* Date Strip */}
          <div className="overflow-x-auto -mx-3.5 px-3.5" style={{ scrollSnapType: 'x mandatory' }}>
            <div className="flex gap-2 pb-2">
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const selected = day === selectedDay;
                const today = isToday(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className="shrink-0 w-[54px] rounded-xl border-[1.5px] py-2 px-1 text-center transition-all"
                    style={
                      selected
                        ? { backgroundColor: 'var(--meal-lunch)', color: 'var(--meal-lunch-content)', borderColor: 'var(--meal-lunch)' }
                        : { backgroundColor: 'var(--color-base-200)', borderColor: 'var(--meal-line)', color: 'var(--color-base-content)', scrollSnapAlign: 'start' }
                    }
                  >
                    <div className={`text-lg font-bold ${selected ? '' : today ? 'text-warning' : ''}`}>{day}</div>
                    <div className="text-[11px] opacity-70">{getDayName(day).slice(0, 3)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Member Cards */}
          <div className="space-y-3">
            {activeMembers.map(member => {
              const canEdit = isManager && canEditMealForDate(member, selectedDay);
              const initials = member.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div key={member.userId} className="bg-base-200 border border-base-content/15 rounded-2xl p-3">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{ backgroundColor: 'var(--meal-lunch)', color: 'var(--meal-lunch-content)' }}
                    >
                      {initials}
                    </div>
                    <span className="font-bold text-base-content">{member.name}</span>
                  </div>

                  {/* Tiles - Dynamic grid based on user's meal types */}
                  <div className={`grid gap-2 ${getUserMealTypes(member.userId).length === 1 ? 'grid-cols-1' : getUserMealTypes(member.userId).length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {getUserMealTypes(member.userId).map(({ key, label }) => {
                      const checked = getMealStatus(selectedDay, member.userId, key);
                      const count = getMealCount(selectedDay, member.userId, key);
                      const bgColor = key === 'breakfast' ? 'var(--meal-breakfast-tint)' : (key === 'lunch' ? 'var(--meal-lunch-tint)' : 'var(--meal-dinner-tint)');
                      const btnBg = key === 'breakfast' ? 'var(--meal-breakfast)' : (key === 'lunch' ? 'var(--meal-lunch)' : 'var(--meal-dinner)');
                      const btnText = key === 'breakfast' ? 'var(--meal-breakfast-content)' : (key === 'lunch' ? 'var(--meal-lunch-content)' : 'var(--meal-dinner-content)');

                      return (
                        <div key={key} className="rounded-xl p-3" style={{ backgroundColor: bgColor }}>
                          <p className="text-xs text-base-content/70 mb-2">{label}</p>
                          <p className="text-[22px] font-extrabold text-base-content tabular-nums mb-2">{checked ? count : '-'}</p>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="w-10 h-10 rounded-[10px] flex items-center justify-center font-bold text-lg transition-all disabled:opacity-30"
                              style={{ backgroundColor: btnBg, color: btnText }}
                              onClick={() => {
                                if (checked && count > 1) {
                                  updateMealCount(selectedDay, member.userId, key, count - 1);
                                } else if (checked) {
                                  toggleMeal(selectedDay, member.userId, key);
                                }
                              }}
                              disabled={!canEdit || !checked}
                            >
                              <FaMinus className="text-sm" />
                            </button>
                            <button
                              type="button"
                              className="w-10 h-10 rounded-[10px] flex items-center justify-center font-bold text-lg transition-all disabled:opacity-30"
                              style={{ backgroundColor: btnBg, color: btnText }}
                              onClick={() => {
                                if (checked) {
                                  updateMealCount(selectedDay, member.userId, key, count + 1);
                                } else {
                                  toggleMeal(selectedDay, member.userId, key);
                                }
                              }}
                              disabled={!canEdit}
                            >
                              <FaPlus className="text-sm" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month Grid - Show when mobileView === 'month' */}
      {mobileView === 'month' && (
      <div className="bg-base-200 border border-base-content/15 rounded-2xl overflow-hidden">
        <div 
          ref={scrollWrapperRef}
          className="overflow-x-auto lg:overflow-auto lg:max-h-[min(68vh,700px)]"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
            overscrollBehaviorY: 'auto',
            touchAction: 'pan-x pan-y'
          }}
          tabIndex={0}
          aria-label="Monthly meal grid"
          data-scrolled-x={isScrolledX || undefined}
        >
          <table 
            className="w-full"
            style={{ 
              fontSize: '0.8125rem',
              minWidth: '820px',
              borderCollapse: 'separate',
              borderSpacing: 0
            }}
          >
            <thead>
              {/* Header Row 1: Member Names */}
              <tr ref={headerRow1Ref}>
                <th 
                  className="text-center min-w-[84px] max-w-[84px] p-2"
                  style={{
                    position: 'sticky',
                    top: 0,
                    left: 0,
                    zIndex: 40,
                    backgroundColor: 'var(--meal-head)',
                    borderBottom: '1px solid var(--meal-line)',
                    borderRight: '1px solid var(--meal-line)',
                    boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 2px 0 6px -4px rgb(0 0 0 / .25)'
                  }}
                >
                  <span className="text-[13px] font-semibold text-base-content/70">Day</span>
                </th>
                {activeMembers.map((member, idx) => {
                  const initials = member.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  const userMealTypes = getUserMealTypes(member.userId);

                  return (
                    <th
                      key={member.userId}
                      colSpan={userMealTypes.length}
                      className="p-2 text-center"
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 30,
                        backgroundColor: 'var(--meal-head)',
                        borderBottom: '1px solid var(--meal-line)',
                        borderRight: idx === activeMembers.length - 1 ? 'none' : '1px solid var(--meal-line)'
                      }}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{ backgroundColor: 'var(--meal-lunch)', color: 'var(--meal-lunch-content)' }}
                        >
                          {initials}
                        </div>
                        <span className="text-[13px] font-semibold text-base-content truncate">{member.name}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>

              {/* Header Row 2: Meal Type Labels (dynamic per user) */}
              <tr>
                <th
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 40,
                    backgroundColor: 'var(--meal-head)',
                    borderBottom: '2px solid var(--meal-lunch)',
                    borderRight: '1px solid var(--meal-line)',
                    boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 2px 0 6px -4px rgb(0 0 0 / .25)',
                    paddingTop: '0.5rem'
                  }}
                />
                {activeMembers.map((member, memberIdx) => {
                  const userMealTypes = getUserMealTypes(member.userId);
                  return (
                  <React.Fragment key={`header2-${member.userId}`}>
                    {userMealTypes.map((mealType, typeIdx) => {
                      const isLastInMember = typeIdx === userMealTypes.length - 1;
                      const isLastMember = memberIdx === activeMembers.length - 1;
                      const getMealTint = (key) => {
                        if (key === 'breakfast') return 'var(--meal-breakfast-tint)';
                        if (key === 'lunch') return 'var(--meal-lunch-tint)';
                        return 'var(--meal-dinner-tint)';
                      };
                      
                      return (
                        <th
                          key={mealType.key}
                          className="text-center text-xs font-semibold text-base-content/70 pb-1"
                          style={{
                            backgroundColor: 'var(--meal-head)',
                            backgroundImage: `linear-gradient(${getMealTint(mealType.key)}, ${getMealTint(mealType.key)})`,
                            borderBottom: '2px solid var(--meal-lunch)',
                            borderRight: (isLastInMember && !isLastMember) ? '1px solid var(--meal-line)' : undefined,
                            paddingTop: '0.5rem'
                          }}
                        >
                          {mealType.label}
                        </th>
                      );
                    })}
                  </React.Fragment>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const isTodayRow = isToday(day);
                const isFriday = getDay(new Date(year, month - 1, day)) === 5;
                const isEven = day % 2 === 0;
                const rowBg = isTodayRow ? 'var(--meal-today)' : isEven ? 'var(--meal-row-alt)' : 'transparent';

                return (
                  <tr key={day} style={{ backgroundColor: rowBg }}>
                    {/* Day Column */}
                    <td 
                      className="p-2 text-center min-w-[84px] max-w-[84px]"
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 20,
                        backgroundColor: isTodayRow ? 'var(--meal-today)' : 'var(--meal-daycell)',
                        borderBottom: '1px solid var(--meal-line)',
                        borderRight: '1px solid var(--meal-line)',
                        boxShadow: isScrolledX ? '2px 0 6px -4px rgb(0 0 0 / .25)' : 'none'
                      }}
                    >
                      <div className="text-[13px] font-semibold text-base-content">
                        {day} {getDayName(day).slice(0, 3)}
                        {isTodayRow && <span className="text-[10px] text-base-content/60 ml-1">today</span>}
                      </div>
                      {isFriday && !isTodayRow && <div className="text-[10px] text-base-content/60">Fri</div>}
                    </td>

                    {/* Meal Cells - Only show enabled meal types for this user */}
                    {activeMembers.map((member, memberIdx) => {
                      const userMealTypes = getUserMealTypes(member.userId);
                      return (
                        <React.Fragment key={`${member.userId}-${day}`}>
                          {userMealTypes.map((mealType, typeIdx) => {
                            const canEdit = isManager && canEditMealForDate(member, day);
                            const checked = getMealStatus(day, member.userId, mealType.key);
                            const count = getMealCount(day, member.userId, mealType.key);
                            const changed = hasCellChanged(day, member.userId, mealType.key);
                            
                            // Get colors based on meal type
                            const getMealColors = (key) => {
                              if (key === 'breakfast') return { tint: 'var(--meal-breakfast-tint)', fill: 'var(--meal-breakfast)', content: 'var(--meal-breakfast-content)' };
                              if (key === 'lunch') return { tint: 'var(--meal-lunch-tint)', fill: 'var(--meal-lunch)', content: 'var(--meal-lunch-content)' };
                              return { tint: 'var(--meal-dinner-tint)', fill: 'var(--meal-dinner)', content: 'var(--meal-dinner-content)' };
                            };
                            const colors = getMealColors(mealType.key);
                            const isLastInMember = typeIdx === userMealTypes.length - 1;
                            const isLastMember = memberIdx === activeMembers.length - 1;
                            const isLastCol = isLastInMember && !isLastMember;

                            return (
                              <td
                                key={mealType.key}
                                className="text-center p-1"
                                style={{
                                  position: 'relative',
                                  zIndex: 0,
                                  backgroundColor: isTodayRow ? 'var(--meal-today)' : colors.tint,
                                  borderBottom: '1px solid var(--meal-line)',
                                  borderRight: isLastCol ? '1px solid var(--meal-line)' : undefined,
                                }}
                              >
                                <div className="flex items-center justify-center gap-1 my-[3px]">
                                  {/* Checkbox */}
                                  <button
                                    type="button"
                                    onClick={() => toggleMeal(day, member.userId, mealType.key)}
                                    disabled={!canEdit}
                                    className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center font-bold transition-all disabled:opacity-60"
                                    style={{
                                      backgroundColor: checked ? (count >= 2 ? 'var(--meal-guest)' : colors.fill) : 'transparent',
                                      border: checked ? 'none' : '1.5px solid var(--meal-cell-border)',
                                      boxShadow: (checked && count >= 2) ? '0 0 0 2px var(--color-accent)' : 'none',
                                      cursor: canEdit ? 'pointer' : 'default',
                                      outline: changed ? '2px solid var(--color-warning)' : 'none',
                                      outlineOffset: changed ? '2px' : '0',
                                    }}
                                    aria-label={`${member.name} ${mealType.label}, day ${day}`}
                                  >
                                    {checked && (
                                      <svg 
                                        className="w-5 h-5" 
                                        fill="none" 
                                        viewBox="0 0 24 24" 
                                        stroke="currentColor" 
                                        strokeWidth="3"
                                        style={{
                                          color: count >= 2 ? 'var(--meal-guest-content)' : colors.content
                                        }}
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                  
                                  {/* Count Input */}
                                  {checked && (
                                    <input
                                      type="number"
                                      min="1"
                                      max="10"
                                      value={count}
                                      onChange={(e) => updateMealCount(day, member.userId, mealType.key, e.target.value)}
                                      disabled={!canEdit}
                                      className="w-9 h-9 rounded-lg bg-base-100 text-center text-sm font-semibold text-base-content tabular-nums focus:outline-none disabled:opacity-60"
                                      style={{
                                        border: '1px solid var(--meal-line)',
                                        outline: '3px solid var(--color-accent)'
                                      }}
                                      onFocus={(e) => {
                                        e.target.select();
                                        e.target.style.outline = '3px solid var(--color-accent)';
                                        e.target.style.outlineOffset = '0';
                                      }}
                                      onBlur={(e) => {
                                        e.target.style.outline = 'none';
                                      }}
                                      onClick={(e) => e.target.select()}
                                    />
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>

            {/* Footer Totals */}
            <tfoot>
              <tr>
                <td 
                  className="font-bold text-sm text-base-content p-2 text-center"
                  style={{
                    position: 'sticky',
                    bottom: 0,
                    left: 0,
                    zIndex: 40,
                    backgroundColor: 'var(--meal-head)',
                    borderTop: '2px solid var(--meal-lunch)',
                    borderRight: '1px solid var(--meal-line)',
                    boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 2px 0 6px -4px rgb(0 0 0 / .25)'
                  }}
                >
                  Total
                </td>
                {activeMembers.map((member, memberIdx) => {
                  const userMealTypes = getUserMealTypes(member.userId);
                  return (
                  <React.Fragment key={`total-${member.userId}`}>
                    {userMealTypes.map((mealType, typeIdx) => {
                      let total = 0;
                      Array.from({ length: daysInMonth }, (_, i) => i + 1).forEach(day => {
                        if (getMealStatus(day, member.userId, mealType.key)) {
                          total += getMealCount(day, member.userId, mealType.key);
                        }
                      });

                      const isLastInMember = typeIdx === userMealTypes.length - 1;
                      const isLastMember = memberIdx === activeMembers.length - 1;
                      const isLastCol = isLastInMember && !isLastMember;
                      
                      // Get colors based on meal type
                      const getMealColors = (key) => {
                        if (key === 'breakfast') return { fill: 'var(--meal-breakfast)', content: 'var(--meal-breakfast-content)' };
                        if (key === 'lunch') return { fill: 'var(--meal-lunch)', content: 'var(--meal-lunch-content)' };
                        return { fill: 'var(--meal-dinner)', content: 'var(--meal-dinner-content)' };
                      };
                      const colors = getMealColors(mealType.key);

                      return (
                        <td
                          key={mealType.key}
                          className="text-center font-bold text-sm tabular-nums p-2"
                          style={{
                            position: 'sticky',
                            bottom: 0,
                            zIndex: 30,
                            backgroundColor: colors.fill,
                            color: colors.content,
                            borderTop: '2px solid var(--meal-lunch)',
                            borderRight: isLastCol ? '1px solid var(--meal-line)' : undefined,
                          }}
                        >
                          {total}
                        </td>
                      );
                    })}
                  </React.Fragment>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(MealSheet);
