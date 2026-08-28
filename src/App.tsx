import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { DatabaseProvider } from '@/database/DatabaseProvider';
import { AppLayout } from '@/components/layout/AppLayout';
import { NotesHomePage } from '@/pages/NotesHomePage';
import { TextNoteEditorPage } from '@/pages/TextNoteEditorPage';
import { ChecklistEditorPage } from '@/pages/ChecklistEditorPage';
import { EventEditorPage } from '@/pages/EventEditorPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { SearchPage } from '@/pages/SearchPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { BackupPage } from '@/pages/BackupPage';
import { FolderPage } from '@/pages/FolderPage';
import { EditFolderPage } from '@/pages/EditFolderPage';

export function App() {
  return (
    <ThemeProvider>
      <DatabaseProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<NotesHomePage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/backup" element={<BackupPage />} />
              <Route path="/folder/:id" element={<FolderPage />} />
            </Route>
            {/* Editor screens don't use the main layout (no bottom nav) */}
            <Route path="/note/new" element={<TextNoteEditorPage />} />
            <Route path="/note/:id" element={<TextNoteEditorPage />} />
            <Route path="/checklist/new" element={<ChecklistEditorPage />} />
            <Route path="/checklist/:id" element={<ChecklistEditorPage />} />
            <Route path="/event/new" element={<EventEditorPage />} />
            <Route path="/event/:id" element={<EventEditorPage />} />
            <Route path="/folder/:id/edit" element={<EditFolderPage />} />
            <Route path="/folder/new" element={<EditFolderPage />} />
          </Routes>
        </BrowserRouter>
      </DatabaseProvider>
    </ThemeProvider>
  );
}
