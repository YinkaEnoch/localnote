import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { DatabaseProvider } from '@/database/DatabaseProvider';
import { AppLayout } from '@/components/layout/AppLayout';

/**
 * Code-split page modules so the heavy editor pages (TipTap, dnd-kit) are only
 * downloaded/parsed when the user actually navigates to them — keeping the
 * initial startup bundle and first-paint fast on low-end Android devices.
 */
const NotesHomePage = lazy(() => import('@/pages/NotesHomePage').then(m => ({ default: m.NotesHomePage })));
const TextNoteEditorPage = lazy(() => import('@/pages/TextNoteEditorPage').then(m => ({ default: m.TextNoteEditorPage })));
const ChecklistEditorPage = lazy(() => import('@/pages/ChecklistEditorPage').then(m => ({ default: m.ChecklistEditorPage })));
const EventEditorPage = lazy(() => import('@/pages/EventEditorPage').then(m => ({ default: m.EventEditorPage })));
const CalendarPage = lazy(() => import('@/pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
const SearchPage = lazy(() => import('@/pages/SearchPage').then(m => ({ default: m.SearchPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const BackupPage = lazy(() => import('@/pages/BackupPage').then(m => ({ default: m.BackupPage })));
const FolderPage = lazy(() => import('@/pages/FolderPage').then(m => ({ default: m.FolderPage })));
const EditFolderPage = lazy(() => import('@/pages/EditFolderPage').then(m => ({ default: m.EditFolderPage })));

/** Minimal, non-blocking loading indicator shown while a route chunk loads. */
function RouteFallback(): ReactNode {
  return (
    <div className="flex-1 h-full flex items-center justify-center">
      <div
        className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"
        aria-label="Loading"
      />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <DatabaseProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
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
          </Suspense>
        </BrowserRouter>
      </DatabaseProvider>
    </ThemeProvider>
  );
}
