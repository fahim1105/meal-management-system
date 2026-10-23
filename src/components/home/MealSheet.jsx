import { useState, useMemo } from 'react';
import { FaCheck } from 'react-icons/fa';

const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const MEALS = ['Breakfast', 'Lunch', 'Dinner'];
const DEMO_BAZAR = 4200;

const MealSheet = () => {
  // grid[dayIndex][mealIndex] = boolean
  const [grid, setGrid] = useState(() =>
    DAYS.map(() => MEALS.map(() => false))
  );

  const toggle = (d, m) => {
    setGrid(prev => {
      const next = prev.map(row => [...row]);
      next[d][m] = !next[d][m];
      return next;
    });
  };

  const totalMeals = useMemo(
    () => grid.flat().filter(Boolean).length,
    [grid]
  );

  const mealRate = totalMeals > 0
    ? (DEMO_BAZAR / totalMeals).toFixed(2)
    : '—';

  return (
    <div
      className="rounded-[18px] bg-white border border-[var(--color-accent-1)] shadow-[0_8px_32px_rgba(92,112,87,0.12)] overflow-hidden w-full max-w-sm mx-auto lg:mx-0"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
        <div>
          <p className="text-sm font-600 text-[var(--muted)]">This week's meals</p>
          <p className="text-xs text-[var(--muted)]/70 mt-0.5">Tap to try it</p>
        </div>
        <div className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center"
          style={{ background: 'var(--color-accent-2)' }}>
          <span className="text-base leading-none">🍽</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ background: 'var(--color-accent-2)' }}>
              <th className="py-2.5 pl-4 pr-2 text-left font-600 text-[var(--muted)] w-12">Day</th>
              {MEALS.map(m => (
                <th key={m} className="py-2.5 px-1 text-center font-600 text-[var(--muted)]">
                  <span className="hidden sm:inline">{m}</span>
                  <span className="sm:hidden">{m[0]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, d) => (
              <tr key={day} className="border-t border-[var(--line)]">
                <td className="pl-4 pr-2 py-1.5 font-600 text-[var(--text)] text-xs">{day}</td>
                {MEALS.map((_, m) => {
                  const on = grid[d][m];
                  return (
                    <td key={m} className="px-1 py-1.5 text-center">
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(d, m)}
                        className="hg-focus w-11 h-11 rounded-[var(--radius-sm)] flex items-center justify-center mx-auto transition-all duration-150"
                        style={{
                          background: on ? 'var(--color-primary)' : 'transparent',
                          border: `1.5px ${on ? 'solid' : 'dashed'} ${on ? 'var(--color-primary)' : 'var(--color-accent-1)'}`,
                          minWidth: 44,
                          minHeight: 44,
                        }}
                      >
                        {on && <FaCheck className="text-white text-xs" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      <div className="grid grid-cols-3 divide-x divide-[var(--line)] border-t border-[var(--line)]"
        style={{ background: 'var(--color-accent-2)' }}>
        {[
          { label: 'Total meals', value: totalMeals },
          { label: 'Bazar', value: `৳${DEMO_BAZAR.toLocaleString()}` },
          { label: 'Meal rate', value: mealRate === '—' ? '—' : `৳${mealRate}` },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center py-3 px-2 gap-0.5">
            <span className="text-[10px] text-[var(--muted)]">{label}</span>
            <span className="text-sm font-700 text-[var(--text)]"
              style={{ fontFamily: 'var(--font-heading)' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MealSheet;
