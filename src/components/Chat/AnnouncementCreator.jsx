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
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container - Desktop: centered, Mobile: bottom sheet */}
      <div className="fixed inset-0 z-[70] flex items-end lg:items-center justify-center pointer-events-none">
        <div 
          className="pointer-events-auto w-full lg:w-auto lg:min-w-[560px] lg:max-w-[calc(100%-32px)] max-h-[92vh] lg:max-h-[90vh] flex flex-col
                     bg-[var(--md-bg)] border-[1px] border-[var(--md-border)]
                     rounded-t-[var(--md-radius-modal-mobile)] lg:rounded-[var(--md-radius-modal)]
                     shadow-2xl overflow-hidden"
        >
          {/* Mobile Grab Handle */}
          <div className="lg:hidden flex justify-center pt-3 pb-2 shrink-0">
            <div className="w-10 h-1 bg-base-content/20 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 px-5 lg:px-6 py-4 border-b border-[var(--md-border)] shrink-0">
            <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-[var(--md-announcement-icon)] flex items-center justify-center shrink-0">
              <FaBullhorn className="text-white text-lg lg:text-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg lg:text-xl font-bold text-base-content">
                Create Announcement
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-base-content/10 transition-colors shrink-0"
              aria-label="Close"
            >
              <FaTimes className="text-base-content/70 text-base" />
            </button>
          </div>

          {/* Scrollable Body */}
          <form onSubmit={handleCreate} className="flex-1 overflow-y-auto px-5 lg:px-6 py-5 space-y-5">
            {/* Message Field */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <label htmlFor="announcement-message" className="text-sm font-semibold text-[var(--md-label)]">
                  Message
                </label>
                <span className="text-xs font-medium text-[var(--md-helper)]">
                  {content.length}/500
                </span>
              </div>
              <textarea
                id="announcement-message"
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 500))}
                placeholder="Type your important announcement here..."
                rows={5}
                className="w-full px-4 py-3 text-sm lg:text-base bg-[var(--md-input-bg)] border border-[var(--md-input-border)] rounded-[var(--md-radius-field)]
                           text-base-content placeholder:text-base-content/40
                           focus:outline-none focus:border-[var(--md-input-border-focus)] focus:ring-2 focus:ring-[var(--md-input-ring)]
                           resize-none transition-colors"
                required
                maxLength={500}
              />
              <p className="text-xs text-[var(--md-helper)]">
                This will be highlighted for all group members
              </p>
            </div>

            {/* Pin Switch */}
            <div className="space-y-2">
              <label htmlFor="announcement-pin" className="text-sm font-semibold text-[var(--md-label)]">
                Options
              </label>
              <label 
                htmlFor="announcement-pin"
                className="flex items-center gap-3 p-3.5 bg-[var(--md-preview-bg)] border border-[var(--md-preview-border)] rounded-[var(--md-radius-field)] cursor-pointer hover:bg-base-content/[0.06] transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-base-content">
                    <FaThumbtack className="text-[var(--md-announcement-icon)]" />
                    <span>Pin to top</span>
                  </div>
                  <p className="text-xs text-[var(--md-helper)] mt-0.5">
                    Keep visible at the top of chat
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="announcement-pin"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative w-12 h-6 rounded-full transition-colors ${isPinned ? 'bg-[var(--md-announcement-icon)]' : 'bg-base-content/20'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isPinned ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </label>
            </div>

            {/* Preview Card */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--md-label)]">
                Preview
              </label>
              <div className="p-4 bg-[var(--md-preview-bg)] border border-[var(--md-preview-border)] rounded-[var(--md-radius-preview)]">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--md-announcement-icon)] flex items-center justify-center shrink-0">
                    <FaBullhorn className="text-white text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-base-content">
                        {userData?.name || userData?.displayName || 'You'}
                      </span>
                      {isPinned && (
                        <FaThumbtack className="text-[var(--md-announcement-icon)] text-xs" />
                      )}
                    </div>
                    <p className="text-sm text-base-content/80 break-words">
                      {content.trim() || 'Your announcement will appear here...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center gap-3 px-5 lg:px-6 py-4 border-t border-[var(--md-border)] shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="flex-1 lg:flex-initial lg:min-w-[100px] px-4 py-2.5 text-sm font-semibold text-base-content bg-base-content/[0.06] hover:bg-base-content/[0.12] rounded-[var(--md-radius-button)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleCreate}
              disabled={!content.trim() || creating}
              className="flex-1 lg:flex-[2] px-4 py-2.5 text-sm font-semibold text-white bg-[var(--md-announcement-btn)] hover:opacity-90 rounded-[var(--md-radius-button)] transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <FaBullhorn />
                  <span>Post Announcement</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementCreator;
