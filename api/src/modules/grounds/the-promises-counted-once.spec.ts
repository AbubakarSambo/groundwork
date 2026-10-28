import * as fs from 'fs';
import * as path from 'path';
import { thePromisesOf, thePromisesCounted } from './the-promises-counted-once';
import { theRunningRecordFrom } from '../suites/the-running-record';

/**
 * ONE COUNT OF PROMISES, WHEREVER IT IS SHOWN (fix plan, pattern 1; quarter test, 28 October 2026). Joseph read "17 of 18 promises kept"
 * on My work and "You said you would do 17 things. 4 done, 1 not done, 12 still open" on You, the same day. Mercy read 7 of 9 and 2 of 4.
 * The whole pattern: any page that counts promises from its own read of the rows. These tests hold the one read and the one count.
 */
const G = 'g1';
const P = 'p1';
const day = (d: string) => new Date(`${d}T09:00:00Z`);

/** Joseph's shape: settled, open, dropped, asked-for, and his own to-do for a promise he also said in the check-in. */
const commitments = [
  { id: 'c1', groundId: G, participantId: P, text: 'I will send the price list to Mama Pima', whenSaid: null, status: 'DONE', settledAt: day('2026-10-14'), createdAt: day('2026-10-12') },
  { id: 'c2', groundId: G, participantId: P, text: 'I will call Upper Hill Offices', whenSaid: null, status: 'NOT_DONE', settledAt: day('2026-10-16'), createdAt: day('2026-10-13') },
  { id: 'c3', groundId: G, participantId: P, text: 'I will deliver the 15 units to Mama Pima', whenSaid: 'on Friday', status: 'UNKNOWN', settledAt: null, createdAt: day('2026-10-14') },
  { id: 'c4', groundId: G, participantId: P, text: 'I will visit Juja Hardware', whenSaid: null, status: 'DROPPED', settledAt: null, createdAt: day('2026-10-15') },
  { id: 'c5', groundId: G, participantId: P, text: 'Send Grace the list of deals', whenSaid: null, status: 'UNKNOWN', settledAt: null, createdAt: day('2026-10-15'), explicit: false },
];
const ownToDos = [
  { id: 'o1', groundId: G, participantId: P, text: 'I will deliver the 15 units to Mama Pima', kind: 'TODO', status: 'MET', statusChangedAt: day('2026-10-17'), authoredBy: 'self', dueSaid: 'on Friday', createdAt: day('2026-10-14') },
];

function aPrisma() {
  return {
    groundCommitment: { findMany: async ({ where }: any) => commitments.filter((c) => [where.participantId].flat().concat(where.participantId?.in ?? []).includes(c.participantId) && (!where.groundId || c.groundId === where.groundId)) },
    personObjective: { findMany: async ({ where }: any) => ownToDos.filter((o) => [where.participantId].flat().concat(where.participantId?.in ?? []).includes(o.participantId)) },
    itemEvidence: { findMany: async () => [] },
    goalVersion: { findMany: async () => [] },
    conversationTurn: { findMany: async () => [] },
    checkIn: { findMany: async () => [] },
  };
}

describe('a person’s promises are read and counted once', () => {
  it('merges the to-do they wrote with the same promise from the check-in, leaves out dropped ones, and counts only their own', async () => {
    const promises = await thePromisesOf(aPrisma(), [P], () => 'Sales team, Q4');
    expect(promises.map((p) => p.id).sort()).not.toContain('c4');
    expect(promises.filter((p) => /deliver the 15 units/.test(p.raw))).toHaveLength(1);
    expect(thePromisesCounted(promises)).toEqual({ said: 3, kept: 2, notDone: 1, open: 0 });
  });

  it('the You page says the same numbers My work counts', async () => {
    const prisma = aPrisma();
    const counted = thePromisesCounted(await thePromisesOf(prisma, [P], () => 'Sales team, Q4', { groundId: G }));
    const you = await theRunningRecordFrom(prisma, [P], new Map([[G, 'Sales team, Q4']]));
    expect(you.inShort).toBe(`You said you would do ${counted.said} things. ${counted.kept} done, ${counted.notDone} not done, ${counted.open} still open.`);
  });

  it('no page that shows promises reads the commitment rows for itself', () => {
    const readers = ['../board/my-work.ts', '../suites/the-running-record.ts', './your-board.service.ts'];
    for (const f of readers) {
      const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
      const ownReads = (src.match(/groundCommitment\?*\.findMany\?*\(\{\s*where:\s*\{\s*(?:groundId:[^}]*,\s*)?participantId:\s*(?:pid|\{\s*in:\s*(?:ids|participantIds))/g) ?? []);
      expect({ file: f, ownReads }).toEqual({ file: f, ownReads: [] });
    }
  });
});
