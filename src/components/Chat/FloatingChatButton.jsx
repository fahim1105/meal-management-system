import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { FaComments } from 'react-icons/fa';
import { objectIdToString } from '../../lib/utils';

const FloatingChatButton = ({ onClick, groupId }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const { userData } = useAuth();
  const pulseTimerRef = useRef(null);

  const groupIdString = objectIdToString(groupId);

  useEffect(() => {
    if (!groupIdString || !userData) return;

    const messagesRef = collection(db, 'groups', groupIdString, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let unread = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.senderId === userData.uid) return;
        if (!data.readBy?.includes(userData.uid)) {
          unread++;
        }
      });

      setUnreadCount(unread);

      if (unread > 0) {
        setHasNewMessage(true);
        if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = setTimeout(() => setHasNewMessage(false), 3000);
      }
    });

    return () => {
      unsubscribe();
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
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
