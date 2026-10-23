import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import BazarSchedule from '../components/BazarSchedule';
import LottieLoader from '../components/LottieLoader';
import { queryKeys, fetchGroup } from '../lib/queries';

const Bazar = () => {
  const { userData, getAuthHeaders } = useAuth();

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: queryKeys.group(),
    queryFn: () => fetchGroup(getAuthHeaders),
    enabled: !!userData?.groupId,
    refetchInterval: 1000 * 15,
  });

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
      <BazarSchedule group={group} isManager={isManager} />
    </div>
  );
};

export default Bazar;
