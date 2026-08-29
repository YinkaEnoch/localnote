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
 * Schedules the reminder notification for an event and records it in the
 * reminders table. Replaces any previously scheduled reminder for the event.
 * Returns the scheduled notification id, or null when there is nothing to
 * schedule (no reminder, past time, web platform, or missing permission).
 */
export const scheduleEventReminder = async (event: Event): Promise<number | null> => {
  if (Capacitor.getPlatform() === 'web') return null;
  if (event.reminder === 'none') {
    await cancelEventReminder(event.id);
    return null;
  }

  const remindAt = new Date(
    new Date(event.startDate).getTime() - OFFSET_MINUTES[event.reminder] * 60_000,
  );

  // Always refresh the stored reminder row (and cancel stale schedules).
  await cancelEventReminder(event.id);

  if (remindAt.getTime() <= Date.now()) return null;
  const granted = await requestPermissionIfNeeded();
  if (!granted) return null;

  const notificationId = notificationIdFor(event.id);

  // If this event is configured for the long alarm sound, ensure the custom
  // channel exists and route the notification through it (Android 8+ plays the
  // channel's sound, so this is what produces the longer alarm ringtone).
  let channelId: string | undefined;
  if (event.sound === 'long') {
    if (await ensureLongAlarmChannel()) {
      channelId = LONG_ALARM_CHANNEL_ID;
    } else {
      console.warn('[reminder] long alarm channel unavailable; using default sound.');
    }
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationId,
        title: event.title || 'Event reminder',
        body: `Starts at ${new Date(event.startDate).toLocaleString([], {
          hour: '2-digit',
          minute: '2-digit',
          day: 'numeric',
          month: 'short',
        })}`,
        schedule: { at: remindAt, allowWhileIdle: true },
        smallIcon: 'ic_launcher',
        largeIcon: 'ic_launcher_round',
        channelId,
      },
    ],
  });

  await ReminderRepository.create({
    parentId: event.id,
    parentType: 'event',
    remindAt: remindAt.toISOString(),
    notificationId,
  });

  return notificationId;
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