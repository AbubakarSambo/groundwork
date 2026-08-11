import {
  contentWords,
  touches,
  accountShapeFor,
  provenanceFor,
  standardsAndWhatTouchedThem,
  cleanText,
  type EntryRow,
} from './what-the-record-actually-holds';
import { softSpots } from './harder-to-fool';
import { whatALeaderCanWeigh } from './what-a-leader-can-weigh';
import { provenanceLine, isSettled } from './confidence-in-the-picture';

/**
 * COMPUTED, CORRECT, AND WIRED TO NOTHING. (G10, G31, G34)
 *
 * Three modules were built this week that need numbers nobody was producing.
 * Each was tested against hand-written inputs and passed, which is exactly the
 * bug shape this project has already had once: a read that is right in isolation
 * and reaches no reader.
 *
 * So these assertions run the real functions over rows shaped like real ones, and
 * then feed the result into the modules that consume it - because the seam
 * between "the arithmetic is right" and "the sentence is right" is where both of
 * the previous versions of this failed.
 *
 * THE OVERLAP TEST IS CRUDE ON PURPOSE and the tests say where it breaks rather
 * than pretending it does not. Two shared content words. It misses a pair who
 * describe the same event in entirely different words, which makes the product
 * LESS sure than it needs to be, and that is the safe direction.
 */

const e = (participantId: string, type: string, text: string, sessionNumber: number): EntryRow =>
  ({ participantId, type, text, sessionNumber });

describe('whether two accounts are describing the same thing', () => {
  it('says yes when they share the nouns, which is how people actually overlap', () => {
    expect(touches(
      'The Meridian migration handover slipped past the agreed date',
      'Handover of the Meridian work has not happened yet',
    )).toBe(true);
  });

  it('says no on one shared word, because one is a coincidence', () => {
    // The threshold is two for a reason: one shared word links half a ground.
    expect(touches('The migration is late', 'The invoice is late')).toBe(false);
  });

  it('ignores the words every account contains', () => {
    // Without this, "this week the work is going well" touches everything.
    expect(touches(
      'This week the work is really going quite well',
      'The work this week has been something of a thing',
    )).toBe(false);
  });

  it('and misses the pair who used entirely different words, which is admitted', () => {
    // THE KNOWN LIMIT, written down as a test so nobody discovers it as a
    // surprise. It errs toward less confidence, not more.
    expect(touches('He never owned a client end to end', 'Nobody handed him an account of his own')).toBe(false);
  });

  it('never reads the verifiability marker as content', () => {
    expect([...contentWords('[VERIFIABILITY:HIGH] the Meridian handover')]).not.toContain('verifiability');
    expect(cleanText('[VERIFIABILITY:HIGH] the Meridian handover')).toBe('the Meridian handover');
  });
});

describe('the shape of one account, from rows', () => {
  const entries = [
    e('hafsah', 'SUCCESS_DEFINITION', '[VERIFIABILITY:HIGH] owning at least one client relationship end to end', 1),
    e('hafsah', 'WORRY', 'The Meridian handover keeps coming back to me', 2),
    e('abubakar', 'COMMITMENT', '[VERIFIABILITY:HIGH] I will take the Meridian handover this month', 2),
    e('abubakar', 'ASK', '[VERIFIABILITY:MEDIUM] Nobody told me I could own an account', 3),
  ];

  it('counts what anybody else touched, not what a person is', () => {
    const shape = accountShapeFor('abubakar', entries, [], 3);
    expect(shape.corroborated).toBe(1);
    expect(shape.specifics).toBe(2);
  });

  it('counts a repeat only when it came after the first mention', () => {
    // A specific restated in a LATER session is a repeat. The same specific read
    // backwards is the original, and counting both would make every account look
    // stale from session two.
    const repeated = [
      ...entries,
      e('abubakar', 'COMMITMENT', '[VERIFIABILITY:HIGH] Still taking the Meridian handover this month', 4),
    ];
    expect(accountShapeFor('abubakar', repeated, [], 4).repeatedSpecifics).toBe(1);
  });

  it('notices a document nothing refers to, and one that something does', () => {
    const docs = [{ participantId: 'abubakar', name: 'meridian-handover-plan.pdf' }, { participantId: 'abubakar', name: 'scratch.txt' }];
    const shape = accountShapeFor('abubakar', entries, docs, 3);
    expect(shape.documents).toBe(2);
    expect(shape.documentsReferredTo).toBe(1);
  });

  it('and the shape produces a soft spot that reads about the record', () => {
    // THE SEAM. The arithmetic being right is half of it; the sentence it
    // produces is the half a person reads.
    const lonely = accountShapeFor('nobody', [e('nobody', 'WORRY', 'The audit trail is incomplete somewhere', 2)], [], 3);
    const [spot] = softSpots({ ...lonely, sessions: 3 });
    expect(spot.spot).toBe('nothing else touches it');
    expect(spot.line).toMatch(/does not make it wrong, it makes it unchecked/);
  });
});

describe('what a claim rests on, from rows', () => {
  const entries = [
    e('hafsah', 'WORRY', 'The Meridian handover keeps coming back to me', 2),
    e('abubakar', 'COMMITMENT', 'I will take the Meridian handover this month', 3),
  ];

  it('counts the separate accounts and where it started', () => {
    const p = provenanceFor('The Meridian handover has not happened', entries);
    expect(p.accounts).toBe(2);
    expect(p.firstSeenSession).toBe(2);
    expect(isSettled(p)).toBe(true);
    expect(provenanceLine(p)).toMatch(/independently by 2 people/);
  });

  it('a claim nothing touches rests on one account and is not settled', () => {
    const p = provenanceFor('The pricing model was never agreed', entries);
    expect(p.accounts).toBe(1);
    expect(isSettled(p)).toBe(false);
    expect(provenanceLine(p)).toMatch(/nothing else in the record touches it/);
  });

  it('never guesses that somebody was contradicted', () => {
    // THE LINE THIS MUST NOT CROSS. Overlap can show two people are talking
    // about the same thing. It cannot show they disagree, and a guess in that
    // direction is an accusation the product cannot support.
    for (const claim of ['The Meridian handover happened on time', 'The Meridian handover never happened']) {
      expect(provenanceFor(claim, entries).contradicted).toBe(false);
    }
  });
});

describe('the standards, and the one nothing reached', () => {
  const entries = [
    e('hafsah', 'SUCCESS_DEFINITION', 'owning at least one client relationship end to end by month three', 1),
    e('hafsah', 'SUCCESS_DEFINITION', 'judgement, not just delivery', 1),
    e('abubakar', 'COMMITMENT', 'I have taken one client relationship end to end this month', 6),
  ];

  it('finds the standard the record reached', () => {
    const { standardsTouched } = standardsAndWhatTouchedThem('hafsah', entries);
    expect(standardsTouched).toEqual(['owning at least one client relationship end to end by month three']);
  });

  it('and refuses to let a standard be its own evidence', () => {
    /**
     * THE ASSERTION THE WHOLE SECTION DEPENDS ON. If the entry that states the
     * standard counts as touching it, every standard is always reached and part
     * three of G10 is empty forever - a section that quietly always says
     * "everything is covered" is worse than no section, because it is read as a
     * finding.
     */
    const aloneWithItself = standardsAndWhatTouchedThem('hafsah', [entries[0], entries[1]]);
    expect(aloneWithItself.standardsTouched).toEqual([]);
  });

  it('feeds G10, which names the untouched one and says what that means', () => {
    const { statedStandards, standardsTouched } = standardsAndWhatTouchedThem('hafsah', entries);
    const section = whatALeaderCanWeigh({
      statedStandards,
      standardsTouched,
      entries: entries.map((r) => ({ kind: r.type as any, text: r.text, session: r.sessionNumber })),
      isClosing: true,
    })!;
    expect(section.whatNobodyHasEvidenceFor).toEqual(['judgement, not just delivery']);
    expect(section.note).toMatch(/not evidence against anyone/);
  });

  it('and says nothing at all where the lead never stated one', () => {
    const { statedStandards } = standardsAndWhatTouchedThem('abubakar', entries);
    expect(statedStandards).toEqual([]);
    expect(whatALeaderCanWeigh({ statedStandards, standardsTouched: [], entries: [], isClosing: true })).toBeNull();
  });
});
