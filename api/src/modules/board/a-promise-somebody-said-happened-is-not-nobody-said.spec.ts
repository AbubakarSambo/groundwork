import { theLeadActions, type WhoIsReading } from './the-switchboards-own-sections';
import { aLineThatSaysItHappened } from './somebody-said-it-happened';

/**
 * "NOBODY HAS SAID WHETHER IT HAPPENED" AFTER BRIAN SAID THE REPLY WAS FILED (messages test, 19 October, finding 4, the board's part).
 *
 * Muchemi & Co. (test). Wanjiru said on Monday 12 October, in session 1 of "Litigation team daily", "I will draft the reply and ensure it is
 * filed by Friday." On Tuesday 13 October Brian Otieno said "The reply in Kasarani Foods v. Tumaini Traders was filed today." From Tuesday
 * to Friday What needs you still read: In session 1, you said, "I will draft the reply and ensure it is filed". The time you gave for it
 * was "by Friday". It has been open for 2 sessions, and nobody has said whether it happened. Only Wanjiru moves her own promise, so it
 * stays open; but somebody did say, and the line now says who and what, word for word, to her.
 */
const P = { wanjiru: '3e60b08a-d31d-4b7e-9adc-b4c60bd4b0f1', brian: 'e9e2d42c-c918-491e-8b13-73b212ec6f2c', aisha: '1fdbb152-b086-44f4-8c1f-172734ff06ba' };
const NAMES: Record<string, string> = { [P.wanjiru]: 'You', [P.brian]: 'Brian Otieno', [P.aisha]: 'Aisha Kamau' };
const wanjiru: WhoIsReading = {
  meId: P.wanjiru, mayReadEveryone: true, theLeadsId: P.wanjiru,
  personMayBeRead: () => true, handoffMayBeRead: () => true, commitmentMayBeRead: () => true,
  nameOf: (id) => NAMES[id] ?? null, aColleague: () => 'A colleague',
};
const HER_PROMISE = {
  id: 'c-reply', participantId: P.wanjiru, text: 'I will draft the reply and ensure it is filed', whenSaid: 'by Friday', explicit: true, status: 'UNKNOWN',
  source: 'CHECK_IN', statedInSession: 1, saidAgainIn: [], settledBy: null, settledAt: null, saidWordForWord: true, whenSaidWordForWord: true,
  createdAt: new Date('2026-10-12T06:20:00Z'),
};
const LINES = [
  { participantId: P.brian, type: 'PROGRESS', text: 'The reply has been drafted and should be filed this week.', createdAt: new Date('2026-10-12T08:38:00Z') },
  { participantId: P.brian, type: 'PROGRESS', text: 'The reply in Kasarani Foods v. Tumaini Traders was filed today.', createdAt: new Date('2026-10-13T06:33:00Z') },
];
const SESSIONS = [
  { participantId: P.wanjiru, sessionNumber: 1, status: 'COMPLETED', completedAt: new Date('2026-10-12T06:25:00Z') },
  { participantId: P.brian, sessionNumber: 3, status: 'COMPLETED', completedAt: new Date('2026-10-14T06:40:00Z') },
];

describe('a promise somebody else said happened never reads "nobody has said"', () => {
  it('finds Brian\'s line of 13 October, and not his "should be filed this week" of the 12th', () => {
    expect(aLineThatSaysItHappened(HER_PROMISE, LINES)?.text).toBe('The reply in Kasarani Foods v. Tumaini Traders was filed today.');
    expect(aLineThatSaysItHappened(HER_PROMISE, [LINES[0]])).toBeNull();
  });

  it('Wanjiru reads who said it, and what, under What needs you', () => {
    const withIt = { ...HER_PROMISE, saidHappened: { ...LINES[1] } };
    const [own] = theLeadActions([withIt as any], [], SESSIONS as any, [], wanjiru);
    expect(own.says).toContain('In session 1, you said, "I will draft the reply and ensure it is filed". The time you gave for it was "by Friday".');
    expect(own.says).toContain('Brian Otieno said on 13 October, "The reply in Kasarani Foods v. Tumaini Traders was filed today."');
    expect(own.says).not.toContain('nobody has said whether it happened');
  });
});
