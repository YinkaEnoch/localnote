import { getDatabase } from '../connection';
import type { ChecklistItem } from '@/types/models';
import { v4 as uuidv4 } from 'uuid';

interface ChecklistItemRow {
  id: string;
  note_id: string;
  text: string;
  is_completed: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const mapRowToItem = (row: ChecklistItemRow): ChecklistItem => ({
  id: row.id,
  noteId: row.note_id,
  text: row.text,
  isCompleted: Boolean(row.is_completed),
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class ChecklistRepository {
  static async getByNoteId(noteId: string): Promise<ChecklistItem[]> {
    const db = await getDatabase();
    const res = await db.query(
      'SELECT * FROM checklist_items WHERE note_id = ? ORDER BY sort_order ASC;',
      [noteId]
    );
    return (res.values || []).map(mapRowToItem);
  }

  static async create(item: Omit<ChecklistItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChecklistItem> {
    const db = await getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO checklist_items (id, note_id, text, is_completed, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [id, item.noteId, item.text, item.isCompleted ? 1 : 0, item.sortOrder, now, now]
    );

    return {
      id,
      ...item,
      createdAt: now,
      updatedAt: now,
    };
  }

  static async update(
    id: string,
    data: Partial<Pick<ChecklistItem, 'text' | 'isCompleted' | 'sortOrder'>>
  ): Promise<ChecklistItem> {
    const db = await getDatabase();
    const res = await db.query('SELECT * FROM checklist_items WHERE id = ? LIMIT 1;', [id]);
    if (!res.values || res.values.length === 0) throw new Error(`ChecklistItem with id ${id} not found`);

    const current = mapRowToItem(res.values[0] as ChecklistItemRow);
    const now = new Date().toISOString();
    const updated: ChecklistItem = {
      ...current,
      ...data,
      updatedAt: now,
    };

    await db.run(
      `UPDATE checklist_items
       SET text = ?, is_completed = ?, sort_order = ?, updated_at = ?
       WHERE id = ?;`,
      [updated.text, updated.isCompleted ? 1 : 0, updated.sortOrder, now, id]
    );

    return updated;
  }

  static async remove(id: string): Promise<void> {
    const db = await getDatabase();
    await db.run('DELETE FROM checklist_items WHERE id = ?;', [id]);
  }

  static async reorder(items: { id: string; sortOrder: number }[]): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    try {
      await db.execute('BEGIN TRANSACTION;', false);
      for (const item of items) {
        await db.run(
          'UPDATE checklist_items SET sort_order = ?, updated_at = ? WHERE id = ?;',
          [item.sortOrder, now, item.id],
          false
        );
      }
      await db.execute('COMMIT;', false);
    } catch (err) {
      await db.execute('ROLLBACK;', false);
      throw err;
    }
  }
}
