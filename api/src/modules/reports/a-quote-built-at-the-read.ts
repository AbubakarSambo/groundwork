/**
 * A QUOTE IN A LINE BUILT AT THE READ IS THE RECORD'S WORDS TOO.
 *
 * Hafsah, 27 September 2026: "Every quote any person sees must be the person's original words, taken
 * from the record, never the model's copy of them."
 *
 * The quote pass (a-quote-is-what-they-said) runs once, before a report is stored. Some of what a
 * person reads is never stored: it is built when the report or the board is opened. The run of 27
 * September (all-24, run 12) served 482 quotes, and the three that were not word for word in the
 * record were all in lines built at the read:
 *
 *   Renewal, the lead's report, "what to ask each person":
 *     "Worth getting on record, where anyone could check it later: 'On track', for me, meant that
 *      there weren't any major disruptions or escalations."
 *   Yemi typed "On track, for me, meant that..." with no marks. The record reader put 'On track' in
 *   single marks when it wrote the line, and the probe list copies the whole line.
 *
 *   Seniorhire, the board's Blockers tile, for Dr Amina Bello, who runs it, and for Tobi Adewale:
 *     "I haven't explicitly said 'get me out of these meetings.' I did say he..., and 3 more; nobody
 *      is waiting on anybody"
 *   Amina typed "get me out of these meetings." in double marks; the record reader changed them to
 *   single ones, so the line is not stamped as her words, and the tile copies it.
 *
 * So the lines built at the read get the same rule, at the read: a quote whose words are in the
 * record gets the record's words back, a quote that is not loses its marks where the words stand as
 * a plain statement, and the sentence goes where they cannot - the same no-blank rules as the stored
 * pass (an item of a list goes, a field on its own stays, unquoted).
 *
 * THE SAME RECORD, AND NO WIDER. The lines the stored pass may quote from (theLinesAQuoteMayComeFrom:
 * the record lines stamped as the person's own words, their promises where those are, and the lead's
 * own words at set-up), read for the check-in the reader is already reading. And with no names: the
 * stored pass lets a label inside a quote be found as the person's name, because the models write
 * labels. At the read the names are already in, for this reader, so a quote is found only as the same
 * words. What goes back between the marks is therefore always the words that were already there, in
 * the record's capitals and apostrophes: nobody is shown a name, or a word, they were not shown before.
 *
 * Nothing is rebuilt and no model is called.
 */
import { everyQuoteFromTheRecord, theLinesAQuoteMayComeFrom } from './a-quote-is-what-they-said';

/** Only what this reads. Optional-chained, like every read the report makes on a client a test may double. */
interface TheRecordsReader {
  recordEntry?: { findMany?: (args: any) => Promise<any[]> };
  groundCommitment?: { findMany?: (args: any) => Promise<any[]> };
  ground?: { findUnique?: (args: any) => Promise<any> };
}

/**
 * The lines a quote on this check-in may come from: the same list the stored pass builds, read the
 * same way. A read that fails gives no lines, and then no quote is kept, because a quote that cannot
 * be checked against the record is not known to be anybody's words.
 */
export async function theRecordAQuoteMayComeFrom(prisma: TheRecordsReader, groundId: string): Promise<string[]> {
  const read = <T,>(f: () => Promise<T> | undefined, fallback: T): Promise<T> =>
    Promise.resolve().then(() => f() ?? fallback).catch(() => fallback);
  const [lines, promises, ground] = await Promise.all([
    read(() => prisma.recordEntry?.findMany?.({ where: { participant: { groundId } }, select: { text: true, saidWordForWord: true } }), [] as any[]),
    read(() => prisma.groundCommitment?.findMany?.({ where: { groundId }, select: { text: true, whenSaid: true, saidWordForWord: true, whenSaidWordForWord: true } }), [] as any[]),
    read(() => prisma.ground?.findUnique?.({ where: { id: groundId }, select: { brief: true, participants: { select: { remitAsGiven: true, roleAsDescribed: true } } } }), null as any),
  ]);
  return theLinesAQuoteMayComeFrom(
    [
      ...(Array.isArray(lines) ? lines : []),
      ...(Array.isArray(promises) ? promises : []).map((c: any) => ({ text: c.text, saidWordForWord: c.saidWordForWord === true })),
      ...(Array.isArray(promises) ? promises : []).map((c: any) => ({ text: c.whenSaid, saidWordForWord: c.whenSaidWordForWord === true })),
    ],
    [ground?.brief, ...((ground?.participants ?? []) as any[]).flatMap((p) => [p.remitAsGiven, p.roleAsDescribed])],
  );
}

/**
 * Every quote in a value built at the read, made the record's words, made not a quote, or taken out
 * with its sentence. `changed` collects what was unquoted or dropped, for the log.
 */
export function quotesBuiltAtTheRead<T>(value: T, record: string[], changed: string[] = []): T {
  if (value === null || value === undefined) return value;
  /* No names: see THE SAME RECORD, AND NO WIDER, above. */
  const r = everyQuoteFromTheRecord(value, record, []);
  changed.push(...r.unquoted.map((q) => `unquoted "${q}"`), ...r.dropped.map((s) => `dropped "${s}"`));
  return r.value;
}
