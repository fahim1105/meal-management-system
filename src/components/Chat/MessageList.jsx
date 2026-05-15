import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import MessageItem from './MessageItem';
import AnnouncementItem from './AnnouncementItem';
import PollItem from './PollItem';
import TypingIndicator from './TypingIndicator';

const MessageList = ({ messages, groupId, isManager, onReply }) => {
  const messagesEndRef = useRef(null);
  const { userData } = useAuth();
  const [activeReactionMessageId, setActiveReactionMessageId] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-base-50 to-base-100">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-base-content/50">
          <div className="bg-base-200/50 p-8 rounded-3xl shadow-inner">
            <p className="text-lg font-semibold mb-2">No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        </div>
      ) : (
        messages.map((message) => {
          if (message.type === 'announcement') {
            return (
              <AnnouncementItem 
                key={message.id} 
                message={message} 
                groupId={groupId}
                isManager={isManager}
              />
            );
          } else if (message.type === 'poll') {
            return (
              <PollItem 
                key={message.id} 
                message={message} 
                groupId={groupId}
                isManager={isManager}
              />
            );
          } else {
            return (
              <MessageItem
                key={message.id}
                message={message}
                isOwn={message.senderId === userData?.uid}
                groupId={groupId}
                onReply={onReply}
                activeReactionMessageId={activeReactionMessageId}
                setActiveReactionMessageId={setActiveReactionMessageId}
                allMessages={messages} // Pass all messages for name lookup
              />
            );
          }
        })
      )}
      <TypingIndicator groupId={groupId} />
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
