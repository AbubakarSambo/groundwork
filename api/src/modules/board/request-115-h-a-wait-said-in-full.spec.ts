import { boardAs, answered, handoff, AMINA, BARAKA, RUKIA, JUMA, SETUP_ADMIN } from './the-switchboards-sections-harness';
import { aWaitSaidInFull } from './a-wait-said-in-full';

/**
 * REQUEST 115 (h): "WAITING ON: CHANDARANA WESTLANDS" IS TWO PIECES JOINED BY A COLON.
 *
 * Each handoff on the board now carries `waitingSays`, one full sentence that says who is waiting on whom,
 * with "you" for the reader on either side. The screen draws it in place of "Waiting on: <on>".
 */
const setup = {
  createdByUserId: 'u-setup',
  checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)],
  dependencies: [
    handoff('d-chandarana', 'p-baraka', 'the signed agreement', { onLabel: 'Chandarana Westlands', status: 'WAITING' }),
    handoff('d-warehouse', 'p-rukia', 'the stock count', { onLabel: 'the warehouse', status: 'BLOCKING' }),
    handoff('d-rukia', 'p-baraka', 'the discount decision', { onParticipantId: 'p-rukia', status: 'WAITING' }),
  ],
};

const said = (board: any) => Object.fromEntries((board.dependencies ?? []).map((d: any) => [d.id, d.waitingSays]));

describe('request 115 (h): who is waiting on whom, in one sentence for each reader', () => {
  it.each([
    ['Amina, the lead', AMINA],
    ['the admin who set it up', SETUP_ADMIN],
    ['Juma, an admin who only reads', JUMA],
  ])('%s reads each wait as a sentence with both names', async (_who, reader) => {
    const board = await boardAs(setup as any, ...(reader as readonly [string, string]));
    expect(said(board)).toEqual({
      'd-chandarana': 'Baraka Otieno is waiting on Chandarana Westlands.',
      'd-warehouse': 'Rukia Mwangi is waiting on the warehouse.',
      'd-rukia': 'Baraka Otieno is waiting on Rukia Mwangi.',
    });
  });

  it('Baraka, who checks in, reads his own waits with "you"', async () => {
    const board = await boardAs(setup as any, ...BARAKA);
    expect(said(board)['d-chandarana']).toBe('You are waiting on Chandarana Westlands.');
    expect(said(board)['d-rukia']).toBe('You are waiting on Rukia Mwangi.');
  });

  it('Rukia, who checks in, reads that Baraka is waiting on her as "you"', async () => {
    const board = await boardAs(setup as any, ...RUKIA);
    expect(said(board)['d-rukia']).toBe('Baraka Otieno is waiting on you.');
    expect(said(board)['d-warehouse']).toBe('You are waiting on the warehouse.');
  });

  it('no reader is sent a wait joined by a colon', async () => {
    for (const reader of [AMINA, SETUP_ADMIN, JUMA, BARAKA, RUKIA]) {
      const board = await boardAs(setup as any, ...(reader as readonly [string, string]));
      for (const d of board.dependencies ?? []) {
        expect(d.waitingSays).toMatch(/^[A-Z][^:]* (is|are) waiting on [^:]+\.$/);
      }
    }
  });

  it('where people see only themselves, Baraka reads his own waits and nobody else\'s, and a colleague is not named', async () => {
    const hidden = { ...setup, peersVisibleToEachOther: false };
    const baraka = await boardAs(hidden as any, ...BARAKA);
    expect(Object.keys(said(baraka)).sort()).toEqual(['d-chandarana', 'd-rukia']);
    for (const d of baraka.dependencies ?? []) {
      expect(d.waitingSays).toMatch(/^You are waiting on /);
      expect(d.waitingSays).not.toContain('Rukia');
    }
    const amina = await boardAs(hidden as any, ...AMINA);
    expect(said(amina)['d-rukia']).toBe('Baraka Otieno is waiting on Rukia Mwangi.');
  });
});

describe('the sentence on its own', () => {
  it('says somebody outside the check-in where nobody is named, and a colleague in lower case mid-sentence', () => {
    expect(aWaitSaidInFull({ from: 'Baraka Otieno', fromParticipantId: 'p-b', on: null, onParticipantId: null }, null))
      .toBe('Baraka Otieno is waiting on somebody outside this check-in.');
    expect(aWaitSaidInFull({ from: 'A colleague', fromParticipantId: 'p-x', on: 'A colleague', onParticipantId: 'p-y' }, 'p-b'))
      .toBe('A colleague is waiting on a colleague.');
  });
});
