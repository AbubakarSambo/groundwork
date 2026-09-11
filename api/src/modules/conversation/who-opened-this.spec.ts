/**
 * A PARTICIPANT WAS TOLD THEY HAD EQUAL STANDING WITH THEIR MANAGER.
 *
 * ENGINE_RULES has carried a power-difference rule for months: when the person who opened the
 * check-in is a founder or a manager and the person answering is not, establish safety before any
 * probe. It could never fire. Nothing set openerRole, and the fallback read the party type of
 * whoever was ANSWERING - so the initiator got 'founder' and every other person got 'peer'.
 *
 * Which meant the first rule needed a participant whose opener role was 'founder', made impossible
 * by the fallback, and the second rule fired for every participant in the product: each one told,
 * explicitly, that their account weighed the same as the person who opened the check-in about
 * their work. In a check-in their manager opened, that is not a comfort. It is the product being
 * confidently wrong about the room.
 */
import { whoOpenedThis } from './who-opened-this';

describe('reading who opened it', () => {
  it.each([
    ['Founder', 'founder'],
    ['co-founder and CEO', 'founder'],
    ['Managing Director', 'founder'],
    ['Head of People', 'hr'],
    ['HR business partner', 'hr'],
    ['Engineering manager', 'manager'],
    ['Head of Sales', 'manager'],
    ['VP Product', 'manager'],
    ['Sales manager', 'manager'],
  ])('%s reads as %s', (text, expected) => {
    expect(whoOpenedThis(text, false)).toBe(expected);
  });

  it('and an ordinary role is a peer, which is the truth rather than a hedge', () => {
    expect(whoOpenedThis('Sales executive', false)).toBe('peer');
    expect(whoOpenedThis('Designer', false)).toBe('peer');
  });

  it('takes the senior reading when a title carries both', () => {
    /* A founder who also manages is still the founder as far as the room is concerned. */
    expect(whoOpenedThis('Founder and engineering manager', false)).toBe('founder');
    /* And people work is HR before it is management. */
    expect(whoOpenedThis('Head of People', false)).toBe('hr');
  });

  it('never invents a title it was not given', () => {
    expect(whoOpenedThis(null, false)).toBe('peer');
    expect(whoOpenedThis('   ', false)).toBe('peer');
  });

  it('and answering your own check-in has no difference in it, whatever your title', () => {
    expect(whoOpenedThis('Founder', true)).toBe('peer');
  });
});

describe('the wiring', () => {
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const SRC = strip(require('fs').readFileSync(require('path').join(__dirname, 'conversation.service.ts'), 'utf8'));

  it('passes the opener role from the person who opened it, not the person answering', () => {
    expect(SRC).toMatch(/openerRole: whoOpenedThis\(/);
    expect(SRC).toMatch(/partyType === PartyType\.INITIATOR\)\?\.roleAsDescribed/);
  });

  it('and tells it whether the answerer is that person', () => {
    expect(SRC).toMatch(/checkIn\.participant\.partyType === PartyType\.INITIATOR,/);
  });
});
