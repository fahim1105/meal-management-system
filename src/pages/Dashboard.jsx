import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import MealSheet from '../components/MealSheet';
import FinanceSummary from '../components/FinanceSummary';
import ManagerSettings from '../components/ManagerSettings';
import GroupSettings from '../components/GroupSettings';
import BazarSchedule from '../components/BazarSchedule';
import burgerToast from '../components/BurgerToast';
import LottieLoader from '../components/LottieLoader';
import { FaUtensils, FaChartLine, FaCog, FaUsers, FaCrown, FaUserCog, FaCopy, FaCalendarCheck } from 'react-icons/fa';

const Dashboard = () => {
  const { userData, getAuthHeaders } = useAuth();
  const [group, setGroup] = useState(null);
  const [activeTab, setActiveTab] = useState('meals');
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (userData && userData.groupId) {
      fetchGroup();
    }
  }, [userData]);

  const fetchGroup = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_URL}/group/my-group`, { headers });
      setGroup(response.data.group);
    } catch (error) {
      burgerToast.error('Failed to load group data');
    } finally {
      setLoading(false);
    }
  };

  const isManager = group?.managerId === userData?.uid;

  if (loading) {
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
                <div className="badge badge-lg bg-white/20 border-white/40 text-white font-mono font-semibold cursor-pointer hover:bg-white/30 transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(group?.groupCode);
                    burgerToast.success('Group code copied!');
                  }}
                  title="Click to copy"
                >
                  Code: {group?.groupCode} <FaCopy className="ml-1 text-xs opacity-70" />
                </div>
                {isManager && (
                  <div className="badge badge-lg bg-warning border-warning text-warning-content font-semibold gap-2">
                    <FaCrown />
                    Manager
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Premium Tabs */}
        <div className="bg-base-100 rounded-2xl shadow-xl p-2 mb-6">
          <div className="tabs tabs-boxed bg-base-200/50 gap-1">
            <a
              className={`tab flex-1 flex-col xs:flex-row gap-0.5 xs:gap-1 font-semibold transition-all duration-300 text-[10px] xs:text-xs sm:text-sm py-2 min-h-0 h-auto rounded-xl ${
                activeTab === 'meals'
                  ? 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg shadow-primary/30 scale-[1.03]'
                  : 'text-base-content/50 hover:text-primary hover:bg-primary/10'
              }`}
              onClick={() => setActiveTab('meals')}
            >
              <FaUtensils className="text-base flex-shrink-0" />
              <span>Meals</span>
            </a>
            <a
              className={`tab flex-1 flex-col xs:flex-row gap-0.5 xs:gap-1 font-semibold transition-all duration-300 text-[10px] xs:text-xs sm:text-sm py-2 min-h-0 h-auto rounded-xl ${
                activeTab === 'finance'
                  ? 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg shadow-primary/30 scale-[1.03]'
                  : 'text-base-content/50 hover:text-primary hover:bg-primary/10'
              }`}
              onClick={() => setActiveTab('finance')}
            >
              <FaChartLine className="text-base flex-shrink-0" />
              <span>Finance</span>
            </a>
            <a
              className={`tab flex-1 flex-col xs:flex-row gap-0.5 xs:gap-1 font-semibold transition-all duration-300 text-[10px] xs:text-xs sm:text-sm py-2 min-h-0 h-auto rounded-xl ${
                activeTab === 'bazar'
                  ? 'bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-lg shadow-teal-500/30 scale-[1.03]'
                  : 'text-base-content/50 hover:text-teal-500 hover:bg-teal-500/10'
              }`}
              onClick={() => setActiveTab('bazar')}
            >
              <FaCalendarCheck className="text-base flex-shrink-0" />
              <span>Bazar</span>
            </a>
            <a
              className={`tab flex-1 flex-col xs:flex-row gap-0.5 xs:gap-1 font-semibold transition-all duration-300 text-[10px] xs:text-xs sm:text-sm py-2 min-h-0 h-auto rounded-xl ${
                activeTab === 'account'
                  ? 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg shadow-primary/30 scale-[1.03]'
                  : 'text-base-content/50 hover:text-primary hover:bg-primary/10'
              }`}
              onClick={() => setActiveTab('account')}
            >
              <FaUserCog className="text-base flex-shrink-0" />
              <span>Account</span>
            </a>
            {isManager && (
              <a
                className={`tab flex-1 flex-col xs:flex-row gap-0.5 xs:gap-1 font-semibold transition-all duration-300 text-[10px] xs:text-xs sm:text-sm py-2 min-h-0 h-auto rounded-xl ${
                  activeTab === 'settings'
                    ? 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg shadow-primary/30 scale-[1.03]'
                    : 'text-base-content/50 hover:text-primary hover:bg-primary/10'
                }`}
                onClick={() => setActiveTab('settings')}
              >
                <FaCog className="text-base flex-shrink-0" />
                <span>Manager</span>
              </a>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-fadeIn">
          {activeTab === 'meals' && <MealSheet group={group} isManager={isManager} onUpdate={fetchGroup} />}
          {activeTab === 'finance' && <FinanceSummary group={group} isManager={isManager} onUpdate={fetchGroup} />}
          {activeTab === 'bazar' && <BazarSchedule group={group} isManager={isManager} />}
          {activeTab === 'account' && <GroupSettings group={group} isManager={isManager} onUpdate={fetchGroup} />}
          {activeTab === 'settings' && isManager && <ManagerSettings group={group} onUpdate={fetchGroup} />}
        </div>
      </div>
  );
};

export default Dashboard;
