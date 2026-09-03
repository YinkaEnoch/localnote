import React, { useState, useEffect, useRef } from 'react';
import { getDatabase } from '@/database/connection';
import { NoteRepository } from '@/database/repositories/NoteRepository';
import { FolderRepository } from '@/database/repositories/FolderRepository';
import { EventRepository } from '@/database/repositories/EventRepository';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';

interface StorageStats {
  notesCount: number;
  eventsCount: number;
  foldersCount: number;
}

export function BackupPage() {
  const [stats, setStats] = useState<StorageStats>({ notesCount: 0, eventsCount: 0, foldersCount: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const notes = await NoteRepository.getAll();
      const events = await EventRepository.getAll();
      const folders = await FolderRepository.getAll();
      setStats({
        notesCount: notes.length,
        eventsCount: events.length,
        foldersCount: folders.length,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setMessage(null);
    try {
      const db = await getDatabase();
      const notesRes = await db.query('SELECT * FROM notes;');
      const checklistRes = await db.query('SELECT * FROM checklist_items;');
      const eventsRes = await db.query('SELECT * FROM events;');
      const foldersRes = await db.query('SELECT * FROM folders;');
      const attachmentsRes = await db.query('SELECT * FROM attachments;');
      const remindersRes = await db.query('SELECT * FROM reminders;');
      const settingsRes = await db.query('SELECT * FROM settings;');

      const backupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          notes: notesRes.values || [],
          checklist_items: checklistRes.values || [],
          events: eventsRes.values || [],
          folders: foldersRes.values || [],
          attachments: attachmentsRes.values || [],
          reminders: remindersRes.values || [],
          settings: settingsRes.values || [],
        },
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `localnote-backup-${dateStr}.json`;

      // Simple, reliable, cross-platform: write the backup to the app's
      // cache as a temp file, then open the native share sheet so the user
      // can save it anywhere (Drive, Files, email, etc.). Uses only the
      // official @capacitor/filesystem + @capacitor/share plugins — no custom
      // native code required.
      const written = await Filesystem.writeFile({
        path: fileName,
        data: jsonStr,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      await Share.share({
        title: fileName,
        text: `Backup of your LocalNote data (${dateStr})`,
        files: [written.uri],
        dialogTitle: 'Save or share your backup',
      });

      setMessage({ text: `Backup exported successfully! ${fileName}`, type: 'success' });
    } catch (err: any) {
      console.error('Export error:', err);
      setMessage({ text: `Export failed: ${err.message}`, type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Store the pending file and ask for confirmation (non-blocking).
    setPendingImportFile(file);
    setConfirmImportOpen(true);
  };

  const handleConfirmImport = async () => {
    const file = pendingImportFile;
    if (!file) return;

    setPendingImportFile(null);
    setConfirmImportOpen(false);
    setIsImporting(true);
    setMessage(null);

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.data || typeof backup.data !== 'object') {
        throw new Error('Invalid backup file structure');
      }

      const db = await getDatabase();
      // transaction: false everywhere — the plugin's implicit per-run
      // transaction would conflict with the manual BEGIN/COMMIT here.
      await db.execute('BEGIN TRANSACTION;', false);

      try {
        // Clear existing data
        await db.execute(`
          DELETE FROM attachments;
          DELETE FROM reminders;
          DELETE FROM checklist_items;
          DELETE FROM notes;
          DELETE FROM events;
          DELETE FROM folders;
          DELETE FROM settings;
        `, false);

        // Insert Folders
        for (const f of backup.data.folders || []) {
          await db.run(
            'INSERT INTO folders (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
            [f.id, f.name, f.color, f.created_at, f.updated_at],
            false
          );
        }

        // Insert Events (sound/reminder_days/reminders default for older backups)
        interface BackupEventRow {
          id: string; title: string; start_date: string; end_date: string | null;
          all_day: number; reminder: string; reminders?: string; sound?: string; reminder_days?: string;
          description: string; links: string; color: string; folder_id: string | null;
          created_at: string; updated_at: string;
        }
        for (const ev of (backup.data.events || []) as BackupEventRow[]) {
          await db.run(
            `INSERT INTO events (id, title, start_date, end_date, all_day, reminder, reminders, sound, reminder_days, description, links, color, folder_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              ev.id, ev.title, ev.start_date, ev.end_date, ev.all_day, ev.reminder,
              // Newer backups carry a `reminders` JSON array; older ones fall
              // back to wrapping the legacy single `reminder` value.
              ev.reminders || (ev.reminder && ev.reminder !== 'none' ? `["${ev.reminder}"]` : '[]'),
              ev.sound || 'default',
              ev.reminder_days || '[]',
              ev.description, ev.links, ev.color, ev.folder_id, ev.created_at, ev.updated_at,
            ],
            false
          );
        }

        // Insert Notes
        for (const n of backup.data.notes || []) {
          await db.run(
            `INSERT INTO notes (id, title, content, type, color, folder_id, event_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [n.id, n.title, n.content, n.type, n.color, n.folder_id, n.event_id, n.created_at, n.updated_at],
            false
          );
        }

        // Insert Checklist items
        for (const c of backup.data.checklist_items || []) {
          await db.run(
            `INSERT INTO checklist_items (id, note_id, text, is_completed, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [c.id, c.note_id, c.text, c.is_completed, c.sort_order, c.created_at, c.updated_at],
            false
          );
        }

        // Insert Attachments
        for (const a of backup.data.attachments || []) {
          await db.run(
            `INSERT INTO attachments (id, parent_id, parent_type, filename, filepath, mime_type, size, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [a.id, a.parent_id, a.parent_type, a.filename, a.filepath, a.mime_type, a.size, a.created_at],
            false
          );
        }

        // Insert Reminders
        for (const r of backup.data.reminders || []) {
          await db.run(
            `INSERT INTO reminders (id, parent_id, parent_type, remind_at, notification_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?);`,
            [r.id, r.parent_id, r.parent_type, r.remind_at, r.notification_id, r.created_at],
            false
          );
        }

        // Insert Settings
        for (const s of backup.data.settings || []) {
          await db.run(
            'INSERT INTO settings (key, value) VALUES (?, ?);',
            [s.key, s.value],
            false
          );
        }

        await db.execute('COMMIT;', false);
        setMessage({ text: 'Data successfully restored from backup!', type: 'success' });
        await loadStats();
      } catch (err) {
        await db.execute('ROLLBACK;', false);
        throw err;
      }
    } catch (err: any) {
      console.error('Import failed:', err);
      setMessage({ text: `Import failed: ${err.message}`, type: 'error' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background text-on-background overflow-hidden font-body-md">
      {/* TopAppBar */}
      <header className="flex justify-between items-center px-margin-mobile md:px-margin-desktop w-full h-16 bg-background z-30 shrink-0 border-b border-outline-variant/20">
        <h1 className="font-headline-md text-headline-md font-bold text-on-background">Backup & Import</h1>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 w-full max-w-[800px] mx-auto px-margin-mobile md:px-margin-desktop pb-[100px] md:pb-xl pt-lg overflow-y-auto">
        <div className="flex flex-col gap-xl">
          {message && (
            <div
              className={`p-4 rounded-xl text-body-md border ${
                message.type === 'success'
                  ? 'bg-secondary-container/20 border-secondary text-secondary'
                  : 'bg-error-container/20 border-error text-error'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Generate Backup Section */}
          <section className="flex flex-col gap-md">
            <div className="flex items-center gap-sm mb-xs">
              <span className="material-symbols-outlined text-primary">download</span>
              <h2 className="font-body-lg text-body-lg font-bold text-on-background">Generate Backup</h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-[42rem]">
              Create a secure, local file containing all your notes, folders, and calendar events. This file can be used to restore your data on this device or transfer it to another device securely.
            </p>
            <button
              className="mt-sm h-12 w-full md:w-auto px-lg bg-primary text-on-primary font-label-sm text-label-sm rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 self-start shadow-sm font-semibold disabled:opacity-50"
              onClick={handleExport}
              disabled={isExporting}
            >
              <span className="material-symbols-outlined text-lg">save</span>
              {isExporting ? 'Exporting...' : 'Create Backup File'}
            </button>
          </section>

          <hr className="border-outline-variant/30" />

          {/* Import Backup Section */}
          <section className="flex flex-col gap-md">
            <div className="flex items-center gap-sm mb-xs">
              <span className="material-symbols-outlined text-on-background">upload</span>
              <h2 className="font-body-lg text-body-lg font-bold text-on-background">Import Backup</h2>
            </div>
            <div className="bg-error-container/20 border border-error-container/50 rounded-xl p-md flex gap-md items-start">
              <span className="material-symbols-outlined text-error mt-1">warning</span>
              <div>
                <h3 className="font-label-sm text-label-sm font-bold text-error mb-1">Data Replacement Warning</h3>
                <p className="font-body-md text-body-md text-error/90">
                  Importing a backup will completely replace all current local data (notes, folders, and events) on this device. This action cannot be undone. We recommend creating a backup of your current state first.
                </p>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileSelected}
            />

            <button
              className="mt-sm h-12 w-full md:w-auto px-lg border border-outline text-on-background font-label-sm text-label-sm rounded-lg hover:bg-surface-container transition-colors flex items-center justify-center gap-2 self-start font-medium disabled:opacity-50"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              <span className="material-symbols-outlined text-lg">file_open</span>
              {isImporting ? 'Importing...' : 'Select Backup File'}
            </button>
          </section>

          <hr className="border-outline-variant/30" />

          {/* Local Storage Info */}
          <section className="flex flex-col gap-sm bg-surface-container-low p-md rounded-xl border border-outline-variant/20">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-on-surface-variant">storage</span>
              <h3 className="font-body-md text-body-md font-semibold text-on-surface">Local Database Status</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div className="p-3 bg-surface rounded-lg text-center">
                <span className="block font-headline-md text-primary font-bold">{stats.notesCount}</span>
                <span className="text-label-sm text-on-surface-variant">Notes</span>
              </div>
              <div className="p-3 bg-surface rounded-lg text-center">
                <span className="block font-headline-md text-secondary font-bold">{stats.eventsCount}</span>
                <span className="text-label-sm text-on-surface-variant">Events</span>
              </div>
              <div className="p-3 bg-surface rounded-lg text-center">
                <span className="block font-headline-md text-tertiary font-bold">{stats.foldersCount}</span>
                <span className="text-label-sm text-on-surface-variant">Folders</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <ConfirmDialog
        isOpen={confirmImportOpen}
        title="Replace all data?"
        message="Importing this backup will completely overwrite all current local data (notes, folders, events). This cannot be undone. Do you want to proceed?"
        confirmText="Import"
        destructive
        onConfirm={handleConfirmImport}
        onCancel={() => {
          setConfirmImportOpen(false);
          setPendingImportFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
      />
    </div>
  );
}

