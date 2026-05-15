import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { FaComments, FaTimes } from 'react-icons/fa';

const FloatingChatButton = ({ onClick, groupId }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const { userData } = useAuth();

  // Ensure groupId is a string
  const groupIdString = groupId ? String(groupId) : null;

  useEffect(() => {
    if (!groupIdString || !userData) return;

    // Listen for new messages
    const messagesRef = collection(db, 'groups', groupIdString, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let unread = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Count messages not read by current user
        if (!data.readBy?.includes(userData.uid)) {
          unread++;
        }
      });
      
      setUnreadCount(unread);
      
      // Trigger pulse animation for new messages
      if (unread > 0) {
        setHasNewMessage(true);
        setTimeout(() => setHasNewMessage(false), 3000);
      }
    });

    return () => unsubscribe();
  }, [groupIdString, userData]);

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-24 right-4 z-50 btn btn-circle btn-lg bg-gradient-to-br from-purple-500 to-purple-700 border-none text-white shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 ${
        hasNewMessage ? 'animate-pulse' : ''
      }`}
      aria-label="Open chat"
    >
      <div className="relative">
        <FaComments className="text-2xl" />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-error text-error-content text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
    </button>
  );
};

export default FloatingChatButton;
