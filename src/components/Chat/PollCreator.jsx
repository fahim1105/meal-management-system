import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { FaPoll, FaTimes, FaPlus, FaTrash, FaClock } from 'react-icons/fa';
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
      const hours = Number(expiryHours);
      if (!Number.isFinite(hours) || hours < 1) {
        burgerToast.error('Please set a valid expiry time (1–168 hours)');
        setCreating(false);
        return;
      }

      const messagesRef = collection(db, 'groups', groupIdString, 'messages');
      const expiresAt = Timestamp.fromDate(new Date(Date.now() + hours * 60 * 60 * 1000));

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

  // Quick expiry presets (optional chips)
  const expiryPresets = [
    { label: '6h', hours: 6 },
    { label: '12h', hours: 12 },
    { label: '24h', hours: 24 },
    { label: '3d', hours: 72 },
    { label: '7d', hours: 168 },
  ];

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
          className="pointer-events-auto w-full lg:w-auto lg:min-w-[560px] lg:max-w-[calc(100%-32px)] max-h-[85vh] lg:max-h-[75vh] flex flex-col
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
            <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-[var(--md-poll-icon)] flex items-center justify-center shrink-0">
              <FaPoll className="text-white text-lg lg:text-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg lg:text-xl font-bold text-base-content">
                Create Poll
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
          <form onSubmit={handleCreate} className="flex-1 overflow-y-auto px-5 lg:px-6 py-5 space-y-5 scrollbar-thin scrollbar-thumb-base-content/20 scrollbar-track-transparent">
            {/* Question Field */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <label htmlFor="poll-question" className="text-sm font-semibold text-[var(--md-label)]">
                  Question
                </label>
                <span className="text-xs font-medium text-[var(--md-helper)]">
                  {question.length}/200
                </span>
              </div>
              <input
                type="text"
                id="poll-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
                placeholder="e.g., What should we cook for dinner?"
                className="w-full px-4 py-3 text-sm lg:text-base bg-[var(--md-input-bg)] border border-[var(--md-input-border)] rounded-[var(--md-radius-field)]
                           text-base-content placeholder:text-base-content/40
                           focus:outline-none focus:border-[var(--md-input-border-focus)] focus:ring-2 focus:ring-[var(--md-input-ring)]
                           transition-colors"
                required
                maxLength={200}
              />
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--md-label)]">
                Options
              </label>
              <div className="space-y-2.5">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-base-content/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-base-content/60">
                        {index + 1}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value.slice(0, 100))}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-3.5 py-2.5 text-sm bg-[var(--md-input-bg)] border border-[var(--md-input-border)] rounded-[var(--md-radius-field)]
                                 text-base-content placeholder:text-base-content/40
                                 focus:outline-none focus:border-[var(--md-input-border-focus)] focus:ring-2 focus:ring-[var(--md-input-ring)]
                                 transition-colors"
                      required
                      maxLength={100}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-error hover:bg-error/10 transition-colors shrink-0"
                        aria-label={`Remove option ${index + 1}`}
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {options.length < 10 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="mt-2 px-3.5 py-2 text-sm font-medium text-[var(--md-poll-icon)] bg-[var(--md-poll-icon)]/10 hover:bg-[var(--md-poll-icon)]/20 rounded-[var(--md-radius-button)] transition-colors flex items-center gap-2"
                >
                  <FaPlus className="text-xs" />
                  <span>Add Option</span>
                </button>
              )}
              <p className="text-xs text-[var(--md-helper)] mt-1.5">
                {options.length}/10 options • Minimum 2 required
              </p>
            </div>

            {/* Expiry Time */}
            <div className="space-y-2">
              <label htmlFor="poll-expiry" className="text-sm font-semibold text-[var(--md-label)]">
                Expires in
              </label>
              <div className="relative">
                <FaClock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
                <input
                  type="number"
                  id="poll-expiry"
                  min="1"
                  max="168"
                  value={expiryHours}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (Number.isNaN(n)) {
                      setExpiryHours('');
                      return;
                    }
                    setExpiryHours(Math.min(168, Math.max(1, n)));
                  }}
                  className="w-full pl-10 pr-14 py-3 text-sm lg:text-base bg-[var(--md-input-bg)] border border-[var(--md-input-border)] rounded-[var(--md-radius-field)]
                             text-base-content
                             focus:outline-none focus:border-[var(--md-input-border-focus)] focus:ring-2 focus:ring-[var(--md-input-ring)]
                             transition-colors"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--md-helper)]">
                  hours
                </span>
              </div>
              {/* Quick Preset Chips (optional) */}
              <div className="flex flex-wrap gap-2">
                {expiryPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setExpiryHours(preset.hours)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      expiryHours === preset.hours
                        ? 'bg-[var(--md-poll-icon)] text-white'
                        : 'bg-base-content/[0.06] text-base-content/70 hover:bg-base-content/[0.12]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--md-helper)]">
                1–168 hours (7 days max)
              </p>
            </div>

            {/* Preview Card */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--md-label)]">
                Preview
              </label>
              <div className="p-4 bg-[var(--md-preview-bg)] border border-[var(--md-preview-border)] rounded-[var(--md-radius-preview)]">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--md-poll-icon)] flex items-center justify-center shrink-0">
                    <FaPoll className="text-white text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-base-content mb-0.5">
                      {userData?.name || userData?.displayName || 'You'}
                    </div>
                    <p className="text-sm text-base-content/80 break-words">
                      {question.trim() || 'Your poll question will appear here...'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 pl-2">
                  {options.filter(o => o.trim()).slice(0, 3).map((opt, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-sm text-base-content/70">
                      <div className="w-4 h-4 rounded-full border-2 border-current shrink-0" />
                      <span className="truncate">{opt}</span>
                    </div>
                  ))}
                  {options.filter(o => o.trim()).length > 3 && (
                    <div className="text-xs text-[var(--md-helper)] pl-6">
                      +{options.filter(o => o.trim()).length - 3} more
                    </div>
                  )}
                </div>
                <div className="text-xs text-[var(--md-helper)] mt-3 flex items-center gap-1.5">
                  <FaClock />
                  <span>Expires in {expiryHours} hour{expiryHours !== 1 ? 's' : ''}</span>
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
              disabled={creating || !question.trim() || options.filter(o => o.trim()).length < 2}
              className="flex-1 lg:flex-[2] px-4 py-2.5 text-sm font-semibold text-white bg-[var(--md-poll-btn)] hover:opacity-90 rounded-[var(--md-radius-button)] transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <FaPoll />
                  <span>Create Poll</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PollCreator;
