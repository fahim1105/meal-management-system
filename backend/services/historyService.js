import Finance from '../models/Finance.js';
import MealSheet from '../models/MealSheet.js';

/**
 * Build personal meal/finance history for a group member across membership intervals.
 * Same data as GET /api/finance/my-history.
 */
export async function computeMemberHistory(group, member, uid) {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const intervals = [];
  const joinStart = new Date(member.joinedAt);

  if (member.leftAt) {
    intervals.push({ start: joinStart, end: new Date(member.leftAt) });
    if (member.rejoinedAt) {
      intervals.push({ start: new Date(member.rejoinedAt), end: now });
    }
  } else {
    intervals.push({ start: joinStart, end: now });
  }

  const firstJoinMonth = new Date(joinStart.getFullYear(), joinStart.getMonth(), 1);
  const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const toMonthStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const isInInterval = (monthDate) =>
    intervals.some(({ start, end }) => {
      // Get the first and last day of the month we're checking
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0); // Last day of month
      
      // Check if there's ANY overlap between the month and the membership interval
      // Month overlaps if: interval starts before month ends AND interval ends after month starts
      return start <= monthEnd && end >= monthStart;
    });

  const months = [];
  let cur = new Date(firstJoinMonth);
  while (cur <= endMonth) {
    months.push(toMonthStr(cur));
    cur.setMonth(cur.getMonth() + 1);
  }

  if (months.length === 0) {
    return { history: [], currentMonthStr };
  }

  const [finances, mealSheets] = await Promise.all([
    Finance.find({ groupId: group._id, month: { $in: months } }),
    MealSheet.find({ groupId: group._id, month: { $in: months } }),
  ]);

  const financeMap = Object.fromEntries(finances.map((f) => [f.month, f]));
  const mealMap = Object.fromEntries(mealSheets.map((m) => [m.month, m]));

  // Pre-resolve current manager name as fallback for months with no Finance doc yet
  const currentManagerMember = group.members.find(
    (m) => String(m.userId) === String(group.managerId)
  );
  const currentManagerName = currentManagerMember?.name || '';

  const history = months.map((month) => {
    const finance = financeMap[month];
    const mealSheet = mealMap[month];
    const monthDate = new Date(month + '-01');
    const inRange = isInInterval(monthDate);
    const isCurrentMonth = month === currentMonthStr;

    const totalBazar = finance?.bazarCosts?.reduce((s, b) => s + b.amount, 0) || 0;

    let breakfast = 0;
    let lunch = 0;
    let dinner = 0;
    let totalMeals = 0;
    let groupTotalMeals = 0;

    if (mealSheet?.days) {
      const days =
        mealSheet.days instanceof Map
          ? [...mealSheet.days.entries()]
          : Object.entries(mealSheet.days);

      for (const [, meals] of days) {
        if (!Array.isArray(meals)) continue;
        meals.forEach((meal) => {
          const tb = meal.breakfast ? meal.breakfastCount || 1 : 0;
          const tl = meal.lunch ? meal.lunchCount || 1 : 0;
          const td = meal.dinner ? meal.dinnerCount || 1 : 0;
          groupTotalMeals += tb + tl + td;
          if (meal.userId === uid) {
            breakfast += tb;
            lunch += tl;
            dinner += td;
            totalMeals += tb + tl + td;
          }
        });
      }
    }

    const mealRate = groupTotalMeals > 0 ? totalBazar / groupTotalMeals : 0;
    const cost = Math.round(totalMeals * mealRate * 100) / 100;
    const deposit =
      finance?.deposits
        ?.filter((d) => d.userId === uid)
        .reduce((s, d) => s + d.amount, 0) || 0;
    const balance = Math.round((deposit - cost) * 100) / 100;

    // Finance doc stamped with manager at creation time (or updated on transfer).
    // Old docs with no managerName show — rather than a misleading fallback name.
    const managerName = finance?.managerName || (finance ? '' : currentManagerName);

    return {
      month,
      breakfast,
      lunch,
      dinner,
      totalMeals,
      totalBazar,
      mealRate,
      deposit,
      cost,
      balance,
      managerName,
      isCurrentMonth,
      inRange,
      isGap: !inRange,
      hasData: totalMeals > 0 || deposit > 0 || totalBazar > 0,
    };
  });

  return { history, currentMonthStr };
}
