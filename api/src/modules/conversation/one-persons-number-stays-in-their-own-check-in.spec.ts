import { readFileSync } from 'fs';
import { join } from 'path';
import { whatTheRecordAlreadyHolds } from './what-the-record-already-holds';

/**
 * ONE PERSON'S NUMBER STAYS IN THEIR OWN CHECK-IN.
 *
 * Adversarial run, 20 September 2026: the loan officer said one borrower was "one month behind on a
 * 150,000 NGN payment". It was written as an aim of the whole ground, owned by nobody, and two other
 * borrowers were then asked "You said you need to make the 150,000 NGN payment". Two rules now: an aim
 * said in a check-in is owned by its speaker unless the lead is setting a target for a team that works
 * together, and a number owned by somebody else never reaches another person's prompt.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const service = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));

describe('an aim said inside a check-in', () => {
  it('is written against the person who said it, unless the lead is setting a shared target for a team', () => {
    expect(service).toContain("const aimsAreShared = me.partyType === PartyType.INITIATOR && (ground as any).peopleWorkTogether !== false;");
    /* Request 117 (11): the row now also keeps a person's own aim's day apart from its name; whose it is has not changed. */
    expect(service).toMatch(/groundObjective\.createMany\(\{\s*data: fresh\.map\(\(a, i\) => \{[\s\S]{0,400}?ownerParticipantId: aimsAreShared \? null : participantId, setByParticipantId: participantId/);
  });

  it('and only unowned targets or their own reach a person mid-conversation', () => {
    expect(service).toMatch(/\.filter\(\(o\) => !o\.ownerParticipantId \|\| o\.ownerParticipantId === checkIn\.participantId\)/);
  });
});

describe('what the record already holds', () => {
  it('names the check-in\'s own targets as the check-in\'s, never as something this person said', () => {
    const out = whatTheRecordAlreadyHolds({
      targets: [{ name: '150,000 NGN payment', target: 150000, count: 0, yours: false }],
      inTheWay: [], saidLastTime: [], now: new Date(),
    });
    expect(out).toContain('not said by this person. The count on it is EVERYBODY');
    expect(out).toContain('Never put these to them as "you said"');
    expect(out).not.toMatch(/Theirs/);
  });
});
