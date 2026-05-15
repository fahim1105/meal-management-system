import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { FaPaperPlane } from 'react-icons/fa';

const MessageInput = ({ onSend, groupId, replyingTo, onCancelReply }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { userData } = useAuth();
  const typingTimeoutRef = useRef(null);

  // Ensure groupId is a string
  const groupIdString = groupId ? String(groupId) : null;

  const updateTypingStatus = async (isTyping) => {
    if (!userData || !groupIdString) return;

    try {
      const typingRef = doc(db, 'groups', groupIdString, 'typing', userData.uid);
      
      if (isTyping) {
        await setDoc(typingRef, {
          userId: userData.uid,
          userName: userData.name || userData.displayName || userData.email,
          timestamp: serverTimestamp()
        });
      } else {
        await deleteDoc(typingRef);
      }
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing status
    if (e.target.value.trim()) {
      updateTypingStatus(true);

      // Remove typing status after 3 seconds of no typing
      typingTimeoutRef.current = setTimeout(() => {
        updateTypingStatus(false);
      }, 3000);
    } else {
      updateTypingStatus(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    await updateTypingStatus(false);
    await onSend(message);
    setMessage('');
    setSending(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Cleanup typing status on unmount
  useEffect(() => {
    return () => {
      updateTypingStatus(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="bg-gradient-to-r from-base-200 to-base-100 border-t border-base-300 shadow-inner">
      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 pt-3 pb-2 border-b border-base-300 bg-base-200/50">
          <div className="flex items-start gap-2 bg-base-100 rounded-lg p-3 border-l-4 border-primary">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary mb-1">
                Replying to {replyingTo.senderName}
              </p>
              <p className="text-sm text-base-content/70 truncate">
                {replyingTo.content}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="btn btn-xs btn-circle btn-ghost"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      <div className="p-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="textarea textarea-bordered w-full resize-none focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-base-100 rounded-2xl shadow-sm transition-all duration-200 pr-12 text-base"
              rows="1"
              disabled={sending}
              style={{
                minHeight: '48px',
                maxHeight: '120px',
                fontSize: '16px', // Prevent iOS zoom
                overflowY: message.split('\n').length > 2 ? 'auto' : 'hidden'
              }}
            />
            {/* Character count (optional) */}
            {message.length > 0 && (
              <span className="absolute bottom-2 right-3 text-xs text-base-content/40">
                {message.length}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={!message.trim() || sending}
            className="btn btn-circle btn-lg bg-gradient-to-br from-purple-500 to-purple-700 border-none text-white shadow-lg hover:shadow-purple-500/50 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <FaPaperPlane className="text-lg" />
            )}
          </button>
        </div>
        {/* Hint text */}
        <p className="text-xs text-base-content/50 mt-2 ml-1">
          Press <kbd className="kbd kbd-xs">Shift</kbd> + <kbd className="kbd kbd-xs">Enter</kbd> for new line
        </p>
      </div>
    </form>
  );
};

export default MessageInput;
