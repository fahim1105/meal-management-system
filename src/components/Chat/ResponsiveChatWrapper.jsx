import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import FloatingChatButton from './FloatingChatButton';
import ChatModal from './ChatModal';
import ChatSidebar from './ChatSidebar';
import { objectIdToString } from '../../lib/utils';

const ResponsiveChatWrapper = ({ groupId, isManager }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const { userData } = useAuth();

  // Convert groupId to string properly (handle MongoDB ObjectId)
  const groupIdString = objectIdToString(groupId);

  // Check if user is logged in and has a group
  const userGroupIdString = objectIdToString(userData?.groupId);
  const canShowChat = userData && groupIdString && userGroupIdString === groupIdString;

  // Track online count
  useEffect(() => {
    if (!groupIdString) return;

    const typingRef = collection(db, 'groups', groupIdString, 'typing');
    const q = query(typingRef, where('timestamp', '>', new Date(Date.now() - 60000)));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOnlineCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [groupIdString]);

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
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
          {/* Mobile: Floating Button + Modal */}
          <FloatingChatButton
            onClick={() => setIsModalOpen(true)}
            groupId={groupIdString}
          />
          <ChatModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            groupId={groupIdString}
            isManager={isManager}
            onlineCount={onlineCount}
          />
        </>
      ) : (
        <>
          {/* Desktop: Right Sidebar */}
          <ChatSidebar groupId={groupIdString} isManager={isManager} />
        </>
      )}
    </>
  );
};

export default ResponsiveChatWrapper;
