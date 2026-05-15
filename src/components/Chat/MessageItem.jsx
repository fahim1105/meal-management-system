import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { format } from 'date-fns';
import { FaReply, FaSmile } from 'react-icons/fa';
import ReactionTooltip from './ReactionTooltip';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

const MessageItem = ({ message, isOwn, groupId, onReply, activeReactionMessageId, setActiveReactionMessageId, allMessages = [] }) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showReactionTooltip, setShowReactionTooltip] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ top: 0, left: 0 });
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [reactionPosition, setReactionPosition] = useState('below');
  const [userNames, setUserNames] = useState({}); // Store user names
  const { userData } = useAuth();
  const reactionPickerRef = useRef(null);
  const contextMenuRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const longPressTimer = useRef(null);
  const messageRef = useRef(null);
  const bubbleRef = useRef(null);

  // Handle swipe gesture for reply (WhatsApp style)
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    setIsSwiping(false);

    // Start long press timer for reaction picker (mobile only)
    longPressTimer.current = setTimeout(() => {
      // Only show reactions if not swiping
      if (!isSwiping && swipeOffset === 0) {
        // Close any other open reaction modal first
        if (activeReactionMessageId && activeReactionMessageId !== message.id) {
          setActiveReactionMessageId(null);
        }
        
        // Calculate position for reaction picker
        if (bubbleRef.current) {
          const rect = bubbleRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          
          // If message is in top half, show reactions below; otherwise show above
          if (rect.top < viewportHeight / 2) {
            setReactionPosition('below');
          } else {
            setReactionPosition('above');
          }
        } else {
          setReactionPosition('below');
        }
        
        // Set this message as active and show reactions
        setActiveReactionMessageId(message.id);
        setShowReactions(true);
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }, 500); // 500ms long press
  };

  const handleTouchMove = (e) => {
    if (!touchStartX.current) return;

    const touchCurrentX = e.touches[0].clientX;
    const touchCurrentY = e.touches[0].clientY;
    const diffX = touchCurrentX - touchStartX.current;
    const diffY = touchCurrentY - touchStartY.current;

    // Cancel long press if moving
    if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    }

    // Only swipe if horizontal movement is greater than vertical (not scrolling)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      setIsSwiping(true);
      
      // Only allow right swipe (positive diffX) and limit to 80px
      if (diffX > 0 && diffX <= 80) {
        setSwipeOffset(diffX);
      } else if (diffX > 80) {
        setSwipeOffset(80);
      }
    }
  };

  const handleTouchEnd = () => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    if (swipeOffset > 50) {
      // Trigger reply if swiped more than 50px
      handleReply();
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
    
    // Reset swipe
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartX.current = 0;
    touchStartY.current = 0;
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
    // Close any other open reaction modal first
    if (activeReactionMessageId && activeReactionMessageId !== message.id) {
      setActiveReactionMessageId(null);
    }
    
    // Calculate position based on bubble location
    if (bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // If message is in top half, show reactions below; otherwise show above
      if (rect.top < viewportHeight / 2) {
        setReactionPosition('below');
      } else {
        setReactionPosition('above');
      }
    } else {
      // Default to below if ref not available
      setReactionPosition('below');
    }
    
    // Set this message as active and show reactions
    setActiveReactionMessageId(message.id);
    setShowReactions(true);
    setShowContextMenu(false);
  };

  // Close reaction picker when clicking outside or pressing ESC
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close reaction picker if clicking outside
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target)) {
        setShowReactions(false);
      }
      // Close context menu if clicking outside
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setShowContextMenu(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowReactions(false);
        setShowReactionTooltip(null);
        setShowContextMenu(false);
      }
    };

    const handleScroll = () => {
      // Close tooltip on scroll
      setShowReactionTooltip(null);
      setShowReactions(false);
      setShowContextMenu(false);
    };

    if (showReactions || showReactionTooltip || showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      // Listen for scroll on window and any scrollable parent
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
  }, [showReactions, showReactionTooltip, showContextMenu]);

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
      const currentReactions = message.reactions || {};
      const userReactions = currentReactions[emoji] || [];

      // Check if user already reacted with this emoji
      const hasThisReaction = userReactions.includes(userData.uid);

      // Prepare updated reactions object
      const updatedReactions = { ...currentReactions };

      // First, remove user from ALL reactions (single reaction per user)
      Object.keys(updatedReactions).forEach((reactionEmoji) => {
        updatedReactions[reactionEmoji] = (updatedReactions[reactionEmoji] || []).filter(
          uid => uid !== userData.uid
        );
      });

      // If user didn't have this reaction, add it (if they did, it stays removed = toggle off)
      if (!hasThisReaction) {
        updatedReactions[emoji] = [...(updatedReactions[emoji] || []), userData.uid];
      }

      // Update the document
      await updateDoc(messageRef, {
        reactions: updatedReactions
      });

      // Mark as read
      if (!message.readBy?.includes(userData.uid)) {
        await updateDoc(messageRef, {
          readBy: arrayUnion(userData.uid)
        });
      }

      setShowReactions(false);
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

    // Build user names from available message data (no Firestore needed)
    const newUserNames = { ...userNames };
    
    Array.from(userIds).forEach(userId => {
      if (!newUserNames[userId] && userId !== userData?.uid) {
        // Look for this user in all messages to find their name
        const userMessage = allMessages.find(msg => msg.senderId === userId);
        
        if (userMessage && userMessage.senderName) {
          newUserNames[userId] = userMessage.senderName;
        } else if (message.senderId === userId) {
          // Fallback to current message sender name
          newUserNames[userId] = message.senderName || 'User';
        } else {
          // Last resort - generic name
          newUserNames[userId] = 'User';
        }
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

  const getTimeAgo = () => {
    if (!message.timestamp) return 'Just now';
    const date = message.timestamp.toDate ? message.timestamp.toDate() : new Date(message.timestamp);
    return format(date, 'h:mm a'); // Format: 2:30 PM
  };

  const reactions = message.reactions || {};
  const hasReactions = Object.keys(reactions).some(emoji => reactions[emoji]?.length > 0);

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
          <div
            ref={bubbleRef}
            className={`px-3 py-2 rounded-2xl touch-feedback relative ${
              isOwn
                ? 'bg-primary text-primary-content rounded-br-sm'
                : 'bg-base-200 text-base-content rounded-bl-sm'
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
                  ? 'bg-primary-content/10 border-l-4 border-primary-content/40' 
                  : 'bg-primary/10 border-l-4 border-primary'
              }`}>
                <p className={`text-[10px] font-bold mb-0.5 ${isOwn ? 'text-primary-content' : 'text-primary'}`}>
                  {message.replyTo.senderId === userData?.uid ? 'You' : message.replyTo.senderName}
                </p>
                <p className={`text-xs ${isOwn ? 'text-primary-content/70' : 'text-base-content/70'} line-clamp-2`}>
                  {message.replyTo.content}
                </p>
              </div>
            )}
            
            <p className="text-sm whitespace-pre-wrap break-words pr-12 pb-3">{message.content}</p>
            <span className={`absolute bottom-1 right-2 text-[10px] ${isOwn ? 'text-primary-content/60' : 'text-base-content/50'} whitespace-nowrap`}>
              {getTimeAgo()}
            </span>
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
          {showReactions && bubbleRef.current && createPortal(
            <div
              ref={reactionPickerRef}
              className="fixed z-[99999] bg-base-100 shadow-xl rounded-full px-2 py-1.5 flex gap-1 border border-base-300"
              style={{
                top: reactionPosition === 'below' 
                  ? `${bubbleRef.current.getBoundingClientRect().bottom + 8}px`
                  : `${bubbleRef.current.getBoundingClientRect().top - 48}px`,
                left: isOwn 
                  ? `${bubbleRef.current.getBoundingClientRect().right - 240}px`
                  : `${bubbleRef.current.getBoundingClientRect().left}px`,
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
