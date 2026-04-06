import {
  buildMonthCalendar,
  getRateForRequiredDays,
  getRequiredDays,
  getRuleSummary,
} from '@/src/features/goals/goal-form';

describe('goal form helpers', () => {
  test('calculates required days by rounding up', () => {
    expect(getRequiredDays(7, 71)).toBe(5);
  });

  test('builds the correct rule summary copy', () => {
    expect(getRuleSummary(7, 5)).toBe('Debes cumplir 5 de los pr\u00f3ximos 7 d\u00edas para estar al d\u00eda.');
  });

  test('derives a minimum rate from required days', () => {
    expect(getRateForRequiredDays(5, 3)).toBe(41);
    expect(getRateForRequiredDays(5, 5)).toBe(100);
    expect(getRateForRequiredDays(0, 0)).toBe(0);
  });

  test('builds a month calendar with in-month and out-of-month days', () => {
    const calendar = buildMonthCalendar(new Date(2026, 1, 1));

    expect(calendar.length % 7).toBe(0);
    expect(calendar.find((day) => day.date === '2026-02-01')).toEqual({
      date: '2026-02-01',
      dayNumber: 1,
      inMonth: true,
    });
    expect(calendar.find((day) => day.date === '2026-02-28')).toEqual({
      date: '2026-02-28',
      dayNumber: 28,
      inMonth: true,
    });
    expect(calendar.some((day) => !day.inMonth)).toBe(true);
  });
});
