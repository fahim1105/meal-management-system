import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, runTransaction } from 'firebase/firestore';
import { FaReply, FaSmile } from 'react-icons/fa';
import ReactionTooltip from './ReactionTooltip';
import { formatMessageTime } from './formatMessageTime';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];
const PICKER_WIDTH = 240;

const MessageItem = ({ message, isOwn, groupId, onReply, activeReactionMessageId, setActiveReactionMessageId, allMessages = [], groupMembers = [] }) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showReactionTooltip, setShowReactionTooltip] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ top: 0, left: 0 });
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [reactionPosition, setReactionPosition] = useState('below');
  const [pickerCoords, setPickerCoords] = useState({ top: 0, left: 0 });
  const [userNames, setUserNames] = useState({});
  const { userData } = useAuth();
  const reactionPickerRef = useRef(null);
  const contextMenuRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchStartTime = useRef(0);
  const longPressTimer = useRef(null);
  const isSwipingRef = useRef(false);
  const swipeOffsetRef = useRef(0);
  const messageRef = useRef(null);
  const bubbleRef = useRef(null);

  const closeReactions = () => {
    setShowReactions(false);
    if (activeReactionMessageId === message.id) {
      setActiveReactionMessageId(null);
    }
  };

  const openReactionPicker = () => {
    if (activeReactionMessageId && activeReactionMessageId !== message.id) {
      setActiveReactionMessageId(null);
    }

    if (bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const below = rect.top < viewportHeight / 2;
      setReactionPosition(below ? 'below' : 'above');

      let left = isOwn ? rect.right - PICKER_WIDTH : rect.left;
      left = Math.max(8, Math.min(left, viewportWidth - PICKER_WIDTH - 8));
      const top = below ? rect.bottom + 8 : rect.top - 48;
      setPickerCoords({ top, left });
    } else {
      setReactionPosition('below');
    }

    setActiveReactionMessageId(message.id);
    setShowReactions(true);
  };

  // Handle swipe gesture for reply (WhatsApp style)
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    isSwipingRef.current = false;
    swipeOffsetRef.current = 0;
    setIsSwiping(false);
    setSwipeOffset(0);

    longPressTimer.current = setTimeout(() => {
      if (!isSwipingRef.current && swipeOffsetRef.current === 0) {
        openReactionPicker();
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }, 500);
  };

  const handleTouchMove = (e) => {
    if (touchStartX.current == null) return;

    const touchCurrentX = e.touches[0].clientX;
    const touchCurrentY = e.touches[0].clientY;
    const diffX = touchCurrentX - touchStartX.current;
    const diffY = touchCurrentY - touchStartY.current;

    if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      isSwipingRef.current = true;
      setIsSwiping(true);
      const offset = Math.max(0, Math.min(diffX, 80));
      swipeOffsetRef.current = offset;
      setSwipeOffset(offset);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);

    if (swipeOffsetRef.current > 50) {
      handleReply();
      if (navigator.vibrate) navigator.vibrate(50);
    }

    setSwipeOffset(0);
    setIsSwiping(false);
    isSwipingRef.current = false;
    swipeOffsetRef.current = 0;
    touchStartX.current = null;
    touchStartY.current = null;
    touchStartTime.current = 0;
  };

  // Handle right click for desktop only
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only show context menu on desktop (not touch devices)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) {
      return; // Don't show context menu on mobile
    }
    
    // Calculate position based on bubble location
    if (!bubbleRef.current) return;
    
    const rect = bubbleRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const menuWidth = 200;
    const menuHeight = 60;
    
    let top, left;
    
    // Vertical positioning
    if (rect.bottom + menuHeight + 10 < viewportHeight) {
      top = rect.bottom + 8;
      setReactionPosition('below');
    } else {
      top = rect.top - menuHeight - 8;
      setReactionPosition('above');
    }
    
    // Horizontal positioning
    if (isOwn) {
      left = rect.right - menuWidth;
      if (left < 10) left = 10;
    } else {
      left = rect.left;
      if (left + menuWidth > viewportWidth - 10) {
        left = viewportWidth - menuWidth - 10;
      }
    }
    
    setContextMenuPosition({ top, left });
    setShowContextMenu(true);
  };

  const handleReply = () => {
    onReply({
      id: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      content: message.content
    });
    setShowContextMenu(false);
    setShowReactions(false);
  };

  const handleShowReactions = () => {
    openReactionPicker();
    setShowContextMenu(false);
  };

  // Close reaction picker when clicking outside or pressing ESC
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target)) {
        closeReactions();
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setShowContextMenu(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeReactions();
        setShowReactionTooltip(null);
        setShowContextMenu(false);
      }
    };

    const handleScroll = () => {
      setShowReactionTooltip(null);
      closeReactions();
      setShowContextMenu(false);
    };

    if (showReactions || showReactionTooltip || showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, [showReactions, showReactionTooltip, showContextMenu, activeReactionMessageId, message.id]);

  // Close this message's reaction modal if another message's modal is opened
  useEffect(() => {
    if (activeReactionMessageId && activeReactionMessageId !== message.id) {
      setShowReactions(false);
      setShowContextMenu(false);
    }
  }, [activeReactionMessageId, message.id]);

  const handleReaction = async (emoji) => {
    if (!userData) return;

    try {
      const messageRef = doc(db, 'groups', groupId, 'messages', message.id);

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(messageRef);
        if (!snap.exists()) return;

        const data = snap.data();
        const currentReactions = { ...(data.reactions || {}) };
        const userReactions = currentReactions[emoji] || [];
        const hasThisReaction = userReactions.includes(userData.uid);

        Object.keys(currentReactions).forEach((reactionEmoji) => {
          currentReactions[reactionEmoji] = (currentReactions[reactionEmoji] || []).filter(
            (uid) => uid !== userData.uid
          );
        });

        if (!hasThisReaction) {
          currentReactions[emoji] = [...(currentReactions[emoji] || []), userData.uid];
        }

        const updates = { reactions: currentReactions };
        const readBy = data.readBy || [];
        if (!readBy.includes(userData.uid)) {
          updates.readBy = [...readBy, userData.uid];
        }
        transaction.update(messageRef, updates);
      });

      closeReactions();
      setShowContextMenu(false);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleReactionClick = async (event, emoji) => {
    // Prevent event bubbling
    event.stopPropagation();
    
    // Show all reactions in tooltip for this specific emoji or all reactions
    const allReactions = [];
    const userIds = new Set();
    
    if (emoji) {
      // Show only this emoji's reactions
      const users = reactions[emoji] || [];
      users.forEach(userId => {
        allReactions.push({ emoji, userId });
        userIds.add(userId);
      });
    } else {
      // Show all reactions
      Object.entries(reactions).forEach(([reactionEmoji, users]) => {
        if (users && users.length > 0) {
          users.forEach(userId => {
            allReactions.push({ emoji: reactionEmoji, userId });
            userIds.add(userId);
          });
        }
      });
    }

    if (allReactions.length === 0) return;

    // Build user names — priority: groupMembers → allMessages → fallback
    const newUserNames = { ...userNames };
    
    Array.from(userIds).forEach(userId => {
      if (!newUserNames[userId] && userId !== userData?.uid) {
        // 1. Check group members first (most reliable)
        const groupMember = groupMembers.find(m => m.userId === userId);
        if (groupMember?.name) {
          newUserNames[userId] = groupMember.name;
          return;
        }

        // 2. Look in message history
        const userMessage = allMessages.find(msg => msg.senderId === userId);
        if (userMessage?.senderName) {
          newUserNames[userId] = userMessage.senderName;
          return;
        }

        // 3. Check current message sender
        if (message.senderId === userId && message.senderName) {
          newUserNames[userId] = message.senderName;
          return;
        }

        // 4. Last resort
        newUserNames[userId] = 'Unknown';
      }
    });

    // Update state with names
    setUserNames(newUserNames);
    
    // Show tooltip immediately
    setShowReactionTooltip({ 
      allReactions,
      targetElement: event.currentTarget,
      emoji,
      userNames: newUserNames
    });
  };

  const getDisplayName = (senderName) => {
    // If senderName looks like an email, extract the part before @
    if (senderName && senderName.includes('@')) {
      return senderName.split('@')[0];
    }
    return senderName;
  };

  const reactions = message.reactions || {};
  const hasReactions = Object.keys(reactions).some(emoji => reactions[emoji]?.length > 0);

  const getTimeAgo = () => formatMessageTime(message.timestamp);

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group relative`}>
      {/* Reply icon - shows during swipe */}
      {swipeOffset > 0 && (
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 transition-opacity"
          style={{ 
            opacity: Math.min(swipeOffset / 50, 1),
            transform: `translateY(-50%) scale(${Math.min(swipeOffset / 50, 1)})`
          }}
        >
          <div className="text-2xl">↩️</div>
        </div>
      )}

      <div 
        ref={messageRef}
        className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col transition-transform`}
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {/* Sender info */}
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1 px-2">
            {message.senderPhoto ? (
              <img
                src={message.senderPhoto}
                alt={message.senderName}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {getDisplayName(message.senderName)?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-semibold text-base-content/70">
              {getDisplayName(message.senderName)}
            </span>
          </div>
        )}

        {/* Message bubble with time inside */}
        <div className="relative">
          <div className={`group/msg ${isOwn ? 'flex flex-row-reverse' : 'flex flex-row'} items-center gap-1`}>
            <div
              ref={bubbleRef}
              className={`px-3 py-2 rounded-2xl touch-feedback relative ${
                isOwn
                  ? 'bg-[#5C7057] text-white rounded-br-sm'
                  : 'bg-base-300 dark:bg-base-200 text-base-content rounded-bl-sm'
              } transition-transform`}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onContextMenu={handleContextMenu}
            >
              {/* Reply Preview */}
              {message.replyTo && (
                <div className={`mb-2 pb-2 pl-3 pr-2 py-2 rounded-lg ${
                  isOwn 
                    ? 'bg-white/10 border-l-4 border-white/40' 
                    : 'bg-primary/10 border-l-4 border-primary'
                }`}>
                  <p className={`text-[10px] font-bold mb-0.5 ${isOwn ? 'text-white' : 'text-primary'}`}>
                    {message.replyTo.senderId === userData?.uid ? 'You' : message.replyTo.senderName}
                  </p>
                  <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-base-content/70'} line-clamp-2`}>
                    {message.replyTo.content}
                  </p>
                </div>
              )}
              
              <p className="text-sm whitespace-pre-wrap break-words pr-12 pb-3">{message.content}</p>
              <span className={`absolute bottom-1 right-2 text-[10px] ${isOwn ? 'text-white/60' : 'text-base-content/50'} whitespace-nowrap`}>
                {getTimeAgo()}
              </span>
            </div>

            {/* Desktop hover actions — Reply / React */}
            <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
              <button
                type="button"
                onClick={handleShowReactions}
                className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-warning hover:bg-base-200"
                title="React"
                aria-label="React to message"
              >
                <FaSmile className="text-sm" />
              </button>
              <button
                type="button"
                onClick={handleReply}
                className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-primary hover:bg-base-200"
                title="Reply"
                aria-label="Reply to message"
              >
                <FaReply className="text-sm" />
              </button>
            </div>
          </div>

          {/* Context Menu - Portal rendering to stay on top of everything */}
          {showContextMenu && createPortal(
            <div
              ref={contextMenuRef}
              className="fixed z-[999999]"
              style={{
                top: `${contextMenuPosition.top}px`,
                left: `${contextMenuPosition.left}px`,
              }}
            >
              {/* Simple arrow indicator */}
              <div className={`absolute ${isOwn ? 'right-6' : 'left-6'} ${
                reactionPosition === 'below' 
                  ? '-top-2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-transparent border-b-base-100' 
                  : '-bottom-2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-transparent border-t-base-100'
              }`} style={{ filter: 'drop-shadow(0 -2px 4px rgba(0,0,0,0.1))' }} />
              
              {/* Menu container */}
              <div className="bg-base-100 shadow-2xl rounded-2xl px-2 py-2 border border-base-300 flex items-center gap-1">
                {/* Reply button */}
                <button
                  onClick={handleReply}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-base-200 rounded-xl transition-all"
                >
                  <FaReply className="text-base text-primary" />
                  <span className="text-sm font-medium">Reply</span>
                </button>
                
                {/* Divider */}
                <div className="w-px h-6 bg-base-300" />
                
                {/* React button */}
                <button
                  onClick={handleShowReactions}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-base-200 rounded-xl transition-all"
                >
                  <FaSmile className="text-base text-warning" />
                  <span className="text-sm font-medium">React</span>
                </button>
              </div>
            </div>,
            document.body
          )}

          {/* Reactions display - below message, left aligned */}
          {hasReactions && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {Object.entries(reactions).map(([emoji, users]) => {
                if (!users || users.length === 0) return null;
                const hasReacted = users.includes(userData?.uid);
                return (
                  <div key={emoji} className="relative">
                    <button
                      onClick={(e) => handleReactionClick(e, emoji)}
                      className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 transition-all hover:scale-105 ${
                        hasReacted
                          ? 'bg-primary/20 border-2 border-primary'
                          : 'bg-base-200 border border-base-300 hover:bg-base-300'
                      }`}
                      title="Click to see who reacted"
                    >
                      <span>{emoji}</span>
                      <span className="font-semibold">{users.length}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reaction picker - shows when React button clicked from context menu - Portal rendering */}
          {showReactions && createPortal(
            <div
              ref={reactionPickerRef}
              className="fixed z-[99999] bg-base-100 shadow-xl rounded-full px-2 py-1.5 flex gap-1 border border-base-300"
              style={{
                top: `${pickerCoords.top}px`,
                left: `${pickerCoords.left}px`,
              }}
            >
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="text-2xl hover:scale-125 active:scale-110 transition-transform p-1.5 rounded-full hover:bg-base-200 active:bg-base-300"
                >
                  {emoji}
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>
      </div>

      {/* Reaction Tooltip - New Component */}
      <ReactionTooltip
        isVisible={!!showReactionTooltip}
        targetElement={showReactionTooltip?.targetElement}
        allReactions={showReactionTooltip?.allReactions || []}
        userNames={showReactionTooltip?.userNames || userNames}
        userData={userData}
        onClose={() => setShowReactionTooltip(null)}
      />
    </div>
  );
};

export default MessageItem;
