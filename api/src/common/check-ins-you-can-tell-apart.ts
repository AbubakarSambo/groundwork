import { whenItWas } from './a-date-reads-the-same-everywhere';

/**
 * TWO CHECK-INS WITH THE SAME NAME, TOLD APART IN PLAIN WORDS.
 *
 * Where two of one reader's check-ins share a name, a message that lists them ("You have two check-ins
 * open: "Sales team, Q4" and "Sales team, Q4"") cannot be answered. This is the one place that says
 * which is which, for every message that lists check-ins by name: by when each started, or when they
 * started on the same day, by who runs it. A check-in whose name is unique reads exactly as it did.
 *
 * Only the display changes. The stored name is never rewritten.
 */
export interface ACheckInToName {
  id: string;
  label: string;
  /** When the check-in started (its creation). */
  startedAt?: Date | string | null;
  /** The first name of the person who runs it. */
  leadName?: string | null;
}

const bones = (t: string) => (t ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function namesTheyCanTellApart(items: ACheckInToName[], timeZone?: string): Map<string, string> {
  const said = new Map<string, string>();
  const groups = new Map<string, ACheckInToName[]>();
  for (const c of items) {
    const key = bones(c.label);
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  for (const group of groups.values()) {
    if (group.length === 1) { said.set(group[0].id, group[0].label); continue; }
    const day = (c: ACheckInToName) => (c.startedAt ? whenItWas(c.startedAt, 'dayAndMonthLong', timeZone) : '');
    const days = group.map(day);
    const daysDiffer = new Set(days).size === group.length && days.every(Boolean);
    const leads = group.map((c) => (c.leadName ?? '').trim());
    const leadsDiffer = new Set(leads).size === group.length && leads.every(Boolean);
    group.forEach((c, i) => {
      const base = c.label.trim().replace(/[.,;:\s]+$/, '');
      if (daysDiffer) said.set(c.id, `${base}, started ${days[i]}`);
      else if (leadsDiffer) said.set(c.id, `${base}, run by ${leads[i]}${days[i] ? `, started ${days[i]}` : ''}`);
      else if (days.every(Boolean)) {
        /* Same day, same person: the time is the only honest difference left. */
        said.set(c.id, `${base}, started ${days[i]} at ${whenItWas(c.startedAt, 'time', timeZone)}`);
      } else {
        said.set(c.id, c.label);
      }
    });
  }
  return said;
}

/** The labels in the same order, each one told apart from the others. */
export function labelsTheyCanTellApart<T extends ACheckInToName>(items: T[], timeZone?: string): (T & { label: string })[] {
  const said = namesTheyCanTellApart(items, timeZone);
  return items.map((c) => ({ ...c, label: said.get(c.id) ?? c.label }));
}
