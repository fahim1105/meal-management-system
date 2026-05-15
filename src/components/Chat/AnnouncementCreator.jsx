import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { FaBullhorn, FaTimes, FaThumbtack } from 'react-icons/fa';
import burgerToast from '../BurgerToast';

const AnnouncementCreator = ({ groupId, onClose }) => {
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [creating, setCreating] = useState(false);
  const { userData } = useAuth();

  // Ensure groupId is a string
  const groupIdString = groupId ? String(groupId) : null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!content.trim() || creating || !groupIdString) return;

    setCreating(true);
    try {
      const messagesRef = collection(db, 'groups', groupIdString, 'messages');
      await addDoc(messagesRef, {
        type: 'announcement',
        senderId: userData.uid,
        senderName: userData.name || userData.displayName || userData.email,
        senderPhoto: userData.photoURL || null,
        content: content.trim(),
        isPinned,
        timestamp: serverTimestamp(),
        readBy: [userData.uid],
        reactions: {}
      });

      burgerToast.success('Announcement posted successfully!');
      onClose();
    } catch (error) {
      console.error('Error creating announcement:', error);
      burgerToast.error('Failed to post announcement');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl max-h-[95vh] bg-gradient-to-br from-base-100 to-base-200 shadow-2xl border border-warning/20 p-0 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-br from-base-100 to-base-200 px-4 sm:px-6 py-4 border-b border-base-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="bg-gradient-to-br from-warning to-orange-500 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg shrink-0">
                <FaBullhorn className="text-white text-xl sm:text-2xl" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg sm:text-2xl text-base-content truncate">
                  Create Announcement
                </h3>
                <p className="text-xs sm:text-sm text-base-content/60 line-clamp-2">
                  Share important updates with your group
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="btn btn-sm btn-circle btn-ghost hover:bg-error/10 hover:text-error transition-all shrink-0"
            >
              <FaTimes className="text-base sm:text-lg" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-80px)] px-4 sm:px-6 py-4">
          <form onSubmit={handleCreate} className="space-y-4 sm:space-y-6">
            {/* Message Input */}
            <div className="form-control">
              <label className="label px-0">
                <span className="label-text font-semibold text-sm sm:text-base flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
                  Announcement Message
                </span>
                <span className="label-text-alt text-base-content/50 text-xs sm:text-sm">
                  {content.length}/500
                </span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 500))}
                placeholder="Type your important announcement here... Make it clear and concise!"
                className="textarea textarea-bordered h-32 sm:h-40 focus:outline-none focus:border-warning focus:ring-2 focus:ring-warning/20 bg-base-100 rounded-xl shadow-sm resize-none text-sm sm:text-base"
                required
              />
              <label className="label px-0">
                <span className="label-text-alt text-base-content/50 text-xs">
                  This will be highlighted for all members
                </span>
              </label>
            </div>

            {/* Pin Option */}
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3 sm:gap-4 p-3 sm:p-4 bg-base-200/50 rounded-xl hover:bg-base-200 transition-all border border-base-300">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="checkbox checkbox-warning checkbox-sm sm:checkbox-lg"
                />
                <div className="flex-1 min-w-0">
                  <span className="label-text font-semibold text-sm sm:text-base flex items-center gap-2">
                    <FaThumbtack className="text-warning shrink-0" />
                    <span className="truncate">Pin this announcement</span>
                  </span>
                  <span className="label-text-alt text-base-content/60 block mt-1 text-xs sm:text-sm">
                    Pinned announcements stay at the top
                  </span>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost hover:bg-base-200 w-full sm:w-auto"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn bg-gradient-to-r from-warning to-orange-500 border-none text-white shadow-lg hover:shadow-warning/50 hover:scale-105 transition-all gap-2 w-full sm:w-auto sm:flex-1"
                disabled={!content.trim() || creating}
              >
                {creating ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    <span className="hidden sm:inline">Posting...</span>
                  </>
                ) : (
                  <>
                    <FaBullhorn />
                    Post Announcement
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
    </div>
  );
};

export default AnnouncementCreator;
