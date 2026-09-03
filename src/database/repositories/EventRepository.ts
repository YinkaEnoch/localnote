import { getDatabase } from '../connection';
import type { Event, SortOption, ReminderOffset, EventSound, NoteColor } from '@/types/models';
import { v4 as uuidv4 } from 'uuid';

/** Valid, selectable reminder offsets (excluding the legacy 'none'). */
const REMINDER_OFFSETS: ReminderOffset[] = ['5min', '10min', '15min', '30min', '1hr', '1day'];

interface EventRow {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  all_day: number;
  reminder: string; // legacy single-offset column (kept for backward compat)
  reminders: string; // JSON array of selected offsets
  sound: string;
  reminder_days: string;
  description: string;
  links: string;
  color: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

const parseReminders = (value: string | undefined | null, legacy: string | undefined | null): ReminderOffset[] => {
  let parsed: unknown = [];
  try {
    parsed = JSON.parse(value || '[]');
  } catch {
    parsed = [];
  }
  const result = Array.isArray(parsed)
    ? parsed.filter((v): v is ReminderOffset => REMINDER_OFFSETS.includes(v as ReminderOffset))
    : [];
  // Fall back to the legacy single offset when the array is empty but a real
  // (non-'none') reminder was recorded.
  if (result.length === 0 && legacy && legacy !== 'none' && REMINDER_OFFSETS.includes(legacy as ReminderOffset)) {
    result.push(legacy as ReminderOffset);
  }
  return result;
};

const mapRowToEvent = (row: EventRow): Event => ({
  id: row.id,
  title: row.title,
  startDate: row.start_date,
  endDate: row.end_date,
  allDay: Boolean(row.all_day),
  reminders: parseReminders(row.reminders, row.reminder),
  sound: (row.sound as EventSound) || 'default',
  reminderDays: parseReminderDays(row.reminder_days),
  description: row.description,
  links: row.links,
  color: row.color as NoteColor,
  folderId: row.folder_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const parseReminderDays = (value: string | undefined | null): number[] => {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.filter((d): d is number => typeof d === 'number') : [];
  } catch {
    return [];
  }
};

const getSortClause = (sortBy: SortOption): string => {
  switch (sortBy) {
    case 'created':
      return 'created_at DESC';
    case 'alphabetical':
      return 'title COLLATE NOCASE ASC';
    case 'updated':
    default:
      return 'updated_at DESC';
  }
};

export class EventRepository {
  static async getAll(sortBy: SortOption = 'updated'): Promise<Event[]> {
    const db = await getDatabase();
    const res = await db.query(`SELECT * FROM events ORDER BY ${getSortClause(sortBy)};`);
    return (res.values || []).map(mapRowToEvent);
  }

  static async getById(id: string): Promise<Event | null> {
    const db = await getDatabase();
    const res = await db.query('SELECT * FROM events WHERE id = ? LIMIT 1;', [id]);
    if (!res.values || res.values.length === 0) return null;
    return mapRowToEvent(res.values[0] as EventRow);
  }

  static async getByDateRange(startDate: string, endDate: string): Promise<Event[]> {
    const db = await getDatabase();
    const res = await db.query(
      'SELECT * FROM events WHERE start_date >= ? AND start_date <= ? ORDER BY start_date ASC;',
      [startDate, endDate]
    );
    return (res.values || []).map(mapRowToEvent);
  }

  static async getByDate(date: string): Promise<Event[]> {
    const db = await getDatabase();
    // Match date prefix "YYYY-MM-DD"
    const prefix = `${date}%`;
    const res = await db.query(
      'SELECT * FROM events WHERE start_date LIKE ? ORDER BY start_date ASC;',
      [prefix]
    );
    return (res.values || []).map(mapRowToEvent);
  }

  static async create(event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
    const db = await getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    // Keep the legacy single-`reminder` column populated with a representative
    // offset so older app versions / imports that read it still see something.
    const reminders = REMINDER_OFFSETS.filter((o) => event.reminders?.includes(o));
    const primaryReminder = reminders[reminders.length - 1] || 'none';

    await db.run(
      `INSERT INTO events (id, title, start_date, end_date, all_day, reminder, reminders, sound, reminder_days, description, links, color, folder_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        event.title,
        event.startDate,
        event.endDate,
        event.allDay ? 1 : 0,
        primaryReminder,
        JSON.stringify(reminders),
        event.sound,
        JSON.stringify(event.reminderDays ?? []),
        event.description,
        event.links,
        event.color,
        event.folderId,
        now,
        now,
      ]
    );

    return {
      id,
      ...event,
      reminders,
      createdAt: now,
      updatedAt: now,
    };
  }

  static async update(
    id: string,
    data: Partial<Omit<Event, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Event> {
    const db = await getDatabase();
    const current = await this.getById(id);
    if (!current) throw new Error(`Event with id ${id} not found`);

    const now = new Date().toISOString();
    const updated: Event = {
      ...current,
      ...data,
      updatedAt: now,
    };
    const reminders = REMINDER_OFFSETS.filter((o) => updated.reminders?.includes(o));
    const primaryReminder = reminders[reminders.length - 1] || 'none';

    await db.run(
      `UPDATE events
       SET title = ?, start_date = ?, end_date = ?, all_day = ?, reminder = ?, reminders = ?, sound = ?, reminder_days = ?, description = ?, links = ?, color = ?, folder_id = ?, updated_at = ?
       WHERE id = ?;`,
      [
        updated.title,
        updated.startDate,
        updated.endDate,
        updated.allDay ? 1 : 0,
        primaryReminder,
        JSON.stringify(reminders),
        updated.sound,
        JSON.stringify(updated.reminderDays ?? []),
        updated.description,
        updated.links,
        updated.color,
        updated.folderId,
        now,
        id,
      ]
    );

    return { ...updated, reminders };
  }

  static async remove(id: string): Promise<void> {
    const db = await getDatabase();
    try {
      await db.execute('BEGIN TRANSACTION;', false);
      await db.run('UPDATE notes SET event_id = NULL WHERE event_id = ?;', [id], false);
      await db.run('DELETE FROM attachments WHERE parent_id = ? AND parent_type = ?;', [id, 'event'], false);
      await db.run('DELETE FROM reminders WHERE parent_id = ? AND parent_type = ?;', [id, 'event'], false);
      await db.run('DELETE FROM events WHERE id = ?;', [id], false);
      await db.execute('COMMIT;', false);
    } catch (err) {
      await db.execute('ROLLBACK;', false);
      throw err;
    }
  }
}
