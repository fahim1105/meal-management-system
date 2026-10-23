import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import MessageItem from './MessageItem';
import AnnouncementItem from './AnnouncementItem';
import PollItem from './PollItem';
import TypingIndicator from './TypingIndicator';

const MessageList = ({ messages, groupId, isManager, onReply, groupMembers = [] }) => {
  const messagesEndRef = useRef(null);
  const listRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  const { userData } = useAuth();
  const [activeReactionMessageId, setActiveReactionMessageId] = useState(null);

  const isNearBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  };

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Pinned announcements first, then chronological order
  const displayMessages = (() => {
    const pinned = [];
    const rest = [];
    messages.forEach((m) => {
      if (m.type === 'announcement' && m.isPinned) pinned.push(m);
      else rest.push(m);
    });
    return [...pinned, ...rest];
  })();

  useEffect(() => {
    const last = messages[messages.length - 1];
    const lastId = last?.id ?? null;
    const prevId = lastMessageIdRef.current;
    const isInitial = prevId === null && lastId !== null;
    const isNewMessage = lastId !== null && lastId !== prevId;

    lastMessageIdRef.current = lastId;

    if (isInitial) {
      scrollToBottom('auto');
      return;
    }

    // Only auto-scroll when a new message arrives and user is near bottom
    // (or the new message is from current user)
    if (isNewMessage && (isNearBottom() || last?.senderId === userData?.uid)) {
      scrollToBottom('smooth');
    }
  }, [messages, userData?.uid]);

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-base-50 to-base-100"
      style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
    >
      {displayMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-base-content/50">
          <div className="bg-base-200/50 p-8 rounded-3xl shadow-inner">
            <p className="text-lg font-semibold mb-2">No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        </div>
      ) : (
        displayMessages.map((message) => {
          if (message.type === 'announcement') {
            return (
              <AnnouncementItem
                key={message.id}
                message={message}
                groupId={groupId}
                isManager={isManager}
              />
            );
          }
          if (message.type === 'poll') {
            return (
              <PollItem
                key={message.id}
                message={message}
                groupId={groupId}
                isManager={isManager}
              />
            );
          }
          return (
            <MessageItem
              key={message.id}
              message={message}
              isOwn={message.senderId === userData?.uid}
              groupId={groupId}
              onReply={onReply}
              activeReactionMessageId={activeReactionMessageId}
              setActiveReactionMessageId={setActiveReactionMessageId}
              allMessages={messages}
              groupMembers={groupMembers}
            />
          );
        })
      )}
      <TypingIndicator groupId={groupId} />
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
