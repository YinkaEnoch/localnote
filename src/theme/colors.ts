import type { FolderColor, NoteColor } from '@/types/models';

/**
 * CSS var per note color. 'default' has no explicit mapping so callers fall
 * back to the type-based hue (text/checklist/event).
 */
export const NOTE_COLOR_VAR: Partial<Record<NoteColor, string>> = {
  orange: 'var(--color-tertiary)',
  teal: 'var(--color-secondary)',
  red: 'var(--color-error)',
  purple: 'var(--color-primary)',
  blue: 'var(--color-primary-container)',
};

/**
 * CSS vars per folder color (bg + onBg). These mirror the swatches shown in
 * EditFolderPage so the color selected for a folder is the same color used to
 * display it everywhere (folder cards, folder header icon, folder pickers).
 */
export const FOLDER_COLOR_VAR: Record<FolderColor, { bg: string; onBg: string }> = {
  purple: { bg: 'var(--color-primary)', onBg: 'var(--color-on-primary)' },
  coral: { bg: 'var(--color-tertiary-container)', onBg: 'var(--color-on-tertiary-container)' },
  amber: { bg: 'var(--color-tertiary)', onBg: 'var(--color-on-tertiary)' },
  teal: { bg: 'var(--color-secondary-container)', onBg: 'var(--color-on-secondary-container)' },
  lavender: { bg: 'var(--color-primary-container)', onBg: 'var(--color-on-primary-container)' },
  blue: { bg: 'var(--color-inverse-primary)', onBg: 'var(--color-primary-container)' },
};