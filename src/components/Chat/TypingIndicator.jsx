import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';

const TYPING_WINDOW_MS = 5000;

const TypingIndicator = ({ groupId }) => {
  const [typingUsers, setTypingUsers] = useState([]);
  const { userData } = useAuth();
  const groupIdString = groupId ? String(groupId) : null;

  useEffect(() => {
    if (!groupIdString) return;

    let latestDocs = [];
    const typingRef = collection(db, 'groups', groupIdString, 'typing');

    const applyFilter = () => {
      const cutoff = Date.now() - TYPING_WINDOW_MS;
      const users = [];
      latestDocs.forEach((data) => {
        if (data.userId === userData?.uid) return;
        const ts = data.timestamp?.toMillis
          ? data.timestamp.toMillis()
          : data.timestamp?.seconds
            ? data.timestamp.seconds * 1000
            : 0;
        if (ts > cutoff) users.push(data.userName || 'Someone');
      });
      setTypingUsers(users);
    };

    const unsubscribe = onSnapshot(typingRef, (snapshot) => {
      latestDocs = [];
      snapshot.forEach((docSnap) => latestDocs.push(docSnap.data()));
      applyFilter();
    });

    const interval = setInterval(applyFilter, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [groupIdString, userData?.uid]);

  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0]} is typing`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0]} and ${typingUsers[1]} are typing`;
    }
    return `${typingUsers.length} people are typing`;
  };

  return (
    <div className="flex items-center gap-2 text-sm text-base-content/60 italic px-2">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
      </div>
      <span>{getTypingText()}...</span>
    </div>
  );
};

export default TypingIndicator;
