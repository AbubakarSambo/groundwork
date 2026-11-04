/**
 * A FAILED WRITE TO THE RECORD IS KEPT AND WRITTEN AGAIN, NEVER ONLY LOGGED (Hafsah, 1 November 2026; a-write-is-owed-until-it-lands.ts).
 * The assessment test's setup lost the lead's record and her targets to one "fetch failed": the call was not tried again, and the
 * failure was only a log line.
 */
import { worthWaitingOut, tryAgainIfItIsJustBusy } from './anthropic.service';
import { writeOrOwe, theWritesOwedIn, whenToTryAgain } from './a-write-is-owed-until-it-lands';
import { writeEverythingOwed } from './the-owed-writes.cron';

function aCheckInTable() {
  const rows = new Map<string, any>([['c1', { id: 'c1', participantId: 'p1', groundId: 'g1', sessionNumber: 1, writesOwed: null }]]);
  return {
    rows,
    checkIn: {
      findUnique: async ({ where }: any) => rows.get(where.id) ?? null,
      update: async ({ where, data }: any) => { Object.assign(rows.get(where.id), data); return rows.get(where.id); },
      findMany: async () => [...rows.values()].filter((r) => r.writesOwed != null),
    },
  };
}

describe('a model call that writes the record is tried again when the line drops', () => {
  it('reads "fetch failed" and a reset connection as worth waiting out, and a bad request as not', () => {
    expect(worthWaitingOut(new Error('fetch failed'))).toBe(true);
    expect(worthWaitingOut(Object.assign(new Error('read'), { code: 'ECONNRESET' }))).toBe(true);
    expect(worthWaitingOut(Object.assign(new Error('x'), { cause: { code: 'UND_ERR_SOCKET' } }))).toBe(true);
    expect(worthWaitingOut(new Error('Invalid JSON payload received'))).toBe(false);
  });

  it('asks again after a dropped line, and answers with the second try', async () => {
    let n = 0;
    const got = await tryAgainIfItIsJustBusy(async () => { n += 1; if (n === 1) throw new Error('fetch failed'); return 'read'; });
    expect(got).toBe('read');
    expect(n).toBe(2);
  });
});

describe('a write that still fails is owed on its check-in, and the scheduled pass writes it', () => {
  it('keeps the step, the error and the next try on the check-in, not in a log line', async () => {
    const db = aCheckInTable();
    const landed = await writeOrOwe(db as any, 'c1', 'the record', async () => { throw new Error('fetch failed'); });
    expect(landed).toBe(false);
    const owed = theWritesOwedIn(db.rows.get('c1').writesOwed);
    expect(owed).toHaveLength(1);
    expect(owed[0]).toMatchObject({ step: 'the record', tries: 1, lastError: 'fetch failed' });
  });

  it('tries it again once its time comes, and clears it when it lands', async () => {
    const db = aCheckInTable();
    await writeOrOwe(db as any, 'c1', 'the assessment', async () => { throw new Error('fetch failed'); }, { how: { howItEnded: 'setup saved' } });
    const ran: string[] = [];
    const conversation = { writeWhatIsOwed: async (row: any, w: any) => { ran.push(w.step); await writeOrOwe(db as any, row.id, w.step, async () => undefined); } };

    /* Not before its time. */
    expect(await writeEverythingOwed(db as any, conversation as any, new Date())).toBe(0);
    const later = new Date(Date.now() + 6 * 60_000);
    expect(await writeEverythingOwed(db as any, conversation as any, later)).toBe(1);
    expect(ran).toEqual(['the assessment']);
    expect(db.rows.get('c1').writesOwed).toBeNull();
  });

  it('owes it again with a longer wait when the next try fails too, and keeps what it needs to run', async () => {
    const db = aCheckInTable();
    const fail = async () => { throw new Error('fetch failed'); };
    await writeOrOwe(db as any, 'c1', 'the aims and expectations', fail, { spokenElsewhere: [{ role: 'user', content: 'We must collect KES 2,400,000.' }] });
    await writeOrOwe(db as any, 'c1', 'the aims and expectations', fail);
    const [w] = theWritesOwedIn(db.rows.get('c1').writesOwed);
    expect(w.tries).toBe(2);
    expect((w.input as any).spokenElsewhere[0].content).toContain('KES 2,400,000');
    const t0 = new Date('2026-11-01T00:00:00Z');
    expect(whenToTryAgain(2, t0).getTime() - t0.getTime()).toBeGreaterThan(whenToTryAgain(1, t0).getTime() - t0.getTime());
  });
});
