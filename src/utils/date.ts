import { getCurrentLocale } from '@/src/i18n';

const DAY = 24 * 60 * 60 * 1000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAY_REFERENCE_MONDAY = Date.UTC(2024, 0, 1);

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatParts(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseISODate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateInput(value: string | Date) {
  if (typeof value === 'string' && ISO_DATE_PATTERN.test(value)) {
    return parseISODate(value);
  }

  return typeof value === 'string' ? new Date(value) : value;
}

function getLocalDateParts(value: Date) {
  return {
    year: value.getFullYear(),
    month: value.getMonth() + 1,
    day: value.getDate(),
  };
}

export function toISODate(input: string | Date): string {
  if (typeof input === 'string' && ISO_DATE_PATTERN.test(input)) {
    return input;
  }

  const date = typeof input === 'string' ? new Date(input) : input;
  const { year, month, day } = getLocalDateParts(date);
  return formatParts(year, month, day);
}

export function startOfToday(): string {
  return toISODate(new Date());
}

export function addDays(date: string | Date, amount: number): string {
  const base = typeof date === 'string' && ISO_DATE_PATTERN.test(date) ? parseISODate(date) : parseISODate(toISODate(date));
  base.setUTCDate(base.getUTCDate() + amount);

  return formatParts(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
}

export function addMonths(date: string | Date, amount: number): string {
  const base = typeof date === 'string' && ISO_DATE_PATTERN.test(date) ? parseISODate(date) : parseISODate(toISODate(date));
  const originalDay = base.getUTCDate();
  base.setUTCDate(1);
  base.setUTCMonth(base.getUTCMonth() + amount);

  const daysInTargetMonth = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(originalDay, daysInTargetMonth));

  return formatParts(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
}

export function diffInDays(start: string, end: string): number {
  const startDate = parseISODate(start);
  const endDate = parseISODate(end);
  return Math.floor((endDate.getTime() - startDate.getTime()) / DAY);
}

export function enumerateDates(start: string, end: string): string[] {
  const days = diffInDays(start, end);
  return Array.from({ length: days + 1 }, (_, index) => addDays(start, index));
}

export function formatDateByLocale(
  date: string | Date,
  options: Intl.DateTimeFormatOptions,
  locale = getCurrentLocale(),
) {
  return new Intl.DateTimeFormat(locale, options).format(toDateInput(date));
}

export function formatDatePartsByLocale(
  date: string | Date,
  options: Intl.DateTimeFormatOptions,
  locale = getCurrentLocale(),
) {
  return new Intl.DateTimeFormat(locale, options).formatToParts(toDateInput(date));
}

export function formatMonthYearLabel(date: Date, locale = getCurrentLocale()) {
  return formatDateByLocale(date, { month: 'long', year: 'numeric' }, locale);
}

export function getLocalizedWeekdayLabels(
  format: Intl.DateTimeFormatOptions['weekday'] = 'narrow',
  locale = getCurrentLocale(),
) {
  return Array.from({ length: 7 }, (_, index) =>
    formatDateByLocale(new Date(WEEKDAY_REFERENCE_MONDAY + index * DAY), { timeZone: 'UTC', weekday: format }, locale).replace(/\./g, ''),
  );
}

export function formatShortDate(date: string): string {
  return formatDateByLocale(date, {
    day: '2-digit',
    month: 'short',
  });
}

export function formatCompactDate(date: string): string {
  return formatDateByLocale(date, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).replace('.', '');
}

export function formatWeekdayShort(date: string): string {
  return formatDateByLocale(date, {
    weekday: 'short',
  }).replace('.', '');
}

export function formatLongDate(date: string): string {
  return formatDateByLocale(date, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatLongDateWithWeekday(date: string): string {
  return formatDateByLocale(date, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
