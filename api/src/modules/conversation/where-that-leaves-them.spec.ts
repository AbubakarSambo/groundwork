import { readFileSync } from 'fs';
import { whereThatLeavesThem, theySaidANumber } from './where-that-leaves-them';

/**
 * SHE CAME TO TRACK PROGRESS AND THE TRACKING HAPPENED SOMEWHERE SHE WAS NOT.
 *
 * A lead sets 150 contracts. Session two she says "we are at sixty", and the reply asks her the next
 * question. The board knows the 150 and knows where she was last time. She hears none of it.
 *
 * This is the safest trade in the product: her number against her target. Nothing about anybody
 * else, no wall to apply, nothing that was not already hers.
 */
describe('where that leaves them', () => {
  const hers = [
    { name: 'Achieve a target of 150 contracts', target: 150, count: 0 },
    { name: '500 contracts', target: 500, count: 120 },
  ];

  it('puts her own targets in front of the model when she reports a number', () => {
    const out = whereThatLeavesThem('we are at sixty now', hers);
    expect(out).toContain('the board has 0 of 150');
    expect(out).toContain('the board has 120 of 500');
  });

  it('says nothing at all in a turn with no number in it', () => {
    expect(whereThatLeavesThem('the aggregation point is still the hold up', hers)).toBe('');
    expect(whereThatLeavesThem('yes', hers)).toBe('');
  });

  it('and nothing when there is no target to be against', () => {
    expect(whereThatLeavesThem('we are at sixty', [])).toBe('');
    expect(whereThatLeavesThem('we are at sixty', [{ name: 'Sell trucks', target: null, count: 0 }])).toBe('');
  });

  /**
   * SHE SAID "I HAVE CLOSED TWELVE" AND IT ASKED HER WHAT HER TARGET WAS.
   *
   * Off a real participant check-in. Rita opened with "not great honestly, I have closed twelve",
   * against a target of 150 sitting on the board, and the give-back stayed silent because the word
   * list started at twenty. The reply asked her for the number the board already held.
   *
   * Small numbers are the ones people say in words. Nobody writes "we closed 3".
   */
  it('hears the small numbers people actually say out loud', () => {
    for (const said of ['I have closed twelve', 'I closed three', 'we have eight left', 'nineteen so far', 'none yet']) {
      expect(theySaidANumber(said)).toBe(true);
    }
  });

  it('and puts her targets up when she says one of them', () => {
    expect(whereThatLeavesThem('Not great honestly. I have closed twelve.', hers)).toContain('the board has 0 of 150');
  });

  it('does not treat a date or a session number as a report of progress', () => {
    expect(theySaidANumber('we agreed 12/03 for the handover')).toBe(false);
    expect(theySaidANumber('that was session 2')).toBe(false);
    expect(theySaidANumber('by 2026')).toBe(false);
    expect(theySaidANumber('we closed sixty')).toBe(true);
    expect(theySaidANumber('we are at 60')).toBe(true);
  });

  it('forbids a figure of its own, and forbids a verdict', () => {
    const out = whereThatLeavesThem('we are at sixty', hers);
    expect(out).toMatch(/never a figure of your own/);
    expect(out).toMatch(/do not tell them they are behind or ahead/);
    expect(out).toMatch(/the arithmetic is\s+theirs to draw a conclusion from/);
  });

  it('and does not let it become a recitation, which is the restating fault in a new coat', () => {
    const out = whereThatLeavesThem('we are at sixty', hers);
    expect(out).toMatch(/Do not recite the list/);
    expect(out).toMatch(/one short clause before your question/);
  });

  it('changes nothing on the board, because that is asked for elsewhere and accepted', () => {
    expect(whereThatLeavesThem('we are at sixty', hers)).toMatch(/a number is only\s+changed where they are asked and they accept/);
  });
});

describe('and it reaches the conversation', () => {
  const src = readFileSync(`${__dirname}/conversation.service.ts`, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('is assembled into the prompt', () => {
    expect(src).toMatch(/const againstTheirNumber = await this\.whereTheirNumberLeavesThem\(checkIn, latestMessage \?\? ''\)/);
    /* Chosen among the three by oneThingBack, and first in that order. */
    expect(src).toMatch(/oneThingBack\(\{ againstTheirNumber/);
    expect(src).toMatch(/theOneThingBack,/);
  });

  it('reads their own targets and the ground\'s, never another person\'s', () => {
    const fn = src.slice(src.indexOf('private async whereTheirNumberLeavesThem'));
    expect(fn).toMatch(/ownerParticipantId: checkIn\.participantId/);
    expect(fn).toMatch(/ownerParticipantId: null/);
    expect(fn).toMatch(/target: \{ not: null \}/);
  });

  it('and never stops somebody getting a reply', () => {
    const fn = src.slice(src.indexOf('private async whereTheirNumberLeavesThem'));
    expect(fn).toMatch(/catch \(err: any\)/);
  });
});
