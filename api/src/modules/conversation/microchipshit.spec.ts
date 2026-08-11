import {
  namesNobodySaid,
  restoreTheirWords,
  causalClaimNobodyMade,
  ASK_INSTEAD_OF_CONCLUDING,
} from './the-record-holds-what-was-said';

/**
 * "MICROCHIPSHIT" IS THE CLIENT'S NAME UNTIL SHE SAYS OTHERWISE. (W2)
 *
 * From Hafsah's own walkthrough of the entry flow, session one:
 *
 *   she typed   "microchipshit and they were not happy so i had to step in"
 *   it wrote    "I have the client name: Microchip Solutions."
 *
 *   she typed   "They finally got a demo, after the team didnt do it and signed-up"
 *   it wrote    "that demo led directly to the client signing up ... that is
 *                rescuing a sale"
 *
 * The first is the promise breaking. This product's whole claim is that it holds
 * what people said, and a model that silently corrects a name has broken it -
 * quietly, helpfully, and invisibly until a report quotes a company that does not
 * exist.
 *
 * The second is the engine agreeing with the person it is interviewing, which is
 * the behaviour every divergence in the product exists to make impossible.
 *
 * BOTH ARE THE MODEL BEING HELPFUL, which is why this is code. No instruction has
 * ever reliably stopped a model being helpful.
 */

const hers = [
  'i hate my colleagues',
  'They do not deliver, i do all the work',
  'microchipshit and they were not happy so i had to step in',
  'They finally got a demo, after the team didnt do it and signed-up',
  'mass general',
];

describe('names nobody typed', () => {
  it('catches the one that started this', () => {
    expect(namesNobodySaid('I have the client name: Microchip Solutions.', hers))
      .toContain('Microchip Solutions');
  });

  it('leaves alone a name the person actually gave', () => {
    // Daisy and Duke were typed, so the engine repeating them is the engine
    // working. A check that fired on these would be unusable.
    expect(namesNobodySaid('Got it, Daisy and Duke.', [...hers, 'Daisy and duke'])).toEqual([]);
  });

  it('is not fooled by capitalisation', () => {
    // She typed "mass general" in lower case; the engine writing "Mass General"
    // is the same name, and correcting a capital is not inventing a company.
    expect(namesNobodySaid('Got it: Mass General.', hers)).toEqual([]);
  });

  it('ignores the ordinary capitals of English prose', () => {
    // A check that reported "Thank" and "Your" as invented names would be
    // ignored within a day, and then the real one would be ignored with it.
    expect(namesNobodySaid(
      'Thank you. That gives me what I need. Your record now shows this clearly. Is there anything else?',
      hers,
    )).toEqual([]);
  });
});

describe('putting her word back', () => {
  it('restores what she typed', () => {
    // THE FIX. Restoring beats flagging: a flag arrives after the sentence is on
    // screen and she has already read a company name she never typed.
    const out = restoreTheirWords('I have the client name: Microchip Solutions.', hers);
    expect(out).toBe('I have the client name: microchipshit.');
  });

  it('restores every occurrence, including in a closing summary', () => {
    const reply = 'You named Microchip Solutions and Mass General. Microchip Solutions signed up.';
    const out = restoreTheirWords(reply, hers);
    expect(out).not.toMatch(/Microchip Solutions/);
    expect(out.match(/microchipshit/g)).toHaveLength(2);
  });

  it('leaves a reply alone when there is nothing to restore', () => {
    const reply = 'What was the outcome of that call?';
    expect(restoreTheirWords(reply, hers)).toBe(reply);
  });

  it('never invents a substitution of its own', () => {
    // The guard on the guard. A name with nothing of hers in it is reported but
    // not replaced, because replacing it would mean this code choosing a word,
    // which is the exact fault it exists to stop.
    const reply = 'I have noted Anvil Partners as the client.';
    expect(restoreTheirWords(reply, hers)).toBe(reply);
  });
});

describe('causal claims she did not make', () => {
  it('catches the upgrade', () => {
    const hits = causalClaimNobodyMade(
      'You ran the demo the team missed, and that demo led directly to the client signing up. That is not just showing up; that is rescuing a sale.',
      hers,
    );
    expect(hits).toContain('led directly to');
    expect(hits.some((h) => /rescuing a sale/i.test(h))).toBe(true);
  });

  it('leaves her own causal claim alone', () => {
    // The check is against her words, not against a vocabulary. Somebody who
    // says "I rescued that account" has said it, and the engine repeating it is
    // the record working.
    expect(causalClaimNobodyMade(
      'So your intervention is what turned it around.',
      [...hers, 'honestly my intervention is the only reason it closed'],
    )).toEqual([]);
  });

  it('says nothing about a plain summary', () => {
    expect(causalClaimNobodyMade(
      'You joined a client call the team was meant to handle, and they signed up afterwards.',
      hers,
    )).toEqual([]);
  });

  it('and the remedy is a question, not silence', () => {
    // The causal claim might well be true. She is the only one who can put it on
    // the record, and asking usually gets it.
    expect(ASK_INSTEAD_OF_CONCLUDING).toMatch(/Ask whether the two things are connected/);
    expect(ASK_INSTEAD_OF_CONCLUDING).toMatch(/a claim only they can make/);
  });
});
