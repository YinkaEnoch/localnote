import type { EventSound, ReminderOffset } from '@/types/models';

/** Minutes before the anchor each selectable offset fires. */
export const OFFSET_MINUTES: Record<ReminderOffset, number> = {
  none: 0,
  '5min': 5,
  '10min': 10,
  '15min': 15,
  '30min': 30,
  '1hr': 60,
  '1day': 1440,
};

/** Android caps pending alarms; stay safely below it. */
export const MAX_SCHEDULED_REMINDERS = 64;

export interface ReminderScheduleInput {
  parentId: string;
  parentType: 'event' | 'note';
  title: string;
  offsets: ReminderOffset[];
  sound: EventSound;
  days: number[];
  startDate: string; // ISO 8601 anchor (and start of the recurrence range)
  endDate: string | null; // ISO 8601 end of the recurrence range (optional)
  /** Fragment placed before the formatted fire date in the notification body. */
  bodyPrefix: string;
}

export interface ReminderEntry {
  remindAt: Date;
  offset: ReminderOffset;
}

export interface BuiltReminderPlan {
  /** Deduped, valid offsets (excluding 'none'). Empty = no reminder. */
  offsets: ReminderOffset[];
  /** Anchor dates to remind on (start date only, or matching weekdays in range). */
  anchorDates: Date[];
  /** Future-only fire times, sorted ascending and capped. */
  entries: ReminderEntry[];
}

/**
 * Pure computation of reminder fire times — no Capacitor, storage, or Date.now()
 * hidden inside (pass `nowMs` explicitly) so it is trivially unit-testable.
 */
export const buildReminderPlan = (
  input: Pick<ReminderScheduleInput, 'offsets' | 'days' | 'startDate' | 'endDate'>,
  nowMs: number,
): BuiltReminderPlan => {
  const offsets = (Array.isArray(input.offsets) ? input.offsets : [])
    .filter((o): o is ReminderOffset => o !== 'none' && OFFSET_MINUTES[o] !== undefined)
    .filter((o, i, arr) => arr.indexOf(o) === i); // dedupe

  const anchorDates: Date[] = [];
  const days = Array.isArray(input.days)
    ? [...new Set(input.days)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort((a, b) => a - b)
    : [];

  const start = input.startDate ? new Date(input.startDate) : null;
  if (offsets.length > 0 && start && !Number.isNaN(start.getTime())) {
    if (days.length === 0) {
      // Single reminder on the start date (previous behaviour).
      anchorDates.push(start);
    } else {
      const endRaw = input.endDate ? new Date(input.endDate) : start;
      const end = Number.isNaN(endRaw.getTime()) ? start : endRaw;
      // Normalise both to local midnight so day iteration is inclusive/correct.
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

      for (
        let day = new Date(startDay);
        day <= endDay && anchorDates.length < MAX_SCHEDULED_REMINDERS;
        day.setDate(day.getDate() + 1)
      ) {
        if (days.includes(day.getDay())) {
          // Keep the time-of-day from the start date.
          const at = new Date(day);
          at.setHours(start.getHours(), start.getMinutes(), 0, 0);
          anchorDates.push(new Date(at));
        }
      }
    }
  }

  const entries: ReminderEntry[] = [];
  for (const offset of offsets) {
    for (const at of anchorDates) {
      const remindAt = new Date(at.getTime() - OFFSET_MINUTES[offset] * 60_000);
      if (remindAt.getTime() > nowMs) {
        entries.push({ remindAt, offset });
      }
    }
  }
  entries.sort((a, b) => a.remindAt.getTime() - b.remindAt.getTime());
  const capped = entries.slice(0, MAX_SCHEDULED_REMINDERS);

  return { offsets, anchorDates, entries: capped };
};
