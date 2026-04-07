import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router';
import axios from 'axios';
import { format } from 'date-fns';
import { FaUtensils, FaChartBar, FaCoffee, FaHamburger, FaMoon, FaBan, FaChartPie, FaChartLine } from 'react-icons/fa';
import burgerToast from '../components/BurgerToast';
import LottieLoader from '../components/LottieLoader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981'];

const MyHistory = () => {
  const { userData, getAuthHeaders } = useAuth();
  const { theme } = useTheme();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const isDark = theme === 'dark';
  const axisColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  useEffect(() => {
    if (!userData?.groupId) { navigate('/group-setup'); return; }
    fetchHistory();
  }, [userData]);

  const fetchHistory = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(`${API_URL}/finance/my-history`, { headers });
      setHistory(res.data.history || []);
    } catch (e) {
      burgerToast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

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
        <div className="bg-base-100 p-3 rounded-xl shadow-xl border border-primary/20 text-sm">
          <p className="font-bold text-primary mb-1">{label}</p>
          {payload.map((e, i) => (
            <p key={i} style={{ color: e.color }}>
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
        <div className="bg-base-100 p-3 rounded-xl shadow-xl border border-primary/20 text-sm">
          <p style={{ color: payload[0].payload.fill }} className="font-bold">{payload[0].name}</p>
          <p className="text-base-content">{payload[0].value} meals ({((payload[0].value / total) * 100).toFixed(1)}%)</p>
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
              <div className="card bg-base-100 shadow-xl border-t-4 border-t-primary">
                <div className="card-body p-5">
                  <h3 className="font-bold text-primary mb-1 flex items-center gap-2">
                    <FaChartPie className="text-sm" /> Overall Meal Distribution
                  </h3>
                  <p className="text-xs text-base-content/50 mb-2">All completed months combined</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        dataKey="value"
                        labelLine={false}
                        label={renderPieLabel}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Deposit per month — Line chart */}
            {chartMonths.length >= 2 && (
              <div className="card bg-base-100 shadow-xl border-t-4 border-t-green-500">
                <div className="card-body p-5">
                  <h3 className="font-bold text-green-600 mb-1 flex items-center gap-2">
                    <FaChartLine className="text-sm" /> Monthly Deposit
                  </h3>
                  <p className="text-xs text-base-content/50 mb-2">How much you deposited each month</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartMonths.map(h => ({ name: monthLabel(h.month), Deposit: h.deposit }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="name" stroke={axisColor} tick={{ fontSize: 11 }} />
                      <YAxis stroke={axisColor} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="Deposit" stroke="#10b981" strokeWidth={2.5} dot={{ r: 5, fill: '#10b981' }} activeDot={{ r: 7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Meal cost per month — Bar chart */}
          {chartMonths.length >= 2 && (
            <div className="card bg-base-100 shadow-xl border-t-4 border-t-orange-400">
              <div className="card-body p-5">
                <h3 className="font-bold text-orange-500 mb-1 flex items-center gap-2">
                  <FaUtensils className="text-sm" /> Monthly Meal Cost
                </h3>
                <p className="text-xs text-base-content/50 mb-2">How much your meals cost each month</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartMonths.map(h => ({ name: monthLabel(h.month), Cost: parseFloat(h.cost.toFixed(2)), Meals: h.totalMeals }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" stroke={axisColor} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" stroke={axisColor} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" stroke={axisColor} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="Cost" fill="#f97316" radius={[6, 6, 0, 0]} />
                    <Bar yAxisId="right" dataKey="Meals" fill="#a78bfa" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
