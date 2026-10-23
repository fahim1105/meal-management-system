import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import burgerToast from './BurgerToast';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { FaShoppingCart, FaUtensils, FaChartLine, FaMoneyBillWave, FaUsers, FaClipboardList, FaCalendarAlt, FaTrash, FaChevronLeft, FaChevronRight, FaHistory, FaBalanceScale } from 'react-icons/fa';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { queryKeys, fetchFinance, fetchSummary } from '../lib/queries';

const FinanceSummary = ({ group, isManager }) => {
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const { getAuthHeaders, userData } = useAuth();
  const queryClient = useQueryClient();
  const API_URL = import.meta.env.VITE_API_URL;

  const { data: finance, isLoading: financeLoading } = useQuery({
    queryKey: queryKeys.finance(currentMonth),
    queryFn: () => fetchFinance(getAuthHeaders, currentMonth),
    enabled: !!group,
    refetchInterval: 1000 * 10, // every 10s
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: queryKeys.summary(currentMonth),
    queryFn: () => fetchSummary(getAuthHeaders, currentMonth),
    enabled: !!group,
    refetchInterval: 1000 * 10,
  });

  const loading = financeLoading && !finance;

  const invalidateFinance = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.finance(currentMonth) });
    queryClient.invalidateQueries({ queryKey: queryKeys.summary(currentMonth) });
  };

  const [deletingDepositId, setDeletingDepositId] = useState(null);
  const [deletingBazarId, setDeletingBazarId] = useState(null);
  const [historyTab, setHistoryTab] = useState('deposit');
  const [depositSort, setDepositSort] = useState('newest');
  const [bazarSort, setBazarSort] = useState('newest');

  const handleDeleteBazar = async (bazarId) => {
    const result = await Swal.fire({
      title: 'Delete Bazar Entry?',
      text: 'Are you sure you want to delete this bazar entry?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      background: 'var(--color-base-100)',
      color: 'var(--color-base-content)',
      iconColor: 'var(--fin-neg)',
      confirmButtonColor: 'transparent',
      cancelButtonColor: 'transparent',
      customClass: {
        popup: 'swal-finance-popup',
        title: 'swal-finance-title',
        htmlContainer: 'swal-finance-text',
        confirmButton: 'swal-finance-confirm',
        cancelButton: 'swal-finance-cancel',
        icon: 'swal-finance-icon'
      }
    });
    if (!result.isConfirmed) return;
    setDeletingBazarId(bazarId);
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_URL}/finance/bazar/${currentMonth}/${bazarId}`, { headers });
      burgerToast.success('Bazar entry deleted');
      invalidateFinance();
    } catch {
      burgerToast.error('Failed to delete bazar entry');
    } finally {
      setDeletingBazarId(null);
    }
  };

  const handleDeleteDeposit = async (depositId) => {
    const result = await Swal.fire({
      title: 'Delete Deposit?',
      text: 'Are you sure you want to delete this deposit entry?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      background: 'var(--color-base-100)',
      color: 'var(--color-base-content)',
      iconColor: 'var(--fin-neg)',
      confirmButtonColor: 'transparent',
      cancelButtonColor: 'transparent',
      customClass: {
        popup: 'swal-finance-popup',
        title: 'swal-finance-title',
        htmlContainer: 'swal-finance-text',
        confirmButton: 'swal-finance-confirm',
        cancelButton: 'swal-finance-cancel',
        icon: 'swal-finance-icon'
      }
    });
    if (!result.isConfirmed) return;
    setDeletingDepositId(depositId);
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_URL}/finance/deposit/${currentMonth}/${depositId}`, { headers });
      burgerToast.success('Deposit entry deleted');
      invalidateFinance();
    } catch {
      burgerToast.error('Failed to delete deposit');
    } finally {
      setDeletingDepositId(null);
    }
  };

  const sortFns = {
    newest:      (a, b) => new Date(b.date) - new Date(a.date),
    oldest:      (a, b) => new Date(a.date) - new Date(b.date),
    highAmount:  (a, b) => b.amount - a.amount,
    lowAmount:   (a, b) => a.amount - b.amount,
  };

  const getDepositHistory = () => {
    if (!finance?.deposits?.length) return [];
    return finance.deposits.map(d => {
      const member = group?.members.find(m => m.userId === d.userId);
      return { ...d, memberName: member?.name || 'Unknown' };
    }).sort(sortFns[depositSort]);
  };

  const navigateMonth = (direction) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const getMemberChartData = () => {
    if (!summary?.memberStats) return [];
    return Object.entries(summary.memberStats).map(([, stats]) => ({
      name: stats.name,
      deposit: stats.deposit,
      cost: stats.cost,
      balance: stats.balance,
      ownMeals: stats.ownMeals || 0,
      guestMeals: stats.guestMeals || 0,
      totalMeals: stats.totalMeals
    }));
  };

  const getMealDistributionData = () => {
    if (!summary?.memberStats) return [];
    return Object.entries(summary.memberStats).map(([, stats]) => ({
      name: stats.name,
      value: stats.totalMeals
    }));
  };

  const currencyFields = ['deposit', 'cost', 'balance', 'Deposit', 'Cost', 'Balance'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="px-3 py-2 rounded-lg border text-base-content text-[13px]" style={{ 
          backgroundColor: 'var(--color-base-200)', 
          borderColor: 'var(--fin-line)' 
        }}>
          <p className="font-bold mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="tabular-nums" style={{ color: entry.color }}>
              {currencyFields.includes(entry.name)
                ? `${entry.name}: ৳${entry.value?.toFixed(2)}`
                : `${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="flex justify-center"><span className="loading loading-spinner"></span></div>;
  }

  return (
    <div className="space-y-4 mx-auto pb-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[26px] md:text-[32px] font-extrabold text-base-content leading-none">Finance Summary</h1>
          <p className="text-sm text-base-content/70 mt-1">Track your group's financial status</p>
        </div>
        <div className="bg-base-200 border border-base-content/15 rounded-xl p-1 flex items-center gap-1 w-full md:w-auto">
          <button 
            type="button" 
            onClick={() => navigateMonth(-1)} 
            className="w-9 h-9 rounded-[9px] flex items-center justify-center text-base-content hover:bg-base-content/10 transition-colors"
            style={{ backgroundColor: 'var(--fin-tile)' }}
            aria-label="Previous month"
          >
            <FaChevronLeft />
          </button>
          <input
            type="month"
            className="flex-1 min-w-0 bg-transparent border-none text-center font-semibold text-base-content focus:outline-none cursor-pointer px-2"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            aria-label="Select month"
          />
          <button 
            type="button" 
            onClick={() => navigateMonth(1)} 
            className="w-9 h-9 rounded-[9px] flex items-center justify-center text-base-content hover:bg-base-content/10 transition-colors"
            style={{ backgroundColor: 'var(--fin-tile)' }}
            aria-label="Next month"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="finance-kpi-grid">
        {/* Net Balance - Hero Card */}
        {(() => {
          const netBalance = (finance?.deposits?.reduce((sum, d) => sum + d.amount, 0) || 0) - (summary?.totalBazar || 0);
          const isPositive = netBalance > 0;
          const isZero = netBalance === 0;
          
          // Dynamic background color based on balance
          const bgColor = isZero 
            ? 'var(--color-base-200)' 
            : isPositive 
              ? 'var(--color-neutral)' 
              : 'var(--color-error)';
          
          const textColor = isZero ? 'var(--color-base-content)' : 'var(--fin-on-strong)';
          const borderColor = isZero ? 'var(--fin-line)' : bgColor;
          
          return (
            <div 
              className="rounded-[18px] p-5 relative overflow-hidden transition-colors duration-300" 
              style={{ 
                backgroundColor: bgColor,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: borderColor
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium mb-1" style={{ color: textColor }}>Net Balance</p>
                  {summaryLoading ? (
                    <div className="h-8 sm:h-10 w-24 sm:w-32 rounded animate-pulse" style={{ backgroundColor: isZero ? 'var(--fin-tile)' : 'rgba(255,255,255,.22)' }} />
                  ) : (
                    <p className="text-[28px] sm:text-[34px] md:text-[40px] font-extrabold leading-none tabular-nums" style={{ color: textColor }}>
                      ৳{netBalance.toFixed(2)}
                    </p>
                  )}
                </div>
                <div 
                  className="w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-[10px] flex items-center justify-center shrink-0" 
                  style={{ backgroundColor: isZero ? 'var(--fin-tile)' : 'rgba(255,255,255,.18)' }}
                >
                  <FaBalanceScale className="text-base sm:text-lg" style={{ color: textColor }} />
                </div>
              </div>
              {!summaryLoading && (
                <div className="mt-4">
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: isZero ? 'var(--fin-tile)' : 'rgba(255,255,255,.22)' }}>
                    <div 
                      className="h-full rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${Math.min(100, ((summary?.totalBazar || 0) / (finance?.deposits?.reduce((sum, d) => sum + d.amount, 0) || 1)) * 100)}%`,
                        backgroundColor: isZero ? 'var(--color-neutral)' : 'var(--color-accent)'
                      }}
                    />
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: textColor, opacity: 0.85 }}>
                    {Math.round(((summary?.totalBazar || 0) / (finance?.deposits?.reduce((sum, d) => sum + d.amount, 0) || 1)) * 100)}% of deposits spent
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Total Deposits */}
        <div className="bg-base-200 border border-base-content/15 rounded-[18px] p-3 sm:p-4">
          <div className="flex items-start justify-between mb-1 sm:mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] sm:text-[13px] text-base-content/70 mb-1">Total Deposits</p>
              {summaryLoading ? (
                <div className="h-6 sm:h-8 w-20 sm:w-24 bg-base-content/10 rounded animate-pulse" />
              ) : (
                <p className="text-[20px] sm:text-[26px] font-extrabold leading-none tabular-nums text-base-content">
                  ৳{finance?.deposits?.reduce((sum, d) => sum + d.amount, 0)?.toFixed(2) || '0.00'}
                </p>
              )}
            </div>
            <div className="w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-[10px] flex items-center justify-center text-base-content shrink-0" style={{ backgroundColor: 'var(--fin-tile)' }}>
              <FaMoneyBillWave className="text-base sm:text-lg" />
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-base-content/60">{finance?.deposits?.length || 0} {(finance?.deposits?.length || 0) === 1 ? 'entry' : 'entries'}</p>
        </div>

        {/* Total Bazar */}
        <div className="bg-base-200 border border-base-content/15 rounded-[18px] p-3 sm:p-4">
          <div className="flex items-start justify-between mb-1 sm:mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] sm:text-[13px] text-base-content/70 mb-1">Total Bazar</p>
              {summaryLoading ? (
                <div className="h-6 sm:h-8 w-20 sm:w-24 bg-base-content/10 rounded animate-pulse" />
              ) : (
                <p className="text-[20px] sm:text-[26px] font-extrabold leading-none tabular-nums text-base-content">
                  ৳{summary?.totalBazar?.toFixed(2) || '0.00'}
                </p>
              )}
            </div>
            <div className="w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-[10px] flex items-center justify-center text-base-content shrink-0" style={{ backgroundColor: 'var(--fin-tile)' }}>
              <FaShoppingCart className="text-base sm:text-lg" />
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-base-content/60">{finance?.bazarCosts?.length || 0} {(finance?.bazarCosts?.length || 0) === 1 ? 'entry' : 'entries'}</p>
        </div>

        {/* Total Meals */}
        <div className="bg-base-200 border border-base-content/15 rounded-[18px] p-3 sm:p-4">
          <div className="flex items-start justify-between mb-1 sm:mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] sm:text-[13px] text-base-content/70 mb-1">Total Meals</p>
              {summaryLoading ? (
                <div className="h-6 sm:h-8 w-16 sm:w-20 bg-base-content/10 rounded animate-pulse" />
              ) : (
                <p className="text-[20px] sm:text-[26px] font-extrabold leading-none tabular-nums text-base-content">
                  {summary?.totalMeals || 0}
                </p>
              )}
            </div>
            <div className="w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-[10px] flex items-center justify-center text-base-content shrink-0" style={{ backgroundColor: 'var(--fin-tile)' }}>
              <FaUtensils className="text-base sm:text-lg" />
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-base-content/60">Own and guest meals</p>
        </div>

        {/* Meal Rate */}
        <div className="bg-base-200 border border-base-content/15 rounded-[18px] p-3 sm:p-4">
          <div className="flex items-start justify-between mb-1 sm:mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] sm:text-[13px] text-base-content/70 mb-1">Meal Rate</p>
              {summaryLoading ? (
                <div className="h-6 sm:h-8 w-20 sm:w-24 bg-base-content/10 rounded animate-pulse" />
              ) : (
                <p className="text-[20px] sm:text-[26px] font-extrabold leading-none tabular-nums text-base-content">
                  ৳{summary?.mealRate?.toFixed(2) || '0.00'}
                </p>
              )}
            </div>
            <div className="w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-[10px] flex items-center justify-center text-base-content shrink-0" style={{ backgroundColor: 'var(--fin-tile)' }}>
              <FaChartLine className="text-base sm:text-lg" />
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-base-content/60">
            {summary?.totalBazar && summary?.totalMeals ? `৳${summary.totalBazar.toFixed(0)} ÷ ${summary.totalMeals} meals` : 'Per meal cost'}
          </p>
        </div>
      </div>

      {/* Member Summary */}
      <div className="bg-base-200 border border-base-content/15 rounded-[18px] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--fin-line)' }}>
          <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center text-base-content" style={{ backgroundColor: 'var(--fin-tile)' }}>
            <FaUsers className="text-xl" />
          </div>
          <div className="flex-1">
            <h2 className="text-[19px] font-bold text-base-content leading-none">Member Summary</h2>
            <p className="text-[13px] text-base-content/60 mt-0.5">Individual financial breakdown</p>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[420px]" style={{ overscrollBehavior: 'contain' }} tabIndex={0} aria-label="Member summary table">
          <table className="w-full min-w-[720px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead className="sticky top-0" style={{ backgroundColor: 'var(--fin-head)', zIndex: 3 }}>
              <tr>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-base-content/70 whitespace-nowrap">Name</th>
                <th className="text-right px-4 py-3 text-[13px] font-semibold text-base-content/70 whitespace-nowrap">Own Meals</th>
                <th className="text-right px-4 py-3 text-[13px] font-semibold text-base-content/70 whitespace-nowrap">Guest Meals</th>
                <th className="text-right px-4 py-3 text-[13px] font-semibold text-base-content/70 whitespace-nowrap">Total Meals</th>
                <th className="text-right px-4 py-3 text-[13px] font-semibold text-base-content/70 whitespace-nowrap">Deposit</th>
                <th className="text-right px-4 py-3 text-[13px] font-semibold text-base-content/70 whitespace-nowrap">Cost</th>
                <th className="text-right px-4 py-3 text-[13px] font-semibold text-base-content/70 whitespace-nowrap">Balance</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary?.memberStats || {}).map(([userId, stats], idx) => {
                const member = group?.members.find(m => m.userId === userId);
                const isInactive = member?.status === 'inactive';
                const isCurrentUser = userId === userData?.uid;
                return (
                  <tr key={userId} className="group" style={{ 
                    backgroundColor: idx % 2 === 0 ? 'var(--fin-alt)' : 'var(--color-base-200)',
                    borderBottom: '1px solid var(--fin-line)'
                  }}>
                    <td className="px-4 py-3" style={{ backgroundColor: idx % 2 === 0 ? 'var(--fin-alt)' : 'var(--color-base-200)' }}>
                      <div className="flex items-center gap-2.5 whitespace-nowrap">
                        <div className="w-[26px] h-[26px] rounded-full bg-neutral flex items-center justify-center text-[11px] font-bold shrink-0" style={{ color: 'var(--fin-on-strong)' }}>
                          {stats.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-base-content">{stats.name}</span>
                        {isCurrentUser && <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-base-content whitespace-nowrap" style={{ backgroundColor: 'var(--fin-tile)' }}>You</span>}
                        {isInactive && <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-base-content/50 whitespace-nowrap" style={{ backgroundColor: 'var(--fin-tile)' }}>Inactive</span>}
                      </div>
                    </td>
                    <td className="text-right px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center min-w-[34px] px-2 h-6 rounded-lg text-[13px] font-bold text-base-content tabular-nums" style={{ 
                        backgroundColor: 'var(--fin-tile)',
                        opacity: stats.ownMeals === 0 ? 0.45 : 1
                      }}>
                        {stats.ownMeals || 0}
                      </span>
                    </td>
                    <td className="text-right px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center min-w-[34px] px-2 h-6 rounded-lg text-[13px] font-bold text-base-content tabular-nums" style={{ 
                        backgroundColor: 'var(--fin-guest)',
                        opacity: stats.guestMeals === 0 ? 0.45 : 1
                      }}>
                        {stats.guestMeals || 0}
                      </span>
                    </td>
                    <td className="text-right px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-base-content tabular-nums">{stats.totalMeals}</span>
                    </td>
                    <td className="text-right px-4 py-3 font-semibold text-base-content tabular-nums whitespace-nowrap">৳{stats.deposit.toFixed(2)}</td>
                    <td className="text-right px-4 py-3 font-semibold text-base-content tabular-nums whitespace-nowrap">৳{stats.cost.toFixed(2)}</td>
                    <td className="text-right px-4 py-3 font-bold tabular-nums whitespace-nowrap" style={{ 
                      color: stats.balance >= 0 ? 'var(--fin-pos)' : 'var(--fin-neg)'
                    }}>
                      {stats.balance >= 0 ? '+' : '−'}৳{Math.abs(stats.balance).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {Object.keys(summary?.memberStats || {}).length > 0 && (
              <tfoot className="sticky bottom-0" style={{ backgroundColor: 'var(--fin-head)', borderTop: '2px solid var(--color-neutral)', zIndex: 3 }}>
                <tr>
                  <td className="px-4 py-3 font-bold text-base-content whitespace-nowrap">Total</td>
                  <td className="text-right px-4 py-3 font-bold text-base-content tabular-nums whitespace-nowrap">
                    {Object.values(summary?.memberStats || {}).reduce((sum, s) => sum + (s.ownMeals || 0), 0)}
                  </td>
                  <td className="text-right px-4 py-3 font-bold text-base-content tabular-nums whitespace-nowrap">
                    {Object.values(summary?.memberStats || {}).reduce((sum, s) => sum + (s.guestMeals || 0), 0)}
                  </td>
                  <td className="text-right px-4 py-3 font-bold text-base-content tabular-nums whitespace-nowrap">
                    {Object.values(summary?.memberStats || {}).reduce((sum, s) => sum + s.totalMeals, 0)}
                  </td>
                  <td className="text-right px-4 py-3 font-bold text-base-content tabular-nums whitespace-nowrap">
                    ৳{Object.values(summary?.memberStats || {}).reduce((sum, s) => sum + s.deposit, 0).toFixed(2)}
                  </td>
                  <td className="text-right px-4 py-3 font-bold text-base-content tabular-nums whitespace-nowrap">
                    ৳{Object.values(summary?.memberStats || {}).reduce((sum, s) => sum + s.cost, 0).toFixed(2)}
                  </td>
                  <td className="text-right px-4 py-3 font-bold text-base-content tabular-nums whitespace-nowrap">
                    ৳{Object.values(summary?.memberStats || {}).reduce((sum, s) => sum + s.balance, 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Deposit / Bazar History Panel */}
      <div className="bg-base-200 border border-base-content/15 rounded-[18px] overflow-hidden">
        {/* Tabs */}
        <div className="mx-5 mt-4 mb-3 bg-base-100 border border-base-content/15 rounded-xl p-1 flex gap-1">
          <button
            onClick={() => setHistoryTab('deposit')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[9px] font-semibold text-sm transition-colors ${
              historyTab === 'deposit'
                ? 'bg-neutral text-white'
                : 'text-base-content/60 hover:bg-base-content/5'
            }`}
            role="tab"
            aria-selected={historyTab === 'deposit'}
            style={historyTab === 'deposit' ? { backgroundColor: 'var(--color-neutral)', color: 'var(--fin-on-strong)' } : {}}
          >
            Deposit
            {finance?.deposits?.length > 0 && (
              <span className="text-xs font-bold opacity-75">
                {finance.deposits.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setHistoryTab('bazar')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[9px] font-semibold text-sm transition-colors ${
              historyTab === 'bazar'
                ? 'bg-neutral text-white'
                : 'text-base-content/60 hover:bg-base-content/5'
            }`}
            role="tab"
            aria-selected={historyTab === 'bazar'}
            style={historyTab === 'bazar' ? { backgroundColor: 'var(--color-neutral)', color: 'var(--fin-on-strong)' } : {}}
          >
            Bazar
            {finance?.bazarCosts?.length > 0 && (
              <span className="text-xs font-bold opacity-75">
                {finance.bazarCosts.length}
              </span>
            )}
          </button>
        </div>

        {/* Sort Row - Only show if there are 2+ entries */}
        {((historyTab === 'deposit' && finance?.deposits?.length > 1) || 
          (historyTab === 'bazar' && finance?.bazarCosts?.length > 1)) && (
          <div className="px-5 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-base-content/60 shrink-0 hidden sm:inline">Sort by</span>
              <div className="flex gap-1.5 flex-1 sm:flex-initial">
                {[
                  { value: 'newest', label: 'Newest' },
                  { value: 'oldest', label: 'Oldest' },
                  { value: 'highAmount', label: 'Highest' },
                  { value: 'lowAmount', label: 'Lowest' },
                ].map(opt => {
                  const currentSort = historyTab === 'deposit' ? depositSort : bazarSort;
                  const setSort = historyTab === 'deposit' ? setDepositSort : setBazarSort;
                  const isSelected = currentSort === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSort(opt.value)}
                      className={`flex-1 sm:flex-initial px-2 sm:px-3 py-1 rounded-full text-[11px] sm:text-[13px] font-semibold transition-all ${
                        isSelected
                          ? 'border-neutral text-base-content'
                          : 'border-transparent text-base-content/60 hover:border-base-content/30'
                      }`}
                      style={isSelected ? { 
                        backgroundColor: 'var(--fin-tile)',
                        borderWidth: '1.5px',
                        borderStyle: 'solid',
                        borderColor: 'var(--color-neutral)'
                      } : { 
                        borderWidth: '1.5px',
                        borderStyle: 'solid',
                        borderColor: 'var(--fin-line)'
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Deposit Tab Content */}
        {historyTab === 'deposit' && (
          !finance?.deposits?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-base-content/40">
              <FaHistory className="text-5xl mb-3" />
              <p className="text-base font-semibold">No deposits yet</p>
              <p className="text-sm">Deposits added this month will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[420px]" style={{ overscrollBehavior: 'contain' }} tabIndex={0} aria-label="Deposit history table">
              <table className="w-full min-w-[500px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead className="sticky top-0" style={{ backgroundColor: 'var(--fin-head)', zIndex: 2 }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-[13px] font-semibold text-base-content/70">Date</th>
                    <th className="text-left px-4 py-3 text-[13px] font-semibold text-base-content/70">Member</th>
                    <th className="text-right px-4 py-3 text-[13px] font-semibold text-base-content/70">Amount</th>
                    {isManager && <th className="text-right px-4 py-3 text-[13px] font-semibold text-base-content/70">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {getDepositHistory().map((deposit, idx) => (
                    <tr key={deposit._id} style={{
                      backgroundColor: idx % 2 === 0 ? 'var(--fin-alt)' : 'var(--color-base-200)',
                      borderBottom: '1px solid var(--fin-line)'
                    }}>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-lg text-[13px] font-semibold text-base-content" style={{ backgroundColor: 'var(--fin-tile)' }}>
                          {format(new Date(deposit.date), 'dd MMM yyyy')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-base-content">
                        {deposit.memberName}
                        {deposit.userId === userData?.uid && (
                          <span className="ml-2 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-base-content" style={{ backgroundColor: 'var(--fin-tile)' }}>
                            You
                          </span>
                        )}
                      </td>
                      <td className="text-right px-4 py-3 font-bold text-base-content tabular-nums">
                        ৳{deposit.amount.toFixed(2)}
                      </td>
                      {isManager && (
                        <td className="text-right px-4 py-3">
                          <button
                            className={`w-8 h-8 rounded-[9px] flex items-center justify-center transition-colors ${deletingDepositId === deposit._id ? 'opacity-50' : ''}`}
                            style={{
                              border: `1.5px solid ${deletingDepositId === deposit._id ? 'var(--fin-neg)' : 'color-mix(in oklab, var(--fin-neg) 55%, transparent)'}`,
                              color: 'var(--fin-neg)'
                            }}
                            onClick={() => handleDeleteDeposit(deposit._id)}
                            disabled={deletingDepositId === deposit._id}
                            aria-label="Delete deposit"
                          >
                            {deletingDepositId === deposit._id ? '...' : <FaTrash className="text-xs" />}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0" style={{ backgroundColor: 'var(--fin-head)', borderTop: '2px solid var(--color-neutral)', zIndex: 2 }}>
                  <tr>
                    <td className="px-4 py-3 font-bold text-base-content" colSpan={2}>Total Deposits</td>
                    <td className="text-right px-4 py-3 font-bold text-base-content text-lg tabular-nums">
                      ৳{finance.deposits.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}
                    </td>
                    {isManager && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        )}

        {/* Bazar Tab Content */}
        {historyTab === 'bazar' && (
          !finance?.bazarCosts?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-base-content/40">
              <FaClipboardList className="text-5xl mb-3" />
              <p className="text-base font-semibold">No bazar entries yet</p>
              <p className="text-sm">Bazar costs added this month will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[420px]" style={{ overscrollBehavior: 'contain' }} tabIndex={0} aria-label="Bazar history table">
              <table className="w-full min-w-[620px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead className="sticky top-0" style={{ backgroundColor: 'var(--fin-head)', zIndex: 2 }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-[13px] font-semibold text-base-content/70">Date</th>
                    <th className="text-right px-4 py-3 text-[13px] font-semibold text-base-content/70">Amount</th>
                    <th className="text-left px-4 py-3 text-[13px] font-semibold text-base-content/70">Description</th>
                    {isManager && <th className="text-right px-4 py-3 text-[13px] font-semibold text-base-content/70">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {[...finance.bazarCosts].sort(sortFns[bazarSort]).map((bazar, idx) => (
                    <tr key={bazar._id} style={{
                      backgroundColor: idx % 2 === 0 ? 'var(--fin-alt)' : 'var(--color-base-200)',
                      borderBottom: '1px solid var(--fin-line)'
                    }}>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-lg text-[13px] font-semibold text-base-content" style={{ backgroundColor: 'var(--fin-tile)' }}>
                          {format(new Date(bazar.date), 'dd MMM yyyy')}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 font-bold text-base-content tabular-nums">
                        ৳{bazar.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-base-content/70 text-sm">
                        {bazar.description || '−'}
                      </td>
                      {isManager && (
                        <td className="text-right px-4 py-3">
                          <button
                            className={`w-8 h-8 rounded-[9px] flex items-center justify-center transition-colors ${deletingBazarId === bazar._id ? 'opacity-50' : ''}`}
                            style={{
                              border: `1.5px solid ${deletingBazarId === bazar._id ? 'var(--fin-neg)' : 'color-mix(in oklab, var(--fin-neg) 55%, transparent)'}`,
                              color: 'var(--fin-neg)'
                            }}
                            onClick={() => handleDeleteBazar(bazar._id)}
                            disabled={deletingBazarId === bazar._id}
                            aria-label="Delete bazar entry"
                          >
                            {deletingBazarId === bazar._id ? '...' : <FaTrash className="text-xs" />}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0" style={{ backgroundColor: 'var(--fin-head)', borderTop: '2px solid var(--color-neutral)', zIndex: 2 }}>
                  <tr>
                    <td className="px-4 py-3 font-bold text-base-content">Total Bazar</td>
                    <td className="text-right px-4 py-3 font-bold text-base-content text-lg tabular-nums">
                      ৳{finance.bazarCosts.reduce((sum, b) => sum + b.amount, 0).toFixed(2)}
                    </td>
                    <td></td>
                    {isManager && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        )}
      </div>


      {/* Financial Analytics */}
      {summary && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-[28px] font-extrabold text-base-content">Financial Analytics</h2>
            <p className="text-sm text-base-content/60 mt-1">Visual insights into your group's finances</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
            {/* 1. Deposit vs Cost Analysis */}
            <div className="bg-base-200 border border-base-content/15 rounded-[18px] p-[18px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center text-base-content" style={{ backgroundColor: 'var(--fin-tile)' }}>
                  <FaMoneyBillWave className="text-xl" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[19px] font-bold text-base-content leading-none">Deposit vs Cost Analysis</h3>
                  <p className="text-[13px] text-base-content/60 mt-0.5">Compare member contributions</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240} minHeight={220}>
                <BarChart data={getMemberChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--fin-line)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'color-mix(in oklab, var(--color-base-content) 70%, transparent)', fontSize: 11 }}
                    stroke="var(--fin-line)"
                  />
                  <YAxis 
                    tick={{ fill: 'color-mix(in oklab, var(--color-base-content) 70%, transparent)', fontSize: 11 }}
                    stroke="var(--fin-line)"
                  />
                  <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{ fill: 'var(--fin-tile)' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }}
                    iconType="square"
                    iconSize={10}
                  />
                  <Bar 
                    dataKey="deposit" 
                    name="Deposit"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                    style={{ fill: 'var(--fin-c1)' }}
                  />
                  <Bar 
                    dataKey="cost" 
                    name="Cost"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                    style={{ fill: 'var(--fin-c2)' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 2. Member Balance Overview */}
            <div className="bg-base-200 border border-base-content/15 rounded-[18px] p-[18px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center text-base-content" style={{ backgroundColor: 'var(--fin-tile)' }}>
                  <FaChartLine className="text-xl" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[19px] font-bold text-base-content leading-none">Member Balance Overview</h3>
                  <p className="text-[13px] text-base-content/60 mt-0.5">Track financial standing</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240} minHeight={220}>
                <AreaChart data={getMemberChartData()}>
                  <defs>
                    <linearGradient id="balancePos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--fin-pos)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--fin-pos)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="balanceNeg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--fin-neg)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--fin-neg)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--fin-line)" vertical={false} />
                  <XAxis 
                    dataKey="name"
                    tick={{ fill: 'color-mix(in oklab, var(--color-base-content) 70%, transparent)', fontSize: 11 }}
                    stroke="var(--fin-line)"
                  />
                  <YAxis 
                    tick={{ fill: 'color-mix(in oklab, var(--color-base-content) 70%, transparent)', fontSize: 11 }}
                    stroke="var(--fin-line)"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    name="Balance"
                    strokeWidth={2}
                    fill="url(#balancePos)"
                    style={{ stroke: 'var(--fin-pos)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 3. Meal Distribution */}
            <div className="bg-base-200 border border-base-content/15 rounded-[18px] p-[18px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center text-base-content" style={{ backgroundColor: 'var(--fin-tile)' }}>
                  <FaUtensils className="text-xl" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[19px] font-bold text-base-content leading-none">Meal Distribution</h3>
                  <p className="text-[13px] text-base-content/60 mt-0.5">Member meal consumption</p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={220} className="flex-shrink-0" style={{ maxWidth: '280px' }}>
                  <PieChart>
                    <Pie 
                      data={getMealDistributionData().filter(d => d.value > 0)}
                      cx="50%" 
                      cy="50%" 
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={false}
                    >
                      {getMealDistributionData().filter(d => d.value > 0).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          style={{ 
                            fill: `var(--fin-s${(index % 4) + 1})`,
                            stroke: 'var(--color-base-200)',
                            strokeWidth: 2
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <text 
                      x="50%" 
                      y="50%" 
                      textAnchor="middle" 
                      dominantBaseline="middle" 
                      style={{ 
                        fontSize: '24px', 
                        fontWeight: 'bold',
                        fill: 'var(--color-base-content)'
                      }}
                    >
                      {summary.totalMeals}
                    </text>
                    <text 
                      x="50%" 
                      y="58%" 
                      textAnchor="middle" 
                      dominantBaseline="middle" 
                      style={{ 
                        fontSize: '11px',
                        fill: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)'
                      }}
                    >
                      meals
                    </text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 w-full">
                  {getMealDistributionData().filter(d => d.value > 0).map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-[10px] h-[10px] rounded-sm shrink-0" style={{ backgroundColor: `var(--fin-s${(index % 4) + 1})` }} />
                      <span className="text-sm text-base-content flex-1 truncate">{entry.name}</span>
                      <span className="text-sm font-bold text-base-content tabular-nums">
                        {((entry.value / summary.totalMeals) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Own vs Guest Meals */}
            <div className="bg-base-200 border border-base-content/15 rounded-[18px] p-[18px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center text-base-content" style={{ backgroundColor: 'var(--fin-tile)' }}>
                  <FaUsers className="text-xl" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[19px] font-bold text-base-content leading-none">Own vs Guest Meals</h3>
                  <p className="text-[13px] text-base-content/60 mt-0.5">Meal type comparison</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240} minHeight={220}>
                <LineChart data={getMemberChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--fin-line)" vertical={false} />
                  <XAxis 
                    dataKey="name"
                    tick={{ fill: 'color-mix(in oklab, var(--color-base-content) 70%, transparent)', fontSize: 11 }}
                    stroke="var(--fin-line)"
                  />
                  <YAxis 
                    tick={{ fill: 'color-mix(in oklab, var(--color-base-content) 70%, transparent)', fontSize: 11 }}
                    stroke="var(--fin-line)"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }}
                    iconType="circle"
                    iconSize={10}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ownMeals" 
                    name="Own Meals"
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 2 }}
                    style={{ 
                      stroke: 'var(--fin-c1)',
                      fill: 'var(--fin-c1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="guestMeals" 
                    name="Guest Meals"
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 2 }}
                    style={{ 
                      stroke: 'var(--fin-c2)',
                      fill: 'var(--fin-c2)'
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FinanceSummary;