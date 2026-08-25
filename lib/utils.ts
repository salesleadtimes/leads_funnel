import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtINR(n: number | string | null | undefined): string {
  const num = Number(n) || 0;
  return '₹' + num.toLocaleString('en-IN');
}

export function fmtDate(d: string | null | undefined): string {
  return d ? new Date(d).toLocaleDateString('en-IN') : '—';
}
