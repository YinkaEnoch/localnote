import { getDatabase } from '../connection';
import type { Event, SortOption, ReminderOffset, NoteColor } from '@/types/models';
import { v4 as uuidv4 } from 'uuid';

interface EventRow {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  all_day: number;
  reminder: string;
  description: string;
  links: string;
  color: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

const mapRowToEvent = (row: EventRow): Event => ({
  id: row.id,
  title: row.title,
  startDate: row.start_date,
  endDate: row.end_date,
  allDay: Boolean(row.all_day),
  reminder: row.reminder as ReminderOffset,
  description: row.description,
  links: row.links,
  color: row.color as NoteColor,
  folderId: row.folder_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getSortClause = (sortBy: SortOption): string => {
  switch (sortBy) {
    case 'created':
      return 'created_at DESC';
    case 'alphabetical':
      return 'title ASC COLLATE NOCASE';
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

    await db.run(
      `INSERT INTO events (id, title, start_date, end_date, all_day, reminder, description, links, color, folder_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        event.title,
        event.startDate,
        event.endDate,
        event.allDay ? 1 : 0,
        event.reminder,
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

    await db.run(
      `UPDATE events
       SET title = ?, start_date = ?, end_date = ?, all_day = ?, reminder = ?, description = ?, links = ?, color = ?, folder_id = ?, updated_at = ?
       WHERE id = ?;`,
      [
        updated.title,
        updated.startDate,
        updated.endDate,
        updated.allDay ? 1 : 0,
        updated.reminder,
        updated.description,
        updated.links,
        updated.color,
        updated.folderId,
        now,
        id,
      ]
    );

    return updated;
  }

  static async remove(id: string): Promise<void> {
    const db = await getDatabase();
    try {
      await db.execute('BEGIN TRANSACTION;');
      await db.run('UPDATE notes SET event_id = NULL WHERE event_id = ?;', [id]);
      await db.run('DELETE FROM attachments WHERE parent_id = ? AND parent_type = "event";', [id]);
      await db.run('DELETE FROM reminders WHERE parent_id = ? AND parent_type = "event";', [id]);
      await db.run('DELETE FROM events WHERE id = ?;', [id]);
      await db.execute('COMMIT;');
    } catch (err) {
      await db.execute('ROLLBACK;');
      throw err;
    }
  }
}
