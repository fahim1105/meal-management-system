import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import burgerToast from './BurgerToast';
import { format } from 'date-fns';
import { FaUtensils, FaCalendarAlt, FaInfoCircle, FaCoffee, FaHamburger, FaMoon, FaUserSlash, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const MealSheet = ({ group, isManager }) => {
  const [mealSheet, setMealSheet] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState({});
  const [saving, setSaving] = useState(false);
  const { getAuthHeaders } = useAuth();

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchMealSheet();
    setPendingChanges({}); // Clear pending changes when month changes
  }, [currentMonth]);

  const fetchMealSheet = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_URL}/meal/${currentMonth}`, { headers });
      
      const mealSheetData = response.data.mealSheet;
      
      // Ensure days is a plain object with arrays
      if (mealSheetData && mealSheetData.days) {
        // Convert Map to object if needed
        if (mealSheetData.days instanceof Map) {
          mealSheetData.days = Object.fromEntries(mealSheetData.days);
        }
        
        // Ensure all values are arrays
        Object.keys(mealSheetData.days).forEach(day => {
          if (!Array.isArray(mealSheetData.days[day])) {
            mealSheetData.days[day] = [];
          }
        });
      }
      
      setMealSheet(mealSheetData);
    } catch (error) {
      console.error('Fetch meal sheet error:', error);
      burgerToast.error('Failed to fetch meal sheet');
    } finally {
      setLoading(false);
    }
  };

  const updateMealCount = (day, userId, mealType, count) => {
    if (!isManager) {
      burgerToast.error('Only manager can edit meals');
      return;
    }

    // Check if this member can be edited for this date
    const member = group?.members.find(m => m.userId === userId);
    if (!canEditMealForDate(member, day)) {
      burgerToast.error('Cannot edit meals for this member on this date');
      return;
    }

    const changeKey = `${day}-${userId}-${mealType}-count`;
    
    // Update local state immediately
    setMealSheet(prevSheet => {
      if (!prevSheet) return prevSheet;
      
      const updatedSheet = { ...prevSheet };
      const dayKey = day.toString();
      
      if (!updatedSheet.days) {
        updatedSheet.days = {};
      }
      
      const dayMeals = Array.isArray(updatedSheet.days[dayKey]) 
        ? [...updatedSheet.days[dayKey]] 
        : [];
      
      const userMealIndex = dayMeals.findIndex(m => m.userId === userId);
      
      if (userMealIndex >= 0) {
        dayMeals[userMealIndex] = {
          ...dayMeals[userMealIndex],
          [`${mealType}Count`]: Math.max(1, parseInt(count) || 1)
        };
      }
      
      updatedSheet.days[dayKey] = dayMeals;
      return updatedSheet;
    });

    // Track pending change
    setPendingChanges(prev => ({
      ...prev,
      [changeKey]: {
        day,
        userId,
        mealType,
        count: Math.max(1, parseInt(count) || 1),
        type: 'count'
      }
    }));
  };

  const getMealCount = (day, userId, mealType) => {
    if (!mealSheet?.days) return 1;
    
    const dayKey = day.toString();
    const dayMeals = mealSheet.days[dayKey];
    
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

    // Check if this member can be edited for this date
    const member = group?.members.find(m => m.userId === userId);
    if (!canEditMealForDate(member, day)) {
      burgerToast.error('Cannot edit meals for this member on this date');
      return;
    }

    const currentStatus = getMealStatus(day, userId, mealType);
    const newStatus = !currentStatus;
    const changeKey = `${day}-${userId}-${mealType}`;

    // Update local state immediately
    setMealSheet(prevSheet => {
      if (!prevSheet) return prevSheet;
      const updatedSheet = { ...prevSheet };
      const dayKey = day.toString();
      if (!updatedSheet.days) updatedSheet.days = {};
      const dayMeals = Array.isArray(updatedSheet.days[dayKey])
        ? [...updatedSheet.days[dayKey]]
        : [];
      const userMealIndex = dayMeals.findIndex(m => m.userId === userId);
      if (userMealIndex >= 0) {
        dayMeals[userMealIndex] = {
          ...dayMeals[userMealIndex],
          [mealType]: newStatus,
          // uncheck হলে count reset to 1, check হলে আগের count রাখো
          [`${mealType}Count`]: newStatus ? (dayMeals[userMealIndex][`${mealType}Count`] || 1) : 1,
        };
      } else {
        dayMeals.push({
          userId,
          breakfast: mealType === 'breakfast' ? newStatus : false, breakfastCount: 1,
          lunch:     mealType === 'lunch'     ? newStatus : false, lunchCount: 1,
          dinner:    mealType === 'dinner'    ? newStatus : false, dinnerCount: 1,
        });
      }
      updatedSheet.days[dayKey] = dayMeals;
      return updatedSheet;
    });

    // Store absolute final state — overwrites any previous toggle on same cell
    // uncheck হলে সেই mealType এর count pending change ও delete করো
    // নইলে backend এ set(false) এর পরে count apply হয়ে পুরনো count ফিরে আসবে
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
    if (!mealSheet?.days) return false;
    
    const dayKey = day.toString();
    const dayMeals = mealSheet.days[dayKey];
    
    if (!dayMeals || !Array.isArray(dayMeals)) return false;
    
    const userMeal = dayMeals.find(m => m.userId === userId);
    return userMeal?.[mealType] || false;
  };

  const hasPendingChanges = () => {
    return Object.keys(pendingChanges).length > 0;
  };

  const getCellChangeKey = (day, userId, mealType) => {
    return `${day}-${userId}-${mealType}`;
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
      // Convert pendingChanges object to array format for batch API
      const changesArray = Object.values(pendingChanges);

      // Single batch API call with all changes
      const response = await axios.post(
        `${API_URL}/meal/batch-update`,
        { 
          month: currentMonth, 
          changes: changesArray
        },
        { headers }
      );

      const { successCount, errorCount, errors } = response.data;

      // Clear pending changes
      setPendingChanges({});

      // Refresh from server to ensure consistency
      await fetchMealSheet();

      if (errorCount === 0) {
        burgerToast.success(`Successfully saved ${successCount} changes`);
      } else {
        burgerToast.warning(`Saved ${successCount} changes, ${errorCount} failed`);
        if (errors && errors.length > 0) {
          console.error('Failed changes:', errors);
        }
      }
    } catch (error) {
      console.error('Save changes error:', error);
      burgerToast.error('Failed to save changes');
      // Refresh to revert to server state
      await fetchMealSheet();
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    setPendingChanges({});
    fetchMealSheet();
    burgerToast.info('Changes discarded');
  };

  const navigateMonth = (direction) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const [year, month] = currentMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  if (loading) {
    return <div className="flex justify-center"><span className="loading loading-spinner"></span></div>;
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

      {/* Premium Legend - Mobile & Desktop Optimized */}
      <div className="card bg-base-100 shadow-xl border-2 border-primary/20">
        <div className="card-body p-4 sm:p-6">
          {/* Mobile: Grid Layout, Desktop: Flex Row */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center">
            {/* Breakfast Card */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-3 sm:px-5 sm:py-3 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 sm:bg-blue-50 shadow-md sm:shadow-lg transition-all hover:scale-105 sm:hover:shadow-xl border-2 border-blue-200/50">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 sm:p-3 rounded-2xl sm:rounded-xl shadow-lg">
                <FaCoffee className="text-white text-2xl sm:text-2xl" />
              </div>
              <span className="font-bold text-blue-700 text-base sm:text-lg">Breakfast</span>
            </div>
            
            {/* Lunch Card */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-3 sm:px-5 sm:py-3 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 sm:bg-purple-50 shadow-md sm:shadow-lg transition-all hover:scale-105 sm:hover:shadow-xl border-2 border-purple-200/50">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 sm:p-3 rounded-2xl sm:rounded-xl shadow-lg">
                <FaHamburger className="text-white text-2xl sm:text-2xl" />
              </div>
              <span className="font-bold text-purple-700 text-base sm:text-lg">Lunch</span>
            </div>
            
            {/* Dinner Card */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-3 sm:px-5 sm:py-3 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 sm:bg-green-50 shadow-md sm:shadow-lg transition-all hover:scale-105 sm:hover:shadow-xl col-span-2 sm:col-span-1 max-w-[50%] sm:max-w-none mx-auto border-2 border-green-200/50">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 sm:p-3 rounded-2xl sm:rounded-xl shadow-lg">
                <FaMoon className="text-white text-2xl sm:text-2xl" />
              </div>
              <span className="font-bold text-green-700 text-base sm:text-lg">Dinner</span>
            </div>
            
            {/* Spacer - Hidden on mobile */}
            <div className="hidden sm:block flex-grow"></div>
            
            {/* Info Card - Full width on mobile, auto on desktop */}
            <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-br from-blue-500 to-blue-600 px-4 sm:px-6 py-3 sm:py-3 rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border-2 border-blue-400 transition-all hover:shadow-xl">
              <FaInfoCircle className="text-white text-lg sm:text-xl flex-shrink-0" />
              <span className="text-xs sm:text-sm text-white text-center sm:text-left leading-tight">
                <span className="font-bold block sm:inline">Number = Meal Count</span>
                <span className="block sm:inline sm:ml-1 text-white/90">(1 = own, 2+ = with guests)</span>
              </span>
            </div>
          </div>
        </div>
      </div>

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
                  {group?.members.map((member, index) => (
                    <th 
                      key={member.userId} 
                      colSpan={3} 
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
                  ))}
                </tr>
                <tr>
                  <th className="day-column day-subheader"></th>
                  {group?.members.map((member, memberIndex) => {
                    const isInactive = member.status === 'inactive';
                    return (
                      <React.Fragment key={member.userId}>
                        <th className={`text-center font-bold ${isInactive ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>B</th>
                        <th className={`text-center font-bold ${isInactive ? 'bg-gray-200 text-gray-500' : 'bg-purple-100 text-purple-700'}`}>L</th>
                        <th className={`text-center font-bold ${isInactive ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'} ${
                          memberIndex < group.members.length - 1 ? 'border-r-4 border-primary/30' : ''
                        }`}>D</th>
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
                      const canEdit = isManager && canEditMealForDate(member, day);
                      const isInactive = member.status === 'inactive';
                      const bgClass = isInactive ? 'bg-gray-100/50' : '';
                      
                      // Check if cells have pending changes
                      const breakfastChanged = hasCellChanged(day, member.userId, 'breakfast');
                      const lunchChanged = hasCellChanged(day, member.userId, 'lunch');
                      const dinnerChanged = hasCellChanged(day, member.userId, 'dinner');
                      
                      return (
                        <React.Fragment key={`${member.userId}-${day}`}>
                          <td className={`text-center p-1 ${bgClass || 'bg-blue-50/50'} ${breakfastChanged ? 'bg-yellow-200 ring-2 ring-yellow-400' : ''}`}>
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-sm checkbox-primary hover:scale-110 transition-transform disabled:opacity-30"
                                checked={getMealStatus(day, member.userId, 'breakfast')}
                                onChange={() => toggleMeal(day, member.userId, 'breakfast')}
                                disabled={!canEdit}
                              />
                              {getMealStatus(day, member.userId, 'breakfast') && (
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  className="input input-xs w-10 h-6 text-center p-0 border-primary/30 disabled:opacity-30"
                                  value={getMealCount(day, member.userId, 'breakfast')}
                                  onChange={(e) => updateMealCount(day, member.userId, 'breakfast', e.target.value)}
                                  disabled={!canEdit}
                                  onClick={(e) => e.target.select()}
                                />
                              )}
                            </div>
                          </td>
                          <td className={`text-center p-1 ${bgClass || 'bg-purple-50/50'} ${lunchChanged ? 'bg-yellow-200 ring-2 ring-yellow-400' : ''}`}>
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-sm checkbox-secondary hover:scale-110 transition-transform disabled:opacity-30"
                                checked={getMealStatus(day, member.userId, 'lunch')}
                                onChange={() => toggleMeal(day, member.userId, 'lunch')}
                                disabled={!canEdit}
                              />
                              {getMealStatus(day, member.userId, 'lunch') && (
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  className="input input-xs w-10 h-6 text-center p-0 border-primary/30 disabled:opacity-30"
                                  value={getMealCount(day, member.userId, 'lunch')}
                                  onChange={(e) => updateMealCount(day, member.userId, 'lunch', e.target.value)}
                                  disabled={!canEdit}
                                  onClick={(e) => e.target.select()}
                                />
                              )}
                            </div>
                          </td>
                          <td className={`text-center p-1 ${bgClass || 'bg-green-50/50'} ${dinnerChanged ? 'bg-yellow-200 ring-2 ring-yellow-400' : ''} ${
                            memberIndex < group.members.length - 1 ? 'border-r-4 border-primary/30' : ''
                          }`}>
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-sm checkbox-accent hover:scale-110 transition-transform disabled:opacity-30"
                                checked={getMealStatus(day, member.userId, 'dinner')}
                                onChange={() => toggleMeal(day, member.userId, 'dinner')}
                                disabled={!canEdit}
                              />
                              {getMealStatus(day, member.userId, 'dinner') && (
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  className="input input-xs w-10 h-6 text-center p-0 border-primary/30 disabled:opacity-30"
                                  value={getMealCount(day, member.userId, 'dinner')}
                                  onChange={(e) => updateMealCount(day, member.userId, 'dinner', e.target.value)}
                                  disabled={!canEdit}
                                  onClick={(e) => e.target.select()}
                                />
                              )}
                            </div>
                          </td>
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
                    const isInactive = member.status === 'inactive';
                    let bTotal = 0, lTotal = 0, dTotal = 0;
                    Array.from({ length: daysInMonth }, (_, i) => i + 1).forEach(day => {
                      if (getMealStatus(day, member.userId, 'breakfast')) bTotal += getMealCount(day, member.userId, 'breakfast');
                      if (getMealStatus(day, member.userId, 'lunch')) lTotal += getMealCount(day, member.userId, 'lunch');
                      if (getMealStatus(day, member.userId, 'dinner')) dTotal += getMealCount(day, member.userId, 'dinner');
                    });
                    return (
                      <React.Fragment key={`total-${member.userId}`}>
                        <td className={`text-center font-bold text-sm ${isInactive ? 'bg-gray-400 text-white' : 'bg-blue-600 text-white'}`}>{bTotal}</td>
                        <td className={`text-center font-bold text-sm ${isInactive ? 'bg-gray-400 text-white' : 'bg-purple-600 text-white'}`}>{lTotal}</td>
                        <td className={`text-center font-bold text-sm ${isInactive ? 'bg-gray-400 text-white' : 'bg-green-600 text-white'} ${
                          memberIndex < group.members.length - 1 ? 'border-r-4 border-white/30' : ''
                        }`}>{dTotal}</td>
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
