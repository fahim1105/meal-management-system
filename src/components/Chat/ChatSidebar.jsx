import { useState } from 'react';
import { FaComments, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import ChatContainer from './ChatContainer';

const ChatSidebar = ({ groupId, isManager }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <>
      {/* Minimized State */}
      {isMinimized && (
        <div className="fixed right-0 top-20 z-40">
          <button
            onClick={() => setIsMinimized(false)}
            className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-3 rounded-l-lg shadow-lg hover:shadow-purple-500/50 transition-all duration-300 flex items-center gap-2"
            aria-label="Open chat"
          >
            <FaComments className="text-xl" />
            <FaChevronLeft />
          </button>
        </div>
      )}

      {/* Expanded State */}
      {!isMinimized && (
        <div className="fixed right-0 top-20 bottom-0 w-[380px] bg-base-100 border-l border-base-300 shadow-2xl z-40 animate-slideInRight">
          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="absolute -left-8 top-4 bg-gradient-to-br from-purple-500 to-purple-700 text-white p-2 rounded-l-lg shadow-lg hover:shadow-purple-500/50 transition-all duration-300"
            aria-label="Minimize chat"
          >
            <FaChevronRight />
          </button>

          {/* Chat Content */}
          <div className="h-full">
            <ChatContainer groupId={groupId} isManager={isManager} isMobile={false} />
          </div>
        </div>
      )}
    </>
  );
};

export default ChatSidebar;
