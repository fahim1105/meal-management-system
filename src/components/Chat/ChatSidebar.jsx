import { useState } from 'react';
import { FaComments, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import ChatContainer from './ChatContainer';

const ChatSidebar = ({ groupId, isManager, groupMembers = [] }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <>
      {/* Minimized tab — chat stays mounted below so listeners/scroll survive */}
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

      <div
        className={`fixed right-0 top-20 bottom-0 w-[380px] bg-base-100 border-l border-base-300 shadow-2xl z-40 ${
          isMinimized ? 'invisible pointer-events-none translate-x-full' : 'animate-slideInRight'
        }`}
        aria-hidden={isMinimized}
      >
        {!isMinimized && (
          <button
            onClick={() => setIsMinimized(true)}
            className="absolute -left-8 top-4 bg-gradient-to-br from-purple-500 to-purple-700 text-white p-2 rounded-l-lg shadow-lg hover:shadow-purple-500/50 transition-all duration-300"
            aria-label="Minimize chat"
          >
            <FaChevronRight />
          </button>
        )}

        <div className="h-full">
          <ChatContainer
            groupId={groupId}
            isManager={isManager}
            isMobile={false}
            groupMembers={groupMembers}
          />
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;
