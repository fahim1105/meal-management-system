import { useEffect } from 'react';
import { FaTimes, FaComments, FaUsers, FaCircle } from 'react-icons/fa';
import ChatContainer from './ChatContainer';

const ChatModal = ({ isOpen, onClose, groupId, isManager, onlineCount = 0 }) => {
  // Prevent body scroll when modal is open - Enhanced for mobile
  useEffect(() => {
    if (isOpen) {
      // Store original styles
      const originalStyle = window.getComputedStyle(document.body);
      const originalOverflow = originalStyle.overflow;
      const originalPosition = originalStyle.position;
      
      // Add modal-open class and prevent scroll
      document.documentElement.classList.add('modal-open');
      document.body.classList.add('modal-open');
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.documentElement.style.overflow = 'hidden';
      
      // Store scroll position
      const scrollY = window.scrollY;
      
      return () => {
        // Remove modal-open class and restore original styles
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.documentElement.style.overflow = '';
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-base-100 animate-slideUp flex flex-col"
      onTouchMove={(e) => {
        // Prevent background scroll on touch move
        e.preventDefault();
      }}
      style={{ 
        touchAction: 'none',
        overscrollBehavior: 'none'
      }}
    >
      {/* Premium Header */}
      <div className="relative overflow-hidden shrink-0 h-[88px]">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 animate-gradient-x"></div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
        
        {/* Content */}
        <div className="relative p-4 h-full flex items-center">
          <div className="flex items-center justify-between w-full">
            {/* Left Side */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={onClose}
                className="btn btn-circle btn-sm bg-white/20 backdrop-blur-sm border-none text-white hover:bg-white/30 shadow-lg shrink-0"
              >
                <FaTimes className="text-lg" />
              </button>
              <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl shadow-lg border border-white/30 shrink-0">
                <FaComments className="text-2xl text-white drop-shadow-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-white drop-shadow-md flex items-center gap-2">
                  <span className="truncate">Group Chat</span>
                  <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50 shrink-0"></span>
                </h3>
                <p className="text-white/90 text-xs font-medium drop-shadow truncate">
                  Stay connected
                </p>
              </div>
            </div>

            {/* Right Side - Online Count (Fixed width to prevent layout shift) */}
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/30 shadow-lg w-[80px] justify-center shrink-0 ml-2">
              <div className="relative">
                <FaUsers className="text-white text-lg drop-shadow" />
                {onlineCount > 0 && (
                  <FaCircle className="absolute -top-0.5 -right-0.5 text-green-400 text-[8px] animate-pulse" />
                )}
              </div>
              <span className="text-white font-bold text-xl drop-shadow-md">
                {onlineCount}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Gradient Border */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
      </div>

      {/* Chat Content */}
      <div 
        className="flex-1 overflow-hidden"
        style={{ 
          touchAction: 'pan-y',
          overscrollBehavior: 'contain'
        }}
      >
        <ChatContainer groupId={groupId} isManager={isManager} isMobile={true} />
      </div>
    </div>
  );
};

export default ChatModal;
