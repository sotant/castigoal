export type DurationMode = 'days' | 'endDate';
export type MinimumMode = 'percentage' | 'days';

export type CalendarDay = {
  date: string;
  dayNumber: number;
  inMonth: boolean;
};

export const targetDayPresets = [7, 14, 30];
export const minimumRatePresets = [50, 70, 80, 100];
export const weekdayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const sliderSteps = Array.from({ length: 21 }, (_, index) => index * 5);

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function parsePositiveNumber(value: string) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function getRequiredDays(targetDays: number, minimumSuccessRate: number) {
  return Math.max(0, Math.ceil((targetDays * minimumSuccessRate) / 100));
}

export function getRuleSummary(targetDays: number, requiredDays: number) {
  return `Debes cumplir ${requiredDays} de los proximos ${targetDays} dias para estar al dia.`;
}

export function getRateForRequiredDays(targetDays: number, requiredDays: number) {
  if (targetDays <= 0 || requiredDays <= 0) {
    return 0;
  }

  const normalizedDays = clamp(requiredDays, 0, targetDays);
  return Math.round((normalizedDays / targetDays) * 100);
}

export function toCalendarDateParts(value: string) {
  const [year, month] = value.split('-').map(Number);
  return { year, monthIndex: month - 1 };
}

export function getMonthAnchor(date: string) {
  const { year, monthIndex } = toCalendarDateParts(date);
  return new Date(year, monthIndex, 1);
}

export function toLocalISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function buildMonthCalendar(monthDate: Date): CalendarDay[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
  const gridStart = new Date(year, month, 1 - leadingDays);

  return Array.from({ length: totalCells }, (_, index) => {
    const current = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);

    return {
      date: toLocalISODate(current),
      dayNumber: current.getDate(),
      inMonth: current.getMonth() === month,
    };
  });
}
