import { addDays, addMonths, diffInDays, enumerateDates, toISODate } from '@/src/utils/date';

describe('date helpers', () => {
  test('keeps ISO dates unchanged', () => {
    expect(toISODate('2026-04-06')).toBe('2026-04-06');
  });

  test('formats Date objects to ISO dates', () => {
    expect(toISODate(new Date(2026, 3, 6))).toBe('2026-04-06');
  });

  test('adds days across month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-02-01', -1)).toBe('2026-01-31');
  });

  test('adds months clamping the day to the destination month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
  });

  test('computes differences in days', () => {
    expect(diffInDays('2026-04-01', '2026-04-06')).toBe(5);
  });

  test('enumerates an inclusive date range', () => {
    expect(enumerateDates('2026-04-01', '2026-04-03')).toEqual(['2026-04-01', '2026-04-02', '2026-04-03']);
  });
});
