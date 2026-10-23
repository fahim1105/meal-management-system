import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import axios from 'axios';
import { FaUtensils, FaChartBar, FaCoffee, FaHamburger, FaMoon, FaBan, FaChartPie, FaChartLine, FaFilePdf, FaDownload, FaUserTie, FaSortAmountDown, FaCheck } from 'react-icons/fa';
import burgerToast from '../components/BurgerToast';
import LottieLoader from '../components/LottieLoader';
import { queryKeys, fetchHistory } from '../lib/queries';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const MyHistory = () => {
  const { userData, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  const [exporting, setExporting] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: history = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.history(),
    queryFn: () => fetchHistory(getAuthHeaders),
    enabled: !!userData?.groupId,
    refetchInterval: 1000 * 10, // Auto-refresh every 10 seconds
    onError: () => burgerToast.error('Failed to load history'),
  });

  if (!userData?.groupId) { navigate('/group-setup'); return null; }

  const monthLabel = (m) => format(new Date(m + '-01'), 'MMM yyyy');

  const activeMonths = (() => {
    const current = history.filter(h => h.inRange && h.isCurrentMonth);
    const past    = history.filter(h => h.inRange && !h.isCurrentMonth);

    const sortFns = {
      newest:       (a, b) => b.month.localeCompare(a.month),
      oldest:       (a, b) => a.month.localeCompare(b.month),
      highBalance:  (a, b) => b.balance - a.balance,
      lowBalance:   (a, b) => a.balance - b.balance,
      highDeposit:  (a, b) => b.deposit - a.deposit,
      highCost:     (a, b) => b.cost - a.cost,
      mostMeals:    (a, b) => b.totalMeals - a.totalMeals,
      highRate:     (a, b) => b.mealRate - a.mealRate,
    };

    return [...current, ...past.sort(sortFns[sortBy] ?? sortFns.newest)];
  })();
  const gapMonths = history.filter(h => h.isGap);
  // chartMonths always chronological (oldest→newest) — independent of card sort order
  const chartMonths = history
    .filter(h => h.inRange && !h.isCurrentMonth && h.hasData)
    .sort((a, b) => a.month.localeCompare(b.month));

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_URL}/report/history-pdf`, {
        headers,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `meal-history-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      burgerToast.success('History PDF downloaded');
    } catch (error) {
      console.error('History PDF export error:', error);
      burgerToast.error('Failed to export history PDF');
    } finally {
      setExporting(false);
    }
  };

  // Pie data — overall meal type distribution across all completed months
  const totalBreakfast = chartMonths.reduce((s, h) => s + h.breakfast, 0);
  const totalLunch = chartMonths.reduce((s, h) => s + h.lunch, 0);
  const totalDinner = chartMonths.reduce((s, h) => s + h.dinner, 0);
  const pieData = [
    { name: 'Breakfast', value: totalBreakfast },
    { name: 'Lunch', value: totalLunch },
    { name: 'Dinner', value: totalDinner },
  ].filter(d => d.value > 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-base-200 border border-base-content/15 p-3 rounded-lg text-[13px] text-base-content shadow-lg">
          <p className="font-semibold mb-1.5">{label}</p>
          {payload.map((e, i) => (
            <p key={i} className="font-medium">
              {e.name}: {['Deposit', 'Cost', 'Balance'].includes(e.name) ? `৳${Number(e.value).toFixed(2)}` : e.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const total = pieData.reduce((s, d) => s + d.value, 0);
      return (
        <div className="bg-base-200 border border-base-content/15 p-3 rounded-lg text-[13px] text-base-content shadow-lg">
          <p className="font-semibold mb-1">{payload[0].name}</p>
          <p className="font-medium">{payload[0].value} meals</p>
          <p className="text-base-content/70">({((payload[0].value / total) * 100).toFixed(1)}%)</p>
        </div>
      );
    }
    return null;
  };

  if (loading) return <LottieLoader size={270} fullPage />;

  return (
    <div className="container mx-auto px-3.5 lg:px-5 py-4 max-w-[1120px] space-y-[22px]" style={{ paddingBottom: 'calc(80px + 24px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Page Header */}
      <div className="bg-neutral rounded-[22px] p-[18px] lg:p-[24px_28px] shadow-lg flex flex-col lg:flex-row items-start lg:items-center gap-4" style={{ color: 'var(--hs-on-strong)' }}>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-[50px] h-[50px] rounded-[15px] flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,.18)' }}>
            <FaChartBar className="text-[24px]" />
          </div>
          <div>
            <h1 className="text-[23px] lg:text-[28px] font-[800] leading-tight tracking-tight">My History</h1>
            <p className="text-sm mt-0.5" style={{ opacity: 0.9 }}>Your personal meal & finance summary</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={exporting || history.length === 0}
          className="w-full lg:w-auto px-4 py-2.5 rounded-[11px] font-[700] text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105"
          style={{ 
            background: '#D1EDD3',
            color: '#3E5039',
            border: '1.5px solid #D1EDD3'
          }}
        >
          {exporting ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <FaFilePdf className="text-base" />
          )}
          <FaDownload className="text-xs" />
          <span>Export PDF</span>
        </button>
      </div>

      {/* Empty state */}
      {history.length === 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center py-16 text-base-content/40">
            <FaChartBar className="text-6xl mb-4" />
            <p className="text-xl font-semibold">No history yet</p>
            <p className="text-sm">Your monthly data will appear here.</p>
          </div>
        </div>
      )}

      {/* ── COMPARISON SECTION ── */}
      {chartMonths.length >= 1 && (
        <div className="space-y-[12px]">
          <h2 className="text-[21px] font-[700] text-base-content">Comparison</h2>

          {/* Row 1: Pie + Deposit Area */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.25fr] gap-[14px]">

            {/* Overall Meal Distribution - Donut */}
            {pieData.length > 0 && (
              <div className="bg-base-200 border border-base-content/15 rounded-[18px] p-[18px_20px]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center shrink-0" style={{ background: 'var(--hs-tile)' }}>
                    <FaChartPie className="text-base-content text-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[17px] font-[700] text-base-content">Overall Meal Distribution</h3>
                    <p className="text-[13px] text-base-content/70">All completed months combined</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={62}
                      dataKey="value"
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {pieData.map((entry) => {
                        const fillColor = entry.name === 'Lunch' ? 'var(--hs-lunch)' : entry.name === 'Dinner' ? 'var(--hs-dinner)' : 'var(--hs-breakfast)';
                        return <Cell key={entry.name} fill={fillColor} />;
                      })}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-2">
                  {pieData.map((entry) => {
                    const fillColor = entry.name === 'Lunch' ? 'var(--hs-lunch)' : entry.name === 'Dinner' ? 'var(--hs-dinner)' : 'var(--hs-breakfast)';
                    return (
                      <div key={entry.name} className="flex items-center gap-1.5">
                        <div className="w-[10px] h-[10px] rounded-[2px]" style={{ background: fillColor }} />
                        <span className="text-[13px] text-base-content/70">{entry.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Monthly Deposit - Area Chart */}
            {chartMonths.length >= 2 && (
              <div className="bg-base-200 border border-base-content/15 rounded-[18px] p-[18px_20px]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center shrink-0" style={{ background: 'var(--hs-tile)' }}>
                    <FaChartLine className="text-base-content text-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[17px] font-[700] text-base-content">Monthly Deposit</h3>
                    <p className="text-[13px] text-base-content/70">How much you deposited each month</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartMonths.map(h => ({ name: monthLabel(h.month), Deposit: h.deposit }))}>
                    <defs>
                      <linearGradient id="areaDeposit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--hs-lunch)" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="var(--hs-lunch)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="0" stroke="var(--hs-line)" horizontal={true} vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: 'var(--color-base-content)', opacity: 0.7, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: 'var(--color-base-content)', opacity: 0.7, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    <Area 
                      type="monotone" 
                      dataKey="Deposit" 
                      stroke="var(--hs-lunch)" 
                      strokeWidth={2.5}
                      fill="url(#areaDeposit)"
                      dot={{ r: 5, fill: 'var(--color-base-200)', stroke: 'var(--hs-lunch)', strokeWidth: 2.5 }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-[10px] h-[10px] rounded-[2px]" style={{ background: 'var(--hs-lunch)' }} />
                    <span className="text-[13px] text-base-content/70">Deposit</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Monthly Meal Cost - Dual Axis Bar Chart */}
          {chartMonths.length >= 2 && (
            <div className="bg-base-200 border border-base-content/15 rounded-[18px] p-[18px_20px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center shrink-0" style={{ background: 'var(--hs-tile)' }}>
                  <FaUtensils className="text-base-content text-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[17px] font-[700] text-base-content">Monthly Meal Cost</h3>
                  <p className="text-[13px] text-base-content/70">How much your meals cost each month</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartMonths.map(h => ({ name: monthLabel(h.month), Cost: parseFloat(h.cost.toFixed(2)), Meals: h.totalMeals }))}>
                  <CartesianGrid strokeDasharray="0" stroke="var(--hs-line)" horizontal={true} vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'var(--color-base-content)', opacity: 0.7, fontSize: 11 }}
                    axisLine={{ stroke: 'var(--hs-line)' }}
                    tickLine={false}
                  />
                  <YAxis 
                    yAxisId="left" 
                    tick={{ fill: 'var(--color-base-content)', opacity: 0.7, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    tick={{ fill: 'var(--color-base-content)', opacity: 0.7, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar 
                    yAxisId="left" 
                    dataKey="Cost" 
                    fill="var(--hs-cost)" 
                    radius={[6, 6, 0, 0]}
                    maxBarSize={60}
                  />
                  <Bar 
                    yAxisId="right" 
                    dataKey="Meals" 
                    fill="var(--hs-lunch)" 
                    radius={[6, 6, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-[10px] h-[10px] rounded-[2px]" style={{ background: 'var(--hs-cost)' }} />
                  <span className="text-[13px] text-base-content/70">Cost</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-[10px] h-[10px] rounded-[2px]" style={{ background: 'var(--hs-lunch)' }} />
                  <span className="text-[13px] text-base-content/70">Meals</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MONTH CARDS ── */}
      {activeMonths.length > 0 && (
        <div className="space-y-[12px]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-[21px] font-[700] text-base-content">Monthly History</h2>

            {/* Sort Control */}
            {(() => {
              const sortOptions = [
                { group: 'Date',      items: [
                  { value: 'newest',      label: 'Newest First' },
                  { value: 'oldest',      label: 'Oldest First' },
                ]},
                { group: 'Financial', items: [
                  { value: 'highBalance', label: 'Highest Balance' },
                  { value: 'lowBalance',  label: 'Lowest Balance' },
                  { value: 'highDeposit', label: 'Highest Deposit' },
                  { value: 'highCost',    label: 'Highest Cost' },
                ]},
                { group: 'Meal',      items: [
                  { value: 'mostMeals',   label: 'Most Meals' },
                  { value: 'highRate',    label: 'Highest Meal Rate' },
                ]},
              ];
              const activeLabel = sortOptions.flatMap(g => g.items).find(o => o.value === sortBy)?.label ?? 'Sort';

              return (
                <div ref={sortRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setSortOpen(v => !v)}
                    className="flex items-center gap-2 px-[14px] py-[10px] rounded-[11px] text-sm font-semibold bg-base-200 border-[1.5px] text-base-content transition-all"
                    style={{ 
                      borderColor: 'var(--hs-line)',
                      paddingRight: '36px'
                    }}
                    aria-label="Sort monthly history"
                  >
                    <FaSortAmountDown className="text-xs" />
                    <span>{activeLabel}</span>
                    <svg
                      className={`absolute right-3 w-3 h-3 transition-transform ${sortOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {sortOpen && (
                    <div className="absolute right-0 mt-2 w-52 rounded-xl bg-base-200 border border-base-content/15 shadow-xl z-50 overflow-hidden">
                      {sortOptions.map((group, gi) => (
                        <div key={group.group}>
                          {gi > 0 && <div className="mx-3 h-px" style={{ background: 'var(--hs-line)' }} />}
                          <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-base-content/60">
                            {group.group}
                          </p>
                          {group.items.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                              className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium transition-all ${
                                sortBy === opt.value 
                                  ? 'text-base-content font-semibold' 
                                  : 'text-base-content/70'
                              }`}
                              style={{ 
                                background: sortBy === opt.value ? 'var(--hs-tile)' : 'transparent'
                              }}
                            >
                              <span>{opt.label}</span>
                              {sortBy === opt.value && <FaCheck className="text-xs" />}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Month Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[14px]">
            {activeMonths.map(h => {
              const balanceColor = h.balance > 0 ? 'var(--hs-pos)' : h.balance < 0 ? 'var(--hs-neg)' : 'var(--color-base-content)';
              
              return (
                <div
                  key={h.month}
                  className="bg-base-200 border rounded-[18px] p-[18px] flex flex-col gap-[14px]"
                  style={{
                    borderColor: h.isCurrentMonth ? 'var(--color-neutral)' : 'var(--hs-line)',
                    borderWidth: h.isCurrentMonth ? '1.5px' : '1px'
                  }}
                >
                  {/* Top Row: Month + Status */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-[19px] font-[700] text-base-content">
                      {monthLabel(h.month)}
                    </h3>
                    {h.isCurrentMonth && (
                      <span 
                        className="text-[12px] font-[700] rounded-full px-[10px] py-[2px]" 
                        style={{ 
                          background: 'var(--color-neutral)', 
                          color: 'var(--hs-on-strong)' 
                        }}
                      >
                        Running
                      </span>
                    )}
                  </div>

                  {/* Manager Row */}
                  <div 
                    className="rounded-xl border px-3 py-2 flex items-center gap-2 text-[13.5px]"
                    style={{ 
                      background: 'var(--hs-alt)', 
                      borderColor: 'var(--hs-line)' 
                    }}
                  >
                    <FaUserTie className="text-base-content/70 shrink-0 text-sm" />
                    <span className="text-base-content/70">Manager</span>
                    <span className="ml-auto font-semibold text-base-content truncate">
                      {h.managerName || '—'}
                    </span>
                  </div>

                  {/* Meal Counts: 4 columns */}
                  <div className="grid grid-cols-4 gap-[6px]">
                    {/* Breakfast */}
                    <div className="flex flex-col items-center gap-1">
                      <div 
                        className="w-[34px] h-[34px] rounded-full flex items-center justify-center"
                        style={{ background: 'var(--hs-breakfast)' }}
                      >
                        <FaCoffee style={{ color: 'var(--hs-breakfast-on)' }} className="text-sm" />
                      </div>
                      <span className="text-[12px] text-base-content/70">Breakfast</span>
                      <span className="text-[17px] font-[700] text-base-content tabular-nums">{h.breakfast}</span>
                    </div>

                    {/* Lunch */}
                    <div className="flex flex-col items-center gap-1">
                      <div 
                        className="w-[34px] h-[34px] rounded-full flex items-center justify-center"
                        style={{ background: 'var(--hs-lunch)' }}
                      >
                        <FaHamburger style={{ color: 'var(--hs-lunch-on)' }} className="text-sm" />
                      </div>
                      <span className="text-[12px] text-base-content/70">Lunch</span>
                      <span className="text-[17px] font-[700] text-base-content tabular-nums">{h.lunch}</span>
                    </div>

                    {/* Dinner */}
                    <div className="flex flex-col items-center gap-1">
                      <div 
                        className="w-[34px] h-[34px] rounded-full flex items-center justify-center"
                        style={{ background: 'var(--hs-dinner)' }}
                      >
                        <FaMoon style={{ color: 'var(--hs-dinner-on)' }} className="text-sm" />
                      </div>
                      <span className="text-[12px] text-base-content/70">Dinner</span>
                      <span className="text-[17px] font-[700] text-base-content tabular-nums">{h.dinner}</span>
                    </div>

                    {/* Total */}
                    <div className="flex flex-col items-center gap-1">
                      <div 
                        className="w-[34px] h-[34px] rounded-full flex items-center justify-center"
                        style={{ background: 'var(--hs-tile)' }}
                      >
                        <FaUtensils className="text-base-content text-sm" />
                      </div>
                      <span className="text-[12px] text-base-content/70">Total</span>
                      <span className="text-[17px] font-[700] text-base-content tabular-nums">{h.totalMeals}</span>
                    </div>
                  </div>

                  {/* Finance Rows */}
                  <div className="space-y-1 text-[14px]" style={{ borderTop: '1px solid var(--hs-line)', paddingTop: '10px' }}>
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Meal Rate</span>
                      <span className="font-semibold text-base-content tabular-nums">৳{h.mealRate.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Deposit</span>
                      <span className="font-semibold text-base-content tabular-nums">৳{h.deposit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Cost</span>
                      <span className="font-semibold text-base-content tabular-nums">৳{h.cost.toFixed(2)}</span>
                    </div>
                    <div 
                      className="flex justify-between text-[16px]" 
                      style={{ 
                        borderTop: '1px solid var(--hs-line)', 
                        marginTop: '4px', 
                        paddingTop: '8px' 
                      }}
                    >
                      <span className="font-[700]">Balance</span>
                      <span className="font-[800] tabular-nums" style={{ color: balanceColor }}>
                        ৳{h.balance.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Running Month Note */}
                  {h.isCurrentMonth && (
                    <p className="text-[12.5px] text-base-content/70 flex items-center gap-1.5">
                      <FaBan className="text-xs shrink-0" />
                      <span>* Final figures after month ends</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gap months notice */}
      {gapMonths.length > 0 && (
        <div className="alert bg-base-200 border border-base-content/15">
          <FaBan className="text-base-content/40 shrink-0" />
          <span className="text-sm text-base-content/60">
            Not in group during: {gapMonths.map(h => monthLabel(h.month)).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
};

export default MyHistory;
