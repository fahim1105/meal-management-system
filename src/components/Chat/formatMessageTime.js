import { format, isToday, isYesterday } from 'date-fns';

/**
 * Format message timestamp:
 * - Today → "2:30 PM"
 * - Yesterday → "Yesterday"
 * - Older → "20 May" or "20 May 2024" (if different year)
 */
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return 'Just now';

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();

  if (isToday(date)) {
    return format(date, 'h:mm a');
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  const isSameYear = date.getFullYear() === now.getFullYear();
  return isSameYear
    ? format(date, 'dd MMM')
    : format(date, 'dd MMM yyyy');
};
