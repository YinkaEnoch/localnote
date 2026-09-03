export type NoteType = 'text' | 'checklist';
export type NoteColor = 'default' | 'orange' | 'teal' | 'red' | 'purple' | 'blue';
export type FolderColor = 'purple' | 'coral' | 'amber' | 'teal' | 'lavender' | 'blue';
export type FontSize = 'small' | 'default' | 'large';
export type ThemeMode = 'dark' | 'light' | 'system';
export type SortOption = 'updated' | 'created' | 'alphabetical';
export type ReminderOffset = 'none' | '5min' | '10min' | '15min' | '30min' | '1hr' | '1day';
export type SearchScope = 'all' | 'titles' | 'contents';
export type EventSound = 'default' | 'long';

export interface Note {
  id: string;
  title: string;
  content: string; // HTML string for rich text
  type: NoteType;
  color: NoteColor;
  folderId: string | null;
  eventId: string | null; // FK to events table when note is also an event
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface ChecklistItem {
  id: string;
  noteId: string;
  text: string;
  isCompleted: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  title: string;
  startDate: string; // ISO 8601
  endDate: string | null;
  allDay: boolean;
  reminders: ReminderOffset[]; // one alert fires at each selected offset before the event
  sound: EventSound; // notification/alarm sound to use for the reminder
  reminderDays: number[]; // weekdays (0=Sun..6=Sat) to remind on within [startDate, endDate]; empty = start date only
  description: string;
  links: string; // JSON array string
  color: NoteColor;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  color: FolderColor;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  parentId: string;
  parentType: 'note' | 'event';
  filename: string;
  filepath: string;
  mimeType: string;
  size: number; // bytes
  createdAt: string;
}

export interface Reminder {
  id: string;
  parentId: string;
  parentType: 'note' | 'event';
  remindAt: string; // ISO 8601
  notificationId: number | null; // native notification ID
  createdAt: string;
}

export interface NoteListItem {
  id: string;
  title: string;
  snippet: string; // first line of content, stripped of HTML
  type: NoteType;
  color: NoteColor;
  folderId: string | null;
  eventId: string | null;
  checklistTotal?: number;
  checklistCompleted?: number;
  eventDate?: string;
  updatedAt: string;
  createdAt: string;
}

export interface FolderWithCount extends Folder {
  itemCount: number;
}
