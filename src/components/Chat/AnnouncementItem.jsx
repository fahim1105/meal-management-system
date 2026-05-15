import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { FaBullhorn, FaThumbtack, FaTrash } from 'react-icons/fa';
import { db } from '../../firebase/config';
import { doc, deleteDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';

const AnnouncementItem = ({ message, groupId, isManager }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Delete Announcement?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel'
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
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Error deleting announcement:', error);
        Swal.fire({
          title: 'Error',
          text: 'Failed to delete announcement',
          icon: 'error'
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

  const getTimeAgo = () => {
    if (!message.timestamp) return 'Just now';
    const date = message.timestamp.toDate ? message.timestamp.toDate() : new Date(message.timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <div className="w-full">
      <div className={`bg-gradient-to-r from-warning/20 to-warning/10 border-l-4 border-warning rounded-lg p-4 ${
        message.isPinned ? 'ring-2 ring-warning' : ''
      }`}>
        <div className="flex items-start gap-3">
          <div className="bg-warning/20 p-2 rounded-full shrink-0">
            <FaBullhorn className="text-warning text-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge badge-warning gap-1 font-semibold">
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
                <div className="w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center text-xs font-bold text-warning">
                  {getDisplayName(message.senderName)?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-bold text-base-content">
                {getDisplayName(message.senderName)}
              </span>
              <span className="text-xs text-base-content/50">• {getTimeAgo()}</span>
            </div>
            <p className="text-base-content font-medium whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementItem;
