import { pickedFromText, pickWasAsked, A_PICK_IS_GOOD_FOR_MS, A_GREETING_ALONE, A_FINISH_WORD, pickedOrganisation, whichOrganisationAsText } from './a-whatsapp-message-is-routed';

/** "7" in answer to "how many did you close?" switched check-in. A typed number is a pick only while the question is fresh. */
const open = [{ id: 'c1', label: 'A', sessionNumber: 1, status: 'IN_PROGRESS' as const }, { id: 'c2', label: 'B', sessionNumber: 2, status: 'NOT_STARTED' as const }];
const now = new Date('2026-09-11T10:00:00Z');

describe('a typed number', () => {
  it('is a pick when the list was just sent, and an answer when it was not', () => {
    expect(pickedFromText('2', open, new Date(now.getTime() - 60_000), now)?.id).toBe('c2');
    expect(pickedFromText('2', open, null, now)).toBeNull();
    expect(pickedFromText('2', open, new Date(now.getTime() - A_PICK_IS_GOOD_FOR_MS - 1), now)).toBeNull();
  });
  it('a typed id is always a pick; a sentence never is', () => {
    expect(pickedFromText('c1', open, null, now)?.id).toBe('c1');
    expect(pickedFromText('we closed 7', open, new Date(now), now)).toBeNull();
  });
  it('the freshness rule alone', () => {
    expect(pickWasAsked(null)).toBe(false);
    expect(pickWasAsked(new Date(now.getTime() - 1000), now)).toBe(true);
  });
});

describe('the words that are not answers', () => {
  it('a greeting alone, and only alone', () => {
    for (const g of ['hi', 'Hello!', 'good morning', 'Hey there']) expect(A_GREETING_ALONE.test(g)).toBe(true);
    for (const a of ['Not much yet', "It's blocked", 'Behind again', 'hi, we shipped it']) expect(A_GREETING_ALONE.test(a)).toBe(false);
  });
  it('the finish words', () => {
    expect(A_FINISH_WORD.test('finish')).toBe(true);
    expect(A_FINISH_WORD.test('Done.')).toBe(true);
    expect(A_FINISH_WORD.test('done with the supplier')).toBe(false);
  });
});

describe('which organisation', () => {
  const orgs = [{ id: 'a', name: 'Acme' }, { id: 'b', name: 'Bolt' }];
  it('is asked as a numbered list and answered by number', () => {
    expect(whichOrganisationAsText(orgs)).toContain('1. Acme\n2. Bolt');
    expect(pickedOrganisation('2', orgs)?.id).toBe('b');
    expect(pickedOrganisation('3', orgs)).toBeNull();
    expect(pickedOrganisation('Acme', orgs)).toBeNull();
  });
});
