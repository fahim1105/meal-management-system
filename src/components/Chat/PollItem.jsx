import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { FaPoll, FaCheckCircle, FaClock, FaTrash } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { formatMessageTime } from './formatMessageTime';

const PollItem = ({ message, groupId, isManager }) => {
  const [voting, setVoting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { userData } = useAuth();
  const pollData = message.pollData || {};

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Delete Poll?',
      text: 'This will delete the poll and all votes',
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
          text: 'Poll has been deleted',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Error deleting poll:', error);
        Swal.fire({
          title: 'Error',
          text: 'Failed to delete poll',
          icon: 'error'
        });
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleVote = async (optionId) => {
    if (!userData || voting) return;

    setVoting(true);
    try {
      const messageRef = doc(db, 'groups', groupId, 'messages', message.id);
      const options = pollData.options || [];
      
      // Find if user already voted on any option
      const userVotedOption = options.find(opt => opt.votes?.includes(userData.uid));

      if (userVotedOption) {
        if (userVotedOption.id === optionId) {
          // User clicked on the SAME option - TOGGLE OFF (remove vote)
          await updateDoc(messageRef, {
            [`pollData.options`]: options.map(opt =>
              opt.id === optionId
                ? { ...opt, votes: opt.votes.filter(uid => uid !== userData.uid) }
                : opt
            )
          });
        } else {
          // User clicked on a DIFFERENT option
          if (pollData.allowMultiple) {
            // Multiple choice: Check if user already voted on this option
            const alreadyVotedOnThisOption = options.find(
              opt => opt.id === optionId && opt.votes?.includes(userData.uid)
            );
            
            if (alreadyVotedOnThisOption) {
              // Remove vote from this option (toggle off)
              await updateDoc(messageRef, {
                [`pollData.options`]: options.map(opt =>
                  opt.id === optionId
                    ? { ...opt, votes: opt.votes.filter(uid => uid !== userData.uid) }
                    : opt
                )
              });
            } else {
              // Add vote to this option
              await updateDoc(messageRef, {
                [`pollData.options`]: options.map(opt =>
                  opt.id === optionId
                    ? { ...opt, votes: [...(opt.votes || []), userData.uid] }
                    : opt
                )
              });
            }
          } else {
            // Single choice: MOVE vote from old option to new option
            await updateDoc(messageRef, {
              [`pollData.options`]: options.map(opt => {
                if (opt.id === userVotedOption.id) {
                  // Remove vote from old option
                  return { ...opt, votes: opt.votes.filter(uid => uid !== userData.uid) };
                } else if (opt.id === optionId) {
                  // Add vote to new option
                  return { ...opt, votes: [...(opt.votes || []), userData.uid] };
                }
                return opt;
              })
            });
          }
        }
      } else {
        // First vote - add vote to selected option
        await updateDoc(messageRef, {
          [`pollData.options`]: options.map(opt =>
            opt.id === optionId
              ? { ...opt, votes: [...(opt.votes || []), userData.uid] }
              : opt
          )
        });
      }
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setVoting(false);
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

  const isExpired = () => {
    if (!pollData.expiresAt) return false;
    const expiryDate = pollData.expiresAt.toDate ? pollData.expiresAt.toDate() : new Date(pollData.expiresAt);
    return expiryDate < new Date();
  };

  const getExpiryText = () => {
    if (!pollData.expiresAt) return null;
    const expiryDate = pollData.expiresAt.toDate ? pollData.expiresAt.toDate() : new Date(pollData.expiresAt);
    if (isExpired()) return 'Expired';
    return `Expires ${formatDistanceToNow(expiryDate, { addSuffix: true })}`;
  };

  const getTotalVotes = () => {
    return (pollData.options || []).reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
  };

  const hasUserVoted = (optionId) => {
    const option = pollData.options?.find(opt => opt.id === optionId);
    return option?.votes?.includes(userData?.uid);
  };

  const expired = isExpired();
  const totalVotes = getTotalVotes();

  return (
    <div className="w-full">
      <div className="bg-gradient-to-r from-info/20 to-info/10 border-l-4 border-info rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="bg-info/20 p-2 rounded-full shrink-0">
            <FaPoll className="text-info text-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge badge-info gap-1 font-semibold">
                  <FaPoll className="text-xs" />
                  POLL
                </span>
                {expired && (
                  <span className="badge badge-sm badge-error gap-1">
                    <FaClock className="text-xs" />
                    Expired
                  </span>
                )}
              </div>
              {isManager && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn btn-xs btn-ghost text-error hover:bg-error/10 gap-1"
                  title="Delete poll"
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
            <div className="flex items-center gap-2 mb-3">
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
            
            {/* Question */}
            <h4 className="text-base font-bold text-base-content mb-3">
              {pollData.question}
            </h4>

            {/* Options */}
            <div className="space-y-2 mb-3">
              {(pollData.options || []).map((option) => {
                const votes = option.votes?.length || 0;
                const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                const hasVoted = hasUserVoted(option.id);

                return (
                  <button
                    key={option.id}
                    onClick={() => !expired && handleVote(option.id)}
                    disabled={expired || voting}
                    className={`w-full text-left relative overflow-hidden rounded-lg border-2 transition-all ${
                      hasVoted
                        ? 'border-info bg-info/10'
                        : 'border-base-300 bg-base-100 hover:border-info/50'
                    } ${expired ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                  >
                    {/* Progress bar */}
                    <div
                      className="absolute inset-0 bg-info/20 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                    
                    {/* Content */}
                    <div className="relative px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {hasVoted && <FaCheckCircle className="text-info" />}
                        <span className="font-medium">{option.text}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{votes} vote{votes !== 1 ? 's' : ''}</span>
                        {totalVotes > 0 && (
                          <span className="text-xs text-base-content/60">({percentage.toFixed(0)}%)</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-base-content/60">
              <span>{totalVotes} total vote{totalVotes !== 1 ? 's' : ''}</span>
              {getExpiryText() && (
                <span className="flex items-center gap-1">
                  <FaClock />
                  {getExpiryText()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PollItem;
