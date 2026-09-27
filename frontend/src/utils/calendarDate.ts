const calendarPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export const calendarKey = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const match = value.slice(0, 10).match(calendarPattern);
  return match ? match[0] : null;
};

export const parseCalendarDate = (value: string): Date => {
  const match = value.match(calendarPattern);
  if (!match) throw new Error(`Invalid calendar date: ${value}`);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

export const formatCalendarDate = (value: string | null | undefined): string => {
  const key = calendarKey(value);
  if (!key) return '—';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(parseCalendarDate(key));
};

export const monthKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
export const shiftMonth = (date: Date, amount: number): Date => new Date(date.getFullYear(), date.getMonth() + amount, 1);
export const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
export const todayKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
