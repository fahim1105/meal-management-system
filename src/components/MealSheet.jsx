import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import burgerToast from './BurgerToast';
import { format } from 'date-fns';
import { FaUtensils, FaCalendarAlt, FaInfoCircle, FaCoffee, FaHamburger, FaMoon, FaUserSlash, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { queryKeys, fetchMeal, fetchMealConfig } from '../lib/queries';

const MEAL_TYPES = [
  { key: 'breakfast', short: 'B', headerClass: 'bg-blue-100 text-blue-700', cellClass: 'bg-blue-50/50', footerClass: 'bg-blue-600 text-white', checkbox: 'checkbox-primary' },
  { key: 'lunch', short: 'L', headerClass: 'bg-purple-100 text-purple-700', cellClass: 'bg-purple-50/50', footerClass: 'bg-purple-600 text-white', checkbox: 'checkbox-secondary' },
  { key: 'dinner', short: 'D', headerClass: 'bg-green-100 text-green-700', cellClass: 'bg-green-50/50', footerClass: 'bg-green-600 text-white', checkbox: 'checkbox-accent' },
];

const MealSheet = ({ group, isManager, onUpdate }) => {
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [pendingChanges, setPendingChanges] = useState({});
  const [saving, setSaving] = useState(false);
  const { getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const API_URL = import.meta.env.VITE_API_URL;

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

  const getMemberMealTypes = (userId) => {
    if (!mealConfig?.configs) return [];
    const cfg = mealConfig.configs.find(c => c.userId === userId);
    if (!cfg) return [];
    return MEAL_TYPES.filter(t => cfg[t.key]);
  };

  const usedMealTypes = React.useMemo(() => {
    if (!mealConfig?.configs) return [];
    const keys = new Set();
    mealConfig.configs.forEach(c => {
      MEAL_TYPES.forEach(t => { if (c[t.key]) keys.add(t.key); });
    });
    return MEAL_TYPES.filter(t => keys.has(t.key));
  }, [mealConfig]);

  // Normalize days: Map → plain object, ensure arrays
  const mealSheet = React.useMemo(() => {
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

  // Clear pending changes when month changes
  useEffect(() => {
    setPendingChanges({});
  }, [currentMonth]);

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
        count: Math.max(1, parseInt(count) || 1),
        type: 'count',
      },
    }));
  };

  const getMealCount = (day, userId, mealType) => {
    // Check pending changes first (optimistic)
    const countKey = `${day}-${userId}-${mealType}-count`;
    if (pendingChanges[countKey]) return pendingChanges[countKey].count;

    if (!mealSheet?.days) return 1;
    const dayMeals = mealSheet.days[day.toString()];
    if (!dayMeals || !Array.isArray(dayMeals)) return 1;
    const userMeal = dayMeals.find(m => m.userId === userId);
    return userMeal?.[`${mealType}Count`] || 1;
  };

  // Check if a member can have meals edited for a specific date
  const canEditMealForDate = (member, day) => {
    if (!member) return false;
    
    // If member is inactive, cannot edit
    if (member.status === 'inactive') return false;
    
    // Create date from month and day
    const mealDate = new Date(`${currentMonth}-${day.toString().padStart(2, '0')}`);
    
    // If member left and rejoined, check if date is in inactive period
    if (member.leftAt && member.rejoinedAt) {
      const leftDate = new Date(member.leftAt);
      const rejoinDate = new Date(member.rejoinedAt);
      if (mealDate >= leftDate && mealDate < rejoinDate) {
        return false;
      }
    }
    
    // If member left but hasn't rejoined, check if date is after leave date
    if (member.leftAt && !member.rejoinedAt) {
      const leftDate = new Date(member.leftAt);
      if (mealDate >= leftDate) {
        return false;
      }
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
      const updated = {
        ...prev,
        [changeKey]: { day, userId, mealType, type: 'set', value: newStatus },
      };
      if (!newStatus) delete updated[`${day}-${userId}-${mealType}-count`];
      return updated;
    });
  };

  const getMealStatus = (day, userId, mealType) => {
    // Check pending changes first (optimistic)
    const toggleKey = `${day}-${userId}-${mealType}`;
    if (pendingChanges[toggleKey]) return pendingChanges[toggleKey].value;

    if (!mealSheet?.days) return false;
    const dayMeals = mealSheet.days[day.toString()];
    if (!dayMeals || !Array.isArray(dayMeals)) return false;
    const userMeal = dayMeals.find(m => m.userId === userId);
    return userMeal?.[mealType] || false;
  };

  const hasPendingChanges = () => {
    return Object.keys(pendingChanges).length > 0;
  };

  const hasCellChanged = (day, userId, mealType) => {
    const toggleKey = `${day}-${userId}-${mealType}`;
    const countKey = `${day}-${userId}-${mealType}-count`;
    return pendingChanges[toggleKey] || pendingChanges[countKey];
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

      // Invalidate TanStack Query cache — triggers refetch for all users
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

  const renderMealCell = (day, member, mealType, meta, isLastCol) => {
    const canEdit = isManager && canEditMealForDate(member, day);
    const changed = hasCellChanged(day, member.userId, mealType.key);
    return (
      <td
        key={`${day}-${member.userId}-${mealType.key}`}
        className={`text-center p-1 ${member.status === 'inactive' ? 'bg-gray-100/50' : meta.cellClass} ${changed ? 'bg-yellow-200 ring-2 ring-yellow-400' : ''} ${isLastCol ? 'border-r-4 border-primary/30' : ''}`}
      >
        <div className="flex items-center justify-center gap-1">
          <input
            type="checkbox"
            className={`checkbox checkbox-sm ${meta.checkbox} hover:scale-110 transition-transform disabled:opacity-30`}
            checked={getMealStatus(day, member.userId, mealType.key)}
            onChange={() => toggleMeal(day, member.userId, mealType.key)}
            disabled={!canEdit}
          />
          {getMealStatus(day, member.userId, mealType.key) && (
            <input
              type="number"
              min="1"
              max="10"
              className="input input-xs w-10 h-6 text-center p-0 border-primary/30 disabled:opacity-30"
              value={getMealCount(day, member.userId, mealType.key)}
              onChange={(e) => updateMealCount(day, member.userId, mealType.key, e.target.value)}
              disabled={!canEdit}
              onClick={(e) => e.target.select()}
            />
          )}
        </div>
      </td>
    );
  };

  if (loading || configLoading) {
    return <div className="flex justify-center"><span className="loading loading-spinner"></span></div>;
  }

  if (!mealConfig) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-primary to-blue-600 p-6 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-full">
              <FaUtensils className="text-3xl text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">Meal Sheet</h2>
              <p className="text-white/80 text-sm">{currentMonth}</p>
            </div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl border-2 border-warning/30">
          <div className="card-body items-center text-center py-16">
            <FaUtensils className="text-6xl text-warning/40 mb-4" />
            <h3 className="text-xl font-bold text-base-content">Meal types not configured</h3>
            <p className="text-base-content/60 mt-2 max-w-md">
              The manager has not set up meal types for {currentMonth} yet.
              {isManager
                ? ' Go to Manager Settings → Meals tab to configure each member\'s meal types.'
                : ' Please ask your manager to configure meal types for this month.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-primary to-blue-600 p-6 rounded-2xl shadow-lg">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-full">
              <FaUtensils className="text-3xl text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">Meal Sheet</h2>
              <p className="text-white/80 text-sm">Track daily meals for all members</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full">
            <label className="text-white text-sm font-medium flex items-center gap-2 shrink-0">
              <FaCalendarAlt className="text-lg" />
              Month:
            </label>
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              className="btn btn-ghost btn-sm btn-circle text-white hover:bg-white/20 shrink-0"
            >
              <FaChevronLeft />
            </button>
            <div className="relative flex-1 min-w-0">
              <input
                type="month"
                id="mealMonthPicker"
                className="input input-bordered bg-white text-gray-800 font-medium shadow-md w-full cursor-pointer"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              className="btn btn-ghost btn-sm btn-circle text-white hover:bg-white/20 shrink-0"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* Read-only Alert */}
      {!isManager && (
        <div className="alert bg-primary/10 border-2 border-primary/30 shadow-lg">
          <FaInfoCircle className="text-primary text-xl" />
          <span className="text-primary font-medium">You are viewing in read-only mode. Only the manager can edit meals.</span>
        </div>
      )}

      {/* Inactive Members Info */}
      {group?.members.some(m => m.status === 'inactive') && (
        <div className="alert bg-gray-100 border-2 border-gray-300 shadow-lg">
          <FaUserSlash className="text-gray-600 text-xl" />
          <div>
            <span className="text-gray-700 font-medium">Inactive members are shown with gray background.</span>
            <p className="text-sm text-gray-600">Their historical data is preserved but cannot be edited.</p>
          </div>
        </div>
      )}

      {/* Save Changes Bar */}
      {hasPendingChanges() && (
        <div className="alert bg-warning/20 border-2 border-warning shadow-xl">
          <FaInfoCircle className="text-warning text-xl sm:text-2xl flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-warning font-bold text-sm sm:text-lg block">
              You have {Object.keys(pendingChanges).length} unsaved change{Object.keys(pendingChanges).length > 1 ? 's' : ''}
            </span>
            <p className="text-xs sm:text-sm text-gray-700 hidden sm:block">Click "Save Changes" to update the database</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button 
              className="btn btn-error btn-xs sm:btn-sm"
              onClick={discardChanges}
              disabled={saving}
            >
              Discard
            </button>
            <button 
              className="btn btn-success btn-xs sm:btn-sm"
              onClick={saveChanges}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Save Changes</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Legend — only configured meal types */}
      {usedMealTypes.length > 0 && (
      <div className="card bg-base-100 shadow-xl border-2 border-primary/20">
        <div className="card-body p-4 sm:p-6">
          <div className="flex flex-wrap gap-2 sm:gap-4 items-stretch sm:items-center">
            {usedMealTypes.map((t, i) => {
              const icons = { breakfast: FaCoffee, lunch: FaHamburger, dinner: FaMoon };
              const colors = {
                breakfast: { bg: 'from-blue-50 to-blue-100', border: 'border-blue-200/50', icon: 'from-blue-500 to-blue-600', text: 'text-blue-700' },
                lunch: { bg: 'from-purple-50 to-purple-100', border: 'border-purple-200/50', icon: 'from-purple-500 to-purple-600', text: 'text-purple-700' },
                dinner: { bg: 'from-green-50 to-green-100', border: 'border-green-200/50', icon: 'from-green-500 to-green-600', text: 'text-green-700' },
              };
              const c = colors[t.key];
              const Icon = icons[t.key];
              const label = t.key.charAt(0).toUpperCase() + t.key.slice(1);
              return (
                <div key={t.key} className={`flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 p-2 sm:px-5 sm:py-3 rounded-2xl bg-gradient-to-br ${c.bg} shadow-md border-2 ${c.border}`}>
                  <div className={`bg-gradient-to-br ${c.icon} p-2.5 sm:p-3 rounded-2xl shadow-lg`}>
                    <Icon className="text-white text-lg sm:text-2xl" />
                  </div>
                  <span className={`font-bold ${c.text} text-xs sm:text-lg text-center`}>{label}</span>
                </div>
              );
            })}
            <div className="hidden sm:block flex-grow"></div>
            <div className="col-span-full sm:col-span-1 flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-br from-blue-500 to-blue-600 px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl shadow-md border-2 border-blue-400">
              <FaInfoCircle className="text-white text-lg sm:text-xl flex-shrink-0" />
              <span className="text-xs sm:text-sm text-white text-center sm:text-left leading-tight">
                <span className="font-bold block sm:inline">Number = Meal Count</span>
                <span className="block sm:inline sm:ml-1 text-white/90">(1 = own, 2+ = with guests)</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Premium Table with Fixed Day Column */}
      <div className="card bg-base-100 shadow-xl border-t-4 border-t-primary overflow-hidden">
        <div className="card-body p-0">
          <div className="meal-table-wrapper">
            <table className="meal-table">
              <thead>
                <tr>
                  <th className="day-column day-header">
                    Day
                  </th>
                  {group?.members.map((member, index) => {
                    const types = getMemberMealTypes(member.userId);
                    if (!types.length) return null;
                    return (
                    <th 
                      key={member.userId} 
                      colSpan={types.length} 
                      className={`text-center font-bold text-base px-3 py-2 ${
                        member.status === 'inactive' 
                          ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white' 
                          : 'bg-gradient-to-br from-primary to-blue-600 text-white'
                      } ${index < group.members.length - 1 ? 'border-r-4 border-white/20' : ''}`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {member.name}
                        {member.status === 'inactive' && (
                          <span className="badge badge-sm bg-white/20 text-white border-none">Inactive</span>
                        )}
                      </div>
                    </th>
                    );
                  })}
                </tr>
                <tr>
                  <th className="day-column day-subheader"></th>
                  {group?.members.map((member, memberIndex) => {
                    const types = getMemberMealTypes(member.userId);
                    if (!types.length) return null;
                    const isInactive = member.status === 'inactive';
                    return (
                      <React.Fragment key={member.userId}>
                        {types.map((t, ti) => (
                          <th key={t.key} className={`text-center font-bold ${isInactive ? 'bg-gray-200 text-gray-500' : t.headerClass} ${
                            ti === types.length - 1 && memberIndex < group.members.length - 1 ? 'border-r-4 border-primary/30' : ''
                          }`}>{t.short}</th>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <tr key={day} className="hover:bg-primary/5 transition-colors">
                      <td className="day-column day-cell">
                        {day}
                      </td>
                    {group?.members.map((member, memberIndex) => {
                      const types = getMemberMealTypes(member.userId);
                      if (!types.length) return null;
                      return (
                        <React.Fragment key={`${member.userId}-${day}`}>
                          {types.map((t, ti) => renderMealCell(
                            day, member, t, t,
                            ti === types.length - 1 && memberIndex < group.members.length - 1
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-primary to-blue-600 text-white font-bold">
                  <td className="day-column day-header text-sm">Total</td>
                  {group?.members.map((member, memberIndex) => {
                    const types = getMemberMealTypes(member.userId);
                    if (!types.length) return null;
                    const isInactive = member.status === 'inactive';
                    return (
                      <React.Fragment key={`total-${member.userId}`}>
                        {types.map((t, ti) => {
                          let total = 0;
                          Array.from({ length: daysInMonth }, (_, i) => i + 1).forEach(day => {
                            if (getMealStatus(day, member.userId, t.key)) total += getMealCount(day, member.userId, t.key);
                          });
                          return (
                            <td key={t.key} className={`text-center font-bold text-sm ${isInactive ? 'bg-gray-400 text-white' : t.footerClass} ${
                              ti === types.length - 1 && memberIndex < group.members.length - 1 ? 'border-r-4 border-white/30' : ''
                            }`}>{total}</td>
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
      </div>
    </div>
  );
};

export default MealSheet;
