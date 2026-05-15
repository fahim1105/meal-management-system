# Reaction Modal Single Instance Fix

## Problem (সমস্যা)
Mobile device এ chat message এ long press করলে reaction modal খুলতো। কিন্তু একসাথে multiple messages এর modal খোলা থাকতো:

```
Message 1 [long press] → Modal 1 খোলে
Message 2 [long press] → Modal 2 খোলে (কিন্তু Modal 1 ও খোলা থাকে) ❌
```

**Expected Behavior:**
```
Message 1 [long press] → Modal 1 খোলে
Message 2 [long press] → Modal 1 বন্ধ হয়, Modal 2 খোলে ✅
```

## Solution (সমাধান)

### 1. **Shared State in Parent Component**
`MessageList.jsx` এ একটা shared state add করা হয়েছে যা track করে কোন message এর reaction modal খোলা আছে:

```javascript
const [activeReactionMessageId, setActiveReactionMessageId] = useState(null);
```

এই state সব MessageItem components এ pass করা হয়েছে:

```jsx
<MessageItem
  key={message.id}
  message={message}
  activeReactionMessageId={activeReactionMessageId}
  setActiveReactionMessageId={setActiveReactionMessageId}
  // ... other props
/>
```

### 2. **MessageItem Component Updates**

#### Props Added:
```javascript
const MessageItem = ({ 
  message, 
  isOwn, 
  groupId, 
  onReply, 
  activeReactionMessageId,        // NEW
  setActiveReactionMessageId      // NEW
}) => {
```

#### Long Press Handler Updated:
```javascript
longPressTimer.current = setTimeout(() => {
  if (!isSwiping && swipeOffset === 0) {
    // Close any other open reaction modal first
    if (activeReactionMessageId && activeReactionMessageId !== message.id) {
      setActiveReactionMessageId(null);
    }
    
    // Set this message as active and show reactions
    setActiveReactionMessageId(message.id);
    setShowReactions(true);
  }
}, 500);
```

#### Context Menu React Button Updated:
```javascript
const handleShowReactions = () => {
  // Close any other open reaction modal first
  if (activeReactionMessageId && activeReactionMessageId !== message.id) {
    setActiveReactionMessageId(null);
  }
  
  // Set this message as active and show reactions
  setActiveReactionMessageId(message.id);
  setShowReactions(true);
  setShowContextMenu(false);
};
```

#### New useEffect for Auto-Close:
```javascript
// Close this message's reaction modal if another message's modal is opened
useEffect(() => {
  if (activeReactionMessageId && activeReactionMessageId !== message.id) {
    setShowReactions(false);
    setShowContextMenu(false);
  }
}, [activeReactionMessageId, message.id]);
```

## How It Works (কিভাবে কাজ করে)

### Flow Diagram:
```
User long presses Message 1
    ↓
setActiveReactionMessageId('message-1-id')
    ↓
Message 1: showReactions = true (modal খোলে)
    ↓
User long presses Message 2
    ↓
Check: activeReactionMessageId !== message.id? YES
    ↓
setActiveReactionMessageId(null) → then setActiveReactionMessageId('message-2-id')
    ↓
Message 1 useEffect detects: activeReactionMessageId !== message.id
    ↓
Message 1: setShowReactions(false) (modal বন্ধ হয়)
    ↓
Message 2: setShowReactions(true) (modal খোলে)
```

### State Management:
1. **Parent (MessageList)** maintains `activeReactionMessageId`
2. **Child (MessageItem)** maintains local `showReactions` state
3. When a message opens its modal → updates parent's `activeReactionMessageId`
4. Other messages detect the change → close their modals automatically

## Files Modified

### 1. `src/components/Chat/MessageList.jsx`
- ✅ Added `activeReactionMessageId` state
- ✅ Passed state and setter to MessageItem components

### 2. `src/components/Chat/MessageItem.jsx`
- ✅ Added new props: `activeReactionMessageId`, `setActiveReactionMessageId`
- ✅ Updated long press handler to use shared state
- ✅ Updated `handleShowReactions` to use shared state
- ✅ Added new useEffect to auto-close when another modal opens

## Testing Checklist

### Mobile (Long Press):
- [ ] Long press Message 1 → Modal 1 খোলে
- [ ] Long press Message 2 → Modal 1 বন্ধ, Modal 2 খোলে
- [ ] Long press Message 3 → Modal 2 বন্ধ, Modal 3 খোলে
- [ ] Long press Message 4 → Modal 3 বন্ধ, Modal 4 খোলে
- [ ] একই message এ আবার long press → Modal toggle হয়

### Desktop (Right Click → React):
- [ ] Message 1 right click → React → Modal 1 খোলে
- [ ] Message 2 right click → React → Modal 1 বন্ধ, Modal 2 খোলে
- [ ] Context menu থেকে React button কাজ করে

### Edge Cases:
- [ ] Modal খোলা অবস্থায় scroll করলে বন্ধ হয়
- [ ] ESC key press করলে বন্ধ হয়
- [ ] Outside click করলে বন্ধ হয়
- [ ] Swipe gesture modal কে affect করে না

## Benefits (সুবিধা)

✅ **Single Modal Instance**: একবারে শুধু একটা reaction modal খোলে
✅ **Better UX**: User confusion কম হয়
✅ **Clean State Management**: Parent-child state coordination
✅ **Performance**: Unnecessary multiple modals render হয় না
✅ **Consistent Behavior**: Mobile এবং desktop উভয়েই same behavior

## Technical Details

### State Hierarchy:
```
MessageList (Parent)
  ├─ activeReactionMessageId (shared state)
  │
  ├─ MessageItem 1
  │   └─ showReactions (local state)
  │
  ├─ MessageItem 2
  │   └─ showReactions (local state)
  │
  └─ MessageItem 3
      └─ showReactions (local state)
```

### Why This Approach?
1. **Centralized Control**: Parent controls which modal is active
2. **Automatic Cleanup**: useEffect automatically closes other modals
3. **Scalable**: Works with any number of messages
4. **No Prop Drilling**: Only passes 2 props (state + setter)

## Alternative Approaches Considered

### ❌ Approach 1: Close all modals on every open
```javascript
// Would require passing all message IDs and closing them manually
// Too complex and error-prone
```

### ❌ Approach 2: Global context for modal state
```javascript
// Overkill for this use case
// Adds unnecessary complexity
```

### ✅ Approach 3: Parent state with child coordination (CHOSEN)
```javascript
// Simple, effective, and maintainable
// Uses React's natural parent-child communication
```

## Future Enhancements (Optional)

- [ ] Add animation when switching between modals
- [ ] Add haptic feedback when modal closes automatically
- [ ] Track analytics: which reactions are most used
- [ ] Add keyboard shortcuts for reactions (1-6 keys)
