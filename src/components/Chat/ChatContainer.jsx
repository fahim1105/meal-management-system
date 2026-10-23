import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  writeBatch,
  arrayUnion,
} from 'firebase/firestore';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import AnnouncementCreator from './AnnouncementCreator';
import PollCreator from './PollCreator';
import { FaBullhorn, FaPoll } from 'react-icons/fa';
import { objectIdToString, getDisplayName } from '../../lib/utils';

const ChatContainer = ({ groupId, isManager, isMobile = false, groupMembers = [] }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const { userData } = useAuth();
  const markingReadRef = useRef(false);

  const groupIdString = objectIdToString(groupId);
  const userGroupIdString = objectIdToString(userData?.groupId);
  const hasGroupAccess = userData?.groupId && userGroupIdString === groupIdString;

  useEffect(() => {
    if (!groupIdString || !hasGroupAccess) {
      setLoading(false);
      return;
    }

    const messagesRef = collection(db, 'groups', groupIdString, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = [];
        snapshot.forEach((docSnap) => {
          msgs.push({ id: docSnap.id, ...docSnap.data() });
        });
        setMessages(msgs.reverse());
        setLoading(false);
      },
      (error) => {
        console.error('Messages listener error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [groupIdString, hasGroupAccess]);

  // Mark unread messages as read while chat is open
  useEffect(() => {
    if (!hasGroupAccess || !userData?.uid || !groupIdString || messages.length === 0) return;
    if (markingReadRef.current) return;

    const unread = messages.filter((m) => !m.readBy?.includes(userData.uid));
    if (unread.length === 0) return;

    let cancelled = false;
    const markRead = async () => {
      markingReadRef.current = true;
      try {
        // Firestore batch max 500
        const chunk = unread.slice(0, 400);
        const batch = writeBatch(db);
        chunk.forEach((m) => {
          batch.update(doc(db, 'groups', groupIdString, 'messages', m.id), {
            readBy: arrayUnion(userData.uid),
          });
        });
        if (!cancelled) await batch.commit();
      } catch (err) {
        console.error('Error marking messages read:', err);
      } finally {
        markingReadRef.current = false;
      }
    };

    // Small delay so opening chat feels snappy; still clears badge quickly
    const t = setTimeout(markRead, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [messages, userData?.uid, groupIdString, hasGroupAccess]);

  const handleSendMessage = async (content) => {
    if (!content.trim() || !userData || !groupIdString || !hasGroupAccess) return false;

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
        reactions: {},
      };

      if (replyingTo) {
        messageData.replyTo = {
          messageId: replyingTo.id,
          senderId: replyingTo.senderId,
          senderName: replyingTo.senderName,
          content: replyingTo.content,
        };
      }

      await addDoc(messagesRef, messageData);
      setReplyingTo(null);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
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
        {!isMobile && <ChatHeader />}

        {isManager && hasGroupAccess && (
          <div className="px-4 py-3 bg-gradient-to-r from-base-200/80 to-base-100 border-b border-base-300 flex flex-wrap gap-2 shadow-sm">
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="btn btn-sm bg-warning border-none text-white shadow-md hover:bg-warning/90 hover:scale-105 transition-all gap-2 flex-1 sm:flex-none"
            >
              <FaBullhorn />
              <span className="hidden sm:inline">Announcement</span>
            </button>
            <button
              onClick={() => setShowPollModal(true)}
              className="btn btn-sm bg-info border-none text-white shadow-md hover:bg-info/90 hover:scale-105 transition-all gap-2 flex-1 sm:flex-none"
            >
              <FaPoll />
              <span className="hidden sm:inline">Create Poll</span>
            </button>
          </div>
        )}

        <MessageList
          messages={messages}
          groupId={groupIdString}
          isManager={isManager}
          onReply={setReplyingTo}
          groupMembers={groupMembers}
        />

        <MessageInput
          onSend={handleSendMessage}
          groupId={groupIdString}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>

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
