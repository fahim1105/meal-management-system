import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import MealSheet from '../components/MealSheet';
import FinanceSummary from '../components/FinanceSummary';
import ManagerSettings from '../components/ManagerSettings';
import GroupSettings from '../components/GroupSettings';
import burgerToast from '../components/BurgerToast';
import LottieLoader from '../components/LottieLoader';
import { FaUtensils, FaChartLine, FaCog, FaUsers, FaCrown, FaUserCog, FaCopy } from 'react-icons/fa';

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
          <div className="tabs tabs-boxed bg-transparent gap-1 sm:gap-2">
            <a
              className={`tab flex-1 gap-1 sm:gap-2 font-semibold transition-all duration-300 text-xs sm:text-sm ${
                activeTab === 'meals' 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'hover:bg-primary/10 hover:text-primary'
              }`}
              onClick={() => setActiveTab('meals')}
            >
              <FaUtensils className="text-base sm:text-lg flex-shrink-0" />
              <span className="truncate">Meals</span>
            </a>
            <a
              className={`tab flex-1 gap-1 sm:gap-2 font-semibold transition-all duration-300 text-xs sm:text-sm ${
                activeTab === 'finance' 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'hover:bg-primary/10 hover:text-primary'
              }`}
              onClick={() => setActiveTab('finance')}
            >
              <FaChartLine className="text-base sm:text-lg flex-shrink-0" />
              <span className="truncate">Finance</span>
            </a>
            <a
              className={`tab flex-1 gap-1 sm:gap-2 font-semibold transition-all duration-300 text-xs sm:text-sm ${
                activeTab === 'account' 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'hover:bg-primary/10 hover:text-primary'
              }`}
              onClick={() => setActiveTab('account')}
            >
              <FaUserCog className="text-base sm:text-lg flex-shrink-0" />
              <span className="truncate">Account</span>
            </a>
            {isManager && (
              <a
                className={`tab flex-1 gap-1 sm:gap-2 font-semibold transition-all duration-300 text-xs sm:text-sm ${
                  activeTab === 'settings' 
                    ? 'bg-primary text-white shadow-lg' 
                    : 'hover:bg-primary/10 hover:text-primary'
                }`}
                onClick={() => setActiveTab('settings')}
              >
                <FaCog className="text-base sm:text-lg flex-shrink-0" />
                <span className="truncate">Manager</span>
              </a>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-fadeIn">
          {activeTab === 'meals' && <MealSheet group={group} isManager={isManager} onUpdate={fetchGroup} />}
          {activeTab === 'finance' && <FinanceSummary group={group} isManager={isManager} onUpdate={fetchGroup} />}
          {activeTab === 'account' && <GroupSettings group={group} isManager={isManager} onUpdate={fetchGroup} />}
          {activeTab === 'settings' && isManager && <ManagerSettings group={group} onUpdate={fetchGroup} />}
        </div>
      </div>
  );
};

export default Dashboard;
