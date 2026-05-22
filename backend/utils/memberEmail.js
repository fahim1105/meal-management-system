import User from '../models/User.js';

/** Prefer group.members.email; fall back to User collection. */
export async function resolveMemberEmail(group, userId) {
  const member = group?.members?.find((m) => m.userId === userId);
  if (member?.email) return member.email;
  const user = await User.findOne({ uid: userId }).select('email');
  return user?.email || null;
}
