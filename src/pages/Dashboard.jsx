import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import MealSheet from '../components/MealSheet';
import FinanceSummary from '../components/FinanceSummary';
import ManagerSettings from '../components/ManagerSettings';
import GroupSettings from '../components/GroupSettings';
import BazarSchedule from '../components/BazarSchedule';
import burgerToast from '../components/BurgerToast';
import LottieLoader from '../components/LottieLoader';
import { queryKeys, fetchGroup, fetchMeal, fetchFinance, fetchSummary, fetchSchedule } from '../lib/queries';
import { FaUtensils, FaChartLine, FaCog, FaUsers, FaCrown, FaUserCog, FaCopy, FaCalendarCheck } from 'react-icons/fa';

const Dashboard = () => {
  const { userData, getAuthHeaders } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'meals');
  const currentMonth = format(new Date(), 'yyyy-MM');

  const enabled = !!userData?.groupId;

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: queryKeys.group(),
    queryFn: () => fetchGroup(getAuthHeaders),
    enabled,
  });

  const { data: mealSheet } = useQuery({
    queryKey: queryKeys.meal(currentMonth),
    queryFn: () => fetchMeal(getAuthHeaders, currentMonth),
    enabled,
  });

  const { data: finance } = useQuery({
    queryKey: queryKeys.finance(currentMonth),
    queryFn: () => fetchFinance(getAuthHeaders, currentMonth),
    enabled,
  });

  const { data: summary } = useQuery({
    queryKey: queryKeys.summary(currentMonth),
    queryFn: () => fetchSummary(getAuthHeaders, currentMonth),
    enabled,
  });

  const { data: schedule } = useQuery({
    queryKey: queryKeys.schedule(currentMonth),
    queryFn: () => fetchSchedule(getAuthHeaders, currentMonth),
    enabled,
  });

  const handleUpdate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.group() });
    queryClient.invalidateQueries({ queryKey: queryKeys.meal(currentMonth) });
    queryClient.invalidateQueries({ queryKey: queryKeys.finance(currentMonth) });
    queryClient.invalidateQueries({ queryKey: queryKeys.summary(currentMonth) });
    queryClient.invalidateQueries({ queryKey: queryKeys.schedule(currentMonth) });
  };

  const isManager = group?.managerId === userData?.uid;

  if (groupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <LottieLoader size={270} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Premium Group Info Card */}
      <div className="card bg-gradient-to-r from-primary to-blue-600 text-white shadow-2xl mb-6 overflow-hidden">
        <div className="card-body relative">
          <div className="absolute top-0 right-0 opacity-10 text-9xl">
            <FaUsers />
          </div>
          <div className="relative z-10">
            <h2 className="card-title text-3xl font-bold mb-2">{group?.name}</h2>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="badge badge-lg bg-white/20 border-white/40 text-white font-semibold gap-2">
                <FaUsers />
                {group?.members?.length} Members
              </div>
              <div
                className="badge badge-lg bg-white/20 border-white/40 text-white font-mono font-semibold cursor-pointer hover:bg-white/30 transition-colors"
                onClick={() => { navigator.clipboard.writeText(group?.groupCode); burgerToast.success('Group code copied!'); }}
                title="Click to copy"
              >
                Code: {group?.groupCode} <FaCopy className="ml-1 text-xs opacity-70" />
              </div>
              {isManager && (
                <div className="badge badge-lg bg-warning border-warning text-warning-content font-semibold gap-2">
                  <FaCrown /> Manager
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-base-100 rounded-2xl shadow-xl p-2 mb-6">
        <div className="tabs tabs-boxed bg-base-200/50 gap-1">
          {[
            { id: 'meals',   label: 'Meals',   icon: FaUtensils },
            { id: 'finance', label: 'Finance', icon: FaChartLine },
            { id: 'bazar',   label: 'Bazar',   icon: FaCalendarCheck },
            { id: 'account', label: 'Account', icon: FaUserCog },
            ...(isManager ? [{ id: 'settings', label: 'Manager', icon: FaCog }] : []),
          ].map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              className={`tab flex-1 flex-col xs:flex-row gap-0.5 xs:gap-1 font-semibold transition-all duration-300 text-[10px] xs:text-xs sm:text-sm py-2 min-h-0 h-auto rounded-xl ${
                activeTab === id
                  ? id === 'bazar'
                    ? 'bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-lg shadow-teal-500/30 scale-[1.03]'
                    : 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg shadow-primary/30 scale-[1.03]'
                  : id === 'bazar'
                    ? 'text-base-content/50 hover:text-teal-500 hover:bg-teal-500/10'
                    : 'text-base-content/50 hover:text-primary hover:bg-primary/10'
              }`}
              onClick={() => setActiveTab(id)}
            >
              <Icon className="text-base flex-shrink-0" />
              <span>{label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-fadeIn">
        {activeTab === 'meals'    && <MealSheet group={group} isManager={isManager} initialMealSheet={mealSheet} onUpdate={handleUpdate} />}
        {activeTab === 'finance'  && <FinanceSummary group={group} isManager={isManager} onUpdate={handleUpdate} />}
        {activeTab === 'bazar'    && <BazarSchedule group={group} isManager={isManager} />}
        {activeTab === 'account'  && <GroupSettings group={group} isManager={isManager} onUpdate={handleUpdate} />}
        {activeTab === 'settings' && isManager && <ManagerSettings group={group} onUpdate={handleUpdate} />}
      </div>
    </div>
  );
};

export default Dashboard;
