import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import axios from 'axios';
import burgerToast from '../components/BurgerToast';
import Swal from 'sweetalert2';
import LottieLoader from '../components/LottieLoader';
import { queryKeys, fetchGroup, fetchMealConfig, fetchMeal } from '../lib/queries';
import { FaUtensils, FaCoffee, FaHamburger, FaMoon, FaInfoCircle, FaSave, FaLock } from 'react-icons/fa';
import PageTitle from '../components/Admin/PageTitle';
import MemberAvatar from '../components/Admin/MemberAvatar';
import StickySaveBar from '../components/Admin/StickySaveBar';

const AdminMeals = () => {
  const [configMonth, setConfigMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [mealConfigs, setMealConfigs] = useState({});
  const [savingMealConfig, setSavingMealConfig] = useState(false);
  
  const { userData, getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();

  const API_URL = import.meta.env.VITE_API_URL;

  const MEAL_TYPES = [
    { key: 'breakfast', label: 'Breakfast', short: 'B', icon: FaCoffee },
    { key: 'lunch', label: 'Lunch', short: 'L', icon: FaHamburger },
    { key: 'dinner', label: 'Dinner', short: 'D', icon: FaMoon },
  ];

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: queryKeys.group(),
    queryFn: () => fetchGroup(getAuthHeaders),
    enabled: !!userData?.groupId,
    refetchInterval: 1000 * 15,
  });

  const { data: existingMealConfig } = useQuery({
    queryKey: queryKeys.mealConfig(configMonth),
    queryFn: () => fetchMealConfig(getAuthHeaders, configMonth),
    enabled: !!group,
    refetchInterval: 1000 * 10, // Auto-refresh every 10 seconds
  });

  const { data: configMonthMealSheet } = useQuery({
    queryKey: queryKeys.meal(configMonth),
    queryFn: () => fetchMeal(getAuthHeaders, configMonth),
    enabled: !!group,
    refetchInterval: 1000 * 10, // Auto-refresh every 10 seconds
  });

  const hasMealEntries = (userId, mealType) => {
    const days = configMonthMealSheet?.days;
    if (!days) return false;
    const dayEntries = days instanceof Map ? [...days.entries()] : Object.entries(days);
    return dayEntries.some(([, dayMeals]) =>
      Array.isArray(dayMeals) &&
      dayMeals.some(m => String(m.userId) === String(userId) && m[mealType] === true)
    );
  };

  const isMealTypeLocked = (userId, mealType) => {
    const currentlyOn = !!mealConfigs[userId]?.[mealType];
    return currentlyOn && hasMealEntries(userId, mealType);
  };

  useEffect(() => {
    const prefilled = {};
    group?.members.forEach(m => {
      const existing = existingMealConfig?.configs?.find(c => c.userId === m.userId);
      prefilled[m.userId] = {
        breakfast: existing?.breakfast ?? false,
        lunch: existing?.lunch ?? false,
        dinner: existing?.dinner ?? false,
      };
    });
    setMealConfigs(prefilled);
  }, [existingMealConfig, configMonth, group?.members]);

  const handleMealConfigToggle = (userId, mealType) => {
    const turningOff = !!mealConfigs[userId]?.[mealType];
    if (turningOff && hasMealEntries(userId, mealType)) {
      const member = group.members.find(m => m.userId === userId);
      burgerToast.error(
        `${member?.name} has ${mealType} entries in the Meal Sheet. Please uncheck those first.`
      );
      return;
    }
    setMealConfigs(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [mealType]: !prev[userId]?.[mealType] },
    }));
  };

  const handleSaveMealConfig = async () => {
    const configs = group.members.map(m => ({
      userId: m.userId,
      breakfast: !!mealConfigs[m.userId]?.breakfast,
      lunch: !!mealConfigs[m.userId]?.lunch,
      dinner: !!mealConfigs[m.userId]?.dinner,
    }));

    const missing = configs.filter(c => !c.breakfast && !c.lunch && !c.dinner);
    if (missing.length) {
      burgerToast.error('Each member must have at least one meal type enabled');
      return;
    }

    if (existingMealConfig) {
      const conflicts = [];
      for (const m of group.members) {
        const prev = existingMealConfig.configs?.find(c => c.userId === m.userId);
        for (const type of ['breakfast', 'lunch', 'dinner']) {
          if (prev?.[type] && !mealConfigs[m.userId]?.[type] && hasMealEntries(m.userId, type)) {
            conflicts.push(`${m.name} → ${type}`);
          }
        }
      }
      if (conflicts.length) {
        burgerToast.error(`Cannot disable meal types with existing entries: ${conflicts.join(', ')}`);
        return;
      }
    }

    setSavingMealConfig(true);
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_URL}/meal-config`, { month: configMonth, configs }, { headers });
      burgerToast.success('Meal config saved');
      queryClient.invalidateQueries({ queryKey: queryKeys.mealConfig(configMonth) });
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save meal config';
      burgerToast.error(msg);
    } finally {
      setSavingMealConfig(false);
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

  const selectedMonthLabel = format(new Date(configMonth + '-01'), 'MMM yyyy');

  return (
    <div className="container mx-auto px-3.5 lg:px-5 py-[14px] lg:py-[22px] max-w-[1040px]" style={{ paddingBottom: 'calc(168px + env(safe-area-inset-bottom, 0px))' }}>
      <PageTitle 
        icon={FaUtensils}
        title="Monthly Meal Config"
        subtitle="Set which meal types each member can use this month"
      />

      {/* Info Note */}
      <div 
        className="rounded-[14px] p-[14px_16px] flex gap-3 mb-[18px]"
        style={{ background: 'var(--ad-tile)' }}
      >
        <FaInfoCircle className="text-base-content shrink-0 mt-0.5" />
        <span className="text-[14px] text-base-content">
          Configure at the start of each month. If a member already has meal entries (🔒), uncheck those in the Meal Sheet before disabling that meal type here.
        </span>
      </div>

      {/* Select Month */}
      <div className="mb-[18px]">
        <label htmlFor="config-month" className="block text-[14.5px] font-[600] text-base-content mb-2">
          Select Month
        </label>
        <input
          id="config-month"
          type="month"
          className="w-full lg:max-w-[280px] px-[14px] py-[12px] rounded-xl border-[1.5px] text-base-content cursor-pointer focus:outline-none focus:ring-3"
          style={{ 
            borderColor: 'var(--ad-line)',
            background: 'var(--ad-field)',
            '--tw-ring-color': 'color-mix(in oklab, var(--color-neutral) 28%, transparent)'
          }}
          value={configMonth}
          onChange={e => setConfigMonth(e.target.value)}
        />
      </div>

      {/* Member Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px] mb-[22px]">
        {group?.members.map(member => {
          const isCurrentUser = member.userId === userData?.uid;
          const isInactive = member.status === 'inactive';

          return (
            <div 
              key={member.userId} 
              className="bg-base-200 border rounded-[18px] p-[16px_18px] transition-opacity"
              style={{ 
                borderColor: isCurrentUser ? 'var(--color-neutral)' : 'var(--ad-line)',
                borderWidth: isCurrentUser ? '1.5px' : '1px',
                opacity: isInactive ? 0.6 : 1
              }}
            >
              <div className="grid gap-[14px]">
                {/* Top Row: Avatar + Name */}
                <div className="flex items-center gap-3">
                  <MemberAvatar 
                    photoURL={member.photoURL}
                    name={member.name}
                    isYou={isCurrentUser}
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-[700] text-base-content">{member.name}</span>
                    {isInactive && (
                      <span className="text-[11px] font-[700] px-2 py-0.5 rounded-full" style={{ background: 'var(--ad-neg)', color: 'white' }}>
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                {/* Meal Chips */}
                <div className="flex gap-2 flex-wrap min-h-[44px]">
                  {MEAL_TYPES.map(({ key, label, short, icon: Icon }) => {
                    const enabled = !!mealConfigs[member.userId]?.[key];
                    const locked = isMealTypeLocked(member.userId, key);
                    
                    let bgColor, textColor, borderColor;
                    if (enabled) {
                      if (key === 'breakfast') {
                        bgColor = 'var(--ad-breakfast)';
                        textColor = 'var(--ad-breakfast-on)';
                        borderColor = 'var(--ad-breakfast)';
                      } else if (key === 'lunch') {
                        bgColor = 'var(--ad-lunch)';
                        textColor = 'var(--ad-lunch-on)';
                        borderColor = 'var(--ad-lunch)';
                      } else {
                        bgColor = 'var(--ad-dinner)';
                        textColor = 'var(--ad-dinner-on)';
                        borderColor = 'var(--ad-dinner)';
                      }
                    } else {
                      bgColor = 'transparent';
                      textColor = 'var(--color-base-content)';
                      borderColor = 'var(--ad-line)';
                    }

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleMealConfigToggle(member.userId, key)}
                        disabled={locked}
                        aria-pressed={enabled}
                        title={locked ? `Has ${key} entries in Meal Sheet — uncheck them first` : undefined}
                        className="flex items-center gap-2 px-[14px] py-2 rounded-full text-[14px] font-[600] transition-all min-h-[44px]"
                        style={{
                          background: bgColor,
                          color: textColor,
                          border: `1.5px solid ${borderColor}`,
                          cursor: locked ? 'not-allowed' : 'pointer',
                          boxShadow: locked ? `0 0 0 2px var(--color-base-200), 0 0 0 3.5px var(--ad-line)` : 'none'
                        }}
                      >
                        <Icon className="text-base" />
                        <span>{label} ({short})</span>
                        {locked && <FaLock className="text-xs" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Save Bar */}
      <StickySaveBar 
        mobile={isMobile}
        statusContent={
          <p className="text-[13px] text-base-content/70">
            Changes apply to {selectedMonthLabel}
          </p>
        }
        button={
          <button
            onClick={handleSaveMealConfig}
            disabled={savingMealConfig}
            className="w-full px-5 py-3 rounded-xl text-[15px] font-[700] flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-110"
            style={{
              background: savingMealConfig ? 'var(--ad-tile)' : 'var(--color-neutral)',
              color: savingMealConfig ? 'var(--color-base-content)' : 'var(--ad-on-strong)'
            }}
          >
            {savingMealConfig ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FaSave />
                Save Meal Config
              </>
            )}
          </button>
        }
      />
    </div>
  );
};

export default AdminMeals;
