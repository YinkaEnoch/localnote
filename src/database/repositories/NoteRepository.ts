import { getDatabase } from '../connection';
import type { Note, NoteListItem, SortOption, SearchScope, NoteType, NoteColor } from '@/types/models';
import { v4 as uuidv4 } from 'uuid';

interface NoteRow {
  id: string;
  title: string;
  content: string;
  type: string;
  color: string;
  folder_id: string | null;
  event_id: string | null;
  created_at: string;
  updated_at: string;
  checklist_total?: number;
  checklist_completed?: number;
  event_start_date?: string;
}

const mapRowToNote = (row: NoteRow): Note => ({
  id: row.id,
  title: row.title,
  content: row.content,
  type: row.type as NoteType,
  color: row.color as NoteColor,
  folderId: row.folder_id,
  eventId: row.event_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapRowToListItem = (row: NoteRow): NoteListItem => {
  // Strip HTML from content for snippet preview
  const snippet = row.content.replace(/<[^>]*>?/gm, '').trim().slice(0, 120);
  return {
    id: row.id,
    title: row.title,
    snippet,
    type: row.type as NoteType,
    color: row.color as NoteColor,
    folderId: row.folder_id,
    eventId: row.event_id,
    checklistTotal: row.checklist_total !== undefined ? Number(row.checklist_total) : undefined,
    checklistCompleted: row.checklist_completed !== undefined ? Number(row.checklist_completed) : undefined,
    eventDate: row.event_start_date,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
};

const getSortClause = (sortBy: SortOption): string => {
  switch (sortBy) {
    case 'created':
      return 'n.created_at DESC';
    case 'alphabetical':
      return 'n.title COLLATE NOCASE ASC';
    case 'updated':
    default:
      return 'n.updated_at DESC';
  }
};

export class NoteRepository {
  static async getAll(sortBy: SortOption = 'updated'): Promise<NoteListItem[]> {
    const db = await getDatabase();
    const query = `
      SELECT 
        n.*,
        (SELECT COUNT(*) FROM checklist_items ci WHERE ci.note_id = n.id) as checklist_total,
        (SELECT COUNT(*) FROM checklist_items ci WHERE ci.note_id = n.id AND ci.is_completed = 1) as checklist_completed,
        e.start_date as event_start_date
      FROM notes n
      LEFT JOIN events e ON n.event_id = e.id
      ORDER BY ${getSortClause(sortBy)};
    `;
    const res = await db.query(query);
    return (res.values || []).map(mapRowToListItem);
  }

  static async getById(id: string): Promise<Note | null> {
    const db = await getDatabase();
    const res = await db.query('SELECT * FROM notes WHERE id = ? LIMIT 1;', [id]);
    if (!res.values || res.values.length === 0) return null;
    return mapRowToNote(res.values[0] as NoteRow);
  }

  static async getByFolderId(folderId: string, sortBy: SortOption = 'updated'): Promise<NoteListItem[]> {
    const db = await getDatabase();
    const query = `
      SELECT 
        n.*,
        (SELECT COUNT(*) FROM checklist_items ci WHERE ci.note_id = n.id) as checklist_total,
        (SELECT COUNT(*) FROM checklist_items ci WHERE ci.note_id = n.id AND ci.is_completed = 1) as checklist_completed,
        e.start_date as event_start_date
      FROM notes n
      LEFT JOIN events e ON n.event_id = e.id
      WHERE n.folder_id = ?
      ORDER BY ${getSortClause(sortBy)};
    `;
    const res = await db.query(query, [folderId]);
    return (res.values || []).map(mapRowToListItem);
  }

  static async create(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
    const db = await getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    
    await db.run(
      `INSERT INTO notes (id, title, content, type, color, folder_id, event_id, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, note.title, note.content, note.type, note.color, note.folderId, note.eventId, now, now]
    );

    return {
      id,
      ...note,
      createdAt: now,
      updatedAt: now,
    };
  }

  static async update(
    id: string, 
    data: Partial<Pick<Note, 'title' | 'content' | 'color' | 'folderId' | 'eventId'>>
  ): Promise<Note> {
    const db = await getDatabase();
    const current = await this.getById(id);
    if (!current) throw new Error(`Note with id ${id} not found`);

    const now = new Date().toISOString();
    const updated: Note = {
      ...current,
      ...data,
      updatedAt: now,
    };

    await db.run(
      `UPDATE notes 
       SET title = ?, content = ?, color = ?, folder_id = ?, event_id = ?, updated_at = ?
       WHERE id = ?;`,
      [updated.title, updated.content, updated.color, updated.folderId, updated.eventId, now, id]
    );

    return updated;
  }

  static async remove(id: string): Promise<void> {
    const db = await getDatabase();
    try {
      await db.execute('BEGIN TRANSACTION;', false);
      await db.run('DELETE FROM checklist_items WHERE note_id = ?;', [id]);
      await db.run('DELETE FROM attachments WHERE parent_id = ? AND parent_type = "note";', [id]);
      await db.run('DELETE FROM reminders WHERE parent_id = ? AND parent_type = "note";', [id]);
      await db.run('DELETE FROM notes WHERE id = ?;', [id]);
      await db.execute('COMMIT;', false);
    } catch (err) {
      await db.execute('ROLLBACK;', false);
      throw err;
    }
  }

  static async search(queryText: string, scope: SearchScope = 'all'): Promise<NoteListItem[]> {
    if (!queryText.trim()) return [];
    const db = await getDatabase();
    const wildcard = `%${queryText.trim()}%`;
    let whereClause = '';
    const params: string[] = [];

    if (scope === 'titles') {
      whereClause = 'WHERE n.title LIKE ?';
      params.push(wildcard);
    } else if (scope === 'contents') {
      whereClause = 'WHERE n.content LIKE ?';
      params.push(wildcard);
    } else {
      whereClause = 'WHERE n.title LIKE ? OR n.content LIKE ?';
      params.push(wildcard, wildcard);
    }

    const query = `
      SELECT 
        n.*,
        (SELECT COUNT(*) FROM checklist_items ci WHERE ci.note_id = n.id) as checklist_total,
        (SELECT COUNT(*) FROM checklist_items ci WHERE ci.note_id = n.id AND ci.is_completed = 1) as checklist_completed,
        e.start_date as event_start_date
      FROM notes n
      LEFT JOIN events e ON n.event_id = e.id
      ${whereClause}
      ORDER BY n.updated_at DESC;
    `;
    const res = await db.query(query, params);
    return (res.values || []).map(mapRowToListItem);
  }
}
