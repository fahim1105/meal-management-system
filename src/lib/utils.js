/**
 * Utility function to convert MongoDB ObjectId to string
 * Handles various ObjectId formats from MongoDB/Mongoose
 */
export const objectIdToString = (id) => {
  if (!id) return null;
  if (typeof id === 'string') return id;
  
  // Handle MongoDB ObjectId formats
  if (id.$oid) return id.$oid; // MongoDB JSON format
  if (id._id) return String(id._id);
  if (id.toHexString && typeof id.toHexString === 'function') return id.toHexString(); // MongoDB ObjectId method
  
  // Try toString() but avoid '[object Object]'
  if (id.toString && typeof id.toString === 'function') {
    const stringified = id.toString();
    // Only use toString if it returns a valid ObjectId string (24 hex characters)
    if (stringified !== '[object Object]' && /^[0-9a-fA-F]{24}$/.test(stringified)) {
      return stringified;
    }
  }
  
  // Last resort: try to extract from object properties
  if (typeof id === 'object') {
    // Check for common ObjectId properties
    const keys = Object.keys(id);
    
    // If single property that looks like ObjectId
    if (keys.length === 1 && /^[0-9a-fA-F]{24}$/.test(keys[0])) {
      return keys[0];
    }
    
    // Check if any property value looks like an ObjectId
    for (const key in id) {
      const value = id[key];
      if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
        return value;
      }
    }
    
    // Check for nested _id or $oid
    if (id.id && typeof id.id === 'string' && /^[0-9a-fA-F]{24}$/.test(id.id)) {
      return id.id;
    }
  }
  
  console.warn('⚠️ Could not convert ObjectId to string:', {
    id,
    type: typeof id,
    keys: typeof id === 'object' ? Object.keys(id) : 'not object',
    toString: id?.toString?.()
  });
  
  return null; // Return null if we can't convert properly
};

/**
 * Helper function to get display name from user data
 * Priority: name > displayName > email
 */
export const getDisplayName = (userData) => {
  if (!userData) return 'Unknown User';
  return userData.name || userData.displayName || userData.email || 'Unknown User';
};

/**
 * Helper function to extract username from email
 * Used for backward compatibility with existing messages
 */
export const getUsernameFromEmail = (email) => {
  if (!email || typeof email !== 'string') return 'Unknown';
  return email.split('@')[0];
};