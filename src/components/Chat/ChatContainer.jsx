import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import AnnouncementCreator from './AnnouncementCreator';
import PollCreator from './PollCreator';
import { FaBullhorn, FaPoll } from 'react-icons/fa';
import { objectIdToString, getDisplayName } from '../../lib/utils';

const ChatContainer = ({ groupId, isManager, isMobile = false }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [replyingTo, setReplyingTo] = useState(null); // Reply state
  const { userData } = useAuth();

  // Convert groupId to string properly (handle MongoDB ObjectId)
  const groupIdString = objectIdToString(groupId);

  // Check if user has access to this group (convert user's groupId properly too)
  const userGroupIdString = objectIdToString(userData?.groupId);
  const hasGroupAccess = userData?.groupId && userGroupIdString === groupIdString;

  // Track online count
  useEffect(() => {
    if (!groupIdString || !hasGroupAccess) return;

    const typingRef = collection(db, 'groups', groupIdString, 'typing');
    const q = query(typingRef, where('timestamp', '>', new Date(Date.now() - 60000)));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOnlineCount(snapshot.size);
    }, (error) => {
      console.error('Typing listener error:', error);
    });

    return () => unsubscribe();
  }, [groupIdString, hasGroupAccess]);

  useEffect(() => {
    if (!groupIdString || !hasGroupAccess) {
      setLoading(false);
      return;
    }

    // Real-time listener for messages
    const messagesRef = collection(db, 'groups', groupIdString, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs.reverse()); // Reverse to show oldest first
      setLoading(false);
    }, (error) => {
      console.error('Messages listener error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [groupIdString, hasGroupAccess]);

  const handleSendMessage = async (content) => {
    if (!content.trim() || !userData || !groupIdString || !hasGroupAccess) return;

    const senderName = getDisplayName(userData);

    try {
      const messagesRef = collection(db, 'groups', groupIdString, 'messages');
      const messageData = {
        type: 'message',
        senderId: userData.uid,
        senderName: senderName,
        senderPhoto: userData.photoURL || null,
        content: content.trim(),
        timestamp: serverTimestamp(),
        readBy: [userData.uid],
        reactions: {}
      };

      // Add reply data if replying
      if (replyingTo) {
        messageData.replyTo = {
          messageId: replyingTo.id,
          senderId: replyingTo.senderId,
          senderName: replyingTo.senderName,
          content: replyingTo.content
        };
      }

      await addDoc(messagesRef, messageData);
      setReplyingTo(null); // Clear reply after sending
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!hasGroupAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold text-base-content mb-2">Access Denied</h3>
          <p className="text-base-content/60">You don't have access to this group's chat.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'h-full' : 'card bg-base-100 shadow-xl border-t-4 border-t-purple-500'}`}>
      <div className={`${isMobile ? 'h-full' : 'card-body p-0 h-[calc(100vh-88px)]'} flex flex-col`}>
        {/* Header */}
        {!isMobile && <ChatHeader onlineCount={onlineCount} />}

        {/* Manager Actions */}
        {isManager && hasGroupAccess && (
          <div className="px-4 py-3 bg-gradient-to-r from-base-200/80 to-base-100 border-b border-base-300 flex flex-wrap gap-2 shadow-sm">
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="btn btn-sm bg-gradient-to-r from-warning to-orange-500 border-none text-white shadow-md hover:shadow-warning/50 hover:scale-105 transition-all gap-2 flex-1 sm:flex-none"
            >
              <FaBullhorn />
              <span className="hidden sm:inline">Announcement</span>
            </button>
            <button
              onClick={() => setShowPollModal(true)}
              className="btn btn-sm bg-gradient-to-r from-info to-blue-600 border-none text-white shadow-md hover:shadow-info/50 hover:scale-105 transition-all gap-2 flex-1 sm:flex-none"
            >
              <FaPoll />
              <span className="hidden sm:inline">Create Poll</span>
            </button>
          </div>
        )}

        {/* Messages */}
        <MessageList 
          messages={messages} 
          groupId={groupIdString} 
          isManager={isManager}
          onReply={setReplyingTo}
        />

        {/* Input */}
        <MessageInput 
          onSend={handleSendMessage} 
          groupId={groupIdString}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>

      {/* Modals */}
      {showAnnouncementModal && (
        <AnnouncementCreator
          groupId={groupIdString}
          onClose={() => setShowAnnouncementModal(false)}
        />
      )}
      {showPollModal && (
        <PollCreator
          groupId={groupIdString}
          onClose={() => setShowPollModal(false)}
        />
      )}
    </div>
  );
};

export default ChatContainer;
