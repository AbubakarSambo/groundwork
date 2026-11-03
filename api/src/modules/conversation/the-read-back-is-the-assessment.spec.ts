import { readFileSync } from 'fs';
import { join } from 'path';
import { theReadBack, THE_READ_BACK_WAS_GIVEN } from './the-read-back';

/**
 * THE READ-BACK IS THE ASSESSMENT, AS THE PERSON MAY READ IT (F4 item 2, 3 November 2026). What Mercy reads at the end of her check-in
 * is her own items in the assessment written at that moment, in her own words; the lead's judgement of her never reaches it.
 */
const item = (id: string, words: string, extra: Record<string, unknown> = {}, whoMaySee = 'the people in this check-in') => ({ id, words, from: [1], whoMaySee, saidWordForWord: true, ...extra });
const anAssessment = (participantId: string, who: string, isTheLead: boolean) => ({
  kind: 'assessment', version: 1,
  about: { checkInId: 'c1', groundId: 'g1', participantId, who, isTheLead, checkIn: 'Sales', sessionNumber: 2, startedAt: null, endedAt: '2026-11-03T09:00:00.000Z', channel: 'web', howItEnded: 'finished by the person' },
  workUpdates: [item('w1', 'Kilele Hotel paid KES 40,000 on Monday.', { proof: 'proved' })],
  claims: [], numbers: [], dates: [], decisions: [], corrections: [], documents: [], targets: [], everythingElse: [],
  promises: [item('p1', 'I will send the Westgate quote on Friday')],
  blockers: [item('b1', 'Still waiting for Joseph to send the samples.')],
  people: [item('n1', 'Joseph')],
  stillOpen: [item('s1', 'Ask about Westgate next time.')],
  observations: [item('o1', 'Mercy keeps letting promised days pass.', {}, 'the lead only')],
  roleSignals: [], areas: [],
  messages: [{ n: 1, turnId: 't1', where: 'check-in', at: null }],
});

describe('the read-back at the end of a check-in', () => {
  it('Mercy, a participant, reads her own items in her own words, and the lead\'s judgement of her is not there', () => {
    const said = theReadBack(anAssessment('p-mercy', 'Mercy Achieng', false) as any)!;
    expect(said).toBe([
      'Here’s what I recorded.',
      'You said “Kilele Hotel paid KES 40,000 on Monday.” A document you added backs this.',
      'You promised “I will send the Westgate quote on Friday.”',
      'You said “Still waiting for Joseph to send the samples.”',
      'Is anything wrong? Tell me and I will put it right.',
    ].join('\n'));
    expect(said).not.toMatch(/letting promised days pass|Ask about Westgate|Joseph”$/);
  });

  it('Grace, the lead, reads the same shape about her own check-in, and her own lead-only items are not read back either', () => {
    const said = theReadBack(anAssessment('p-grace', 'Grace Wanjiru', true) as any)!;
    expect(said.startsWith('Here’s what I recorded.\nYou said “Kilele Hotel paid')).toBe(true);
    expect(said).not.toMatch(/letting promised days pass/);
  });

  it('nothing of theirs to say back means no read-back, and the close goes on as before', () => {
    const empty = { ...anAssessment('p-mercy', 'Mercy Achieng', false), workUpdates: [], promises: [], blockers: [] };
    expect(theReadBack(empty as any)).toBeNull();
    expect(theReadBack(null)).toBeNull();
  });

  it('plain full sentences, no colon joining pieces', () => {
    const said = theReadBack(anAssessment('p-mercy', 'Mercy Achieng', false) as any)!;
    for (const line of said.split('\n')) expect(line).not.toMatch(/^[^“]*:\s/);
  });

  it('the close is held once for it, and the next turn is told a fix is a claim checked against the record', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    expect(src).toContain('const readBack = theReadBack(assessed);');
    expect(src).toContain("data: { closeHeldAt: new Date() }");
    expect(src).toContain("(r?.closeHeldAt ? THE_READ_BACK_WAS_GIVEN : '')");
    expect(THE_READ_BACK_WAS_GIVEN).toMatch(/a correction is a claim like any other/);
    expect(THE_READ_BACK_WAS_GIVEN).toMatch(/ask for it once, naturally, without accusing anybody/);
    expect(THE_READ_BACK_WAS_GIVEN).toMatch(/Never read the list back again\./);
  });
});
