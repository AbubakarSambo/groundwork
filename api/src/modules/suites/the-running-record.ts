import { thePromisesOf, thePromisesCounted } from '../grounds/the-promises-counted-once';
/**
 * RELEASE 7: EACH PERSON'S RUNNING RECORD, ON THEIR YOU BOARD (docs/release-plan.md, Release 7: "commitment → action → evidence →
 * learning → adaptation → outcome. It builds up from every check-in they're in, across all scenarios").
 *
 * Built from the record only: what the person committed to in each check-in, what became of it, whether a document backs it, and what
 * they did with their goals when the direction changed (Release 6's goal versions). Nothing is invented: a step the record does not
 * hold is not shown. It is the person's own, and only they read it on their You board (their load across check-ins is private).
 *
 * The same rows draft their self-review (P4): the person's own view, in the first person, that they edit before anything is kept.
 */

export interface ACommitmentOnRecord {
  id: string;
  text: string;
  status: string;
  checkIn: string;
  session: number | null;
  settledOn: string | null;
  madeOn: string;
  /** False where the lead asked for it rather than the person saying it: not theirs to count. */
  explicit?: boolean | null;
}
export interface ProofOnRecord { itemName: string; countsAsProof: boolean; on: string }
export interface AGoalChange { name: string; outcome: 'continued' | 'changed' | 'stopped'; newName: string | null; on: string; byThem: boolean }

export interface ARunningRecordRow {
  id: string;
  /** What they said they would do, in their words, as a sentence. */
  title: string;
  /** Where and when it was said, then what became of it, then what shows it. One line each. */
  said: string;
  became: string;
  shows: string;
  tone: 'rec' | 'att' | 'con' | 'act';
}

export interface TheRunningRecord {
  heading: string;
  rows: ARunningRecordRow[];
  /** How many more than are shown, oldest last. */
  more: number;
  /** What they did with their goals when the direction changed, one sentence each. */
  adapted: string[];
  /** One sentence with the counts, most recent period. */
  inShort: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dayAndMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
/* "I will send the contract back" reads as the thing itself: "Send the contract back". */
const clean = (t: string) => t.replace(/\s+/g, ' ').trim().replace(/[.!]+$/, '').replace(/^(?:I will|I’ll|I'll|I am going to|I’m going to|I'm going to|I plan to|I need to)\s+/i, '');
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const words = (t: string) => new Set(t.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4));
const touches = (a: string, b: string) => { const A = words(a); return [...words(b)].some((w) => A.has(w)); };

const MOST = 8;

export function theRunningRecord(commitments: ACommitmentOnRecord[], proof: ProofOnRecord[], goalChanges: AGoalChange[]): TheRunningRecord {
  const sorted = commitments.slice().sort((a, b) => b.madeOn.localeCompare(a.madeOn));
  const rows = sorted.slice(0, MOST).map((c): ARunningRecordRow => {
    const s = String(c.status).toUpperCase();
    const became = s === 'DONE' ? `Done${c.settledOn ? ` on ${dayAndMonth(c.settledOn)}` : ''}.`
      : s === 'NOT_DONE' ? `Not done${c.settledOn ? `, marked on ${dayAndMonth(c.settledOn)}` : ''}.`
        : s === 'DROPPED' ? 'Dropped.' : 'Still open.';
    const backed = proof.find((p) => p.countsAsProof && touches(c.text, p.itemName));
    const shows = backed ? `A document backs it, added on ${dayAndMonth(backed.on)}.` : s === 'DONE' ? 'Your word only, no document yet.' : 'Nothing to show yet.';
    return {
      id: c.id,
      title: cap(clean(c.text)),
      said: `Said in ${c.checkIn}${c.session ? `, session ${c.session}` : ''}, on ${dayAndMonth(c.madeOn)}.`,
      became,
      shows,
      tone: s === 'DONE' ? (backed ? 'rec' : 'att') : s === 'NOT_DONE' ? 'con' : s === 'DROPPED' ? 'att' : 'act',
    };
  });
  const adapted = goalChanges.filter((g) => g.byThem && g.outcome !== 'continued').slice(0, 4).map((g) =>
    g.outcome === 'stopped'
      ? `You stopped “${clean(g.name)}” on ${dayAndMonth(g.on)}, when the direction changed.`
      : `You changed “${clean(g.name)}”${g.newName ? ` to “${clean(g.newName)}”` : ''} on ${dayAndMonth(g.on)}, when the direction changed.`);
  /* The one count of promises (grounds/the-promises-counted-once.ts), so this line and My work's tile never disagree. */
  const { said, kept: done, notDone, open } = thePromisesCounted(commitments.map((c) => ({ status: String(c.status).toUpperCase(), explicit: c.explicit })));
  return {
    heading: 'Your record so far',
    rows,
    more: Math.max(0, sorted.length - MOST),
    adapted,
    inShort: said
      ? `You said you would do ${said} ${said === 1 ? 'thing' : 'things'}. ${done} done, ${notDone} not done, ${open} still open.`
      : 'Nothing you said you would do is on record yet.',
  };
}

/** Their own view, drafted from the same record, in the first person. They edit it before anything is kept. */
export function aSelfReviewDraft(r: TheRunningRecord): string {
  const done = r.rows.filter((x) => x.became.startsWith('Done')).slice(0, 3).map((x) => x.title.charAt(0).toLowerCase() + x.title.slice(1));
  const notDone = r.rows.filter((x) => x.became.startsWith('Not done')).slice(0, 2).map((x) => x.title.charAt(0).toLowerCase() + x.title.slice(1));
  const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
  return [
    r.inShort.replace(/^You said you would do/, 'I said I would do'),
    done.length ? `I did ${list(done)}.` : '',
    notDone.length ? `I did not ${list(notDone)}. What got in the way was` : '',
    ...r.adapted.map((a) => a.replace(/^You /, 'I ')),
    'Next, I want to',
  ].filter(Boolean).join('\n\n');
}

/** The running record of one person across every check-in they are in, read from the database. For that person's own use only. */
export async function theRunningRecordOf(prisma: any, userId: string): Promise<TheRunningRecord> {
  const places = ((await Promise.resolve(prisma.groundParticipant?.findMany?.({ where: { userId }, select: { id: true, groundId: true, ground: { select: { label: true } } } })).catch(() => [])) ?? []) as any[];
  const label = new Map(places.map((p) => [p.groundId, String(p.ground?.label ?? 'a check-in')]));
  return theRunningRecordFrom(prisma, places.map((p) => p.id), label);
}

/**
 * The running record of these participants (one person's places), with their promises read the one way every page reads them
 * (grounds/the-promises-counted-once.ts): what the record says is done is done, and a promise kept twice is one promise.
 */
export async function theRunningRecordFrom(prisma: any, ids: string[], label: Map<string, string>): Promise<TheRunningRecord> {
  const day = (d: any) => (d ? new Date(d).toISOString().slice(0, 10) : null);
  if (!ids.length) return theRunningRecord([], [], []);
  const [promises, proof, versions] = await Promise.all([
    thePromisesOf(prisma, ids, (g) => label.get(g) ?? 'a check-in'),
    Promise.resolve(prisma.itemEvidence?.findMany?.({ where: { participantId: { in: ids } }, select: { itemName: true, countsAsProof: true, createdAt: true } })).catch(() => []),
    Promise.resolve(prisma.goalVersion?.findMany?.({ where: { ownerParticipantId: { in: ids } }, select: { name: true, outcome: true, newName: true, decidedBy: true, decidedAt: true } })).catch(() => []),
  ]);
  return theRunningRecord(
    promises.filter((c) => label.has(c.groundId)).map((c) => ({ id: c.id, text: c.raw, status: c.status, checkIn: label.get(c.groundId)!, session: null, settledOn: day(c.settledAt), madeOn: day(c.createdAt) ?? day(c.t)!, explicit: c.explicit })),
    ((proof as any[]) ?? []).map((x) => ({ itemName: String(x.itemName ?? ''), countsAsProof: x.countsAsProof === true, on: day(x.createdAt)! })),
    ((versions as any[]) ?? []).map((v) => ({ name: v.name, outcome: v.outcome === 'stopped' ? 'stopped' : v.outcome === 'continued' ? 'continued' : 'changed', newName: v.newName ?? null, on: day(v.decidedAt)!, byThem: v.decidedBy === 'person' })),
  );
}
