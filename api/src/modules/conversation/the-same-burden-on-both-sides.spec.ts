import { theStreamedRouteRunsThePlainRoute } from './__fixtures__/the-streamed-route-is-the-plain-route';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  whatThisTurnAskedFor, countWhatWasAsked, aDirectiveAboutTheBurden,
} from './the-same-burden-on-both-sides';

/**
 * ONE PERSON ASKED TO PROVE THEMSELVES, THE OTHER ASKED TO REFLECT.
 *
 * Driven on a real two-party conflict. Eli got "What did you do, or not do, that helped get the
 * situation to this point?" Fay got "what's in the screenshots you're taking?", "Is there anything
 * written down that proves the environment variable was missing?" and "How many PRs are currently
 * waiting, and for how long?" - three times on the stand.
 *
 * No single turn is wrong: Fay made falsifiable claims and asking for evidence is the job. The
 * pattern is that the person who says checkable things gets audited and the person who says vague
 * things gets sympathy - on the scenario whose whole promise is impartiality, and invisibly, since
 * neither party reads the other's session.
 */
describe('what a turn asked for', () => {
  it('reads a demand to produce something as evidence', () => {
    for (const t of [
      'Is there anything written down that proves the environment variable was missing?',
      'How many PRs are currently waiting, and for how long?',
      'What evidence is there for that?',
      'Where is that recorded?',
    ]) expect(whatThisTurnAskedFor(t)).toBe('evidence');
  });

  it('and an invitation to examine their own part as reflection', () => {
    for (const t of [
      'What did you do, or not do, that helped get the situation to this point?',
      'What part, if any, do you feel you played in getting here?',
      'What would you do differently?',
    ]) expect(whatThisTurnAskedFor(t)).toBe('reflection');
  });

  /** An offer is not a challenge, and counting it as one would make every session look uneven. */
  it('and does not count an offer to share something as putting them on the stand', () => {
    expect(whatThisTurnAskedFor('Is there a brief or a plan you could attach? It helps but it is not required.'))
      .toBe('neither');
  });

  it('and a turn that does both is read generously', () => {
    expect(whatThisTurnAskedFor('What did you do or not do here, and is there anything written down?'))
      .toBe('reflection');
  });
});

describe('the directive when the burden has been uneven', () => {
  const seen = (mine: [number, number], theirs: [number, number]) => ({
    thisPerson: { evidence: mine[0], reflection: mine[1] },
    theOthers: { evidence: theirs[0], reflection: theirs[1] },
  });

  /**
   * THE REAL NUMBERS, replayed from the conflict transcripts: Fay asked for evidence twice and to
   * reflect never, Eli asked to reflect once and for evidence never. The threshold started at three
   * and this case is two, so the guard was silent on the exact run that motivated it - caught by
   * replaying the transcripts, not by the fixture I had written for myself.
   */
  it('fires on the numbers that actually happened', () => {
    const d = aDirectiveAboutTheBurden(seen([2, 0], [0, 1]));
    expect(d).toContain('THE BURDEN HAS NOT BEEN EVEN');
  });

  /** And one against nought is still noise. */
  it('and stays quiet one turn earlier', () => {
    expect(aDirectiveAboutTheBurden(seen([1, 0], [0, 1]))).toBe('');
  });

  it('fires on the shape that actually happened', () => {
    const d = aDirectiveAboutTheBurden(seen([3, 0], [1, 2]));
    expect(d).toContain('THE BURDEN HAS NOT BEEN EVEN');
    expect(d).toContain('do not ask this person for another document, number or proof');
  });

  /** Corrects by adding, never by asking less - otherwise balance is bought with a worse record. */
  it('and never tells it to stop asking for evidence altogether', () => {
    expect(aDirectiveAboutTheBurden(seen([3, 0], [1, 2]))).toContain('Go back to evidence next turn');
  });

  it('and fires the other way when one side is never asked to reflect', () => {
    const d = aDirectiveAboutTheBurden(seen([1, 0], [1, 3]));
    expect(d).toContain('asked to examine');
    expect(d).toContain('what part they played');
  });

  it('and says nothing on a small or even difference', () => {
    expect(aDirectiveAboutTheBurden(seen([2, 1], [2, 1]))).toBe('');
    expect(aDirectiveAboutTheBurden(seen([2, 0], [1, 1]))).toBe('');
    expect(aDirectiveAboutTheBurden(seen([0, 0], [0, 0]))).toBe('');
  });
});

describe('counting across the check-in', () => {
  it('separates this person from everybody else', () => {
    /* Stamps, not text: see countWhatWasAsked for why this never reads a turn. */
    const t = countWhatWasAsked([
      { participantId: 'fay', askedFor: 'evidence' },
      { participantId: 'fay', askedFor: 'evidence' },
      { participantId: 'eli', askedFor: 'reflection' },
      { participantId: 'eli', askedFor: null },
    ], 'fay');
    expect(t.thisPerson).toEqual({ evidence: 2, reflection: 0 });
    expect(t.theOthers).toEqual({ evidence: 0, reflection: 1 });
  });
});

describe('and it reaches the assembled prompt', () => {
  const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  /**
   * NEVER READS ANOTHER PERSON'S TURNS. An AI turn carries the person's own words reflected back,
   * so loading Fay's while answering Eli is loading Fay's account into Eli's session - which an
   * existing guard refuses, correctly. The count comes from a stamp written at the time.
   */
  it('counts with a groupBy, which cannot return content at all', () => {
    const q = SRC.slice(SRC.indexOf('const burden ='), SRC.indexOf('const toPut ='));
    expect(q).toMatch(/conversationTurn\.groupBy\(\{/);
    expect(q).toMatch(/by: \['checkInId', 'askedFor'\]/);
    /* The point of the groupBy: there is no shape of it that returns a turn's words, so this cannot
       be widened into a leak later without being rewritten into something else entirely. */
    expect(q).not.toMatch(/findMany/);
    expect(q).not.toMatch(/content/);
  });

  it('and stamps every AI turn as it is written', () => {
    /* Changed 28 Sep 2026: the streamed route now runs sendMessage itself (the-streamed-route-is-the-plain-route), so a rule held on both paths is in sendMessage once, and the stream runs it. */
    expect((SRC.match(/askedFor: stampWhatItAskedFor\(/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(theStreamedRouteRunsThePlainRoute(SRC)).toBe(true);
  });

  /** On a solo check-in there is no other side to be uneven with, and no query worth running. */
  it('and only where there is another side', () => {
    expect(SRC).toMatch(/\(ground\.participants\?\.length \?\? 0\) > 1/);
  });

  /* What this holds to account is that `burden` is in the join and the three things stay last. It
     used to quote the whole tail, which made every later block that belongs in the middle of that
     tail look like a regression - see when-this-is-over.ts, 22 September 2026. */
  it('and is joined into the prompt rather than merely computed', () => {
    expect(SRC).toMatch(/deliveriesBlock, .*burden, putThisToThem,/);
    expect(SRC).toMatch(/cannotBeMissed, askedLastTurn, patternProbeBlock\]\.filter\(Boolean\)\.join/);
  });
});
