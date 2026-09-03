import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ReminderRepository } from '@/database/repositories/ReminderRepository';
import type { Event, ReminderOffset } from '@/types/models';

const OFFSET_MINUTES: Record<ReminderOffset, number> = {
  none: 0,
  '5min': 5,
  '10min': 10,
  '15min': 15,
  '30min': 30,
  '1hr': 60,
  '1day': 1440,
};

/** Notification channel used for events configured with the "long" alarm. */
export const LONG_ALARM_CHANNEL_ID = 'long_alarm';
let longAlarmChannelReady = false;

/**
 * Creates (once) the high-importance notification channel wired to the bundled
 * `long_alarm.wav` raw resource. Android 8+ plays whatever sound the channel
 * is configured with, so routing a notification to this channel is what gives
 * it the long alarm sound. Returns false if unavailable (web).
 */
export const ensureLongAlarmChannel = async (): Promise<boolean> => {
  if (Capacitor.getPlatform() === 'web') return false;
  if (longAlarmChannelReady) return true;
  try {
    await LocalNotifications.createChannel({
      id: LONG_ALARM_CHANNEL_ID,
      name: 'Event alarms',
      description: 'Events using the long alarm sound',
      importance: 4, // IMPORTANCE_HIGH — needed for the sound to actually play
      sound: 'long_alarm',
    });
    longAlarmChannelReady = true;
    return true;
  } catch (err) {
    console.error('Failed to create long alarm channel:', err);
    return false;
  }
};

/** Stable int32 notification id derived from the event id (uuid). */
const notificationIdFor = (eventId: string): number => {
  let hash = 0;
  for (let i = 0; i < eventId.length; i++) {
    hash = (hash * 31 + eventId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2147483647;
};

const requestPermissionIfNeeded = async (): Promise<boolean> => {
  const status = await LocalNotifications.checkPermissions();
  if (status.display === 'granted') return true;
  const result = await LocalNotifications.requestPermissions();
  return result.display === 'granted';
};

/**
 * Schedules reminder notifications for an event and records them in the
 * reminders table. Replaces any previously scheduled reminders for the event.
 *
 * Each selected offset in `event.reminders` fires its own alert at the
 * corresponding time before the anchor. When the event has selected weekdays
 * (`reminderDays`, 0 = Sunday … 6 = Saturday) the reminders fire on every
 * matching weekday within [startDate, endDate], at the same time of day as
 * the start date.
 *
 * Returns the scheduled notification id of the first alert (empty when there
 * is nothing to schedule: no reminder, all times past, web platform, or
 * missing permission).
 */
const MAX_SCHEDULED_REMINDERS = 64; // Android caps pending alarms; stay safely below it

export const scheduleEventReminder = async (event: Event): Promise<number | null> => {
  if (Capacitor.getPlatform() === 'web') return null;

  // Every selected offset schedules one separate alert. Empty selection is
  // treated as "no reminder" (previous 'none' behaviour).
  const offsets = (Array.isArray(event.reminders) ? event.reminders : [])
    .filter((o): o is ReminderOffset => o !== 'none' && OFFSET_MINUTES[o] !== undefined)
    .filter((o, i, arr) => arr.indexOf(o) === i); // dedupe

  if (offsets.length === 0) {
    await cancelEventReminder(event.id);
    return null;
  }

  // Always refresh the stored reminder rows (and cancel stale schedules).
  await cancelEventReminder(event.id);

  // Build the list of "anchor" dates to remind on.
  const anchorDates: Date[] = [];
  const days = Array.isArray(event.reminderDays) ? [...new Set(event.reminderDays)].sort((a, b) => a - b) : [];

  if (days.length === 0) {
    // Single reminder on the start date (previous behaviour).
    anchorDates.push(new Date(event.startDate));
  } else {
    const start = new Date(event.startDate);
    const end = event.endDate ? new Date(event.endDate) : start;
    // Normalise both to local midnight so day iteration is inclusive/correct.
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    for (let day = startDay; day <= endDay && anchorDates.length < MAX_SCHEDULED_REMINDERS; day.setDate(day.getDate() + 1)) {
      if (days.includes(day.getDay())) {
        // Keep the time-of-day from the start date.
        const at = new Date(day);
        at.setHours(start.getHours(), start.getMinutes(), 0, 0);
        anchorDates.push(at);
      }
    }
  }

  // One entry per (anchor date x selected offset), future-only and sorted by
  // fire time. Capped total to stay safely below the Android pending-alarm
  // limit when multiple offsets are combined with many recurring weekdays.
  const entries: { remindAt: Date; offset: ReminderOffset }[] = [];
  for (const offset of offsets) {
    for (const at of anchorDates) {
      const remindAt = new Date(at.getTime() - OFFSET_MINUTES[offset] * 60_000);
      if (remindAt.getTime() > Date.now()) {
        entries.push({ remindAt, offset });
      }
    }
  }
  entries.sort((a, b) => a.remindAt.getTime() - b.remindAt.getTime());
  const capped = entries.slice(0, MAX_SCHEDULED_REMINDERS);

  if (capped.length === 0) return null;
  const granted = await requestPermissionIfNeeded();
  if (!granted) return null;

  // If this event is configured for the long alarm sound, ensure the custom
  // channel exists and route the notifications through it (Android 8+ plays
  // the channel's sound, so this is what produces the longer alarm ringtone).
  let channelId: string | undefined;
  if (event.sound === 'long') {
    if (await ensureLongAlarmChannel()) {
      channelId = LONG_ALARM_CHANNEL_ID;
    } else {
      console.warn('[reminder] long alarm channel unavailable; using default sound.');
    }
  }

  const showWeekday = anchorDates.length > 1;
  const notifications = capped.map(({ remindAt, offset }, index) => ({
    // Include the offset in the id so each selected reminder gets its own,
    // stable notification id.
    id: notificationIdFor(`${event.id}#${offset}#${index}`),
    title: event.title || 'Event reminder',
    body: `Starts at ${new Date(remindAt.getTime() + OFFSET_MINUTES[offset] * 60_000).toLocaleString([], {
      weekday: showWeekday ? 'short' : undefined,
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    schedule: { at: remindAt, allowWhileIdle: true },
    smallIcon: 'ic_launcher',
    largeIcon: 'ic_launcher_round',
    channelId,
  }));

  await LocalNotifications.schedule({ notifications });

  for (let i = 0; i < capped.length; i++) {
    await ReminderRepository.create({
      parentId: event.id,
      parentType: 'event',
      remindAt: capped[i].remindAt.toISOString(),
      notificationId: notifications[i].id,
    });
  }

  return notifications[0].id;
};

/** Cancels any scheduled reminder notification for an event and clears its rows. */
export const cancelEventReminder = async (eventId: string): Promise<void> => {
  if (Capacitor.getPlatform() === 'web') return;
  try {
    const existing = await ReminderRepository.getByParent(eventId, 'event');
    for (const reminder of existing) {
      if (reminder.notificationId !== null) {
        await LocalNotifications.cancel({ notifications: [{ id: reminder.notificationId }] });
      }
      await ReminderRepository.remove(reminder.id);
    }
  } catch (err) {
    console.error('Failed to cancel event reminder:', err);
  }
};