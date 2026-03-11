const DAY = 24 * 60 * 60 * 1000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

export function diffInDays(start: string, end: string): number {
  const startDate = parseISODate(start);
  const endDate = parseISODate(end);
  return Math.floor((endDate.getTime() - startDate.getTime()) / DAY);
}

export function enumerateDates(start: string, end: string): string[] {
  const days = diffInDays(start, end);
  return Array.from({ length: days + 1 }, (_, index) => addDays(start, index));
}

export function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
  }).format(parseISODate(date));
}

export function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseISODate(date));
}
