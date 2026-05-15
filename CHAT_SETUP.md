# 💬 In-App Chat System Setup Guide

## ✅ What's Implemented

### Features:
- ✅ Real-time group chat
- ✅ Message history (last 100 messages)
- ✅ Read receipts
- ✅ Typing indicators
- ✅ Message reactions (👍, ❤️, 😂, 😮, 😢, 🎉)
- ✅ Manager announcements (highlighted messages)
- ✅ Poll/voting system with expiry
- ✅ Online user count
- ✅ **Responsive Design:**
  - **Mobile:** Floating chat button + Full-screen modal
  - **Desktop:** Fixed right sidebar (collapsible)
- ✅ Unread message badges
- ✅ Smooth animations

### Components Created:
```
src/components/Chat/
├── ChatContainer.jsx          ✅ Main chat wrapper
├── ChatHeader.jsx             ✅ Header with online count
├── MessageList.jsx            ✅ Scrollable message list
├── MessageItem.jsx            ✅ Regular message with reactions
├── AnnouncementItem.jsx       ✅ Highlighted announcement
├── PollItem.jsx               ✅ Interactive poll with voting
├── MessageInput.jsx           ✅ Text input with typing indicator
├── TypingIndicator.jsx        ✅ "User is typing..." display
├── AnnouncementCreator.jsx    ✅ Modal to create announcements
├── PollCreator.jsx            ✅ Modal to create polls
├── FloatingChatButton.jsx     ✅ Floating button (mobile)
├── ChatModal.jsx              ✅ Full-screen modal (mobile)
├── ChatSidebar.jsx            ✅ Right sidebar (desktop)
└── ResponsiveChatWrapper.jsx  ✅ Responsive wrapper
```

---

## 🚀 Setup Instructions

### Step 1: Enable Firestore in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **meeal-manageemeent**
3. Click on **"Firestore Database"** in the left sidebar
4. Click **"Create database"**
5. Choose **"Start in production mode"** (we'll add rules next)
6. Select a location (choose closest to your users, e.g., **asia-south1** for Bangladesh)
7. Click **"Enable"**

### Step 2: Set Firestore Security Rules

1. In Firestore Database, go to the **"Rules"** tab
2. Copy the contents of `firestore.rules` file from your project root
3. Paste it into the Firebase Console rules editor
4. Click **"Publish"**

### Step 3: Install Required Dependencies

```bash
# Already installed in your project, but if needed:
npm install firebase date-fns
```

### Step 4: Test the Chat

1. Start your development server:
```bash
npm run dev
```

2. Login to your account
3. Go to Dashboard
4. Click on the **"Chat"** tab (purple color)
5. Try sending a message
6. Open another browser/incognito window and login with another account
7. See real-time messages!

---

## 🎯 How to Use

### For All Members:

#### Send a Message:
1. Go to Dashboard → Chat tab
2. Type your message in the input box
3. Press Enter or click Send button
4. Message appears instantly for all members

#### React to Messages:
1. Hover over any message
2. Click the 😊 button that appears
3. Select an emoji reaction
4. Click again to remove your reaction

#### View Typing Indicators:
- When someone is typing, you'll see "John is typing..." at the bottom

### For Managers Only:

#### Create an Announcement:
1. Go to Dashboard → Chat tab
2. Click **"Announcement"** button (yellow)
3. Type your announcement
4. Optionally check "Pin this announcement" for highlighting
5. Click "Post Announcement"
6. All members see it highlighted in yellow

#### Create a Poll:
1. Go to Dashboard → Chat tab
2. Click **"Create Poll"** button (blue)
3. Enter your question (e.g., "What should we cook tomorrow?")
4. Add at least 2 options
5. Set expiry time (default 24 hours)
6. Optionally allow multiple choices
7. Click "Create Poll"
8. Members can vote by clicking options
9. Results update in real-time

---

## 📊 Firestore Data Structure

### Messages Collection:
```
groups/{groupId}/messages/{messageId}
├── type: "message" | "announcement" | "poll"
├── senderId: "user-uid"
├── senderName: "John Doe"
├── senderPhoto: "url" or null
├── content: "Message text"
├── timestamp: Firestore Timestamp
├── readBy: ["uid1", "uid2"]
├── reactions: { "👍": ["uid1"], "❤️": ["uid2"] }
├── isPinned: true/false (for announcements)
└── pollData: { ... } (for polls)
```

### Typing Collection:
```
groups/{groupId}/typing/{userId}
├── userId: "user-uid"
├── userName: "John Doe"
└── timestamp: Firestore Timestamp
```

---

## 🎨 UI Features

### Message Types:

1. **Regular Message** (White/Primary bubble)
   - Shows sender name and photo
   - Timestamp
   - Reaction buttons on hover
   - Different color for own messages

2. **Announcement** (Yellow highlighted)
   - Special badge "ANNOUNCEMENT"
   - Optional "Pinned" badge
   - Manager name and photo
   - Larger, more prominent display

3. **Poll** (Blue highlighted)
   - Special badge "POLL"
   - Question in bold
   - Clickable options with vote counts
   - Progress bars showing percentages
   - Expiry countdown
   - "Expired" badge when time is up

### Responsive Design:
- Works on mobile, tablet, and desktop
- Scrollable message list
- Auto-scroll to bottom on new messages
- Touch-friendly buttons

---

## 💰 Firebase Free Tier Limits

Your usage should stay within free tier:

- **Firestore Reads:** 50,000/day
- **Firestore Writes:** 20,000/day
- **Firestore Deletes:** 20,000/day
- **Storage:** 1 GB
- **Network:** 10 GB/month

**Estimated usage for 50 active users:**
- ~5,000 reads/day (well within limit)
- ~2,000 writes/day (well within limit)

---

## 🔧 Troubleshooting

### Messages not appearing?
1. Check Firebase Console → Firestore Database
2. Verify data is being written to `groups/{groupId}/messages`
3. Check browser console for errors
4. Verify Firestore rules are published

### "Permission denied" error?
1. Go to Firebase Console → Firestore → Rules
2. Make sure rules are published
3. Check that user is authenticated (logged in)

### Typing indicator not working?
1. Check if `groups/{groupId}/typing` collection exists
2. Verify rules allow write access to typing collection
3. Check browser console for errors

### Reactions not updating?
1. Verify Firestore rules allow `update` on messages
2. Check browser console for errors
3. Try refreshing the page

---

## 🚀 Future Enhancements (Optional)

If you want to add more features later:

1. **Message Search** - Search through chat history
2. **Message Editing** - Edit sent messages
3. **Message Deletion** - Delete own messages
4. **@Mentions** - Tag specific members
5. **Image Sharing** - Upload and share images
6. **Voice Messages** - Record and send audio
7. **Message Threads** - Reply to specific messages
8. **Emoji Picker** - Better emoji selection UI
9. **Message Notifications** - Browser push notifications
10. **Read Receipts UI** - Show who read each message

---

## 📝 Notes

- Chat data is stored in **Firestore** (not MongoDB)
- Messages are **real-time** using Firestore listeners
- **No backend API needed** for chat (direct Firebase connection)
- Group ID from MongoDB is used as Firestore collection ID
- Chat is **separate from your main backend** (serverless)

---

## ✅ Testing Checklist

- [ ] Firestore enabled in Firebase Console
- [ ] Security rules published
- [ ] Can send regular messages
- [ ] Messages appear in real-time
- [ ] Typing indicator works
- [ ] Can add reactions to messages
- [ ] Manager can create announcements
- [ ] Manager can create polls
- [ ] Can vote on polls
- [ ] Poll results update in real-time
- [ ] Online count shows active users
- [ ] Works on mobile devices

---

## 🎉 You're Done!

Your chat system is now fully functional! Members can communicate in real-time, managers can make announcements, and everyone can participate in polls.

Enjoy your new chat feature! 💬🚀
