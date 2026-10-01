import { run, whatThisRunMayDo, theTypedHostMatches, hostOf } from './stamp-said-word-for-word';

/**
 * THE GUARD ON THE WORD-FOR-WORD SCRIPT (decision 74, item 5).
 *
 * On this machine it writes, as it always has. On a hosted database it needs --hosted-database, is a
 * dry run unless --write is also given, and writes only when the host name is typed back exactly.
 * No test here touches a database: the database is a fake that records every write.
 */
const HOSTED = 'postgresql://release:secret@db.example-host.net:5432/groundwork?sslmode=require';
const LOCAL = 'postgresql://someone@localhost:5432/gw_test';

function aDatabase() {
  const writes: string[] = [];
  const prisma = {
    recordEntry: {
      findMany: jest.fn(async (a: any) => (a?.distinct
        ? [{ checkInId: 'c1' }]
        : [
          { id: 'r1', text: 'I called Green Mart on Monday', saidWordForWord: false },
          { id: 'r2', text: 'Baraka made progress with a retailer', saidWordForWord: true },
        ])),
      updateMany: jest.fn(async () => { writes.push('recordEntry.updateMany'); return { count: 1 }; }),
    },
    conversationTurn: { findMany: jest.fn(async () => [{ content: 'I called Green Mart on Monday and they want the price list.' }]) },
    groundCommitment: {
      findMany: jest.fn(async () => [{ id: 'k1', text: 'they want the price list', whenSaid: null, participantId: 'p1', statedInSession: 1, saidWordForWord: false, whenSaidWordForWord: false }]),
      update: jest.fn(async () => { writes.push('groundCommitment.update'); return {}; }),
    },
    $disconnect: jest.fn(async () => undefined),
  };
  return { prisma, writes };
}

async function runWith(url: string, args: string[], typed: string | null = null) {
  const db = aDatabase();
  const said: string[] = [];
  const ask = jest.fn(async () => typed);
  const r = await run({ url, args, prismaFor: () => db.prisma, ask, say: (l) => said.push(l) });
  return { ...r, writes: db.writes, said, asked: ask.mock.calls.length, prisma: db.prisma };
}

describe('the guard, from the address and the flags', () => {
  it('reads the host from a hosted address, port, password and options included', () => {
    expect(hostOf(HOSTED)).toBe('db.example-host.net');
    expect(hostOf(LOCAL)).toBe('localhost');
    expect(hostOf('mysql://x/y')).toBeNull();
    expect(hostOf('')).toBeNull();
  });

  it('on this machine it writes by default, as it always has, and --dry-run only reads', () => {
    expect(whatThisRunMayDo(LOCAL, [])).toMatchObject({ refused: false, hosted: false, writes: true, mustTypeTheHostBack: false });
    expect(whatThisRunMayDo('postgresql://127.0.0.1/gw_x', [])).toMatchObject({ refused: false, writes: true });
    expect(whatThisRunMayDo(LOCAL, ['--dry-run'])).toMatchObject({ refused: false, writes: false });
  });

  it('refuses a hosted database without --hosted-database, even with --write', () => {
    for (const args of [[], ['--write']]) {
      const may = whatThisRunMayDo(HOSTED, args);
      expect(may.refused).toBe(true);
      expect((may as any).why).toBe('DATABASE_URL points to db.example-host.net, which is not on this machine. This script runs on a hosted database only when whoever runs the release adds --hosted-database. Nothing was read or written.');
    }
  });

  it('with --hosted-database alone it is a dry run; with --write it must have the host typed back', () => {
    expect(whatThisRunMayDo(HOSTED, ['--hosted-database'])).toMatchObject({ refused: false, hosted: true, writes: false, mustTypeTheHostBack: false });
    expect(whatThisRunMayDo(HOSTED, ['--hosted-database', '--write'])).toMatchObject({ refused: false, hosted: true, writes: true, mustTypeTheHostBack: true });
    expect(whatThisRunMayDo(HOSTED, ['--hosted-database', '--write', '--dry-run'])).toMatchObject({ writes: false });
  });

  it('the typed host must be the host itself', () => {
    expect(theTypedHostMatches(' DB.example-host.net ', 'db.example-host.net')).toBe(true);
    expect(theTypedHostMatches('db.example-host', 'db.example-host.net')).toBe(false);
    expect(theTypedHostMatches('other.example-host.net', 'db.example-host.net')).toBe(false);
    expect(theTypedHostMatches('', 'db.example-host.net')).toBe(false);
    expect(theTypedHostMatches(null, 'db.example-host.net')).toBe(false);
  });
});

describe('a whole run, against a fake database', () => {
  it('a hosted database without the flag: nothing is even read', async () => {
    const r = await runWith(HOSTED, ['--write'], 'db.example-host.net');
    expect(r.wrote).toBe(false);
    expect(r.refused).toMatch(/not on this machine/);
    expect(r.prisma.recordEntry.findMany).not.toHaveBeenCalled();
    expect(r.writes).toEqual([]);
    expect(r.asked).toBe(0);
  });

  it('a dry run on a hosted database prints what would change and writes nothing', async () => {
    const r = await runWith(HOSTED, ['--hosted-database']);
    expect(r.wrote).toBe(false);
    expect(r.writes).toEqual([]);
    expect(r.asked).toBe(0);
    expect(r.said).toEqual([
      "2 record lines were read. 1 is the person's own words, and 1 is the record reader's version.",
      "1 record line would be marked as the person's own words, and 1 record line would be marked as not their own words.",
      '1 commitment was read, and 1 of them would change.',
      'This was a dry run. Nothing was written.',
    ]);
  });

  it('--write with a mismatched host typed back writes nothing', async () => {
    const r = await runWith(HOSTED, ['--hosted-database', '--write'], 'db.other-host.net');
    expect(r.asked).toBe(1);
    expect(r.wrote).toBe(false);
    expect(r.writes).toEqual([]);
    expect(r.said[r.said.length - 1]).toBe('The host name typed back did not match the database, so nothing was written.');
  });

  it('--write with no answer, as from a pipe or a scheduled job, writes nothing', async () => {
    const r = await runWith(HOSTED, ['--hosted-database', '--write'], null);
    expect(r.wrote).toBe(false);
    expect(r.writes).toEqual([]);
  });

  it('--write with the host typed back exactly writes only the marks that change', async () => {
    const r = await runWith(HOSTED, ['--hosted-database', '--write'], 'db.example-host.net');
    expect(r.wrote).toBe(true);
    expect(r.writes).toEqual(['recordEntry.updateMany', 'recordEntry.updateMany', 'groundCommitment.update']);
    expect(r.prisma.recordEntry.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['r1'] } }, data: { saidWordForWord: true } });
    expect(r.prisma.recordEntry.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['r2'] } }, data: { saidWordForWord: false } });
  });

  it('on this machine it writes without being asked, as before', async () => {
    const r = await runWith(LOCAL, []);
    expect(r.asked).toBe(0);
    expect(r.wrote).toBe(true);
    expect(r.writes.length).toBeGreaterThan(0);
  });

  it('on this machine with --dry-run it writes nothing', async () => {
    const r = await runWith(LOCAL, ['--dry-run']);
    expect(r.wrote).toBe(false);
    expect(r.writes).toEqual([]);
  });
});
