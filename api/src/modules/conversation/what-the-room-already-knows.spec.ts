import { whatIsWorthSaying, theSameThingSomebodyElseNamed } from './what-the-room-already-knows';

/**
 * THE CONVENING, WHERE THIRTY-SIX PEOPLE NAMED BLOCKERS AND NOT ONE OF THEM WAS TOLD.
 *
 * Forty people checked in on Nigerian agricultural markets. Thirty-six hard blockers went on the
 * record, several of them the same thing in different words, and every person who named one heard
 * nothing back. It reached a report the convener read alone, afterwards.
 *
 * "An organised supply side" was named by more than one of them. The second person to say it should
 * have been told so in the turn they said it.
 */
describe('what the room already knows', () => {
  const room = (others: any[], theyJustSaid: string, shared = true) =>
    whatIsWorthSaying({ shared, theyJustSaid, others });

  it('tells them somebody else is waiting on the same thing', () => {
    const out = room(
      [{ what: 'an organised supply side', raisedBy: 'Chidi Okonkwo', owned: false }],
      'the real hold up is getting an organised supply side, nobody has done it',
    );
    expect(out).toContain('Chidi Okonkwo');
    expect(out).toContain('an organised supply side');
    expect(out).toContain('Nobody is named as owning the other end of it.');
  });

  it('names several people properly when several are waiting', () => {
    const out = room(
      [
        { what: 'repaired rural roads', raisedBy: 'Tunde Bakare', owned: false },
        { what: 'repaired rural roads and aggregation points', raisedBy: 'Amina Yusuf', owned: false },
      ],
      'we cannot move produce until we have repaired rural roads',
    );
    expect(out).toMatch(/Tunde Bakare and Amina Yusuf have already named/);
  });

  it('says nothing at all when it is a different subject', () => {
    expect(room(
      [{ what: 'a fix for the certification process', raisedBy: 'Ngozi', owned: false }],
      'the aggregation point in Kano is the hold up',
    )).toBe('');
  });

  it('says nothing on a private check-in, which has no shared board to draw from', () => {
    expect(room(
      [{ what: 'an organised supply side', raisedBy: 'Chidi', owned: false }],
      'the hold up is an organised supply side',
      false,
    )).toBe('');
  });

  it('says nothing when there is nothing on the board yet', () => {
    expect(room([], 'the aggregation point is the hold up')).toBe('');
  });

  it('does not fire on a short answer with nothing in it to match', () => {
    expect(room([{ what: 'an organised supply side', raisedBy: 'Chidi', owned: false }], 'yes')).toBe('');
  });

  it('prefers the one nobody owns, because that is the fact with somewhere to go', () => {
    const out = room(
      [
        { what: 'planting data before the season', raisedBy: 'Amina', owned: true },
        { what: 'planting data before the season starts', raisedBy: 'Joy', owned: false },
      ],
      'we still have no planting data before the season',
    );
    expect(out).toContain('Nobody is named as owning the other end of it.');
  });

  it('tells the model it is one line before the question, and never a second question', () => {
    const out = room([{ what: 'an organised supply side', raisedBy: 'Chidi', owned: false }], 'the hold up is an organised supply side');
    expect(out).toMatch(/one short sentence/);
    expect(out).toMatch(/Do not turn it into a second/);
    expect(out).toMatch(/drop it entirely if it does not fit/);
  });

  it('matches on the subject, not on a word or two in common', () => {
    expect(theSameThingSomebodyElseNamed('we need an organised supply side', 'an organised supply side')).toBe(true);
    /* A place on the end is extra detail about the same thing, not a different thing. */
    expect(theSameThingSomebodyElseNamed('the aggregation point is the hold up', 'an aggregation point in Kano')).toBe(true);
    /* And one word in common is not a subject in common. */
    expect(theSameThingSomebodyElseNamed('the aggregation point is the hold up', 'a fix for the certification process')).toBe(false);
    expect(theSameThingSomebodyElseNamed('we need planting data', 'somebody to organise the smallholders')).toBe(false);
  });
});

/**
 * AND IT IS ACTUALLY IN THE PROMPT, which is the half that gets forgotten.
 *
 * A guard that exists and is never called is the fault this codebase has hit twice this week: the
 * start-a-check-in flag that no button passed, and the target extraction the entry flow never ran.
 */
describe('the give-back reaches the conversation', () => {
  const { readFileSync } = require('fs');
  const src = readFileSync(`${__dirname}/conversation.service.ts`, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('is assembled into the system prompt beside the other conditional blocks', () => {
    expect(src).toMatch(/const roomKnows = await this\.whatTheRoomAlreadyKnows\(checkIn, latestMessage \?\? ''\)/);
    /* It is chosen among the three by oneThingBack and only the winner is joined, so assert it
       reaches that chooser rather than the join list it no longer appears in directly. */
    expect(src).toMatch(/oneThingBack\(\{[^}]*roomKnows[^}]*\}\)/);
    expect(src).toMatch(/patternProbeBlock, theOneThingBack,/);
  });

  it('only on a shared ground, and never from the reader’s own handoffs', () => {
    const fn = src.slice(src.indexOf('private async whatTheRoomAlreadyKnows'));
    expect(fn).toMatch(/ground\?\.mode !== 'SHARED'/);
    expect(fn).toMatch(/fromParticipantId: \{ not: checkIn\.participantId \}/);
    /* Cleared handoffs are history, not something anybody is waiting on. */
    expect(fn).toMatch(/clearedAt: null/);
  });

  it('and never stops somebody getting a reply', () => {
    const fn = src.slice(src.indexOf('private async whatTheRoomAlreadyKnows'));
    expect(fn).toMatch(/catch \(err: any\)/);
    expect(fn).toMatch(/return '';/);
  });
});
