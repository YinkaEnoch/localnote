import { getDatabase } from '../connection';
import type { Attachment } from '@/types/models';
import { v4 as uuidv4 } from 'uuid';

interface AttachmentRow {
  id: string;
  parent_id: string;
  parent_type: 'note' | 'event';
  filename: string;
  filepath: string;
  mime_type: string;
  size: number;
  created_at: string;
}

const mapRowToAttachment = (row: AttachmentRow): Attachment => ({
  id: row.id,
  parentId: row.parent_id,
  parentType: row.parent_type,
  filename: row.filename,
  filepath: row.filepath,
  mimeType: row.mime_type,
  size: Number(row.size),
  createdAt: row.created_at,
});

export class AttachmentRepository {
  static async getByParent(parentId: string, parentType: 'note' | 'event'): Promise<Attachment[]> {
    const db = await getDatabase();
    const res = await db.query(
      'SELECT * FROM attachments WHERE parent_id = ? AND parent_type = ? ORDER BY created_at ASC;',
      [parentId, parentType]
    );
    return (res.values || []).map(mapRowToAttachment);
  }

  static async create(attachment: Omit<Attachment, 'id' | 'createdAt'>): Promise<Attachment> {
    const db = await getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO attachments (id, parent_id, parent_type, filename, filepath, mime_type, size, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        attachment.parentId,
        attachment.parentType,
        attachment.filename,
        attachment.filepath,
        attachment.mimeType,
        attachment.size,
        now,
      ]
    );

    return {
      id,
      ...attachment,
      createdAt: now,
    };
  }

  static async remove(id: string): Promise<void> {
    const db = await getDatabase();
    await db.run('DELETE FROM attachments WHERE id = ?;', [id]);
  }
}
