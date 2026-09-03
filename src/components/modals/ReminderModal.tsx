import { useEffect, useState } from 'react';
import type { Note, ReminderOffset, EventSound } from '@/types/models';

export type ReminderConfig = Pick<
  Note,
  'reminderOffsets' | 'reminderSound' | 'reminderDays' | 'reminderStart' | 'reminderEnd'
>;

interface ReminderModalProps {
  isOpen: boolean;
  /** Short label describing the parent, e.g. "Note" or "Checklist". */
  title: string;
  initial?: Partial<ReminderConfig>;
  onClose: () => void;
  onSave: (config: ReminderConfig) => void;
  /** Clears the reminder entirely (cancels any scheduled notifications). */
  onClear: () => void;
}

/** Selectable reminder offsets (excluding the legacy 'none'). */
export const REMINDER_OPTIONS: Exclude<ReminderOffset, 'none'>[] = [
  '5min',
  '10min',
  '15min',
  '30min',
  '1hr',
  '1day',
];

export const reminderOffsetLabels: Record<Exclude<ReminderOffset, 'none'>, string> = {
  '5min': '5 minutes before',
  '10min': '10 minutes before',
  '15min': '15 minutes before',
  '30min': '30 minutes before',
  '1hr': '1 hour before',
  '1day': '1 day before',
};

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Formats a config into a short human summary for menu/modal display. */
export const formatReminderSummary = (config: Partial<ReminderConfig>): string => {
  const offsets = (config.reminderOffsets || []).filter(
    (o): o is ReminderOffset => o !== 'none' && o in reminderOffsetLabels
  );
  if (offsets.length === 0) return 'None';

  const parts: string[] = [];
  if (config.reminderStart) {
    const start = new Date(config.reminderStart);
    parts.push(
      start.toLocaleString([], {
        weekday: config.reminderDays && config.reminderDays.length > 0 ? 'short' : undefined,
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  }
  if (config.reminderDays && config.reminderDays.length > 0) {
    parts.push(config.reminderDays.map((d) => WEEKDAY_NAMES[d].slice(0, 3)).join(', '));
  }
  parts.push(`×${offsets.length}`);
  return parts.join(' · ');
};

/** Converts a Date to a `datetime-local` input value (local wall time). */
const toLocalInput = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const minInputValue = (d: Date): string => toLocalInput(new Date(d.getTime() - 60_000));

const getInitial = (initial?: Partial<ReminderConfig>) => {
  const base = initial?.reminderStart ? new Date(initial.reminderStart) : null;
  const endBase = initial?.reminderEnd ? new Date(initial.reminderEnd) : null;
  const now = new Date();

  return {
    start: initial?.reminderStart
      ? toLocalInput(base!)
      : toLocalInput(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0)),
    end: initial?.reminderEnd
      ? toLocalInput(endBase!)
      : toLocalInput(new Date((base || now).getTime() + 24 * 60 * 60 * 1000)),
    offsets: initial?.reminderOffsets?.length ? initial.reminderOffsets : ['5min' as ReminderOffset],
    sound: initial?.reminderSound || ('default' as EventSound),
    days: initial?.reminderDays || ([] as number[]),
  };
};

export function ReminderModal({ isOpen, title, initial, onClose, onSave, onClear }: ReminderModalProps) {
  const [state, setState] = useState(() => getInitial(initial));

  // Re-seed the form whenever the modal opens with (possibly new) config.
  useEffect(() => {
    if (isOpen) setState(getInitial(initial));
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const hasDateRange = state.start.slice(0, 10) !== state.end.slice(0, 10);

  const toggleOffset = (offset: Exclude<ReminderOffset, 'none'>) => {
    setState((prev) => ({
      ...prev,
      offsets: prev.offsets.includes(offset)
        ? prev.offsets.filter((o) => o !== offset)
        : [...prev.offsets, offset],
    }));
  };

  const toggleDay = (day: number) => {
    setState((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day].sort((a, b) => a - b),
    }));
  };

  const handleSave = () => {
    onSave({
      reminderOffsets: state.offsets,
      reminderSound: state.sound,
      reminderDays: state.days,
      reminderStart: state.start ? new Date(state.start).toISOString() : null,
      reminderEnd: hasDateRange && state.end ? new Date(state.end).toISOString() : null,
    });
    onClose();
  };

  const offsetCount = state.offsets.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Scrim / Backdrop */}
      <div className="absolute inset-0 bg-black/60 transition-opacity duration-300" onClick={onClose} />

      {/* Bottom Sheet */}
      <div className="relative z-10 w-full max-w-[800px] mx-auto bg-surface rounded-t-xl sm:rounded-t-3xl shadow-[0_-8px_24px_rgba(0,0,0,0.4)] flex flex-col pt-sm pb-safe h-[88vh] sm:h-auto sm:max-h-[90vh]">
        <div className="w-full py-sm flex justify-center cursor-pointer" onClick={onClose}>
          <div className="w-8 h-1 rounded-full bg-on-surface-variant/40" />
        </div>

        {/* Header */}
        <div className="px-margin-mobile sm:px-margin-desktop pb-md flex items-center justify-between">
          <div className="flex items-center gap-sm">
            {offsetCount > 0 ? (
              <span className="material-symbols-outlined text-[22px]" style={{ color: 'var(--color-primary)' }}>alarm</span>
            ) : (
              <span className="material-symbols-outlined text-[22px]">notifications</span>
            )}
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Reminder</h2>
          </div>
          <button
            aria-label="Close"
            className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-margin-mobile sm:px-margin-desktop pb-xl">
          <p className="font-label-sm text-label-sm text-on-surface-variant mb-lg">
            Remind me about this {title.toLowerCase()} at a chosen date, time and repeat.
          </p>

          {/* Date & Time Range */}
          <div className="grid grid-cols-2 gap-md mb-lg">
            <div className="flex flex-col items-start p-md rounded-xl bg-surface-container-low focus-within:ring-2 focus-within:ring-primary w-full text-left">
              <span className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Starts</span>
              <input
                type="datetime-local"
                className="w-full bg-transparent border-none p-0 font-body-md text-on-background font-medium focus:ring-0"
                value={state.start}
                min={minInputValue(new Date())}
                onChange={(e) => setState((prev) => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className="flex flex-col items-start p-md rounded-xl bg-surface-container-low focus-within:ring-2 focus-within:ring-primary w-full text-left">
              <span className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Ends</span>
              <input
                type="datetime-local"
                className="w-full bg-transparent border-none p-0 font-body-md text-on-background font-medium focus:ring-0"
                value={state.end}
                min={state.start}
                onChange={(e) => setState((prev) => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>

          {/* Multiple Reminders (offsets) */}
          <div className="mb-lg">
            <div className="flex items-center gap-md mb-sm">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">notifications_active</span>
              <span className="font-body-md text-body-md text-on-background">Reminders</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">{offsetCount}</span>
            </div>
            <div className="flex flex-wrap gap-sm pl-[40px]">
              {REMINDER_OPTIONS.map((offset) => {
                const isSelected = state.offsets.includes(offset);
                return (
                  <button
                    key={offset}
                    type="button"
                    aria-pressed={isSelected}
                    className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm border-2 transition-colors ${
                      isSelected
                        ? 'bg-primary border-primary text-on-primary'
                        : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:bg-surface-container'
                    }`}
                    onClick={() => toggleOffset(offset)}
                  >
                    {reminderOffsetLabels[offset]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alarm Sound */}
          <div className="flex items-center gap-md py-sm">
            <span className="material-symbols-outlined text-on-surface-variant">campaign</span>
            <span className="font-body-md text-body-md text-on-background">Alarm sound</span>
            <div className="flex gap-xs bg-surface-container-high rounded-full p-1 ml-auto">
              <button
                type="button"
                className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-colors ${
                  state.sound === 'default' ? 'bg-primary text-on-primary font-medium' : 'text-on-surface-variant'
                }`}
                onClick={() => setState((prev) => ({ ...prev, sound: 'default' }))}
              >
                Default
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-colors ${
                  state.sound === 'long' ? 'bg-primary text-on-primary font-medium' : 'text-on-surface-variant'
                }`}
                onClick={() => setState((prev) => ({ ...prev, sound: 'long' }))}
              >
                Long
              </button>
            </div>
          </div>

          {/* Reminder Days (only meaningful across a date range) */}
          {hasDateRange && (
            <>
              <div className="h-px w-full bg-surface-variant my-sm" />
              <div className="flex flex-col gap-sm py-sm">
                <div className="flex items-center gap-md">
                  <span className="material-symbols-outlined text-on-surface-variant">event_repeat</span>
                  <span className="font-body-md text-body-md text-on-background">Remind me on</span>
                </div>
                <p className="font-label-sm text-label-sm text-on-surface-variant pl-[40px]">
                  {state.days.length === 0
                    ? 'Every day in the selected range'
                    : `Only on ${state.days.map((d) => WEEKDAY_NAMES[d].slice(0, 3)).join(', ')}`}
                </p>
                <div className="flex gap-sm pl-[40px] pt-1">
                  {WEEKDAY_LABELS.map((label, day) => (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={state.days.includes(day)}
                      aria-label={WEEKDAY_NAMES[day]}
                      className={`w-9 h-9 rounded-full font-label-sm text-label-sm border-2 transition-colors ${
                        state.days.includes(day)
                          ? 'bg-primary border-primary text-on-primary'
                          : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:bg-surface-container'
                      }`}
                      onClick={() => toggleDay(day)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Summary */}
          <div className="h-px w-full bg-surface-variant my-sm" />
          <div className="flex items-start gap-md py-sm pb-lg">
            <span className="material-symbols-outlined text-on-surface-variant">info</span>
            <p className="font-label-sm text-label-sm text-on-surface-variant flex-1">
              {formatReminderSummary({
                reminderOffsets: state.offsets,
                reminderDays: state.days,
                reminderStart: state.start ? new Date(state.start).toISOString() : null,
                reminderEnd: hasDateRange && state.end ? new Date(state.end).toISOString() : null,
              })}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-margin-mobile sm:px-margin-desktop py-md border-t border-surface-variant/40 flex items-center gap-md">
          <button
            type="button"
            className="text-error font-label-lg text-label-lg hover:bg-error-container/20 px-md py-sm rounded-full transition-colors flex items-center gap-2"
            onClick={() => { onClear(); onClose(); }}
          >
            <span className="material-symbols-outlined text-[18px]">notifications_off</span>
            Remove
          </button>
          <button
            type="button"
            className="ml-auto px-lg py-sm rounded-full font-label-lg text-label-lg font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity flex items-center gap-2"
            onClick={handleSave}
          >
            <span className="material-symbols-outlined text-[18px]">check</span>
            Save Reminder
          </button>
        </div>
      </div>
    </div>
  );
}
