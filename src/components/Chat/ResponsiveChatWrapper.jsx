import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import FloatingChatButton from './FloatingChatButton';
import ChatModal from './ChatModal';
import ChatSidebar from './ChatSidebar';
import { objectIdToString } from '../../lib/utils';

const ResponsiveChatWrapper = ({ groupId, isManager, groupMembers = [] }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { userData } = useAuth();

  const groupIdString = objectIdToString(groupId);
  const userGroupIdString = objectIdToString(userData?.groupId);
  const canShowChat = userData && groupIdString && userGroupIdString === groupIdString;

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (!canShowChat) return null;

  return (
    <>
      {isMobile ? (
        <>
          <FloatingChatButton
            onClick={() => setIsModalOpen(true)}
            groupId={groupIdString}
          />
          <ChatModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            groupId={groupIdString}
            isManager={isManager}
            groupMembers={groupMembers}
          />
        </>
      ) : (
        <ChatSidebar
          groupId={groupIdString}
          isManager={isManager}
          groupMembers={groupMembers}
        />
      )}
    </>
  );
};

export default ResponsiveChatWrapper;
