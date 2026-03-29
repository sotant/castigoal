import { capitalizeCopy } from '@/src/i18n/common';
import { formatMonthYearLabel, getLocalizedWeekdayLabels } from '@/src/utils/date';

export function getWeekdayLabels() {
  return getLocalizedWeekdayLabels('narrow');
}

export function getMonthDate(offset: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
}

export function getMonthStart(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export function formatMonthLabel(date: Date) {
  return capitalizeCopy(formatMonthYearLabel(date));
}
