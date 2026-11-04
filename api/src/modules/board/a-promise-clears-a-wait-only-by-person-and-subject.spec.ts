import { PartyType } from '@prisma/client';
import { boardAs, person, answered, commitment, handoff, type Setup } from './the-switchboards-sections-harness';
import { aPromiseAboutThisWait } from './the-blockers';

/**
 * A PROMISE CLEARS A WAIT ONLY BY PERSON AND SUBJECT (Hafsah's point 8, Drop Access, 17 October).
 *
 * On the test bed, Kevin's wait on Paul read "Would clear it: Kevin Omondi committed to give Ali a call." and Mercy's wait on
 * Joseph for the sample units read "Would clear it: Mercy Wairimu committed to send Peter the quote for 30 units by Friday.",
 * because "call" and "units" were in both. Read as Grace, who runs it and reads everybody, and as Mercy and Kevin, with
 * Release 1's switch on; with it off, the board reads as before.
 */
const PEOPLE = [
  person('p-grace', 'u-grace', 'Grace', 'Njoroge', PartyType.INITIATOR),
  person('p-kevin', 'u-kevin', 'Kevin', 'Omondi'),
  person('p-mercy', 'u-mercy', 'Mercy', 'Wairimu'),
  person('p-joseph', 'u-joseph', 'Joseph', 'Kariuki'),
];
const GRACE = ['u-grace', 'MEMBER'] as const;
const MERCY = ['u-mercy', 'MEMBER'] as const;
const KEVIN = ['u-kevin', 'MEMBER'] as const;
const at = (s: string) => new Date(s);

const WAITS = [
  handoff('d-samples', 'p-mercy', 'the sample units', { onParticipantId: 'p-joseph', status: 'WAITING', sourceCheckInId: 'c2-p-mercy', createdAt: at('2026-10-13T15:05:00Z') }),
  handoff('d-paul', 'p-kevin', 'a response to their calls', { onLabel: 'Paul', status: 'WAITING', sourceCheckInId: 'c3-p-kevin', createdAt: at('2026-10-14T15:03:00Z') }),
];
const run = (more: Partial<Setup> = {}): Setup => ({
  people: PEOPLE,
  initiatorId: 'u-grace',
  label: 'Sales team, Q4',
  kindOfWork: 'sales team',
  releaseOneSalesBoard: true,
  clock: { now: at('2026-10-17T17:00:00Z') },
  checkIns: [answered('p-kevin', 4, '2026-10-15T15:03:00Z'), answered('p-mercy', 4, '2026-10-15T15:05:00Z'), answered('p-joseph', 4, '2026-10-15T15:07:00Z')],
  dependencies: WAITS,
  commitments: [
    commitment('k-ali', 'p-kevin', "I'll give Ali a call", { statedInSession: 4, saidWordForWord: true, createdAt: at('2026-10-15T15:03:00Z') }),
    commitment('k-peter', 'p-mercy', 'I will send Peter the quote for 30 units by Friday.', { statedInSession: 4, saidWordForWord: true, createdAt: at('2026-10-15T15:05:00Z') }),
  ],
  ...more,
});
const theEntry = (b: any, name: string) => (b.blockers ?? []).find((x: any) => x.name === name);
/* What a person reads under the blocker, as the page draws it. */
const wouldClearIt = (b: any, name: string) => {
  const x = theEntry(b, name);
  return x ? `Would clear it: ${x.wouldClearIt ?? x.wouldClearItSays}` : null;
};

describe('with Release 1\'s sales board on', () => {
  it('Grace reads that nobody has said what would clear the samples wait, never Mercy\'s quote to Peter', async () => {
    const b = await boardAs(run(), ...GRACE);
    expect(wouldClearIt(b, 'the sample units')).toBe('Would clear it: Nobody has said what would clear it yet.');
    expect(JSON.stringify(b.blockers)).not.toMatch(/Peter the quote|Ali a call/);
  });

  it('Mercy reads the same about her own wait', async () => {
    const b = await boardAs(run(), ...MERCY);
    expect(wouldClearIt(b, 'the sample units')).toBe('Would clear it: Nobody has said what would clear it yet.');
  });

  it('Kevin\'s call to Ali is never what would clear his wait on Paul', async () => {
    const b = await boardAs(run(), ...KEVIN);
    const paul = theEntry(b, 'a response to their calls');
    if (paul) expect(paul.wouldClearIt).toBeNull();
    expect(JSON.stringify(b.blockers ?? [])).not.toMatch(/Ali a call/);
  });

  it('Joseph\'s own promise to bring Mercy the samples is what would clear it, as Grace and Mercy read it', async () => {
    const more = { commitments: [...run().commitments!, commitment('k-joseph', 'p-joseph', 'I will bring Mercy the samples on Thursday.', { statedInSession: 4, saidWordForWord: true, createdAt: at('2026-10-15T15:07:00Z') })] };
    expect(wouldClearIt(await boardAs(run(more), ...GRACE), 'the sample units')).toBe('Would clear it: Joseph Kariuki committed to bring Mercy the samples on Thursday.');
    expect(wouldClearIt(await boardAs(run(more), ...MERCY), 'the sample units')).toBe('Would clear it: Joseph Kariuki committed to bring you the samples on Thursday.');
  });
});

describe('a promise is about a wait only by person and subject', () => {
  const samples = { fromParticipantId: 'p-mercy', onParticipantId: 'p-joseph', onLabel: null, what: 'the sample units' };
  const paul = { fromParticipantId: 'p-kevin', onParticipantId: null, onLabel: 'Paul', what: 'a response to their calls' };
  const names = ['Mercy Wairimu', 'Joseph Kariuki', 'Kevin Omondi'];
  it.each([
    ['p-mercy', 'I will send Peter the quote for 30 units by Friday.', samples, false],
    ['p-kevin', "I'll give Ali a call", paul, false],
    ['p-kevin', "I'll call Paul again on Monday to get a response.", paul, true],
    ['p-joseph', 'I will bring Mercy the samples on Thursday.', samples, true],
    ['p-kevin', 'I will bring Mercy the samples on Thursday.', samples, false],
    ['p-joseph', 'I will drop the samples for Rose tomorrow.', samples, false],
  ])('%s: "%s"', (pid, text, wait, yes) => {
    expect(aPromiseAboutThisWait({ participantId: pid as string, text: text as string }, wait as any, names)).toBe(yes);
  });
});

describe('with Release 1\'s sales board off', () => {
  it('the board reads as it did before the switch', async () => {
    const b = await boardAs(run({ releaseOneSalesBoard: false }), ...GRACE);
    expect(wouldClearIt(b, 'the sample units')).toBe('Would clear it: Mercy Wairimu committed to send Peter the quote for 30 units by Friday.');
  });
});
