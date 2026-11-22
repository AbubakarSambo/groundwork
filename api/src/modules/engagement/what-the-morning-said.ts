import { KEY } from './a-message-sent-once';

/**
 * WHAT YESTERDAY'S MORNING SAID, SO TODAY'S SAYS WHAT IS NEW (release test, 22 November 2026, bug 34).
 *
 * The lead's morning was built each day from what is open now and nothing else, so Wairimu read the same words four mornings running.
 * Each morning now keeps, on its own record of that day (the row that already says it went, a-message-sent-once.ts), the lines it said.
 * The next morning reads that record: a line said word for word yesterday is not said again, and how many of those are still open is
 * said in one sentence, so nothing is hidden and the board has them all. A line that changed (a new day late, a new number) is new.
 */
const asSaid = (t: string) => String(t ?? '').toLowerCase().replace(/\s+/g, ' ').replace(/[.!?\s]+$/, '').trim();

/** The day before a YYYY-MM-DD day. */
export const theDayBefore = (day: string): string => new Date(new Date(`${day}T12:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);

/** The lines a morning said, as it said them, from its own record of that day. Empty when it said nothing or is not recorded. */
export async function whatTheMorningSaid(prisma: any, onceKey: string): Promise<Set<string>> {
  const row = await Promise.resolve(prisma?.platformSetting?.findUnique?.({ where: { key: KEY(onceKey) } })).catch(() => null);
  const said = (row as any)?.value?.said;
  return new Set(Array.isArray(said) ? said.map((s: unknown) => asSaid(String(s))) : []);
}

/** Kept on the morning's own record of the day, beside what became of it. */
export async function rememberWhatTheMorningSaid(prisma: any, onceKey: string, lines: string[]): Promise<void> {
  const key = KEY(onceKey);
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key } });
    const value = { ...((row?.value as object) ?? { at: new Date().toISOString() }), said: lines.map(asSaid) };
    if (row) await prisma.platformSetting.update({ where: { key }, data: { value, updatedBy: 'engagement' } });
    else await prisma.platformSetting.create({ data: { key, value, updatedBy: 'engagement' } });
  } catch { /* best effort: a morning that cannot remember says everything tomorrow, as before */ }
}

/** Whether this line was said, as it is now, by the morning before. */
export const saidYesterday = (yesterday: Set<string>, line: string): boolean => yesterday.has(asSaid(line));

/** "Two things from yesterday are still open, and your board has them all." */
export function stillOpenFromYesterday(n: number, inWords: (n: number) => string): string | null {
  if (n <= 0) return null;
  const said = inWords(n);
  return `${said.charAt(0).toUpperCase()}${said.slice(1)} ${n === 1 ? 'thing' : 'things'} from yesterday ${n === 1 ? 'is' : 'are'} still open, and your board has ${n === 1 ? 'it' : 'them all'}.`;
}
