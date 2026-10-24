import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { queryKeys, fetchGroup } from '../../lib/queries';
import DesktopNav from './DesktopNav';
import MobileDock from './MobileDock';
import MobileHeader from './MobileHeader';
import RightDrawer from './RightDrawer';
import { useState, useEffect } from 'react';
import { Outlet } from 'react-router';
import LottieLoader from '../LottieLoader';
import ChatModal from '../Chat/ChatModal';

const AppShell = () => {
  const { currentUser, userData, userDataLoading, loading: authLoading, getAuthHeaders } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);

  // Listen for drawer open event from HomeDashboard
  useEffect(() => {
    const handleOpenDrawer = () => setDrawerOpen(true);
    window.addEventListener('openDrawer', handleOpenDrawer);
    return () => window.removeEventListener('openDrawer', handleOpenDrawer);
  }, []);

  // Fetch group data when user has a group
  const { data: group } = useQuery({
    queryKey: queryKeys.group(),
    queryFn: () => fetchGroup(getAuthHeaders),
    enabled: !!userData?.groupId && !!currentUser,
    refetchInterval: 15000,
  });

  // Logged-out users should not wait on profile fetch
  const isLoading = authLoading || (!!currentUser && userDataLoading);
  const isLoggedIn = !!currentUser;
  const hasGroup = !!userData?.groupId;
  const isManager = group?.managerId === userData?.uid;

  // Shell states:
  // A: Logged out (!isLoggedIn)
  // B: Logged in, no group (isLoggedIn && !hasGroup)
  // C: Logged in + in group (isLoggedIn && hasGroup)

  // Show lightweight skeleton while loading to prevent flash
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <LottieLoader size={200} text="Loading..." />
      </div>
    );
  }

  const shellState = !isLoggedIn ? 'A' : !hasGroup ? 'B' : 'C';

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      {/* Desktop Nav (>= 821px) */}
      <DesktopNav 
        state={shellState}
        userData={userData}
        group={group}
        isManager={isManager}
        onOpenDrawer={() => setDrawerOpen(true)}
      />

      {/* Mobile Header (< 821px, states B and C) */}
      {shellState !== 'A' && (
        <MobileHeader
          state={shellState}
          userData={userData}
          group={group}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
      )}

      {/* Main content */}
      <main className={shellState !== 'A' ? 'pb-[calc(70px+24px+env(safe-area-inset-bottom))] lg:pb-0' : ''}>
        <Outlet />
      </main>

      {/* Mobile Dock (< 821px) */}
      <MobileDock 
        state={shellState} 
        userData={userData}
        onChatClick={() => setChatModalOpen(true)}
        hasUnreadMessages={false} // TODO: Implement unread tracking
      />

      {/* Mobile Chat Modal (state C only) */}
      {shellState === 'C' && (
        <ChatModal
          isOpen={chatModalOpen}
          onClose={() => setChatModalOpen(false)}
          groupId={group?._id}
          isManager={isManager}
          groupMembers={group?.members || []}
        />
      )}

      {/* Right Drawer (state C only) */}
      {shellState === 'C' && (
        <RightDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          userData={userData}
          group={group}
          isManager={isManager}
        />
      )}
    </div>
  );
};

export default AppShell;
