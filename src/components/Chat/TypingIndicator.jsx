import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const TypingIndicator = ({ groupId }) => {
  const [typingUsers, setTypingUsers] = useState([]);
  const { userData } = useAuth();

  // Ensure groupId is a string
  const groupIdString = groupId ? String(groupId) : null;

  useEffect(() => {
    if (!groupIdString) return;

    const typingRef = collection(db, 'groups', groupIdString, 'typing');
    const q = query(typingRef, where('timestamp', '>', new Date(Date.now() - 5000))); // Last 5 seconds

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Don't show current user's typing
        if (data.userId !== userData?.uid) {
          users.push(data.userName);
        }
      });
      setTypingUsers(users);
    });

    return () => unsubscribe();
  }, [groupIdString, userData]);

  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0]} is typing`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0]} and ${typingUsers[1]} are typing`;
    } else {
      return `${typingUsers.length} people are typing`;
    }
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
