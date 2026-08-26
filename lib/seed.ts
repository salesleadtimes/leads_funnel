export function uid(): string {
  return 'HPQ-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function seedState() {
  const leads: any[] = [];
  const targets = { daily: 15000, weekly: 100000, monthly: 400000, quarterly: 1200000, yearly: 5000000 };
  return { leads, targets };
}
