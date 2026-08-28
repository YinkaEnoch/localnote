import { SQLiteDBConnection } from '@capacitor-community/sqlite';

const MIGRATIONS = [
  {
    version: 1,
    up: [
      `CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL DEFAULT 'text',
        color TEXT NOT NULL DEFAULT 'default',
        folder_id TEXT,
        event_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS checklist_items (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        text TEXT NOT NULL DEFAULT '',
        is_completed INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        start_date TEXT NOT NULL,
        end_date TEXT,
        all_day INTEGER NOT NULL DEFAULT 0,
        reminder TEXT NOT NULL DEFAULT 'none',
        description TEXT NOT NULL DEFAULT '',
        links TEXT NOT NULL DEFAULT '[]',
        color TEXT NOT NULL DEFAULT 'default',
        folder_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT 'purple',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        parent_id TEXT NOT NULL,
        parent_type TEXT NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        parent_id TEXT NOT NULL,
        parent_type TEXT NOT NULL,
        remind_at TEXT NOT NULL,
        notification_id INTEGER,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);`,
      `CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);`,
      `CREATE INDEX IF NOT EXISTS idx_notes_event ON notes(event_id);`,
      `CREATE INDEX IF NOT EXISTS idx_checklists_note ON checklist_items(note_id);`,
      `CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_date);`,
      `CREATE INDEX IF NOT EXISTS idx_events_folder ON events(folder_id);`,
      `CREATE INDEX IF NOT EXISTS idx_attachments_parent ON attachments(parent_id, parent_type);`,
      `CREATE INDEX IF NOT EXISTS idx_reminders_parent ON reminders(parent_id, parent_type);`
    ]
  }
];

export const runMigrations = async (db: SQLiteDBConnection): Promise<void> => {
  await db.execute('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);');
  
  const versionRes = await db.query('SELECT version FROM schema_version LIMIT 1;');
  let currentVersion = 0;
  
  if (versionRes.values && versionRes.values.length > 0) {
    currentVersion = versionRes.values[0].version;
  } else {
    await db.run('INSERT INTO schema_version (version) VALUES (0);');
  }

  const pendingMigrations = MIGRATIONS.filter(m => m.version > currentVersion).sort((a, b) => a.version - b.version);

  if (pendingMigrations.length === 0) {
    return;
  }

  for (const migration of pendingMigrations) {
    try {
      await db.execute('BEGIN TRANSACTION;');
      for (const statement of migration.up) {
        await db.execute(statement);
      }
      await db.run('UPDATE schema_version SET version = ?;', [migration.version]);
      await db.execute('COMMIT;');
    } catch (error) {
      await db.execute('ROLLBACK;');
      console.error(`Migration v${migration.version} failed:`, error);
      throw error;
    }
  }
};
