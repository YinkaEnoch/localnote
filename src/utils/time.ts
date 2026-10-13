/**
 * Single source of truth for 12-hour time formatting across the app.
 *
 * Every user-visible time MUST go through these helpers so display is
 * strictly 12-hour (AM/PM) regardless of device locale / 24-hour setting.
 * All helpers force `hour12: true` — never rely on locale defaults.
 */

export const HOUR12_TIME_OPTS = {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
} as const;

export function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** "9:05 AM" — pure 12-hour clock. */
export function formatTime12h(value: Date | string): string {
  try {
    return toDate(value).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(value);
  }
}

/** "Sep 5, 2026 • 9:05 AM" */
export function formatDateTime12h(value: Date | string): string {
  try {
    const d = toDate(value);
    const datePart = d.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${datePart} • ${formatTime12h(d)}`;
  } catch {
    return String(value);
  }
}

/** "Sep 5 • 9:05 AM" (short, no year) */
export function formatShortDateTime12h(value: Date | string): string {
  try {
    const d = toDate(value);
    const datePart = d.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });
    return `${datePart} • ${formatTime12h(d)}`;
  } catch {
    return String(value);
  }
}

/** "Sep 5, 2026 - 9:05 AM" (event list style) or "Sep 5, 2026 - All day". */
export function formatEventDateTime12h(
  value: Date | string,
  opts?: { allDay?: boolean },
): string {
  try {
    const d = toDate(value);
    const datePart = d.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (opts?.allDay) return `${datePart} - All day`;
    return `${datePart} - ${formatTime12h(d)}`;
  } catch {
    return String(value);
  }
}

/** "Sep 5, 2026, 9:05 AM" — date + time via a single formatter. */
export function formatLocaleDateTime12h(value: Date | string): string {
  try {
    return toDate(value).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(value);
  }
}

/** "Sep 5, 9:05 AM" — created-at / card style. */
export function formatCardDateTime12h(value: Date | string): string {
  try {
    return toDate(value).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(value);
  }
}

/** Reminder summary timestamp with optional weekday, strictly 12-hour. */
export function formatReminderStamp12h(
  value: Date | string,
  showWeekday: boolean,
): string {
  try {
    return toDate(value).toLocaleString([], {
      weekday: showWeekday ? 'short' : undefined,
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(value);
  }
}

/** Notification body timestamp, strictly 12-hour. */
export function formatNotifyStamp12h(
  value: Date | string,
  showWeekday: boolean,
): string {
  return formatReminderStamp12h(value, showWeekday);
}

/** "Sep 5, 2026" — date-only (no clock involved). */
export function formatDateLabel(value: Date | string): string {
  try {
    return toDate(value).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
}

/* ------------------------------------------------------------------ */
/* Local `datetime-local` value helpers (YYYY-MM-DDTHH:mm, local wall) */
/* ------------------------------------------------------------------ */

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Converts a Date to a `datetime-local`-compatible local wall value. */
export function toLocalInputValue(date: Date): string {
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  );
}

/** Splits "YYYY-MM-DDTHH:mm" into date + 12-hour fields for the picker. */
export function splitLocalInput(value: string): {
  date: string;
  hour12: number;
  minute: number;
  ampm: 'AM' | 'PM';
} {
  const [date = '', time = '00:00'] = (value || '').split('T');
  const [hStr = '0', mStr = '0'] = time.split(':');
  const h24 = Math.min(23, Math.max(0, parseInt(hStr, 10) || 0));
  const minute = Math.min(59, Math.max(0, parseInt(mStr, 10) || 0));
  const ampm: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { date, hour12, minute, ampm };
}

/** Joins date + 12-hour fields back into "YYYY-MM-DDTHH:mm". */
export function joinLocalInput(
  date: string,
  hour12: number,
  minute: number,
  ampm: 'AM' | 'PM',
): string {
  const h12 = Math.min(12, Math.max(1, hour12 || 12));
  const h24 = h12 % 12 + (ampm === 'PM' ? 12 : 0);
  return `${date}T${pad2(h24)}:${pad2(minute)}`;
}
