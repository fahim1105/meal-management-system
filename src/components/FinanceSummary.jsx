import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import burgerToast from './BurgerToast';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { FaShoppingCart, FaUtensils, FaChartLine, FaMoneyBillWave, FaUsers, FaClipboardList, FaCalendarAlt, FaTrash, FaChevronLeft, FaChevronRight, FaHistory } from 'react-icons/fa';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { queryKeys, fetchFinance, fetchSummary } from '../lib/queries';

const FinanceSummary = ({ group, isManager, onUpdate }) => {
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const { getAuthHeaders, userData } = useAuth();
  const queryClient = useQueryClient();
  const API_URL = import.meta.env.VITE_API_URL;

  const { data: finance, isLoading: financeLoading } = useQuery({
    queryKey: queryKeys.finance(currentMonth),
    queryFn: () => fetchFinance(getAuthHeaders, currentMonth),
    enabled: !!group,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: queryKeys.summary(currentMonth),
    queryFn: () => fetchSummary(getAuthHeaders, currentMonth),
    enabled: !!group,
  });

  const loading = financeLoading && !finance;

  const invalidateFinance = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.finance(currentMonth) });
    queryClient.invalidateQueries({ queryKey: queryKeys.summary(currentMonth) });
  };

  const [depositUserId, setDepositUserId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [bazarAmount, setBazarAmount] = useState('');
  const [bazarDescription, setBazarDescription] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [bazarLoading, setBazarLoading] = useState(false);
  const [deletingDepositId, setDeletingDepositId] = useState(null);
  const [deletingBazarId, setDeletingBazarId] = useState(null);
  const [historyTab, setHistoryTab] = useState('deposit');

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const chartAxisColor = isDark ? '#9ca3af' : '#6b7280';
  const chartGridColor = isDark ? '#374151' : '#e5e7eb';

  const handleAddDeposit = async (e) => {
    e.preventDefault();
    setDepositLoading(true);
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_URL}/finance/deposit`, { month: currentMonth, userId: depositUserId, amount: parseFloat(depositAmount) }, { headers });
      burgerToast.success('Deposit added successfully');
      setDepositUserId('');
      setDepositAmount('');
      invalidateFinance();
    } catch (error) {
      burgerToast.error('Failed to add deposit');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleAddBazar = async (e) => {
    e.preventDefault();
    setBazarLoading(true);
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_URL}/finance/bazar`, { month: currentMonth, amount: parseFloat(bazarAmount), description: bazarDescription }, { headers });
      burgerToast.success('Bazar cost added successfully');
      setBazarAmount('');
      setBazarDescription('');
      invalidateFinance();
    } catch (error) {
      burgerToast.error('Failed to add bazar cost');
    } finally {
      setBazarLoading(false);
    }
  };

  const handleDeleteBazar = async (bazarId) => {
    const result = await Swal.fire({
      title: 'Delete Bazar Entry?',
      text: 'Are you sure you want to delete this bazar entry?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: { popup: 'rounded-2xl', confirmButton: 'btn btn-error', cancelButton: 'btn btn-ghost' }
    });
    if (!result.isConfirmed) return;
    setDeletingBazarId(bazarId);
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_URL}/finance/bazar/${currentMonth}/${bazarId}`, { headers });
      burgerToast.success('Bazar entry deleted');
      invalidateFinance();
    } catch (error) {
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
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: { popup: 'rounded-2xl', confirmButton: 'btn btn-error', cancelButton: 'btn btn-ghost' }
    });
    if (!result.isConfirmed) return;
    setDeletingDepositId(depositId);
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_URL}/finance/deposit/${currentMonth}/${depositId}`, { headers });
      burgerToast.success('Deposit entry deleted');
      invalidateFinance();
    } catch (error) {
      burgerToast.error('Failed to delete deposit');
    } finally {
      setDeletingDepositId(null);
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

  const currencyFields = ['deposit', 'cost', 'balance', 'Deposit', 'Cost', 'Balance'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-base-100 p-3 rounded-lg shadow-xl border-2 border-primary/20">
          <p className="font-bold text-primary">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
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
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-blue-600 p-6 rounded-2xl shadow-lg">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">Finance Summary</h2>
            <p className="text-white/80 text-sm">Track your group's financial status</p>
          </div>
          <div className="flex items-center gap-2 w-full">
            <label className="text-white text-sm font-medium flex items-center gap-2 shrink-0">
              <FaCalendarAlt className="text-lg" />Month:
            </label>
            <button type="button" onClick={() => navigateMonth(-1)} className="btn btn-ghost btn-sm btn-circle text-white hover:bg-white/20 shrink-0">
              <FaChevronLeft />
            </button>
            <div className="relative flex-1 min-w-0">
              <input
                type="month"
                id="monthPicker"
                className="input input-bordered bg-white text-gray-800 font-medium shadow-md w-full cursor-pointer"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
              />
            </div>
            <button type="button" onClick={() => navigateMonth(1)} className="btn btn-ghost btn-sm btn-circle text-white hover:bg-white/20 shrink-0">
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium mb-1">Total Bazar</p>
                {summaryLoading ? (
                  <div className="h-10 w-28 bg-white/30 rounded-lg animate-pulse" />
                ) : (
                  <p className="text-4xl font-bold">৳{summary?.totalBazar?.toFixed(2) || '0.00'}</p>
                )}
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
                {summaryLoading ? (
                  <div className="h-10 w-20 bg-white/30 rounded-lg animate-pulse" />
                ) : (
                  <p className="text-4xl font-bold">{summary?.totalMeals || 0}</p>
                )}
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
                {summaryLoading ? (
                  <div className="h-10 w-28 bg-white/30 rounded-lg animate-pulse" />
                ) : (
                  <p className="text-4xl font-bold">৳{summary?.mealRate?.toFixed(2) || '0.00'}</p>
                )}
              </div>
              <div className="text-5xl opacity-20"><FaChartLine /></div>
            </div>
          </div>
        </div>
      </div>

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

      {/* 2 & 3. History Tabs */}
      <div className="card bg-base-100 shadow-xl border-t-4 border-t-primary">
        <div className="card-body">
          {/* Tab Header */}
          <div className="flex gap-2 mb-5 bg-base-200 p-1.5 rounded-xl">
            <button
              onClick={() => setHistoryTab('deposit')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                historyTab === 'deposit'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                  : 'text-base-content/60 hover:text-green-600 hover:bg-green-500/10'
              }`}
            >
              <FaHistory className="text-base" />
              Deposit
              {finance?.deposits?.length > 0 && (
                <span className={`badge badge-xs ${historyTab === 'deposit' ? 'bg-white/30 text-white border-none' : 'badge-success'}`}>
                  {finance.deposits.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setHistoryTab('bazar')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                historyTab === 'bazar'
                  ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-md'
                  : 'text-base-content/60 hover:text-primary hover:bg-primary/10'
              }`}
            >
              <FaClipboardList className="text-base" />
              Bazar
              {finance?.bazarCosts?.length > 0 && (
                <span className={`badge badge-xs ${historyTab === 'bazar' ? 'bg-white/30 text-white border-none' : 'badge-primary'}`}>
                  {finance.bazarCosts.length}
                </span>
              )}
            </button>
          </div>

          {/* Deposit Tab Content */}
          {historyTab === 'deposit' && (
            !finance?.deposits?.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-base-content/40">
                <FaHistory className="text-5xl mb-3" />
                <p className="text-lg font-semibold">No deposits yet</p>
                <p className="text-sm">Deposits added this month will appear here.</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block rounded-lg overflow-hidden">
                  <table className="table table-zebra w-full table-fixed">
                    <colgroup>
                      <col className="w-1/3" />
                      <col className="w-1/3" />
                      <col className="w-1/3" />
                      {isManager && <col className="w-20" />}
                    </colgroup>
                    <thead>
                      <tr className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                        <th className="font-bold">Date</th>
                        <th className="font-bold text-left">Member</th>
                        <th className="font-bold text-right">Amount</th>
                        {isManager && <th className="font-bold text-center">Action</th>}
                      </tr>
                    </thead>
                  </table>
                  <div className="max-h-72 overflow-y-auto">
                    <table className="table table-zebra w-full table-fixed">
                      <colgroup>
                        <col className="w-1/3" />
                        <col className="w-1/3" />
                        <col className="w-1/3" />
                        {isManager && <col className="w-20" />}
                      </colgroup>
                      <tbody>
                        {getDepositHistory().map((deposit) => (
                          <tr key={deposit._id} className="hover:bg-green-500/5 transition-colors">
                            <td><span className="badge badge-success text-white">{format(new Date(deposit.date), 'dd MMM yyyy')}</span></td>
                            <td className="font-medium text-left">{deposit.memberName}{deposit.userId === userData?.uid && <span className="badge badge-sm badge-primary ml-2">You</span>}</td>
                            <td className="text-right font-bold text-green-600">৳{deposit.amount.toFixed(2)}</td>
                            {isManager && (
                              <td className="text-center">
                                <button className={`btn btn-xs btn-error btn-outline ${deletingDepositId === deposit._id ? 'loading' : ''}`} onClick={() => handleDeleteDeposit(deposit._id)} disabled={deletingDepositId === deposit._id}>
                                  {deletingDepositId !== deposit._id && <FaTrash />}
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <table className="table w-full table-fixed">
                    <colgroup>
                      <col className="w-1/3" />
                      <col className="w-1/3" />
                      <col className="w-1/3" />
                      {isManager && <col className="w-20" />}
                    </colgroup>
                    <tfoot>
                      <tr className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold">
                        <td colSpan={2}>Total Deposits</td>
                        <td className="text-right text-lg">৳{finance.deposits.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}</td>
                        {isManager && <td></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="md:hidden space-y-3 max-h-96 overflow-y-auto pr-1">
                  {getDepositHistory().map((deposit) => (
                    <div key={deposit._id} className="card bg-base-200 shadow-md">
                      <div className="card-body p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-base-content">{deposit.memberName}{deposit.userId === userData?.uid && <span className="badge badge-sm badge-primary ml-2">You</span>}</p>
                            <span className="badge badge-sm badge-success text-white mt-1">{format(new Date(deposit.date), 'dd MMM yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-green-600">৳{deposit.amount.toFixed(2)}</span>
                            {isManager && (
                              <button className={`btn btn-xs btn-error btn-outline ${deletingDepositId === deposit._id ? 'loading' : ''}`} onClick={() => handleDeleteDeposit(deposit._id)} disabled={deletingDepositId === deposit._id}>
                                {deletingDepositId !== deposit._id && <FaTrash />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="md:hidden card bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg mt-2">
                  <div className="card-body p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">Total Deposits</span>
                      <span className="text-2xl font-bold">{'৳'}{finance.deposits.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </>
            )
          )}

          {/* Bazar Tab Content */}
          {historyTab === 'bazar' && (
            !finance?.bazarCosts?.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-base-content/40">
                <FaClipboardList className="text-5xl mb-3" />
                <p className="text-lg font-semibold">No bazar entries yet</p>
                <p className="text-sm">Bazar costs added this month will appear here.</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block rounded-lg overflow-hidden">
                  <table className="table table-zebra w-full table-fixed">
                    <colgroup>
                      <col className="w-36" />
                      <col className="w-40" />
                      <col />
                      {isManager && <col className="w-20" />}
                    </colgroup>
                    <thead>
                      <tr className="bg-gradient-to-r from-primary to-blue-600 text-white">
                        <th className="font-bold">Date</th>
                        <th className="font-bold text-right pr-8">Amount</th>
                        <th className="font-bold">Description</th>
                        {isManager && <th className="font-bold text-center">Action</th>}
                      </tr>
                    </thead>
                  </table>
                  <div className="max-h-72 overflow-y-auto">
                    <table className="table table-zebra w-full table-fixed">
                      <colgroup>
                        <col className="w-36" />
                        <col className="w-40" />
                        <col />
                        {isManager && <col className="w-20" />}
                      </colgroup>
                      <tbody>
                        {[...finance.bazarCosts].sort((a, b) => new Date(b.date) - new Date(a.date)).map((bazar, index) => (
                          <tr key={index} className="hover:bg-primary/5 transition-colors">
                            <td><span className="badge badge-primary badge-outline">{format(new Date(bazar.date), 'dd MMM yyyy')}</span></td>
                            <td className="text-right font-bold text-primary pr-8">৳{bazar.amount.toFixed(2)}</td>
                            <td className="text-base-content/70 truncate">{bazar.description || '-'}</td>
                            {isManager && (
                              <td className="text-center">
                                <button className={`btn btn-xs btn-error btn-outline ${deletingBazarId === bazar._id ? 'loading' : ''}`} onClick={() => handleDeleteBazar(bazar._id)} disabled={deletingBazarId === bazar._id} title="Delete">
                                  {deletingBazarId !== bazar._id && <FaTrash />}
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <table className="table w-full table-fixed">
                    <colgroup>
                      <col className="w-36" />
                      <col className="w-40" />
                      <col />
                      {isManager && <col className="w-20" />}
                    </colgroup>
                    <tfoot>
                      <tr className="bg-gradient-to-r from-primary to-blue-600 text-white font-bold">
                        <td>Total</td>
                        <td className="text-right text-lg pr-8">৳{finance.bazarCosts.reduce((sum, b) => sum + b.amount, 0).toFixed(2)}</td>
                        <td></td>
                        {isManager && <td></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="md:hidden space-y-3 max-h-96 overflow-y-auto pr-1">
                  {[...finance.bazarCosts].sort((a, b) => new Date(b.date) - new Date(a.date)).map((bazar, index) => (
                    <div key={index} className="card bg-base-200 shadow-md">
                      <div className="card-body p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="badge badge-primary">{format(new Date(bazar.date), 'dd MMM yyyy')}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-primary">৳{bazar.amount.toFixed(2)}</span>
                            {isManager && (
                              <button className={`btn btn-xs btn-error btn-outline ${deletingBazarId === bazar._id ? 'loading' : ''}`} onClick={() => handleDeleteBazar(bazar._id)} disabled={deletingBazarId === bazar._id}>
                                {deletingBazarId !== bazar._id && <FaTrash />}
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-base-content/70">{bazar.description || 'No description'}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="md:hidden card bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg mt-2">
                  <div className="card-body p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">Total Bazar</span>
                      <span className="text-2xl font-bold">{'৳'}{finance.bazarCosts.reduce((sum, b) => sum + b.amount, 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </>
            )
          )}
        </div>
      </div>



      {/* 4. Financial Analytics — last */}
      {summary && (        <div className="space-y-6">
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