import { atAGlanceTiles } from './what-this-session-holds';

/**
 * Rerun, 20 Sep 2026, loan cohort: Halima had lost 220 birds, Aisha's diesel was N90,000 over, and the
 * tile read "Blockers: None". Nobody had raised a dependency; they had said a worry.
 */
describe('worries reach the Blockers tile when nothing is blocked', () => {
  const base = { agreed: 0, stillOpen: 0, movedOnTargets: null, blocked: 0, waiting: 0, backedPct: null, numberWasSaid: false };
  const blockers = (tiles: any[]) => tiles.find((t) => t.label === 'Blockers');

  it('says how many were said and names the first, instead of None', () => {
    const b = blockers(atAGlanceTiles({ ...base, worries: 3, theWorry: 'I lost 220 birds and missed a payment.' }));
    expect(b.value).toBe('3 worries');
    expect(b.sub).toBe('I lost 220 birds and missed a payment. There are 2 more worries on record, and no wait has been recorded against a named person.');
    expect(b.tone).toBe('warn');
  });

  it('one worry is a worry', () => {
    expect(blockers(atAGlanceTiles({ ...base, worries: 1, theWorry: 'Diesel is N90,000 a month more.' })).value).toBe('1 worry');
  });

  it('a hard block still comes first, and None still means none', () => {
    expect(blockers(atAGlanceTiles({ ...base, blocked: 1, worries: 3, theBlocker: 'legal to sign', theWorry: 'x' })).value).toBe('1');
    const none = blockers(atAGlanceTiles(base));
    expect(none.value).toBe('None');
    expect(none.tone).toBe('good');
  });
});

/*
 * "we have a meeting with the CEO to discuss m..." - a tile that stopped inside a word (22 Sep 2026).
 * It then cut at the last whole word, which was still inside a sentence: "I did say he..." on the
 * seniorhire Blockers tile (all-24 run 12). A tile now shows a whole sentence, or none.
 */
describe('a tile never cuts inside a sentence', () => {
  const { atAGlanceTiles, theFirstSentenceThatFits } = require('./what-this-session-holds');
  const blockers = (a: any) => atAGlanceTiles({ agreed: 0, stillOpen: 0, movedOnTargets: 0, blocked: 1, waiting: 0, backedPct: null, numberWasSaid: false, ...a })
    .find((t: any) => t.label === 'Blockers')!;

  it('shows a one-sentence line whole', () => {
    expect(blockers({ theBlocker: 'I have heard about it but we have a meeting with the CEO to discuss monetisation next week' }).sub)
      .toBe('I have heard about it but we have a meeting with the CEO to discuss monetisation next week.');
  });

  it('shows the first sentence of a longer one, whole, with its closing mark, and never "..."', () => {
    expect(theFirstSentenceThatFits("I haven't explicitly said 'get me out of these meetings.' I did say he would own the relationships in his interview."))
      .toBe("I haven't explicitly said 'get me out of these meetings.'");
    expect(blockers({ theBlocker: 'Legal has the contract. They said Friday, and it is now Tuesday.' }).sub).toBe('Legal has the contract.');
  });

  it('and a first sentence too long for a tile is not shown: the tile says what it counts', () => {
    const long = `${'The pipeline is running on old names from before the summer '.repeat(3)}and nobody has picked it up.`;
    expect(theFirstSentenceThatFits(long)).toBeNull();
    expect(blockers({ theBlocker: long }).sub).toBe('Something is named as holding work up.');
  });
});

/* Seniorhire, all-24 run 12, as Amina and Tobi read it: "I haven't explicitly said 'get me out of these
   meetings.' I did say he..., and 3 more; nobody is waiting on anybody". */
describe('the worry line is whole sentences, never a piece joined to a count', () => {
  const { atAGlanceTiles } = require('./what-this-session-holds');
  const blockers = (a: any) => atAGlanceTiles({ agreed: 0, stillOpen: 0, movedOnTargets: null, blocked: 0, waiting: 0, backedPct: null, numberWasSaid: false, ...a })
    .find((t: any) => t.label === 'Blockers')!;

  it('the exact case: Amina\'s first worry, shown as its first sentence, and the count as a sentence', () => {
    const sub = blockers({ worries: 4, theWorry: "I haven't explicitly said 'get me out of these meetings.' I did say he would own the relationships in his interview." }).sub;
    expect(sub).toBe("I haven't explicitly said 'get me out of these meetings.' There are 3 more worries on record, and no wait has been recorded against a named person.");
    expect(sub).not.toContain('...');
    expect(sub).not.toContain(';');
  });

  it('one worry, and no worry that fits', () => {
    expect(blockers({ worries: 1, theWorry: 'Diesel is N90,000 a month more.' }).sub)
      .toBe('Diesel is N90,000 a month more. It is the only worry on record, and no wait has been recorded against a named person.');
    /* Changed 5 Oct 2026 (request 127 item 7): a count with no worry shown says why none is shown. */
    expect(blockers({ worries: 4, theWorry: null }).sub).toBe('4 worries are on record. None was kept in the words it was said, so none is quoted here. No wait has been recorded against a named person.');
    expect(blockers({ worries: 1, theWorry: null }).sub).toBe('1 worry is on record. It was not kept in the words it was said, so it is not quoted here. No wait has been recorded against a named person.');
    expect(blockers({ worries: 4, theWorry: null, whyNoWorry: 'walled' }).sub).toBe('4 worries are on record. They are other people\'s words, so they are not shown to you. No wait has been recorded against a named person.');
  });
});

describe('the first worry is one whose line survives the quote rule whole', () => {
  const { whatThisSessionHolds } = require('./what-this-session-holds');
  /* Seniorhire, session 1, the worries in the order they were written, from the run-12 database. */
  const ROWS = [
    { text: "I haven't explicitly said 'get me out of these meetings.' I did say he would own the relationships in his interview.", saidWordForWord: false },
    { text: "I'm just not sure the brief was clear enough on that one point. Or the onboarding.", saidWordForWord: true },
    { text: "I haven't decided yet. [INFERRED: on how to address the lack of clarity in the brief or onboarding]", saidWordForWord: true },
    { text: 'If client satisfaction declines, or if issues arise that I cannot resolve, that would indicate things are off track.', saidWordForWord: true },
  ];
  const prisma = (rows: any[]) => ({
    checkIn: { findMany: async () => [{ id: 'c1' }] },
    groundDependency: { findMany: async () => [] },
    groundObjective: { findMany: async () => [] },
    groundObjectiveSnapshot: { findMany: async () => [] },
    groundCommitment: { findMany: async () => [] },
    ground: { findUnique: async () => ({ brief: null, participants: [] }) },
    recordEntry: { findMany: async (args: any) => (args?.where?.type ? rows.map((r) => ({ text: r.text, saidWordForWord: r.saidWordForWord })) : rows) },
  });

  it('passes over Amina\'s line, whose quote is not the record\'s words, for the next one', async () => {
    const held = await whatThisSessionHolds(prisma(ROWS), 'g', 1, { participantId: null, isLead: true });
    expect(held.worries).toBe(4);
    /* Nobody on this record has a name this reader may read, so it is a colleague's, in their words. */
    expect(held.theFirstWorry).toBe('A colleague said, "I\'m just not sure the brief was clear enough on that one point."');
  });

  it('and with none that stands whole, there is no first worry, and the tile says the count', async () => {
    const held = await whatThisSessionHolds(prisma(ROWS.slice(0, 1)), 'g', 1, { participantId: null, isLead: true });
    expect(held.theFirstWorry).toBeNull();
  });
});

/**
 * "NO TARGET SET" OVER THIRTEEN TARGETS.
 *
 * Read live, 22 September 2026, minutes after a lead pasted the quarter into the context chat: the
 * Context page listed the team's six numbers and three people's, and the Movement tile beside them
 * said "No target set - nobody has set something to measure this against". Movement is null until
 * two snapshots exist to subtract, and null was being read as "none exist".
 */
describe('movement before a round has closed', () => {
  const { atAGlanceTiles } = require('./what-this-session-holds');
  const tile = (a: any) => atAGlanceTiles({ agreed: 0, stillOpen: 0, movedOnTargets: null, blocked: 0, waiting: 0, backedPct: null, numberWasSaid: false, ...a })
    .find((t: any) => t.label === 'Movement');

  it('says nothing has moved yet, and how many are set', () => {
    const t = tile({ targetsSet: 13 });
    expect(t.value).toBe('Nothing yet');
    /* Run-25: the old line, "no round has closed to measure from", was jargon. */
    expect(t.sub).toBe('13 targets are set. Any change in them will show here after the next check-in.');
    expect(t.sub).not.toMatch(/nobody has set/);
  });

  it('still says nobody set one where nobody did', () => {
    expect(tile({ targetsSet: 0 }).value).toBe('No target set');
    expect(tile({}).value).toBe('No target set');
  });

  it('and a number said with nothing tracking it is only that when nothing is set', () => {
    expect(tile({ targetsSet: 0, numberWasSaid: true }).value).toBe('Not tracked');
    expect(tile({ targetsSet: 6, numberWasSaid: true }).value).toBe('Nothing yet');
  });

  it('one target reads as one', () => {
    expect(tile({ targetsSet: 1 }).sub).toContain('1 target is set');
  });
});

describe('the Movement tile says a number a person can read (re-d, sales, session 3)', () => {
  const base = { agreed: 0, stillOpen: 0, blocked: 0, waiting: 0, backedPct: null, numberWasSaid: false, targetsSet: 2 };
  const movement = (t: ReturnType<typeof atAGlanceTiles>) => t.find((x) => x.label === 'Movement')!;
  it('one target that moved by 31 million reads as one target that moved, never "+31000000" (request 107 d)', () => {
    const m = movement(atAGlanceTiles({ ...base, movedOnTargets: 31000000, targetsMoved: 1 }));
    expect(m.value).toBe('1 target');
    expect(m.sub).toBe('1 target changed this session.');
    expect(m.value).not.toMatch(/\d{3,}/);
  });
  it('two targets counted in different things are said as how many moved, never added together', () => {
    const m = movement(atAGlanceTiles({ ...base, movedOnTargets: 31000011, targetsMoved: 2 }));
    expect(m.value).toBe('2 targets');
    expect(m.sub).toBe('2 targets changed this session.');
  });
});

/**
 * RUN-25, LOANS: ANOTHER BORROWER'S WAIT ON SUNDAY'S BLOCKERS TILE. Borrowers do not see each other. Sunday's header
 * said nothing was in his way, and the tile under it read "Work is held up by the grinding machine, which waits on
 * the supplier.": Musa's wait. Where people do not see each other, the tile now counts and names the reader's own
 * waits only, as the header does. Amaka, who runs it, and an admin, read every wait.
 */
describe('run-25: the Blockers tile, as each reader of the loans check-in reads it', () => {
  const { whatThisSessionHolds, atAGlanceTiles } = require('./what-this-session-holds');
  const MUSAS_WAIT = { status: 'BLOCKING', fromParticipantId: 'p-musa', onParticipantId: null, what: 'the grinding machine', onLabel: 'the supplier' };
  const prisma = (deps: any[]) => ({
    checkIn: { findMany: async () => [{ id: 'c1' }] },
    groundDependency: { findMany: async () => deps },
    groundObjective: { findMany: async () => [] },
    groundObjectiveSnapshot: { findMany: async () => [] },
    groundCommitment: { findMany: async () => [] },
    ground: { findUnique: async () => ({ brief: null, participants: [] }) },
    recordEntry: { findMany: async () => [] },
  });
  const tileFor = async (deps: any[], reader: any) => {
    const held = await whatThisSessionHolds(prisma(deps), 'g', 1, reader);
    return atAGlanceTiles({ agreed: 0, stillOpen: 0, movedOnTargets: null, blocked: held.blocked, waiting: held.waiting, backedPct: null, numberWasSaid: false, theBlocker: held.theFirstBlocker, worries: held.worries, theWorry: held.theFirstWorry })
      .find((t: any) => t.label === 'Blockers');
  };

  it('Sunday reads that nothing of his is held up, not Musa\'s grinding machine', async () => {
    const t = await tileFor([MUSAS_WAIT], { participantId: 'p-sunday', isLead: false, ownWaitsOnly: true });
    expect(t.value).toBe('None');
    expect(JSON.stringify(t)).not.toMatch(/grinding machine|supplier/);
  });

  it('Sunday\'s own wait is still his to read', async () => {
    const t = await tileFor([MUSAS_WAIT, { ...MUSAS_WAIT, fromParticipantId: 'p-sunday', what: 'the spare blades', onLabel: 'the field officer' }], { participantId: 'p-sunday', isLead: false, ownWaitsOnly: true });
    expect(t.value).toBe('1');
    expect(t.sub).toBe('Work is held up by the spare blades, which waits on the field officer.');
  });

  it('Amaka, who runs it, and an admin read Musa\'s wait as before', async () => {
    const lead = await tileFor([MUSAS_WAIT], { participantId: 'p-amaka', isLead: true });
    expect(lead.sub).toBe('Work is held up by the grinding machine, which waits on the supplier.');
    const admin = await tileFor([MUSAS_WAIT], { participantId: null, isLead: false });
    expect(admin.sub).toBe('Work is held up by the grinding machine, which waits on the supplier.');
  });
});
