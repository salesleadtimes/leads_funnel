export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface PeriodRange {
  key: string;
  year: number;
  periodType: PeriodType;
  periodValue: number | null;
  start: string;       // ISO string inclusive start: e.g. 2026-08-01T00:00:00.000Z
  end: string;         // ISO string exclusive end: e.g. 2026-09-01T00:00:00.000Z
  startDateStr: string; // YYYY-MM-DD
  endDateStr: string;   // YYYY-MM-DD
  label: string;       // e.g. "August 2026" or "25 Aug 2026"
}

/**
 * Normalizes input period names to canonical PeriodType ('daily'|'weekly'|'monthly'|'quarterly'|'yearly')
 */
export function normalizePeriodType(input: string): PeriodType {
  const p = (input || '').toLowerCase().trim();
  if (p === 'day' || p === 'daily') return 'daily';
  if (p === 'week' || p === 'weekly') return 'weekly';
  if (p === 'month' || p === 'monthly') return 'monthly';
  if (p === 'quarter' || p === 'quarterly') return 'quarterly';
  if (p === 'year' || p === 'yearly') return 'yearly';
  return 'monthly';
}

/**
 * Helper to parse a date safely as local date or fallback to today
 */
function parseRefDate(ref?: string | Date | null): Date {
  if (!ref) return new Date();
  if (ref instanceof Date) return new Date(ref.getTime());
  
  const clean = String(ref).slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const parsed = new Date(ref);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Get ISO week number (1..53) and ISO week-year
 */
export function getIsoWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week: weekNo, year: d.getUTCFullYear() };
}

/**
 * Calculate numeric period value used for database storage
 */
export function getPeriodValue(period: PeriodType | string, refDate?: string | Date | null): number | null {
  const norm = normalizePeriodType(period);
  const d = parseRefDate(refDate);

  switch (norm) {
    case 'daily':
      // MMDD representation (e.g. Aug 25 -> 825, Jan 1 -> 101)
      return (d.getMonth() + 1) * 100 + d.getDate();
    case 'weekly':
      return getIsoWeek(d).week;
    case 'monthly':
      return d.getMonth() + 1;
    case 'quarterly':
      return Math.floor(d.getMonth() / 3) + 1;
    case 'yearly':
    default:
      return null;
  }
}

/**
 * Generate standardized period key, e.g. 2026-08-25, 2026-W35, 2026-08, 2026-Q3, 2026
 */
export function getPeriodKey(period: PeriodType | string, refDate?: string | Date | null): string {
  const norm = normalizePeriodType(period);
  const d = parseRefDate(refDate);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  switch (norm) {
    case 'daily':
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    case 'weekly': {
      const { week, year: wYear } = getIsoWeek(d);
      return `${wYear}-W${String(week).padStart(2, '0')}`;
    }
    case 'monthly':
      return `${year}-${String(month).padStart(2, '0')}`;
    case 'quarterly': {
      const q = Math.floor(d.getMonth() / 3) + 1;
      return `${year}-Q${q}`;
    }
    case 'yearly':
    default:
      return `${year}`;
  }
}

/**
 * Generates exact half-open interval [start, end) and formatted label for any period type
 */
export function getPeriodRange(period: PeriodType | string, refDate?: string | Date | null): PeriodRange {
  const norm = normalizePeriodType(period);
  const d = parseRefDate(refDate);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed

  let start: Date;
  let end: Date;
  let label: string;

  switch (norm) {
    case 'daily': {
      start = new Date(year, month, d.getDate(), 0, 0, 0, 0);
      end = new Date(year, month, d.getDate() + 1, 0, 0, 0, 0);
      label = start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      break;
    }
    case 'weekly': {
      const day = d.getDay(); // 0=Sunday, 1=Monday...
      // Week starts on Monday
      const diffToMonday = (day + 6) % 7;
      start = new Date(year, month, d.getDate() - diffToMonday, 0, 0, 0, 0);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7, 0, 0, 0, 0);
      
      const lastDayOfWeek = new Date(end.getTime() - 86400000);
      label = `${start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${lastDayOfWeek.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
      break;
    }
    case 'monthly': {
      start = new Date(year, month, 1, 0, 0, 0, 0);
      end = new Date(year, month + 1, 1, 0, 0, 0, 0);
      label = start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      break;
    }
    case 'quarterly': {
      const q = Math.floor(month / 3);
      start = new Date(year, q * 3, 1, 0, 0, 0, 0);
      end = new Date(year, (q + 1) * 3, 1, 0, 0, 0, 0);
      label = `Q${q + 1} ${year}`;
      break;
    }
    case 'yearly':
    default: {
      start = new Date(year, 0, 1, 0, 0, 0, 0);
      end = new Date(year + 1, 0, 1, 0, 0, 0, 0);
      label = `Year ${year}`;
      break;
    }
  }

  const periodVal = getPeriodValue(norm, d);
  const key = getPeriodKey(norm, d);

  const toYMD = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const lastInclusiveDay = new Date(end.getTime() - 86400000);

  return {
    key,
    year,
    periodType: norm,
    periodValue: periodVal,
    start: start.toISOString(),
    end: end.toISOString(),
    startDateStr: toYMD(start),
    endDateStr: toYMD(lastInclusiveDay),
    label,
  };
}
