import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import LottieLoader from './LottieLoader';

const ProtectedRoute = ({ children, requireGroup = false }) => {
  const { currentUser, userData, loading, userDataLoading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <LottieLoader size={270} text="Loading..." />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requireGroup && userDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <LottieLoader size={270} text="Loading your group info..." />
      </div>
    );
  }

  if (requireGroup && userData && !userData.groupId) {
    return <Navigate to="/group-setup" replace />;
  }

  return children;
};

export default ProtectedRoute;
