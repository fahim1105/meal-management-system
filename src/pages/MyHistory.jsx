import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { FaUtensils, FaChartBar, FaCoffee, FaHamburger, FaMoon, FaBan, FaChartPie, FaChartLine } from 'react-icons/fa';
import burgerToast from '../components/BurgerToast';
import LottieLoader from '../components/LottieLoader';
import { queryKeys, fetchHistory } from '../lib/queries';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const MyHistory = () => {
  const { userData, getAuthHeaders } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const isDark = theme === 'dark';
  const axisColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const bgColor = isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.5)';

  const { data: history = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.history(),
    queryFn: () => fetchHistory(getAuthHeaders),
    enabled: !!userData?.groupId,
    onError: () => burgerToast.error('Failed to load history'),
  });

  if (!userData?.groupId) { navigate('/group-setup'); return null; }

  const monthLabel = (m) => format(new Date(m + '-01'), 'MMM yyyy');

  const activeMonths = [...history.filter(h => h.inRange)].sort((a, b) => {
    if (a.isCurrentMonth) return -1;
    if (b.isCurrentMonth) return 1;
    return a.month.localeCompare(b.month);
  });
  const gapMonths = history.filter(h => h.isGap);
  const chartMonths = activeMonths.filter(h => !h.isCurrentMonth && h.hasData);

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
        <div className="bg-base-100 backdrop-blur-sm p-4 rounded-xl shadow-2xl border-2 border-primary/30 text-sm">
          <p className="font-bold text-primary mb-2 text-base">{label}</p>
          {payload.map((e, i) => (
            <p key={i} style={{ color: e.color }} className="font-semibold">
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
        <div className="bg-base-100 backdrop-blur-sm p-4 rounded-xl shadow-2xl border-2 border-primary/30">
          <p style={{ color: payload[0].payload.fill }} className="font-bold text-lg mb-1">{payload[0].name}</p>
          <p className="text-base-content font-semibold">{payload[0].value} meals</p>
          <p className="text-base-content/60 text-sm">({((payload[0].value / total) * 100).toFixed(1)}%)</p>
        </div>
      );
    }
    return null;
  };

  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (loading) return <LottieLoader size={270} fullPage />;

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-blue-600 p-6 rounded-2xl shadow-lg mt-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-full">
            <FaChartBar className="text-3xl text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">My History</h1>
            <p className="text-white/80 text-sm">Your personal meal & finance summary</p>
          </div>
        </div>
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
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <FaChartPie /> Comparison
          </h2>

          {/* Row 1: Pie + Deposit Line — side by side on md+ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Pie — overall meal distribution */}
            {pieData.length > 0 && (
              <div className="card bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 shadow-2xl border border-purple-200/50 dark:border-purple-800/50 hover:shadow-purple-500/20 transition-all duration-300">
                <div className="card-body p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-xl shadow-lg">
                      <FaChartPie className="text-2xl text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-purple-700 dark:text-purple-400">Overall Meal Distribution</h3>
                      <p className="text-xs text-base-content/60">All completed months combined</p>
                    </div>
                  </div>
                  <div className="bg-white/50 dark:bg-base-100/50 rounded-xl p-4 backdrop-blur-sm">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <defs>
                          <linearGradient id="breakfastGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                            <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
                          </linearGradient>
                          <linearGradient id="lunchGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                            <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.8} />
                          </linearGradient>
                          <linearGradient id="dinnerGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                          </linearGradient>
                        </defs>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={50}
                          dataKey="value"
                          labelLine={false}
                          label={renderPieLabel}
                          paddingAngle={3}
                        >
                          {pieData.map((entry, i) => (
                            <Cell 
                              key={i} 
                              fill={`url(#${entry.name.toLowerCase()}Gradient)`}
                              stroke="white"
                              strokeWidth={3}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px', fontWeight: '600' }}
                          iconType="circle"
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Deposit per month — Area chart with gradient */}
            {chartMonths.length >= 2 && (
              <div className="card bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 shadow-2xl border border-emerald-200/50 dark:border-emerald-800/50 hover:shadow-emerald-500/20 transition-all duration-300">
                <div className="card-body p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-3 rounded-xl shadow-lg">
                      <FaChartLine className="text-2xl text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">Monthly Deposit</h3>
                      <p className="text-xs text-base-content/60">How much you deposited each month</p>
                    </div>
                  </div>
                  <div className="bg-white/50 dark:bg-base-100/50 rounded-xl p-4 backdrop-blur-sm">
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={chartMonths.map(h => ({ name: monthLabel(h.month), Deposit: h.deposit }))}>
                        <defs>
                          <linearGradient id="colorDeposit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.3} />
                        <XAxis 
                          dataKey="name" 
                          stroke={axisColor} 
                          style={{ fontSize: '12px', fontWeight: '600' }}
                        />
                        <YAxis 
                          stroke={axisColor} 
                          style={{ fontSize: '12px', fontWeight: '600' }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 2 }} />
                        <Area 
                          type="monotone" 
                          dataKey="Deposit" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorDeposit)"
                          dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 8, fill: '#10b981', strokeWidth: 3, stroke: '#fff' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Meal cost per month — Enhanced Bar chart */}
          {chartMonths.length >= 2 && (
            <div className="card bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 shadow-2xl border border-orange-200/50 dark:border-orange-800/50 hover:shadow-orange-500/20 transition-all duration-300">
              <div className="card-body p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-3 rounded-xl shadow-lg">
                    <FaUtensils className="text-2xl text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-orange-700 dark:text-orange-400">Monthly Meal Cost</h3>
                    <p className="text-xs text-base-content/60">How much your meals cost each month</p>
                  </div>
                </div>
                <div className="bg-white/50 dark:bg-base-100/50 rounded-xl p-4 backdrop-blur-sm">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartMonths.map(h => ({ name: monthLabel(h.month), Cost: parseFloat(h.cost.toFixed(2)), Meals: h.totalMeals }))}>
                      <defs>
                        <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#ea580c" stopOpacity={0.7} />
                        </linearGradient>
                        <linearGradient id="mealsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.3} />
                      <XAxis 
                        dataKey="name" 
                        stroke={axisColor} 
                        style={{ fontSize: '12px', fontWeight: '600' }}
                      />
                      <YAxis 
                        yAxisId="left" 
                        stroke={axisColor} 
                        style={{ fontSize: '12px', fontWeight: '600' }}
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        stroke={axisColor} 
                        style={{ fontSize: '12px', fontWeight: '600' }}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(249, 115, 22, 0.1)' }} />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px', fontWeight: '600' }}
                        iconType="circle"
                      />
                      <Bar 
                        yAxisId="left" 
                        dataKey="Cost" 
                        fill="url(#costGradient)" 
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
                      />
                      <Bar 
                        yAxisId="right" 
                        dataKey="Meals" 
                        fill="url(#mealsGradient)" 
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MONTH CARDS ── */}
      {activeMonths.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <FaChartBar /> Monthly History
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeMonths.map(h => (
              <div
                key={h.month}
                className={`card bg-base-100 shadow-xl border-t-4 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ${
                  h.isCurrentMonth ? 'border-t-orange-400' : 'border-t-primary'
                }`}
              >
                <div className="card-body p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-lg font-bold ${h.isCurrentMonth ? 'text-orange-500' : 'text-primary'}`}>
                      {monthLabel(h.month)}
                    </h3>
                    {h.isCurrentMonth && (
                      <span className="badge badge-warning badge-sm font-semibold">Running</span>
                    )}
                  </div>

                  <div className="flex justify-between mb-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className="bg-blue-100 p-2 rounded-full"><FaCoffee className="text-blue-600" /></div>
                      <span className="text-xs text-base-content/60">Breakfast</span>
                      <span className="font-bold text-blue-600">{h.breakfast}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="bg-purple-100 p-2 rounded-full"><FaHamburger className="text-purple-600" /></div>
                      <span className="text-xs text-base-content/60">Lunch</span>
                      <span className="font-bold text-purple-600">{h.lunch}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="bg-green-100 p-2 rounded-full"><FaMoon className="text-green-600" /></div>
                      <span className="text-xs text-base-content/60">Dinner</span>
                      <span className="font-bold text-green-600">{h.dinner}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="bg-primary/10 p-2 rounded-full"><FaUtensils className="text-primary" /></div>
                      <span className="text-xs text-base-content/60">Total</span>
                      <span className="font-bold text-primary">{h.totalMeals}</span>
                    </div>
                  </div>

                  <div className="divider my-1"></div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Meal Rate</span>
                      <span className="font-semibold">৳{h.mealRate.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Deposit</span>
                      <span className="font-semibold text-green-600">৳{h.deposit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Cost</span>
                      <span className="font-semibold text-orange-500">৳{h.cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-base-300 pt-1 mt-1">
                      <span className="font-bold">Balance</span>
                      <span className={`font-bold text-base ${h.balance >= 0 ? 'text-success' : 'text-error'}`}>
                        ৳{h.balance.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {h.isCurrentMonth && (
                    <p className="text-xs text-orange-400/80 mt-2 text-center">* Final figures after month ends</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gap months notice */}
      {gapMonths.length > 0 && (
        <div className="alert bg-base-200 border border-base-300">
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
