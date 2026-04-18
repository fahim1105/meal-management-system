import { useNavigate, Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  FaUtensils, FaChartLine, FaCalendarCheck, FaUsers,
  FaCopy, FaCrown, FaUser, FaMoneyBillWave, FaShoppingCart
} from 'react-icons/fa';
import burgerToast from './BurgerToast';
import { queryKeys, fetchGroup, fetchSummary, fetchSchedule } from '../lib/queries';
import BurgerImg from '../assets/Burger_For_Toast.png';
import SecondBiteImg from '../assets/2nd_bite.png';
import HalfImg from '../assets/halff.png';
import LastBiteImg from '../assets/lastbite.png';
import BabySleepImg from '../assets/Baby_sleep-removebg-preview.png';

const HomeDashboard = () => {
  const { getAuthHeaders, userData } = useAuth();
  const navigate = useNavigate();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const enabled = !!userData?.groupId;

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: queryKeys.group(),
    queryFn: () => fetchGroup(getAuthHeaders),
    enabled,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: queryKeys.summary(currentMonth),
    queryFn: () => fetchSummary(getAuthHeaders, currentMonth),
    enabled,
  });

  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: queryKeys.schedule(currentMonth),
    queryFn: () => fetchSchedule(getAuthHeaders, currentMonth),
    enabled,
  });

  const loading = groupLoading || summaryLoading || scheduleLoading;

  const todayDuty = schedule?.ranges?.find(r => {
    const from = format(new Date(r.fromDate), 'yyyy-MM-dd');
    const to   = format(new Date(r.toDate),   'yyyy-MM-dd');
    return todayStr >= from && todayStr <= to;
  });

  const myStats  = summary?.memberStats?.[userData?.uid];
  const isManager = group?.managerId === userData?.uid;

  const hour = new Date().getHours();
  const greeting =
    hour >= 5  && hour < 12 ? 'Good morning'  :
    hour >= 12 && hour < 14 ? 'Good noon'      :
    hour >= 14 && hour < 17 ? 'Good afternoon' :
    hour >= 17 && hour < 21 ? 'Good evening'   :
                               'Good night';
  const burgerImg =
    hour >= 5  && hour < 12 ? BurgerImg     :
    hour >= 12 && hour < 14 ? SecondBiteImg :
    hour >= 14 && hour < 17 ? HalfImg       :
    hour >= 17 && hour < 21 ? LastBiteImg   :
                               BabySleepImg;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="rounded-3xl bg-base-200 animate-pulse h-40"></div>
        <div className="rounded-2xl bg-base-200 animate-pulse h-20"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-base-200 animate-pulse h-32"></div>
          ))}
        </div>
        <div>
          <div className="h-3 w-28 bg-base-200 rounded animate-pulse mb-3"></div>
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-base-200 animate-pulse h-20"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!group) { navigate('/group-setup'); return null; }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

      {/* Hero Greeting Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-blue-600 to-blue-700 shadow-2xl shadow-primary/30 min-h-[160px]">
        <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/4 translate-y-1/4 pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between px-6 py-7 md:px-10">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white/60 text-sm font-medium">{format(new Date(), 'EEEE, dd MMMM yyyy')}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
              {greeting},<br className="sm:hidden" /> {userData?.name?.split(' ')[0]}!
            </h1>
          </div>
          <div className="flex items-end justify-end shrink-0 ml-4">
            <img src={burgerImg} alt="burger" className="w-28 sm:w-36 md:w-52 object-contain drop-shadow-2xl"
              style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.3))' }} />
          </div>
        </div>
      </div>

      {/* Today's Bazar Duty */}
      {todayDuty ? (
        <div className={`rounded-2xl p-5 border-2 flex items-center gap-4 shadow-lg transition-all ${
          todayDuty.userId === userData?.uid
            ? 'bg-warning/10 border-warning shadow-warning/20'
            : 'bg-teal-500/5 border-teal-400/40'
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            todayDuty.userId === userData?.uid ? 'bg-warning/20' : 'bg-teal-500/15'
          }`}>
            <FaShoppingCart className={`text-xl ${todayDuty.userId === userData?.uid ? 'text-warning' : 'text-teal-500'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-0.5">Today's Bazar Duty</p>
            <p className="font-bold text-base-content text-lg leading-tight">
              {todayDuty.userId === userData?.uid ? "It's your turn today!" : `${todayDuty.name} is on duty`}
            </p>
            <p className="text-xs text-base-content/40 mt-0.5">
              {format(new Date(todayDuty.fromDate), 'dd MMM')} → {format(new Date(todayDuty.toDate), 'dd MMM yyyy')}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-5 border-2 border-dashed border-base-300 flex items-center gap-4 bg-base-200/40">
          <div className="w-12 h-12 rounded-xl bg-base-300 flex items-center justify-center shrink-0">
            <FaCalendarCheck className="text-xl text-base-content/25" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-base-content/30 mb-0.5">Today's Bazar Duty</p>
            <p className="font-semibold text-base-content/50 text-sm">No schedule set for this month</p>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* My Balance */}
        <div className="card bg-base-100 shadow-xl border border-base-300/60 hover:shadow-2xl hover:-translate-y-0.5 transition-all">
          <div className="card-body p-5 gap-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FaMoneyBillWave className="text-primary text-lg" />
              </div>
              <span className="text-xs text-base-content/40 font-medium">{format(new Date(), 'MMM yyyy')}</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-1">My Balance</p>
              {myStats ? (
                <>
                  <p className={`text-2xl font-black ${myStats.balance >= 0 ? 'text-success' : 'text-error'}`}>
                    ৳{myStats.balance.toFixed(2)}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="badge badge-xs bg-green-500/15 text-green-600 border-none">↑ ৳{myStats.deposit.toFixed(2)}</span>
                    <span className="badge badge-xs bg-red-500/15 text-red-500 border-none">↓ ৳{myStats.cost.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-base-content/40">No data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Meal Rate */}
        <div className="card bg-base-100 shadow-xl border border-base-300/60 hover:shadow-2xl hover:-translate-y-0.5 transition-all">
          <div className="card-body p-5 gap-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <FaUtensils className="text-orange-500 text-lg" />
              </div>
              <span className="text-xs text-base-content/40 font-medium">{format(new Date(), 'MMM yyyy')}</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-1">Meal Rate</p>
              {summary?.mealRate !== undefined ? (
                <>
                  <p className="text-2xl font-black text-orange-500">৳{summary.mealRate.toFixed(2)}</p>
                  <p className="text-xs text-base-content/40 mt-1">
                    My total meal →{' '}
                    <span className="font-bold text-orange-500 drop-shadow-[0_0_6px_rgba(249,115,22,0.8)] animate-pulse">
                      {myStats?.totalMeals || 0}
                    </span>
                  </p>                </>
              ) : (
                <p className="text-sm text-base-content/40">No data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Group Info */}
        <div className="card bg-gradient-to-br from-primary to-blue-600 text-white shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all">
          <div className="card-body p-5 gap-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <FaUsers className="text-white text-lg" />
              </div>
              {isManager && (
                <span className="badge badge-xs bg-warning border-none text-warning-content gap-1 font-bold">
                  <FaCrown className="text-[9px]" />Manager
                </span>
              )}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-1">Your Group</p>
              <p className="text-xl font-black text-white leading-tight">{group?.name}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-white/60 text-xs flex items-center gap-1">
                  <FaUser className="text-[10px]" /> {group?.members?.filter(m => m.status === 'active').length} members
                </span>
                <button
                  className="badge bg-white/20 border-white/20 text-white font-mono text-xs cursor-pointer hover:bg-white/30 transition-colors gap-1"
                  onClick={() => { navigator.clipboard.writeText(group?.groupCode); burgerToast.success('Copied!'); }}
                >
                  {group?.groupCode} <FaCopy className="text-[9px]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-base-content/35 mb-3">Quick Actions</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: FaUtensils,    label: 'Meals',   gradient: 'from-blue-500 to-blue-600',    shadow: 'shadow-blue-500/25',    tab: 'meals' },
            { icon: FaChartLine,   label: 'Finance', gradient: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/25', tab: 'finance' },
            { icon: FaCalendarCheck, label: 'Bazar', gradient: 'from-teal-500 to-teal-600',    shadow: 'shadow-teal-500/25',    tab: 'bazar' },
          ].map(({ icon: Icon, label, gradient, shadow, tab }) => (
            <Link key={label} to="/dashboard" state={{ tab }}
              className={`flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg ${shadow} hover:shadow-xl hover:-translate-y-1 transition-all duration-200`}
            >
              <Icon className="text-white text-2xl" />
              <span className="text-white text-xs font-bold">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomeDashboard;
