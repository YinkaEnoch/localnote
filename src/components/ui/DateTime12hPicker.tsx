import { joinLocalInput, splitLocalInput } from '@/utils/time';

interface DateTime12hPickerProps {
  /** Local wall value "YYYY-MM-DDTHH:mm". */
  value: string;
  onChange: (next: string) => void;
  id?: string;
}

/**
 * Strict 12-hour date/time picker.
 *
 * Native `datetime-local` follows the device 12/24-hour setting, so it can
 * present a 24-hour clock. This control splits picking into a date field
 * plus explicit hour (1-12) / minute / AM-PM selects, so setting time is
 * always 12-hour regardless of locale.
 */
export function DateTime12hPicker({ value, onChange, id }: DateTime12hPickerProps) {
  const { date, hour12, minute, ampm } = splitLocalInput(value);

  const pad = (n: number) => String(n).padStart(2, '0');

  const emit = (next: { date?: string; hour12?: number; minute?: number; ampm?: 'AM' | 'PM' }) => {
    const d = next.date ?? date;
    if (!d) return;
    onChange(joinLocalInput(d, next.hour12 ?? hour12, next.minute ?? minute, next.ampm ?? ampm));
  };

  const selectClass =
    'bg-transparent border-none p-0 font-body-md text-on-background font-medium focus:ring-0 cursor-pointer';

  return (
    <div className="w-full flex flex-wrap items-center gap-2">
      <input
        id={id}
        type="date"
        aria-label="Date"
        className="bg-transparent border-none p-0 font-body-md text-on-background font-medium focus:ring-0"
        value={date}
        onChange={(e) => emit({ date: e.target.value })}
      />
      <span className="flex items-center gap-1" role="group" aria-label="Time (12-hour)">
        <select
          aria-label="Hour (1-12)"
          className={selectClass}
          value={hour12}
          onChange={(e) => emit({ hour12: Number(e.target.value) })}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span aria-hidden="true">:</span>
        <select
          aria-label="Minute"
          className={selectClass}
          value={minute}
          onChange={(e) => emit({ minute: Number(e.target.value) })}
        >
          {Array.from({ length: 60 }, (_, i) => i).map((m) => (
            <option key={m} value={m}>
              {pad(m)}
            </option>
          ))}
        </select>
        <select
          aria-label="AM or PM"
          className={selectClass}
          value={ampm}
          onChange={(e) => emit({ ampm: e.target.value as 'AM' | 'PM' })}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </span>
    </div>
  );
}
