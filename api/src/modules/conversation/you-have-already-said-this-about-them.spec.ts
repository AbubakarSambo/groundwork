import { readFileSync } from 'fs';
import { whatIsAlreadyOnThem, theyNamed } from './you-have-already-said-this-about-them';

/**
 * THE LEAD NAMES RITA AGAIN AND THE PRODUCT ASKS AS THOUGH RITA HAS NEVER COME UP.
 *
 * She said in session one what she expects of Rita, and said whether Rita had been told. Both are on
 * the record. Neither reaches the turn where Rita is named again, so she says it twice, and the
 * expectation nobody has been told is never raised at the one moment it is naturally raisable.
 *
 * Nothing here crosses the wall. A PersonObjective is written FOR the person it is about and
 * published to them on their own page, so telling the lead what she herself put on somebody reveals
 * nothing to anybody.
 */
describe('you have already said this about them', () => {
  const onThem = [
    { name: 'Rita Okafor', text: 'Own the pricing page end to end', awareness: 'NOT_TOLD' },
    { name: 'Kunle Adeyinka', text: 'Close the first three contracts', awareness: 'TOLD' },
  ];

  it('says back what they already put on the person they just named', () => {
    const out = whatIsAlreadyOnThem('Rita is the one I am worried about on this', onThem);
    expect(out).toContain('Rita Okafor');
    expect(out).toContain('Own the pricing page end to end');
    expect(out).toMatch(/Do not ask them for it again/);
  });

  it('raises that the person has not been told, as their own account and not as a failing', () => {
    const out = whatIsAlreadyOnThem('what about Rita', onThem);
    expect(out).toMatch(/on their own account, Rita Okafor has not been told/);
    expect(out).toMatch(/never as a failing/);
    expect(out).toMatch(/their own account rather than a fact about the other person/);
  });

  it('prefers the one nobody has been told about, because that is the fact with somewhere to go', () => {
    const out = whatIsAlreadyOnThem('Rita and Kunle are both on this', onThem);
    expect(out).toContain('Rita Okafor');
    expect(out).not.toContain('Close the first three contracts');
  });

  it('says nothing about somebody they did not name', () => {
    expect(whatIsAlreadyOnThem('the aggregation point is the hold up', onThem)).toBe('');
  });

  it('and nothing at all when nothing is on anybody yet', () => {
    expect(whatIsAlreadyOnThem('Rita is on this', [])).toBe('');
  });

  it('does not match a name hiding inside another word', () => {
    expect(theyNamed('the kunle-style handover went fine', 'Kunle Adeyinka')).toBe(true);
    expect(theyNamed('we are working on attrition', 'Rita Okafor')).toBe(false);
    expect(theyNamed('margins are tight', 'Mark')).toBe(false);
  });

  it('and will not fire on a two-letter name, which would match half the language', () => {
    expect(theyNamed('we are at sixty', 'Jo')).toBe(false);
  });

  it('tells the model to drop it where it does not bear on what was just said', () => {
    const out = whatIsAlreadyOnThem('Rita is on this', onThem);
    expect(out).toMatch(/A fact about the right\s+person at the wrong moment still reads as not listening/);
  });
});

describe('and it reaches the conversation, reading only what this person set', () => {
  const src = readFileSync(`${__dirname}/conversation.service.ts`, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('is assembled into the prompt', () => {
    expect(src).toMatch(/const alreadySaidAboutThem = await this\.whatIsAlreadyOnSomebodyTheyNamed/);
    /* Chosen among the three by oneThingBack rather than joined alongside them. */
    expect(src).toMatch(/oneThingBack\(\{[^}]*alreadySaidAboutThem[^}]*\}\)/);
  });

  it('never reads what is on the reader themselves back at them', () => {
    const fn = src.slice(src.indexOf('private async whatIsAlreadyOnSomebodyTheyNamed'));
    expect(fn).toMatch(/participantId: \{ not: checkIn\.participantId \}/);
  });

  it('and never stops somebody getting a reply', () => {
    const fn = src.slice(src.indexOf('private async whatIsAlreadyOnSomebodyTheyNamed'));
    expect(fn).toMatch(/catch \(err: any\)/);
  });
});
