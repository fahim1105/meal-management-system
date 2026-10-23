import { FaComments } from 'react-icons/fa';

const ChatHeader = () => {
  return (
    <div className="relative overflow-hidden h-[88px]">
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

          {/* Right Side - removed online count */}
        </div>
      </div>

      {/* Bottom Gradient Border */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
    </div>
  );
};

export default ChatHeader;
