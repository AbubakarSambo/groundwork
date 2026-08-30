import { mayPropose, mayDecide, keyFor, NOT_YOURS_TO_PROPOSE, NOT_YOURS_TO_DECIDE } from './who-may-say-how-we-do-it';

/**
 * PROPOSING IS NOT APPROVING.
 *
 * A document in a check-in is somebody's file. An approved one becomes what people's own accounts
 * are held up against when they walk through a process, so making one is a piece of authority and
 * it sits with the person who holds the account.
 */
describe('who may propose', () => {
  it('an admin, and somebody who runs check-ins', () => {
    expect(mayPropose('ADMIN').may).toBe(true);
    expect(mayPropose('LEAD').may).toBe(true);
  });

  it('and not somebody who only takes part in them', () => {
    /* Their document arriving on an approval queue would read as policy when it is their evidence. */
    const answer = mayPropose('MEMBER');
    expect(answer.may).toBe(false);
    expect(NOT_YOURS_TO_PROPOSE).toContain('still share this document inside a check-in');
  });

  it('and the refusal says what they can still do', () => {
    expect(NOT_YOURS_TO_PROPOSE).not.toMatch(/\b(not allowed|denied|permission)\b/i);
  });
});

describe('who decides', () => {
  it('only an admin', () => {
    expect(mayDecide('ADMIN').may).toBe(true);
    expect(mayDecide('LEAD').may).toBe(false);
    expect(mayDecide('MEMBER').may).toBe(false);
  });

  it('and a lead is told where theirs went, not just refused', () => {
    expect(NOT_YOURS_TO_DECIDE).toContain('on their list');
  });
});

describe('the key a card is stored under', () => {
  it('is made from the name a person gave the document', () => {
    expect(keyFor('How contracting works.pdf')).toBe('how-contracting-works');
    expect(keyFor('Pricing Process v2.docx')).toBe('pricing-process-v2');
  });

  it('survives a name with nothing usable in it', () => {
    expect(keyFor('???.pdf')).toBe('how-we-do-it');
    expect(keyFor('')).toBe('how-we-do-it');
  });

  it('and is the same for the same process re-uploaded', () => {
    /* It groups a theme across sessions. An id would be unique and meaningless, and next year's
       copy would start a second thread nothing connects to the first. */
    expect(keyFor('How contracting works.pdf')).toBe(keyFor('how contracting works.PDF'));
  });
});
