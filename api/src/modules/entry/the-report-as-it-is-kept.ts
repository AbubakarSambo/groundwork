import type { EntryReport } from './entry.service';

/**
 * THE FIRST REPORT HAS ONE SHAPE, AND THE SERVER GIVES IT THAT SHAPE.
 *
 * (Hafsah's screenshot of 19 November 2026: Clinton pressed "Save this" at the end of his first check-in and read "Something you
 * sent could not be used, so check what you typed and try again." He had typed nothing wrong, and the check-in was not saved.)
 *
 * The report is written by the model, served to the screen, and sent back whole on the save so the report the person read is the
 * one that is kept. The save route then checked it field by field, as if the person had typed it: a field the model added, a
 * `null` where a sentence was expected, a status in other letters or a long line each refused the whole save, with a message that
 * told the person to check their typing. That check stood in the controller as five classes held equal to the screen's type by a
 * test, and it had already refused every save twice before (see `entry-commit-dto-report-summary.spec.ts`).
 *
 * So the shape is given here, once, by the server that wrote the report: when it is served and again when it comes back. What is
 * known is kept as text, anything else is left out, and nothing about the report can refuse a save.
 */
const STATUSES = ['Unresolved', 'Mixed', 'Emerging', 'Clear', 'Aligned'] as const;

const text = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '');
const anObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const rows = <T>(v: unknown, row: (o: Record<string, unknown>) => T | null): T[] =>
  (Array.isArray(v) ? v : []).filter(anObject).map(row).filter((r): r is T => r !== null);
const titled = (o: Record<string, unknown>) => (text(o.title) ? { title: text(o.title) } : {});

const someone = (o: Record<string, unknown>) => (text(o.name).trim() ? { name: text(o.name), context: text(o.context) } : null);

export function theReportAsItIsKept(raw: unknown): EntryReport | undefined {
  if (!anObject(raw)) return undefined;
  const status = STATUSES.find((s) => s.toLowerCase() === text(raw.alignmentStatus).trim().toLowerCase());
  const close = anObject(raw.honestClose) ? raw.honestClose : {};
  return {
    whatGroundworkSaw: text(raw.whatGroundworkSaw),
    yourRole: text(raw.yourRole).trim() || null,
    /* A status the model wrote in no known word claims nothing is settled. */
    alignmentStatus: status ?? 'Unresolved',
    alignmentBasis: text(raw.alignmentBasis),
    areasRequiringAlignment: rows(raw.areasRequiringAlignment, (o) =>
      text(o.observation).trim() || text(o.title).trim()
        ? { ...titled(o), observation: text(o.observation), whyItMatters: text(o.whyItMatters), recommendedMove: text(o.recommendedMove) }
        : null),
    alignmentReached: rows(raw.alignmentReached, (o) => (text(o.note).trim() || text(o.title).trim() ? { ...titled(o), note: text(o.note) } : null)),
    honestClose: { aligned: text(close.aligned), open: text(close.open), revisit: text(close.revisit), risk: text(close.risk) },
    mentionedPeople: rows(raw.mentionedPeople, someone),
    suggestedParties: rows(raw.suggestedParties, (o) => (text(o.role).trim() ? { role: text(o.role), reason: text(o.reason) } : null)),
    alsoCameUp: rows(raw.alsoCameUp, someone),
    alsoCameUpNote: text(raw.alsoCameUpNote) || null,
    ...(anObject(raw.leadsReveal) ? { leadsReveal: raw.leadsReveal as unknown as EntryReport['leadsReveal'] } : {}),
  };
}
