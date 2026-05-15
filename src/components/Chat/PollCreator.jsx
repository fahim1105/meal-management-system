import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { FaPoll, FaTimes, FaPlus, FaTrash } from 'react-icons/fa';
import burgerToast from '../BurgerToast';

const PollCreator = ({ groupId, onClose }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [expiryHours, setExpiryHours] = useState(24);
  const [allowMultiple, setAllowMultiple] = useState(false); // Always false - single choice only
  const [creating, setCreating] = useState(false);
  const { userData } = useAuth();

  // Ensure groupId is a string
  const groupIdString = groupId ? String(groupId) : null;

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    const validOptions = options.filter(opt => opt.trim());
    if (!question.trim() || validOptions.length < 2 || creating || !groupIdString) {
      burgerToast.error('Please provide a question and at least 2 options');
      return;
    }

    setCreating(true);
    try {
      const messagesRef = collection(db, 'groups', groupIdString, 'messages');
      const expiresAt = Timestamp.fromDate(new Date(Date.now() + expiryHours * 60 * 60 * 1000));

      await addDoc(messagesRef, {
        type: 'poll',
        senderId: userData.uid,
        senderName: userData.name || userData.displayName || userData.email,
        senderPhoto: userData.photoURL || null,
        timestamp: serverTimestamp(),
        readBy: [userData.uid],
        pollData: {
          question: question.trim(),
          options: validOptions.map((text, index) => ({
            id: `opt_${Date.now()}_${index}`,
            text: text.trim(),
            votes: []
          })),
          expiresAt,
          allowMultiple,
          createdBy: userData.uid
        }
      });

      burgerToast.success('Poll created successfully!');
      onClose();
    } catch (error) {
      console.error('Error creating poll:', error);
      burgerToast.error('Failed to create poll');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-3xl max-h-[95vh] bg-gradient-to-br from-base-100 to-base-200 shadow-2xl border border-info/20 p-0 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-br from-base-100 to-base-200 px-4 sm:px-6 py-4 border-b border-base-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="bg-gradient-to-br from-info to-blue-600 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg shrink-0">
                <FaPoll className="text-white text-xl sm:text-2xl" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg sm:text-2xl text-base-content truncate">Create Poll</h3>
                <p className="text-xs sm:text-sm text-base-content/60 line-clamp-2">Get feedback from your group members</p>
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
          {/* Question */}
          <div className="form-control">
            <label className="label px-0">
              <span className="label-text font-semibold text-sm sm:text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-info animate-pulse"></span>
                Poll Question
              </span>
              <span className="label-text-alt text-base-content/50 text-xs sm:text-sm">
                {question.length}/200
              </span>
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
              placeholder="e.g., What should we cook for dinner?"
              className="input input-bordered focus:outline-none focus:border-info focus:ring-2 focus:ring-info/20 bg-base-100 rounded-xl shadow-sm text-sm sm:text-base"
              required
            />
          </div>

          {/* Options */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold text-base">Poll Options</span>
              <span className="label-text-alt text-base-content/60">
                {options.length}/10 options • Min 2 required
              </span>
            </label>
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2 items-center group">
                  <span className="text-base-content/40 font-semibold min-w-[24px]">
                    {index + 1}.
                  </span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value.slice(0, 100))}
                    placeholder={`Option ${index + 1}`}
                    className="input input-bordered flex-1 focus:outline-none focus:border-info focus:ring-2 focus:ring-info/20 bg-base-100 rounded-xl shadow-sm"
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="btn btn-square btn-sm btn-ghost text-error hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove option"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="btn btn-sm btn-outline btn-info gap-2 mt-3 hover:scale-105 transition-all"
              >
                <FaPlus />
                Add Option
              </button>
            )}
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 gap-4">
            {/* Expiry Time */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Expires In</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(parseInt(e.target.value))}
                  className="input input-bordered w-full focus:outline-none focus:border-info focus:ring-2 focus:ring-info/20 bg-base-100 rounded-xl shadow-sm pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base-content/50 font-medium">
                  hours
                </span>
              </div>
              <label className="label">
                <span className="label-text-alt text-base-content/50">
                  Max 168 hours (7 days)
                </span>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="alert alert-info shadow-lg">
            <FaPoll className="text-xl" />
            <div className="text-sm">
              <p className="font-semibold">Poll Preview</p>
              <p className="text-base-content/70">
                Members can vote on {options.filter(o => o.trim()).length} options. 
                Poll expires in {expiryHours} hour{expiryHours !== 1 ? 's' : ''}.
                {' '}Single choice only - members can change their vote.
              </p>
            </div>
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
              className="btn bg-gradient-to-r from-info to-blue-600 border-none text-white shadow-lg hover:shadow-info/50 hover:scale-105 transition-all gap-2 w-full sm:w-auto sm:flex-1"
              disabled={creating}
            >
              {creating ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  <span className="hidden sm:inline">Creating...</span>
                </>
              ) : (
                <>
                  <FaPoll />
                  Create Poll
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

export default PollCreator;
