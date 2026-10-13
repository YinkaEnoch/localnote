import { describe, expect, it } from 'vitest';
import {
  formatTime12h,
  formatEventDateTime12h,
  splitLocalInput,
  joinLocalInput,
} from './time';

describe('12-hour time helpers', () => {
  it('formats midnight and noon with AM/PM', () => {
    const midnight = new Date(2026, 9, 12, 0, 5);
    const noon = new Date(2026, 9, 12, 12, 30);
    const evening = new Date(2026, 9, 12, 21, 7);

    expect(formatTime12h(midnight)).toMatch(/12:05\s?AM/i);
    expect(formatTime12h(noon)).toMatch(/12:30\s?PM/i);
    // Strict 12-hour: never renders a 24-hour hour like "21:07".
    expect(formatTime12h(evening)).toMatch(/9:07\s?PM/i);
    expect(formatTime12h(evening)).not.toContain('21:07');
  });

  it('formats event dates in 12-hour style', () => {
    const d = new Date(2026, 8, 5, 14, 45);
    expect(formatEventDateTime12h(d, { allDay: true })).toContain('All day');
    expect(formatEventDateTime12h(d)).toMatch(/2:45\s?PM/i);
  });

  it('round-trips 12-hour picker values', () => {
    expect(joinLocalInput('2026-10-12', 12, 5, 'AM')).toBe('2026-10-12T00:05');
    expect(joinLocalInput('2026-10-12', 12, 30, 'PM')).toBe('2026-10-12T12:30');
    expect(joinLocalInput('2026-10-12', 9, 7, 'PM')).toBe('2026-10-12T21:07');

    expect(splitLocalInput('2026-10-12T00:05')).toEqual({
      date: '2026-10-12',
      hour12: 12,
      minute: 5,
      ampm: 'AM',
    });
    expect(splitLocalInput('2026-10-12T21:07')).toEqual({
      date: '2026-10-12',
      hour12: 9,
      minute: 7,
      ampm: 'PM',
    });
  });
});
