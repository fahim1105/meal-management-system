import { useState } from 'react';
import { FaBullhorn, FaThumbtack, FaTrash } from 'react-icons/fa';
import { db } from '../../firebase/config';
import { doc, deleteDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { formatMessageTime } from './formatMessageTime';

const AnnouncementItem = ({ message, groupId, isManager }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Delete Announcement?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      background: 'var(--color-base-100)',
      color: 'var(--color-base-content)',
      iconColor: '#ef4444',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: 'transparent',
      customClass: {
        popup: 'swal-custom-popup',
        title: 'swal-custom-title',
        htmlContainer: 'swal-custom-text',
        confirmButton: 'swal-custom-confirm',
        cancelButton: 'swal-custom-cancel',
        icon: 'swal-custom-icon',
        actions: 'swal-custom-actions'
      },
      buttonsStyling: false
    });

    if (result.isConfirmed) {
      setDeleting(true);
      try {
        const messageRef = doc(db, 'groups', groupId, 'messages', message.id);
        await deleteDoc(messageRef);
        
        Swal.fire({
          title: 'Deleted!',
          text: 'Announcement has been deleted',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          background: 'var(--color-base-100)',
          color: 'var(--color-base-content)',
          iconColor: '#10b981',
          customClass: {
            popup: 'swal-custom-popup',
            title: 'swal-custom-title',
            htmlContainer: 'swal-custom-text',
            icon: 'swal-custom-icon'
          }
        });
      } catch (error) {
        console.error('Error deleting announcement:', error);
        Swal.fire({
          title: 'Error',
          text: 'Failed to delete announcement',
          icon: 'error',
          confirmButtonText: 'OK',
          background: 'var(--color-base-100)',
          color: 'var(--color-base-content)',
          iconColor: '#ef4444',
          confirmButtonColor: 'transparent',
          customClass: {
            popup: 'swal-custom-popup',
            title: 'swal-custom-title',
            htmlContainer: 'swal-custom-text',
            confirmButton: 'swal-custom-error-btn',
            icon: 'swal-custom-icon'
          },
          buttonsStyling: false
        });
      } finally {
        setDeleting(false);
      }
    }
  };
  const getDisplayName = (senderName) => {
    // If senderName looks like an email, extract the part before @
    if (senderName && senderName.includes('@')) {
      return senderName.split('@')[0];
    }
    return senderName;
  };

  const getTimeAgo = () => formatMessageTime(message.timestamp);

  return (
    <div className="w-full">
      <div className={`bg-gradient-to-r from-info/30 to-info/20 dark:from-info/20 dark:to-info/10 border-l-4 border-info rounded-lg p-4 ${
        message.isPinned ? 'ring-2 ring-info' : ''
      }`}>
        <div className="flex items-start gap-3">
          <div className="bg-info/20 p-2 rounded-full shrink-0">
            <FaBullhorn className="text-info text-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge badge-info gap-1 font-semibold">
                  <FaBullhorn className="text-xs" />
                  ANNOUNCEMENT
                </span>
                {message.isPinned && (
                  <span className="badge badge-sm gap-1">
                    <FaThumbtack className="text-xs" />
                    Pinned
                  </span>
                )}
              </div>
              {isManager && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn btn-xs btn-ghost text-error hover:bg-error/10 gap-1"
                  title="Delete announcement"
                >
                  {deleting ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <>
                      <FaTrash className="text-xs" />
                      <span className="hidden sm:inline">Delete</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 mb-2">
              {message.senderPhoto ? (
                <img
                  src={message.senderPhoto}
                  alt={message.senderName}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-info/20 flex items-center justify-center text-xs font-bold text-info">
                  {getDisplayName(message.senderName)?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-bold text-base-content">
                {getDisplayName(message.senderName)}
              </span>
              <span className="text-xs text-base-content/50">• {getTimeAgo()}</span>
            </div>
            <p className="text-base-content/90 dark:text-base-content font-medium whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementItem;
