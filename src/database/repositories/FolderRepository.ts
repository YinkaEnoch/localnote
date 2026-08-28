import { getDatabase } from '../connection';
import type { Folder, FolderWithCount, FolderColor } from '@/types/models';
import { v4 as uuidv4 } from 'uuid';

interface FolderRow {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

const mapRowToFolderWithCount = (row: FolderRow): FolderWithCount => ({
  id: row.id,
  name: row.name,
  color: row.color as FolderColor,
  itemCount: row.item_count !== undefined ? Number(row.item_count) : 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapRowToFolder = (row: FolderRow): Folder => ({
  id: row.id,
  name: row.name,
  color: row.color as FolderColor,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class FolderRepository {
  static async getAll(): Promise<FolderWithCount[]> {
    const db = await getDatabase();
    const query = `
      SELECT f.*,
        (
          (SELECT COUNT(*) FROM notes n WHERE n.folder_id = f.id) +
          (SELECT COUNT(*) FROM events e WHERE e.folder_id = f.id AND NOT EXISTS (SELECT 1 FROM notes n WHERE n.event_id = e.id AND n.folder_id = f.id))
        ) as item_count
      FROM folders f
      ORDER BY f.name ASC COLLATE NOCASE;
    `;
    const res = await db.query(query);
    return (res.values || []).map(mapRowToFolderWithCount);
  }

  static async getById(id: string): Promise<Folder | null> {
    const db = await getDatabase();
    const res = await db.query('SELECT * FROM folders WHERE id = ? LIMIT 1;', [id]);
    if (!res.values || res.values.length === 0) return null;
    return mapRowToFolder(res.values[0] as FolderRow);
  }

  static async create(folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Folder> {
    const db = await getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO folders (id, name, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?);`,
      [id, folder.name, folder.color, now, now]
    );

    return {
      id,
      ...folder,
      createdAt: now,
      updatedAt: now,
    };
  }

  static async update(
    id: string,
    data: Partial<Pick<Folder, 'name' | 'color'>>
  ): Promise<Folder> {
    const db = await getDatabase();
    const current = await this.getById(id);
    if (!current) throw new Error(`Folder with id ${id} not found`);

    const now = new Date().toISOString();
    const updated: Folder = {
      ...current,
      ...data,
      updatedAt: now,
    };

    await db.run(
      `UPDATE folders
       SET name = ?, color = ?, updated_at = ?
       WHERE id = ?;`,
      [updated.name, updated.color, now, id]
    );

    return updated;
  }

  static async remove(id: string): Promise<void> {
    const db = await getDatabase();
    try {
      await db.execute('BEGIN TRANSACTION;');
      await db.run('UPDATE notes SET folder_id = NULL WHERE folder_id = ?;', [id]);
      await db.run('UPDATE events SET folder_id = NULL WHERE folder_id = ?;', [id]);
      await db.run('DELETE FROM folders WHERE id = ?;', [id]);
      await db.execute('COMMIT;');
    } catch (err) {
      await db.execute('ROLLBACK;');
      throw err;
    }
  }
}
