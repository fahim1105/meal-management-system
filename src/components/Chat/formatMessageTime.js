import { format, isToday, isYesterday, differenceInHours } from 'date-fns';

/**
 * Format message timestamp:
 * - Within 24 hours → "2:30 PM"
 * - Yesterday → "Yesterday"
 * - Older → "20 May" or "20 May 2024" (if different year)
 */
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return 'Just now';

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const hoursDiff = differenceInHours(now, date);

  if (hoursDiff < 24) {
    // Within 24 hours — show time only
    return format(date, 'h:mm a'); // e.g. "2:30 PM"
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  // Older — show date
  const isSameYear = date.getFullYear() === now.getFullYear();
  return isSameYear
    ? format(date, 'dd MMM')       // e.g. "20 May"
    : format(date, 'dd MMM yyyy'); // e.g. "20 May 2024"
};
