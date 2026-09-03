import { getDatabase } from '../connection';
import type { Reminder } from '@/types/models';
import { v4 as uuidv4 } from 'uuid';

interface ReminderRow {
  id: string;
  parent_id: string;
  parent_type: 'note' | 'event';
  remind_at: string;
  notification_id: number | null;
  created_at: string;
}

const mapRowToReminder = (row: ReminderRow): Reminder => ({
  id: row.id,
  parentId: row.parent_id,
  parentType: row.parent_type,
  remindAt: row.remind_at,
  notificationId: row.notification_id !== null ? Number(row.notification_id) : null,
  createdAt: row.created_at,
});

export class ReminderRepository {
  static async getByParent(parentId: string, parentType: 'note' | 'event'): Promise<Reminder[]> {
    const db = await getDatabase();
    const res = await db.query(
      'SELECT * FROM reminders WHERE parent_id = ? AND parent_type = ? ORDER BY remind_at ASC;',
      [parentId, parentType]
    );
    return (res.values || []).map(mapRowToReminder);
  }

  static async getUpcoming(): Promise<Reminder[]> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const res = await db.query(
      'SELECT * FROM reminders WHERE remind_at > ? ORDER BY remind_at ASC;',
      [now]
    );
    return (res.values || []).map(mapRowToReminder);
  }

  static async getByDateRange(startDate: string, endDate: string): Promise<Reminder[]> {
    const db = await getDatabase();
    const res = await db.query(
      'SELECT * FROM reminders WHERE remind_at >= ? AND remind_at <= ? ORDER BY remind_at ASC;',
      [startDate, endDate]
    );
    return (res.values || []).map(mapRowToReminder);
  }

  static async create(reminder: Omit<Reminder, 'id' | 'createdAt'>): Promise<Reminder> {
    const db = await getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO reminders (id, parent_id, parent_type, remind_at, notification_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        id,
        reminder.parentId,
        reminder.parentType,
        reminder.remindAt,
        reminder.notificationId,
        now,
      ]
    );

    return {
      id,
      ...reminder,
      createdAt: now,
    };
  }

  static async update(
    id: string,
    data: Partial<Pick<Reminder, 'remindAt' | 'notificationId'>>
  ): Promise<Reminder> {
    const db = await getDatabase();
    const res = await db.query('SELECT * FROM reminders WHERE id = ? LIMIT 1;', [id]);
    if (!res.values || res.values.length === 0) throw new Error(`Reminder with id ${id} not found`);

    const current = mapRowToReminder(res.values[0] as ReminderRow);
    const updated: Reminder = {
      ...current,
      ...data,
    };

    await db.run(
      'UPDATE reminders SET remind_at = ?, notification_id = ? WHERE id = ?;',
      [updated.remindAt, updated.notificationId, id]
    );

    return updated;
  }

  static async remove(id: string): Promise<void> {
    const db = await getDatabase();
    await db.run('DELETE FROM reminders WHERE id = ?;', [id]);
  }
}
