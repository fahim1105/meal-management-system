import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import MealSheet from '../components/MealSheet';
import LottieLoader from '../components/LottieLoader';
import { queryKeys, fetchGroup } from '../lib/queries';

const Meals = () => {
  const { userData, getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const currentMonth = format(new Date(), 'yyyy-MM');

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: queryKeys.group(),
    queryFn: () => fetchGroup(getAuthHeaders),
    enabled: !!userData?.groupId,
    refetchInterval: 1000 * 15,
  });

  const handleUpdate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.group() });
    queryClient.invalidateQueries({ queryKey: queryKeys.meal(currentMonth) });
    queryClient.invalidateQueries({ queryKey: queryKeys.mealConfig(currentMonth) });
  };

  const isManager = group?.managerId === userData?.uid;

  if (groupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <LottieLoader size={270} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <MealSheet group={group} isManager={isManager} onUpdate={handleUpdate} />
    </div>
  );
};

export default Meals;
