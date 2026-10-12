import { describe, it, expect } from 'vitest';
import { buildReminderPlan } from './reminderSchedule';

const NOW = new Date(2026, 5, 15, 12, 0, 0).getTime(); // Mon Jun 15 2026 12:00 local

describe('buildReminderPlan', () => {
  it('dedupes offsets and drops legacy none', () => {
    const plan = buildReminderPlan(
      {
        offsets: ['10min', '10min', 'none', '5min'],
        days: [],
        startDate: new Date(2026, 5, 15, 13, 0).toISOString(),
        endDate: null,
      },
      NOW,
    );
    expect(plan.offsets).toEqual(['10min', '5min']);
    expect(plan.entries).toHaveLength(2);
    // Sorted by fire time: 10min-before (12:50) then 5min-before (12:55).
    expect(plan.entries[0].offset).toBe('10min');
    expect(plan.entries[1].offset).toBe('5min');
  });

  it('returns empty entries when everything is in the past', () => {
    const plan = buildReminderPlan(
      {
        offsets: ['5min'],
        days: [],
        startDate: new Date(2026, 5, 15, 11, 0).toISOString(),
        endDate: null,
      },
      NOW,
    );
    expect(plan.offsets).toEqual(['5min']);
    expect(plan.entries).toHaveLength(0);
  });

  it('ignores invalid anchor dates instead of scheduling NaN alarms', () => {
    const plan = buildReminderPlan(
      { offsets: ['5min'], days: [], startDate: 'not-a-date', endDate: null },
      NOW,
    );
    expect(plan.anchorDates).toHaveLength(0);
    expect(plan.entries).toHaveLength(0);
  });

  it('expands weekday repeats across the range keeping time-of-day', () => {
    // Start Mon Jun 15 09:00, end Wed Jun 17; remind on Tue + Wed only.
    const plan = buildReminderPlan(
      {
        offsets: ['5min'],
        days: [2, 3],
        startDate: new Date(2026, 5, 15, 9, 0).toISOString(),
        endDate: new Date(2026, 5, 17, 9, 0).toISOString(),
      },
      NOW,
    );
    expect(plan.anchorDates).toHaveLength(2);
    expect(plan.anchorDates[0].getDay()).toBe(2);
    expect(plan.anchorDates[0].getHours()).toBe(9);
    expect(plan.entries).toHaveLength(2);
  });

  it('caps runaway offset x weekday combinations', () => {
    const plan = buildReminderPlan(
      {
        offsets: ['5min', '10min', '15min', '30min', '1hr', '1day'],
        days: [0, 1, 2, 3, 4, 5, 6],
        startDate: new Date(2026, 5, 15, 9, 0).toISOString(),
        endDate: new Date(2027, 5, 15, 9, 0).toISOString(),
      },
      NOW,
    );
    expect(plan.entries.length).toBeLessThanOrEqual(64);
  });
});
