import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ReminderRepository } from '@/database/repositories/ReminderRepository';
import { EventRepository } from '@/database/repositories/EventRepository';
import { NoteRepository } from '@/database/repositories/NoteRepository';
import type { Event, Note, ReminderOffset, EventSound } from '@/types/models';
import { formatNotifyStamp12h } from '@/utils/time';
import { buildReminderPlan } from './reminderSchedule';

/** Notification channel used for events configured with the "long" alarm. */
export const LONG_ALARM_CHANNEL_ID = 'long_alarm';

export type ExactAlarmState = 'granted' | 'denied' | 'unknown';

export type ReminderStatus =
  | 'scheduled'
  | 'cleared'
  | 'none'
  | 'denied'
  | 'error';

export interface ReminderOutcome {
  status: ReminderStatus;
  notificationId: number | null;
  /** Number of OS notifications (re)scheduled. */
  count: number;
  exactAlarm: ExactAlarmState;
  message?: string;
}

const isNative = (): boolean => Capacitor.getPlatform() !== 'web';

/**
 * Creates the high-importance notification channel wired to the bundled
 * `long_alarm.wav` raw resource. Android 8+ plays whatever sound the channel
 * is configured with, so routing a notification to this channel is what gives
 * it the long alarm sound.
 *
 * Idempotent — safe to call on every schedule (deliberately no in-memory
 * "already created" cache: the process can restart between scheduling and a
 * later re-schedule, and createChannel is cheap).
 */
export const ensureLongAlarmChannel = async (): Promise<boolean> => {
  if (!isNative()) return false;
  try {
    await LocalNotifications.createChannel({
      id: LONG_ALARM_CHANNEL_ID,
      name: 'Event alarms',
      description: 'Events using the long alarm sound',
      importance: 4, // IMPORTANCE_HIGH — needed for the sound to actually play
      sound: 'long_alarm',
      vibration: true,
    });
    return true;
  } catch (err) {
    console.error('Failed to create long alarm channel:', err);
    return false;
  }
};

/** Random non-zero int32 notification id — unique per scheduled alert. */
const randomNotificationId = (): number => {
  try {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return (Number(buf[0]) % 2147483647) + 1;
  } catch {
    return Math.floor(Math.random() * 2147483646) + 1;
  }
};

const requestPermissionIfNeeded = async (): Promise<boolean> => {
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') return true;
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (err) {
    console.error('[reminder] permission check failed:', err);
    return false;
  }
};

/** Display (POST_NOTIFICATIONS) permission state without prompting. */
export const checkNotificationPermission = async (): Promise<boolean> => {
  if (!isNative()) return false;
  try {
    const status = await LocalNotifications.checkPermissions();
    return status.display === 'granted';
  } catch (err) {
    console.error('[reminder] checkPermissions failed:', err);
    return false;
  }
};

/**
 * Android 12+ exact-alarm setting. When denied, `setExactAndAllowWhileIdle`
 * falls back to an inexact alarm, so reminders can fire late — surface this
 * to the user instead of failing silently.
 */
export const checkExactAlarmSetting = async (): Promise<ExactAlarmState> => {
  if (!isNative()) return 'unknown';
  try {
    const res = await LocalNotifications.checkExactNotificationSetting();
    return res.exact_alarm === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unknown';
  }
};

/** Opens the system settings screen for the exact-alarm permission (Android 12+). */
export const requestExactAlarmSetting = async (): Promise<ExactAlarmState> => {
  if (!isNative()) return 'unknown';
  try {
    const res = await LocalNotifications.changeExactNotificationSetting();
    return res.exact_alarm === 'granted' ? 'granted' : 'denied';
  } catch {
    return checkExactAlarmSetting();
  }
};


/**
 * Schedules reminder notifications for a parent row (event or note/checklist)
 * and records them in the reminders table. Replaces any previously scheduled
 * reminders for the same parent.
 *
 * Each selected offset in `offsets` fires its own alert at the corresponding
 * time before the anchor. When specific weekdays are selected (`days`,
 * 0 = Sunday … 6 = Saturday) the reminders fire on every matching weekday
 * within [startDate, endDate], at the same time of day as the start date.
 *
 * Returns the scheduled notification id of the first alert (empty when there
 * is nothing to schedule: no reminder, no anchor date, all times past, web
 * platform, or missing permission).
 */
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

/**
 * Schedules reminder notifications for a parent row (event or note/checklist)
 * and records them in the reminders table. Atomically replaces any previously
 * scheduled reminders for the same parent.
 *
 * Ordering (the old code cancelled first, then bailed on permission/empty
 * input — silently deleting working alarms):
 *  1. compute the new plan (pure, via buildReminderPlan);
 *  2. if the new plan is empty, cancel old alarms and clear rows;
 *  3. otherwise request permission, pre-schedule the new OS alarms, and only
 *     then cancel the old ones + persist the new rows. A failed schedule()
 *     leaves the previous alarms untouched.
 *
 * Each selected offset in `offsets` fires its own alert at the corresponding
 * time before the anchor. When specific weekdays are selected (`days`,
 * 0 = Sunday … 6 = Saturday) the reminders fire on every matching weekday
 * within [startDate, endDate], at the same time of day as the start date.
 */
const scheduleReminderDetailed = async (input: ReminderScheduleInput): Promise<ReminderOutcome> => {
  const none: ReminderOutcome = {
    status: 'none',
    notificationId: null,
    count: 0,
    exactAlarm: 'unknown',
  };
  if (!isNative()) return none;

  const plan = buildReminderPlan(input, Date.now());

  // Empty plan (no offsets, bad/missing anchor, or everything in the past):
  // clear any stale alarms so a config change never orphans alerts.
  if (plan.offsets.length === 0 || plan.entries.length === 0) {
    await cancelReminder(input.parentId, input.parentType);
    return { ...none, status: plan.offsets.length === 0 ? 'cleared' : 'none' };
  }

  const granted = await requestPermissionIfNeeded();
  if (!granted) {
    // Do NOT touch the old alarms — the user may grant permission later and
    // re-saving will reschedule.
    return {
      ...none,
      status: 'denied',
      message: 'Notification permission denied — reminder saved but no alarm was scheduled.',
    };
  }

  const exactAlarm = await checkExactAlarmSetting();

  // If this parent is configured for the long alarm sound, ensure the custom
  // channel exists and route the notifications through it (Android 8+ plays
  // the channel's sound, so this is what produces the longer alarm ringtone).
  let channelId: string | undefined;
  if (input.sound === 'long') {
    if (await ensureLongAlarmChannel()) {
      channelId = LONG_ALARM_CHANNEL_ID;
    } else {
      console.warn('[reminder] long alarm channel unavailable; using default sound.');
    }
  }

  const showWeekday = plan.anchorDates.length > 1;
  const notifications = plan.entries.map(({ remindAt }) => ({
    id: randomNotificationId(),
    title: input.title || (input.parentType === 'note' ? 'Note reminder' : 'Event reminder'),
    body: `${input.bodyPrefix} ${formatNotifyStamp12h(remindAt, showWeekday)}`,
    schedule: { at: remindAt, allowWhileIdle: true },
    // NOTE: no smallIcon/largeIcon — the launcher PNGs (`ic_launcher`) are
    // mipmap resources, and the plugin resolves icons from `drawable` only,
    // so the lookup missed and the build fell back in a way that could drop
    // or hide the alert on some ROMs. Omitting them uses the plugin default.
    ...(channelId ? { channelId } : {}),
  }));

  // Snapshot current rows so we can roll back if the native schedule fails.
  const previous = await ReminderRepository.getByParent(input.parentId, input.parentType);
  try {
    await LocalNotifications.schedule({ notifications });
  } catch (err) {
    console.error('[reminder] native schedule failed, keeping previous alarms:', err);
    return {
      status: 'error',
      notificationId: null,
      count: 0,
      exactAlarm,
      message: err instanceof Error ? err.message : String(err),
    };
  }

  // New alarms are live — now safe to cancel the old ones and persist rows.
  for (const reminder of previous) {
    if (reminder.notificationId !== null) {
      try {
        await LocalNotifications.cancel({ notifications: [{ id: reminder.notificationId }] });
      } catch (err) {
        console.warn('[reminder] failed to cancel stale alarm, continuing:', err);
      }
    }
    try {
      await ReminderRepository.remove(reminder.id);
    } catch (err) {
      console.warn('[reminder] failed to clear stale reminder row, continuing:', err);
    }
  }

  for (let i = 0; i < plan.entries.length; i++) {
    await ReminderRepository.create({
      parentId: input.parentId,
      parentType: input.parentType,
      remindAt: plan.entries[i].remindAt.toISOString(),
      notificationId: notifications[i].id,
    });
  }

  return {
    status: 'scheduled',
    notificationId: notifications[0].id,
    count: notifications.length,
    exactAlarm,
  };
};

/** Cancels any scheduled reminder notifications for a parent and clears its rows. */
const cancelReminder = async (parentId: string, parentType: 'event' | 'note'): Promise<void> => {
  if (!isNative()) return;
  try {
    const existing = await ReminderRepository.getByParent(parentId, parentType);
    for (const reminder of existing) {
      if (reminder.notificationId !== null) {
        try {
          await LocalNotifications.cancel({ notifications: [{ id: reminder.notificationId }] });
        } catch (err) {
          // One bad id must not block the rest of the cleanup.
          console.warn(`[reminder] cancel of notification ${reminder.notificationId} failed, continuing:`, err);
        }
      }
      try {
        await ReminderRepository.remove(reminder.id);
      } catch (err) {
        console.warn(`[reminder] removal of reminder row ${reminder.id} failed, continuing:`, err);
      }
    }
  } catch (err) {
    console.error(`Failed to cancel ${parentType} reminder:`, err);
    throw err;
  }
};

/** Legacy-compatible wrapper: resolves to the first notification id or null. */
const scheduleReminder = async (input: ReminderScheduleInput): Promise<number | null> =>
  (await scheduleReminderDetailed(input)).notificationId;

/**
 * Human-readable one-liner for an outcome, for toasts/alerts in editors.
 * Returns null when there is nothing worth telling the user.
 */
export const describeReminderOutcome = (outcome: ReminderOutcome): string | null => {
  switch (outcome.status) {
    case 'scheduled':
      if (outcome.exactAlarm === 'denied') {
        return `Reminder set (${outcome.count} alert${outcome.count === 1 ? '' : 's'}), but exact alarms are off in system settings — alerts may arrive late.`;
      }
      return null;
    case 'denied':
      return outcome.message ?? 'Notification permission denied — reminder saved but no alarm was scheduled.';
    case 'error':
      return `Reminder saved, but scheduling the alarm failed${outcome.message ? `: ${outcome.message}` : '.'}`;
    case 'none':
      return 'Reminder saved, but all alert times are in the past — no alarm was scheduled.';
    case 'cleared':
    default:
      return null;
  }
};

/**
 * Schedules reminder notifications for an event, replacing any previously
 * scheduled ones. Fire times are derived from the event's own start/end dates,
 * selected offsets and weekdays.
 */
export const scheduleEventReminder = (event: Event): Promise<number | null> =>
  scheduleReminder({
    parentId: event.id,
    parentType: 'event',
    title: event.title,
    offsets: event.reminders,
    sound: event.sound,
    days: event.reminderDays,
    startDate: event.startDate,
    endDate: event.endDate,
    bodyPrefix: 'Starts at',
  });

/** Same as scheduleEventReminder but with the full outcome (denied/error/exact-alarm). */
export const scheduleEventReminderDetailed = (event: Event): Promise<ReminderOutcome> =>
  scheduleReminderDetailed({
    parentId: event.id,
    parentType: 'event',
    title: event.title,
    offsets: event.reminders,
    sound: event.sound,
    days: event.reminderDays,
    startDate: event.startDate,
    endDate: event.endDate,
    bodyPrefix: 'Starts at',
  });

/** Cancels any scheduled reminder notification for an event and clears its rows. */
export const cancelEventReminder = (eventId: string): Promise<void> =>
  cancelReminder(eventId, 'event');

/**
 * Schedules reminder notifications for a note or checklist, replacing any
 * previously scheduled ones. Fire times are derived from the note's own
 * reminder start/end dates, selected offsets and weekdays.
 */
export const scheduleNoteReminder = (note: Note): Promise<number | null> =>
  scheduleReminder({
    parentId: note.id,
    parentType: 'note',
    title: note.title,
    offsets: note.reminderOffsets,
    sound: note.reminderSound,
    days: note.reminderDays,
    startDate: note.reminderStart ?? '',
    endDate: note.reminderEnd,
    bodyPrefix: 'Remind on',
  });

/** Same as scheduleNoteReminder but with the full outcome. */
export const scheduleNoteReminderDetailed = (note: Note): Promise<ReminderOutcome> =>
  scheduleReminderDetailed({
    parentId: note.id,
    parentType: 'note',
    title: note.title,
    offsets: note.reminderOffsets,
    sound: note.reminderSound,
    days: note.reminderDays,
    startDate: note.reminderStart ?? '',
    endDate: note.reminderEnd,
    bodyPrefix: 'Remind on',
  });

export interface ResyncResult {
  rescheduledEvents: number;
  rescheduledNotes: number;
  skippedNoPermission: boolean;
}

/** Cancels any scheduled reminder notification for a note/checklist and clears its rows. */
export const cancelNoteReminder = (noteId: string): Promise<void> =>
  cancelReminder(noteId, 'note');

/**
 * Reconciles the database with the OS after reboot / force-stop / reinstall /
 * backup import. The Capacitor plugin only restores its own SharedPreferences
 * copy of alarms (lost on reinstall, can drift); rows whose notification ids
 * are no longer pending are rescheduled from the parent config. Never prompts
 * for permission — if not granted, reports `skippedNoPermission` and leaves
 * the DB untouched.
 */
export const resyncReminders = async (): Promise<ResyncResult> => {
  const result: ResyncResult = { rescheduledEvents: 0, rescheduledNotes: 0, skippedNoPermission: false };
  if (!isNative()) return result;
  if (!(await checkNotificationPermission())) {
    result.skippedNoPermission = true;
    return result;
  }

  let pendingIds = new Set<number>();
  let pendingKnown = true;
  try {
    const pending = await LocalNotifications.getPending();
    pendingIds = new Set((pending.notifications ?? []).map((n) => n.id));
  } catch (err) {
    // getPending failed — do NOT treat every row as missing (that would
    // duplicate all alarms). Only parents with zero future rows are safe to
    // reschedule in this state.
    console.warn('[reminder] getPending failed, resyncing conservatively:', err);
    pendingKnown = false;
  }

  try {
    const events = await EventRepository.getAll();
    for (const event of events) {
      if (!event.reminders || event.reminders.length === 0) continue;
      const rows = await ReminderRepository.getByParent(event.id, 'event');
      const futureRows = rows.filter((r) => new Date(r.remindAt).getTime() > Date.now());
      if (!pendingKnown) {
        if (futureRows.length > 0) continue;
      } else {
        const missing = futureRows.filter((r) => r.notificationId === null || !pendingIds.has(r.notificationId));
        if (futureRows.length > 0 && missing.length === 0) continue;
        for (const row of missing) {
          try {
            await ReminderRepository.remove(row.id);
          } catch (err) {
            console.warn('[reminder] resync cleanup failed, continuing:', err);
          }
        }
        if (missing.length === 0) continue;
      }
      const outcome = await scheduleEventReminderDetailed(event);
      if (outcome.status === 'scheduled') result.rescheduledEvents += 1;
    }
  } catch (err) {
    console.error('[reminder] event resync failed:', err);
  }

  try {
    const notes = await NoteRepository.getAllFull();
    for (const note of notes) {
      if (!note.reminderOffsets || note.reminderOffsets.length === 0 || !note.reminderStart) continue;
      const rows = await ReminderRepository.getByParent(note.id, 'note');
      const futureRows = rows.filter((r) => new Date(r.remindAt).getTime() > Date.now());
      if (!pendingKnown) {
        if (futureRows.length > 0) continue;
      } else {
        const missing = futureRows.filter((r) => r.notificationId === null || !pendingIds.has(r.notificationId));
        if (futureRows.length > 0 && missing.length === 0) continue;
        for (const row of missing) {
          try {
            await ReminderRepository.remove(row.id);
          } catch (err) {
            console.warn('[reminder] resync cleanup failed, continuing:', err);
          }
        }
        if (missing.length === 0) continue;
      }
      const outcome = await scheduleNoteReminderDetailed(note);
      if (outcome.status === 'scheduled') result.rescheduledNotes += 1;
    }
  } catch (err) {
    console.error('[reminder] note resync failed:', err);
  }

  if (result.rescheduledEvents > 0 || result.rescheduledNotes > 0) {
    console.log(
      `[reminder] resync restored ${result.rescheduledEvents} event(s) + ${result.rescheduledNotes} note(s).`,
    );
  }
  return result;
};