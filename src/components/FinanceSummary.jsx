import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import burgerToast from './BurgerToast';
import { format } from 'date-fns';
import { FaShoppingCart, FaUtensils, FaChartLine, FaMoneyBillWave, FaUsers, FaClipboardList, FaCalendarAlt, FaTrash, FaChevronLeft, FaChevronRight, FaHistory } from 'react-icons/fa';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const FinanceSummary = ({ group, isManager }) => {
  const [finance, setFinance] = useState(null);
  const [summary, setSummary] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(true);
  const { getAuthHeaders, userData } = useAuth();

  const [depositUserId, setDepositUserId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [bazarAmount, setBazarAmount] = useState('');
  const [bazarDescription, setBazarDescription] = useState('');

  const API_URL = import.meta.env.VITE_API_URL;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const chartAxisColor = isDark ? '#9ca3af' : '#6b7280';
  const chartGridColor = isDark ? '#374151' : '#e5e7eb';

  useEffect(() => {
    fetchFinance();
    fetchSummary();
  }, [currentMonth]);

  const fetchFinance = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_URL}/finance/${currentMonth}`, { headers });
      setFinance(response.data.finance);
    } catch (error) {
      burgerToast.error('Failed to fetch finance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_URL}/finance/summary/${currentMonth}`, { headers });
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary');
    }
  };

  const handleAddDeposit = async (e) => {
    e.preventDefault();
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_URL}/finance/deposit`, { month: currentMonth, userId: depositUserId, amount: parseFloat(depositAmount) }, { headers });
      burgerToast.success('Deposit added successfully');
      setDepositUserId('');
      setDepositAmount('');
      fetchFinance();
      fetchSummary();
    } catch (error) {
      burgerToast.error('Failed to add deposit');
    }
  };

  const handleAddBazar = async (e) => {
    e.preventDefault();
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_URL}/finance/bazar`, { month: currentMonth, amount: parseFloat(bazarAmount), description: bazarDescription }, { headers });
      burgerToast.success('Bazar cost added successfully');
      setBazarAmount('');
      setBazarDescription('');
      fetchFinance();
      fetchSummary();
    } catch (error) {
      burgerToast.error('Failed to add bazar cost');
    }
  };

  const handleDeleteBazar = async (bazarId) => {
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_URL}/finance/bazar/${currentMonth}/${bazarId}`, { headers });
      burgerToast.success('Bazar entry deleted');
      fetchFinance();
      fetchSummary();
    } catch (error) {
      burgerToast.error('Failed to delete bazar entry');
    }
  };

  const handleDeleteDeposit = async (depositId) => {
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_URL}/finance/deposit/${currentMonth}/${depositId}`, { headers });
      burgerToast.success('Deposit entry deleted');
      fetchFinance();
      fetchSummary();
    } catch (error) {
      burgerToast.error('Failed to delete deposit');
    }
  };

  const getDepositHistory = () => {
    if (!finance?.deposits?.length) return [];
    return finance.deposits.map(d => {
      const member = group?.members.find(m => m.userId === d.userId);
      return { ...d, memberName: member?.name || 'Unknown' };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const navigateMonth = (direction) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const getMemberChartData = () => {
    if (!summary?.memberStats) return [];
    return Object.entries(summary.memberStats).map(([userId, stats]) => ({
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
    return Object.entries(summary.memberStats).map(([userId, stats]) => ({
      name: stats.name,
      value: stats.totalMeals
    }));
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#6366f1'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-base-100 p-3 rounded-lg shadow-xl border-2 border-primary/20">
          <p className="font-bold text-primary">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: ৳{entry.value?.toFixed(2) || entry.value}
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
    <div className="space-y-6 p-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-primary to-blue-600 p-6 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">Finance Summary</h2>
          <p className="text-white/80 text-sm">Track your group's financial status</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-white text-sm font-medium flex items-center gap-2">
            <FaCalendarAlt className="text-lg" />Month:
          </label>
          <button type="button" onClick={() => navigateMonth(-1)} className="btn btn-ghost btn-sm btn-circle text-white hover:bg-white/20">
            <FaChevronLeft />
          </button>
          <div className="relative">
            <input
              type="month"
              id="monthPicker"
              className="input input-bordered bg-white text-gray-800 font-medium shadow-md pr-12"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
            />
            <button type="button" onClick={() => document.getElementById('monthPicker').showPicker()} className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-circle text-primary hover:bg-primary/10">
              <FaCalendarAlt className="text-lg" />
            </button>
          </div>
          <button type="button" onClick={() => navigateMonth(1)} className="btn btn-ghost btn-sm btn-circle text-white hover:bg-white/20">
            <FaChevronRight />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium mb-1">Total Bazar</p>
                <p className="text-4xl font-bold">৳{summary?.totalBazar?.toFixed(2) || 0}</p>
              </div>
              <div className="text-5xl opacity-20"><FaShoppingCart /></div>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium mb-1">Total Meals</p>
                <p className="text-4xl font-bold">{summary?.totalMeals || 0}</p>
              </div>
              <div className="text-5xl opacity-20"><FaUtensils /></div>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium mb-1">Meal Rate</p>
                <p className="text-4xl font-bold">৳{summary?.mealRate?.toFixed(2) || 0}</p>
              </div>
              <div className="text-5xl opacity-20"><FaChartLine /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Manager Actions */}
      {isManager && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card bg-base-100 shadow-xl border-2 border-primary/20 hover:border-primary transition-all duration-300">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <FaMoneyBillWave className="text-2xl text-primary" />
                </div>
                <div>
                  <h2 className="card-title text-primary">Add Deposit</h2>
                  <p className="text-sm text-base-content/60">Record member deposits</p>
                </div>
              </div>
              <form onSubmit={handleAddDeposit} className="space-y-4">
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Select Member</span></label>
                  <select className="select select-bordered w-full focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" value={depositUserId} onChange={(e) => setDepositUserId(e.target.value)} required>
                    <option value="">Choose a member...</option>
                    {group?.members.filter(m => m.status === 'active').map(member => (
                      <option key={member.userId} value={member.userId}>{member.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Amount (৳)</span></label>
                  <input type="number" placeholder="Enter amount..." className="input input-bordered w-full focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary w-full shadow-md">Add Deposit</button>
              </form>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl border-2 border-primary/20 hover:border-primary transition-all duration-300">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <FaShoppingCart className="text-2xl text-primary" />
                </div>
                <div>
                  <h2 className="card-title text-primary">Add Bazar Cost</h2>
                  <p className="text-sm text-base-content/60">Record shopping expenses</p>
                </div>
              </div>
              <form onSubmit={handleAddBazar} className="space-y-4">
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Amount (৳)</span></label>
                  <input type="number" placeholder="Enter amount..." className="input input-bordered w-full focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" value={bazarAmount} onChange={(e) => setBazarAmount(e.target.value)} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Description</span></label>
                  <input type="text" placeholder="e.g., Rice, vegetables, fish..." className="input input-bordered w-full focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" value={bazarDescription} onChange={(e) => setBazarDescription(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary w-full shadow-md">Add Bazar Cost</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 1. Member Summary */}
      <div className="card bg-base-100 shadow-xl border-t-4 border-t-primary">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <FaUsers className="text-2xl text-primary" />
            </div>
            <div>
              <h2 className="card-title text-primary">Member Summary</h2>
              <p className="text-sm text-base-content/60">Individual financial breakdown</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr className="bg-gradient-to-r from-primary to-blue-600 text-white">
                  <th className="font-bold">Name</th>
                  <th className="font-bold text-center">Own Meals</th>
                  <th className="font-bold text-center">Guest Meals</th>
                  <th className="font-bold text-center">Total Meals</th>
                  <th className="font-bold text-right">Deposit</th>
                  <th className="font-bold text-right">Cost</th>
                  <th className="font-bold text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary?.memberStats || {}).map(([userId, stats]) => {
                  const member = group?.members.find(m => m.userId === userId);
                  const isInactive = member?.status === 'inactive';
                  return (
                    <tr key={userId} className={`${userId === userData?.uid ? 'bg-primary/5 border-l-4 border-l-primary font-semibold' : ''} ${isInactive ? 'opacity-60' : ''} hover:bg-primary/5 transition-colors`}>
                      <td className="flex items-center gap-2">
                        {stats.name}
                        {userId === userData?.uid && <span className="badge badge-sm badge-primary">You</span>}
                        {isInactive && <span className="badge badge-sm bg-gray-400 text-white border-none">Inactive</span>}
                      </td>
                      <td className="text-center">
                        <span className={`badge badge-lg border-none font-semibold ${isInactive ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>{stats.ownMeals || 0}</span>
                      </td>
                      <td className="text-center">
                        <span className={`badge badge-lg border-none font-semibold ${isInactive ? 'bg-gray-200 text-gray-600' : 'bg-orange-100 text-orange-700'}`}>{stats.guestMeals || 0}</span>
                      </td>
                      <td className="text-center">
                        <span className={`badge badge-lg border-none font-semibold ${isInactive ? 'bg-gray-200 text-gray-600' : 'bg-primary/20 text-primary'}`}>{stats.totalMeals}</span>
                      </td>
                      <td className="text-right font-semibold">৳{stats.deposit.toFixed(2)}</td>
                      <td className="text-right font-semibold">৳{stats.cost.toFixed(2)}</td>
                      <td className={`text-right font-bold ${stats.balance >= 0 ? 'text-success' : 'text-error'}`}>৳{stats.balance.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2. Deposit History */}
      <div className="card bg-base-100 shadow-xl border-t-4 border-t-green-500">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-500/10 p-3 rounded-full">
              <FaHistory className="text-2xl text-green-600" />
            </div>
            <div>
              <h2 className="card-title text-green-600">Deposit History</h2>
              <p className="text-sm text-base-content/60">All deposit entries this month</p>
            </div>
          </div>

          {!finance?.deposits?.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-base-content/40">
              <FaHistory className="text-5xl mb-3" />
              <p className="text-lg font-semibold">No deposits yet</p>
              <p className="text-sm">Deposits added this month will appear here.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                      <th className="font-bold">Date</th>
                      <th className="font-bold">Member</th>
                      <th className="font-bold text-right">Amount</th>
                      {isManager && <th className="font-bold text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {getDepositHistory().map((deposit) => (
                      <tr key={deposit._id} className="hover:bg-green-500/5 transition-colors">
                        <td>
                          <span className="badge badge-success text-white">
                            {format(new Date(deposit.date), 'dd MMM yyyy')}
                          </span>
                        </td>
                        <td className="font-medium">
                          {deposit.memberName}
                          {deposit.userId === userData?.uid && (
                            <span className="badge badge-sm badge-primary ml-2">You</span>
                          )}
                        </td>
                        <td className="text-right font-bold text-green-600">৳{deposit.amount.toFixed(2)}</td>
                        {isManager && (
                          <td className="text-center">
                            <button className="btn btn-xs btn-error btn-outline" onClick={() => handleDeleteDeposit(deposit._id)}>
                              <FaTrash />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold">
                      <td colSpan={2}>Total Deposits</td>
                      <td className="text-right text-lg">৳{finance.deposits.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}</td>
                      {isManager && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {getDepositHistory().map((deposit) => (
                  <div key={deposit._id} className="card bg-base-200 shadow-md">
                    <div className="card-body p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-base-content">
                            {deposit.memberName}
                            {deposit.userId === userData?.uid && (
                              <span className="badge badge-sm badge-primary ml-2">You</span>
                            )}
                          </p>
                          <span className="badge badge-sm badge-success text-white mt-1">
                            {format(new Date(deposit.date), 'dd MMM yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-green-600">৳{deposit.amount.toFixed(2)}</span>
                          {isManager && (
                            <button className="btn btn-xs btn-error btn-outline" onClick={() => handleDeleteDeposit(deposit._id)}>
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="card bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">
                  <div className="card-body p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">Total Deposits</span>
                      <span className="text-2xl font-bold">৳{finance.deposits.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Bazar History */}
      <div className="card bg-base-100 shadow-xl border-t-4 border-t-primary">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <FaClipboardList className="text-2xl text-primary" />
            </div>
            <div>
              <h2 className="card-title text-primary">Bazar History</h2>
              <p className="text-sm text-base-content/60">All shopping expenses this month</p>
            </div>
          </div>

          {!finance?.bazarCosts?.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-base-content/40">
              <FaClipboardList className="text-5xl mb-3" />
              <p className="text-lg font-semibold">No bazar entries yet</p>
              <p className="text-sm">Bazar costs added this month will appear here.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr className="bg-gradient-to-r from-primary to-blue-600 text-white">
                      <th className="font-bold">Date</th>
                      <th className="font-bold text-right">Amount</th>
                      <th className="font-bold">Description</th>
                      {isManager && <th className="font-bold text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {finance.bazarCosts.map((bazar, index) => (
                      <tr key={index} className="hover:bg-primary/5 transition-colors">
                        <td>
                          <span className="badge badge-primary badge-outline">
                            {format(new Date(bazar.date), 'dd MMM yyyy')}
                          </span>
                        </td>
                        <td className="text-right font-bold text-primary">৳{bazar.amount.toFixed(2)}</td>
                        <td className="text-base-content/70">{bazar.description || '-'}</td>
                        {isManager && (
                          <td className="text-center">
                            <button className="btn btn-xs btn-error btn-outline" onClick={() => handleDeleteBazar(bazar._id)} title="Delete">
                              <FaTrash />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gradient-to-r from-primary to-blue-600 text-white font-bold">
                      <td>Total</td>
                      <td className="text-right text-lg">৳{finance.bazarCosts.reduce((sum, b) => sum + b.amount, 0).toFixed(2)}</td>
                      <td></td>
                      {isManager && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {finance.bazarCosts.map((bazar, index) => (
                  <div key={index} className="card bg-base-200 shadow-md">
                    <div className="card-body p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="badge badge-primary">
                          {format(new Date(bazar.date), 'dd MMM yyyy')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-primary">৳{bazar.amount.toFixed(2)}</span>
                          {isManager && (
                            <button className="btn btn-xs btn-error btn-outline" onClick={() => handleDeleteBazar(bazar._id)}>
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-base-content/70">{bazar.description || 'No description'}</p>
                    </div>
                  </div>
                ))}
                <div className="card bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg">
                  <div className="card-body p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">Total Bazar</span>
                      <span className="text-2xl font-bold">৳{finance.bazarCosts.reduce((sum, b) => sum + b.amount, 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. Financial Analytics — last */}
      {summary && (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-primary text-center">Financial Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card bg-base-100 shadow-xl border-t-4 border-t-primary">
              <div className="card-body">
                <h3 className="card-title text-primary mb-4">Deposit vs Cost Analysis</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getMemberChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                    <XAxis dataKey="name" stroke={chartAxisColor} />
                    <YAxis stroke={chartAxisColor} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="deposit" fill="#3b82f6" name="Deposit" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="cost" fill="#ef4444" name="Cost" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl border-t-4 border-t-green-500">
              <div className="card-body">
                <h3 className="card-title text-green-600 mb-4">Member Balance Overview</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={getMemberChartData()}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                    <XAxis dataKey="name" stroke={chartAxisColor} />
                    <YAxis stroke={chartAxisColor} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="balance" stroke="#10b981" fillOpacity={1} fill="url(#colorBalance)" name="Balance" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl border-t-4 border-t-purple-500">
              <div className="card-body">
                <h3 className="card-title text-purple-600 mb-4">Meal Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={getMealDistributionData()} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                      {getMealDistributionData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl border-t-4 border-t-orange-500">
              <div className="card-body">
                <h3 className="card-title text-orange-600 mb-4">Own vs Guest Meals</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getMemberChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                    <XAxis dataKey="name" stroke={chartAxisColor} />
                    <YAxis stroke={chartAxisColor} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="ownMeals" stroke="#3b82f6" strokeWidth={3} name="Own Meals" dot={{ r: 5 }} />
                    <Line type="monotone" dataKey="guestMeals" stroke="#f59e0b" strokeWidth={3} name="Guest Meals" dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FinanceSummary;
