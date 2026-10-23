import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import axios from 'axios';
import burgerToast from '../components/BurgerToast';
import LottieLoader from '../components/LottieLoader';
import { queryKeys, fetchGroup } from '../lib/queries';
import { FaMoneyBillWave, FaShoppingCart } from 'react-icons/fa';
import PageTitle from '../components/Admin/PageTitle';

const AdminCosts = () => {
  const [depositUserId, setDepositUserId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [bazarAmount, setBazarAmount] = useState('');
  const [bazarDescription, setBazarDescription] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [bazarLoading, setBazarLoading] = useState(false);

  const { userData, getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const currentMonth = format(new Date(), 'yyyy-MM');

  const API_URL = import.meta.env.VITE_API_URL;

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: queryKeys.group(),
    queryFn: () => fetchGroup(getAuthHeaders),
    enabled: !!userData?.groupId,
    refetchInterval: 1000 * 15,
  });

  const invalidateFinance = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.finance(currentMonth) });
    queryClient.invalidateQueries({ queryKey: queryKeys.summary(currentMonth) });
  };

  const handleAddDeposit = async (e) => {
    e.preventDefault();
    setDepositLoading(true);
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_URL}/finance/deposit`, { 
        month: currentMonth, 
        userId: depositUserId, 
        amount: parseFloat(depositAmount) 
      }, { headers });
      burgerToast.success('Deposit added successfully');
      setDepositUserId('');
      setDepositAmount('');
      invalidateFinance();
    } catch { 
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
      await axios.post(`${API_URL}/finance/bazar`, { 
        month: currentMonth, 
        amount: parseFloat(bazarAmount), 
        description: bazarDescription 
      }, { headers });
      burgerToast.success('Bazar cost added successfully');
      setBazarAmount('');
      setBazarDescription('');
      invalidateFinance();
    } catch { 
      burgerToast.error('Failed to add bazar cost'); 
    } finally { 
      setBazarLoading(false); 
    }
  };

  if (groupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <LottieLoader size={270} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3.5 lg:px-5 py-[14px] lg:py-[22px] max-w-[1040px]" style={{ paddingBottom: 'calc(88px + 24px + env(safe-area-inset-bottom, 0px))' }}>
      <PageTitle 
        icon={FaMoneyBillWave}
        title="Manage Costs"
      />

      {/* Two Cards Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        
        {/* Add Deposit Card */}
        <div className="bg-base-200 border border-base-content/15 rounded-[18px] p-[22px]">
          <div className="grid gap-[16px]">
            {/* Card Header */}
            <div className="flex items-center gap-3">
              <div 
                className="w-[44px] h-[44px] rounded-[13px] flex items-center justify-center shrink-0"
                style={{ background: 'var(--ad-tile)' }}
              >
                <FaMoneyBillWave className="text-[20px] text-base-content" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[19px] font-[700] text-base-content">Add Deposit</h3>
                <p className="text-[13.5px] text-base-content/70">Record member deposits</p>
              </div>
            </div>

            <form onSubmit={handleAddDeposit} className="grid gap-[16px]">
              {/* Select Member */}
              <div>
                <label htmlFor="deposit-member" className="block text-[14.5px] font-[600] text-base-content mb-2">
                  Select Member
                </label>
                <div className="relative">
                  <select 
                    id="deposit-member"
                    className="w-full px-[14px] py-[12px] pr-[38px] rounded-xl border-[1.5px] appearance-none focus:outline-none focus:ring-3"
                    style={{ 
                      borderColor: 'var(--ad-line)',
                      background: 'var(--ad-field)',
                      '--tw-ring-color': 'color-mix(in oklab, var(--color-neutral) 28%, transparent)'
                    }}
                    value={depositUserId} 
                    onChange={(e) => setDepositUserId(e.target.value)} 
                    required
                  >
                    <option value="">Choose a member...</option>
                    {group?.members.filter(m => m.status === 'active').map(member => (
                      <option key={member.userId} value={member.userId}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                  <svg 
                    className="absolute right-[14px] top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-base-content/70"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label htmlFor="deposit-amount" className="block text-[14.5px] font-[600] text-base-content mb-2">
                  Amount (৳)
                </label>
                <div className="relative">
                  <span 
                    className="absolute left-[14px] top-1/2 -translate-y-1/2 text-base-content/70 pointer-events-none"
                    aria-hidden="true"
                  >
                    ৳
                  </span>
                  <input 
                    id="deposit-amount"
                    type="number" 
                    min="0.01" 
                    step="0.01" 
                    placeholder="Enter amount..." 
                    className="w-full pl-[34px] pr-[14px] py-[12px] rounded-xl border-[1.5px] focus:outline-none focus:ring-3"
                    style={{ 
                      borderColor: 'var(--ad-line)',
                      background: 'var(--ad-field)',
                      '--tw-ring-color': 'color-mix(in oklab, var(--color-neutral) 28%, transparent)'
                    }}
                    value={depositAmount} 
                    onChange={(e) => setDepositAmount(e.target.value)} 
                    required 
                    inputMode="decimal"
                  />
                </div>
              </div>

              {/* Button */}
              <button 
                type="submit" 
                disabled={depositLoading}
                className="w-full px-5 py-3 rounded-xl text-[15px] font-[700] transition-all disabled:cursor-not-allowed hover:brightness-110"
                style={{
                  background: depositLoading ? 'var(--ad-tile)' : 'var(--color-neutral)',
                  color: depositLoading ? 'var(--color-base-content)' : 'var(--ad-on-strong)',
                  border: depositLoading ? '1.5px solid var(--ad-line)' : 'none'
                }}
              >
                {depositLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="loading loading-spinner loading-sm" />
                    <span>Adding...</span>
                  </span>
                ) : (
                  'Add Deposit'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Add Bazar Cost Card */}
        <div className="bg-base-200 border border-base-content/15 rounded-[18px] p-[22px]">
          <div className="grid gap-[16px]">
            {/* Card Header */}
            <div className="flex items-center gap-3">
              <div 
                className="w-[44px] h-[44px] rounded-[13px] flex items-center justify-center shrink-0"
                style={{ background: 'var(--ad-tile)' }}
              >
                <FaShoppingCart className="text-[20px] text-base-content" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[19px] font-[700] text-base-content">Add Bazar Cost</h3>
                <p className="text-[13.5px] text-base-content/70">Record shopping expenses</p>
              </div>
            </div>

            <form onSubmit={handleAddBazar} className="grid gap-[16px]">
              {/* Amount */}
              <div>
                <label htmlFor="bazar-amount" className="block text-[14.5px] font-[600] text-base-content mb-2">
                  Amount (৳)
                </label>
                <div className="relative">
                  <span 
                    className="absolute left-[14px] top-1/2 -translate-y-1/2 text-base-content/70 pointer-events-none"
                    aria-hidden="true"
                  >
                    ৳
                  </span>
                  <input 
                    id="bazar-amount"
                    type="number" 
                    min="0.01" 
                    step="0.01" 
                    placeholder="Enter amount..." 
                    className="w-full pl-[34px] pr-[14px] py-[12px] rounded-xl border-[1.5px] focus:outline-none focus:ring-3"
                    style={{ 
                      borderColor: 'var(--ad-line)',
                      background: 'var(--ad-field)',
                      '--tw-ring-color': 'color-mix(in oklab, var(--color-neutral) 28%, transparent)'
                    }}
                    value={bazarAmount} 
                    onChange={(e) => setBazarAmount(e.target.value)} 
                    required 
                    inputMode="decimal"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="bazar-description" className="block text-[14.5px] font-[600] text-base-content mb-2">
                  Description
                </label>
                <input 
                  id="bazar-description"
                  type="text" 
                  placeholder="e.g., Rice, vegetables, fish..." 
                  className="w-full px-[14px] py-[12px] rounded-xl border-[1.5px] focus:outline-none focus:ring-3"
                  style={{ 
                    borderColor: 'var(--ad-line)',
                    background: 'var(--ad-field)',
                    '--tw-ring-color': 'color-mix(in oklab, var(--color-neutral) 28%, transparent)'
                  }}
                  value={bazarDescription} 
                  onChange={(e) => setBazarDescription(e.target.value)} 
                />
              </div>

              {/* Button */}
              <button 
                type="submit" 
                disabled={bazarLoading}
                className="w-full px-5 py-3 rounded-xl text-[15px] font-[700] transition-all disabled:cursor-not-allowed hover:brightness-110"
                style={{
                  background: bazarLoading ? 'var(--ad-tile)' : 'var(--color-neutral)',
                  color: bazarLoading ? 'var(--color-base-content)' : 'var(--ad-on-strong)',
                  border: bazarLoading ? '1.5px solid var(--ad-line)' : 'none'
                }}
              >
                {bazarLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="loading loading-spinner loading-sm" />
                    <span>Adding...</span>
                  </span>
                ) : (
                  'Add Bazar Cost'
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminCosts;
