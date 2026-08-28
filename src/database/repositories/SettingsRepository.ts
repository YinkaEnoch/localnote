import { getDatabase } from '../connection';

export class SettingsRepository {
  static async get(key: string): Promise<string | null> {
    const db = await getDatabase();
    const res = await db.query('SELECT value FROM settings WHERE key = ? LIMIT 1;', [key]);
    if (!res.values || res.values.length === 0) return null;
    return res.values[0].value;
  }

  static async set(key: string, value: string): Promise<void> {
    const db = await getDatabase();
    await db.run(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      [key, value]
    );
  }

  static async getAll(): Promise<Record<string, string>> {
    const db = await getDatabase();
    const res = await db.query('SELECT key, value FROM settings;');
    const out: Record<string, string> = {};
    if (res.values) {
      for (const row of res.values) {
        out[row.key] = row.value;
      }
    }
    return out;
  }
}
