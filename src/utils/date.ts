/**
 * Rock-solid local calendar date utilities.
 * Avoids timezone/UTC shift errors by operating directly on year-month-day components.
 */

export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function formatToDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayLocal(): string {
  return formatToDateStr(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatToDateStr(d);
}

export function calculateDaysRemaining(targetDateStr: string, baseDateStr: string): number {
  if (!targetDateStr || !baseDateStr) return 0;
  const target = parseLocalDate(targetDateStr);
  const base = parseLocalDate(baseDateStr);
  // Calculate difference in whole calendar days
  const diffTime = target.getTime() - base.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export interface DeadlineInfo {
  days: number;
  label: string;
  category: 'overdue' | 'today' | 'tomorrow' | 'approaching' | 'this_week' | 'upcoming';
  isUrgent: boolean;
}

export function getDeadlineInfo(targetDateStr: string, baseDateStr: string): DeadlineInfo {
  const days = calculateDaysRemaining(targetDateStr, baseDateStr);

  if (days < 0) {
    const overdueCount = Math.abs(days);
    return {
      days,
      label: `Overdue by ${overdueCount} day${overdueCount === 1 ? '' : 's'}`,
      category: 'overdue',
      isUrgent: true,
    };
  }

  if (days === 0) {
    return {
      days,
      label: 'Due today',
      category: 'today',
      isUrgent: true,
    };
  }

  if (days === 1) {
    return {
      days,
      label: 'Due tomorrow',
      category: 'tomorrow',
      isUrgent: true,
    };
  }

  if (days <= 3) {
    return {
      days,
      label: `Due in ${days} days`,
      category: 'approaching',
      isUrgent: true,
    };
  }

  if (days <= 7) {
    return {
      days,
      label: `This week · in ${days} days`,
      category: 'this_week',
      isUrgent: false,
    };
  }

  return {
    days,
    label: `In ${days} days`,
    category: 'upcoming',
    isUrgent: false,
  };
}

export function formatHeaderDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  const dayName = daysOfWeek[d.getDay()];
  const dayNum = d.getDate();
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();

  return `${dayName} · ${dayNum} ${monthName} ${year}`;
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function formatWeekdayShort(dateStr: string): string {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

export function formatMonthYear(year: number, monthIndex: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[monthIndex]} ${year}`;
}
