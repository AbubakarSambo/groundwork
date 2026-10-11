import { theLeadActions, type WhoIsReading } from './the-switchboards-own-sections';

/**
 * (Final check, 9 October.) Today read "You need to find out who can provide what happens if the person you are handing over to is not on
 * the ward that A colleague is waiting for": the plain words for somebody the reader may not name were put into the middle of the
 * sentence with their capital. Inside a sentence they are "a colleague", and at the start of one they are "A colleague".
 */
const reader = (name: string | null): WhoIsReading => ({
  meId: 'p-lead', mayReadEveryone: true, theLeadsId: 'p-lead',
  personMayBeRead: () => true, handoffMayBeRead: () => true, commitmentMayBeRead: () => true,
  nameOf: (id) => (id === 'p-aisha' ? name : null),
  aColleague: () => 'A colleague',
});
const wait: any = { id: 'd1', fromParticipantId: 'p-aisha', onParticipantId: null, onLabel: null, what: 'the escalation process', status: 'WAITING', triedSaid: null, escalatedAt: null, dueSaid: null, dueOn: null, clearedAt: null, createdAt: '2026-09-16T09:00:00Z' };

describe('somebody the reader may not name, inside a sentence', () => {
  it('is "a colleague", and not "A colleague", after "that"', () => {
    const says = theLeadActions([], [wait], [], [], reader(null)).map((a) => a.says);
    expect(says).toEqual(['You need to find out who can provide the escalation process that a colleague is waiting for, because nobody has been named yet.']);
  });
  it('is a name, as written, where the reader may name them', () => {
    const says = theLeadActions([], [wait], [], [], reader('Aisha Wanjiku')).map((a) => a.says);
    expect(says).toEqual(['You need to find out who can provide the escalation process that Aisha Wanjiku is waiting for, because nobody has been named yet.']);
  });
});
