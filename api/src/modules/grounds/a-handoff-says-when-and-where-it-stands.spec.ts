import { checkInLinks } from './check-in-links';
import { askedOfYou } from './asked-of-you';
import { theDayTheyMeant, theDueWord, whereItStands, theDayIn } from './when-a-handoff-is-due';

/**
 * REQUEST 18 (b): EACH HANDOFF CARRIES THE PERSON'S OWN WORDS FOR WHEN, A DUE WORD, AND ONE PLAIN
 * SENTENCE OF WHERE IT STANDS, FROM THE RECORD.
 *
 * Wednesday 23 September 2026. Served under the rules the links and "everything asked of you" already
 * use, so what is asserted here is what each reader actually reads.
 */
const WEDNESDAY = new Date('2026-09-23T10:00:00Z');
const day = (s: string) => new Date(`${s}T00:00:00Z`);

describe('the day a person\'s words mean', () => {
  it.each([
    ['by Friday', '2026-09-25'],
    ['Friday', '2026-09-25'],
    ['next Monday', '2026-10-05'],
    ['tomorrow', '2026-09-24'],
    ['today', '2026-09-23'],
    ['30 September', '2026-09-30'],
    ['by Sept 30', '2026-09-30'],
    ['the 2nd of October', '2026-10-02'],
  ])('%s', (said, on) => {
    expect(theDayTheyMeant(said, WEDNESDAY)?.toISOString().slice(0, 10)).toBe(on);
  });

  it.each(['soon', 'after the audit', 'when Finance replies', 'next week', ''])('never guesses a day from "%s"', (said) => {
    expect(theDayTheyMeant(said, WEDNESDAY)).toBeNull();
  });
});

describe('the due word', () => {
  const today = day('2026-09-23');
  it('says Overdue, Today, a short weekday, or a short date', () => {
    expect(theDueWord(day('2026-09-21'), today)).toBe('Overdue');
    expect(theDueWord(day('2026-09-23'), today)).toBe('Today');
    expect(theDueWord(day('2026-09-25'), today)).toBe('Fri');
    expect(theDueWord(day('2026-10-09'), today)).toBe('9 Oct');
    expect(theDueWord(null, today)).toBeNull();
  });
  it('reads the day in Lagos, not in UTC', () => {
    expect(theDayIn('Africa/Lagos', new Date('2026-09-23T23:30:00Z')).toISOString().slice(0, 10)).toBe('2026-09-24');
  });
});

describe('where it stands', () => {
  it('says the time they gave, as a plain sentence about the thing', () => {
    expect(whereItStands({ what: 'the Mombasa depot’s count', dueSaid: 'Friday' })).toBe('The Mombasa depot’s count is due Friday.');
    expect(whereItStands({ what: 'credit terms for Westgate Deli', dueSaid: 'due by Friday.' })).toBe('Credit terms for Westgate Deli is due by Friday.');
    expect(whereItStands({ what: 'the seals', dueSaid: 'next week' })).toBe('The seals are due next week.');
  });
  it('says Not decided yet where it is a decision nobody has made, and otherwise that no date was given', () => {
    expect(whereItStands({ what: 'the backup transporter', blockerKind: 'DECISION' })).toBe('Not decided yet.');
    expect(whereItStands({ what: 'the seals' })).toBe('No date has been given yet.');
  });
  it('never joins pieces with a colon, a dash or an arrow', () => {
    for (const s of [whereItStands({ what: 'x y z', dueSaid: 'soon' }), whereItStands({ what: 'a b c', blockerKind: 'DECISION' }), whereItStands({ what: 'a b c' })]) {
      expect(s).not.toMatch(/[:→—]| - /);
      expect(s).toMatch(/\.$/);
    }
  });
});

const ORG = 'org-baridi';
const op = (id: string, label: string, initiatorId: string, peers = true) => ({ id, label, initiatorId, scenario: 'TEAM_PERFORMANCE', peersVisibleToEachOther: peers });
const sales = op('sales', 'Sales team, Q3', 'u-wairimu');
const ops = op('ops', 'Distribution operations', 'u-fatuma');
const handoff = (over: any = {}) => ({
  id: 'l-stock', groundId: 'sales', waitingOnGroundId: 'ops', fromParticipantId: 'p-wairimu', onParticipantId: null, onParticipant: null,
  onLabel: 'Operations', what: 'Stock for Green Mart’s January order', status: 'WAITING', namedTheThing: true, clearedAt: null,
  createdAt: new Date('2026-09-16T08:00:00Z'), dueSaid: 'by Friday', dueOn: day('2026-09-25'), blockerKind: null,
  fromParticipant: { userId: 'u-wairimu', nameGiven: null, user: { firstName: 'Wairimu', lastName: 'Kamau' } }, ...over,
});

describe('as the links between check-ins serve it', () => {
  const mayOpen = new Map<string, any>([['sales', sales], ['ops', ops]]);
  const today = day('2026-09-23');

  it('the lead who asked reads the words, the day, the due word and where it stands', () => {
    const links = checkInLinks(sales, [handoff()] as any, mayOpen, { userId: 'u-wairimu', role: 'LEAD' }, today);
    expect(links.waitingOnOtherTeams[0]).toMatchObject({
      dueSaid: 'by Friday', dueOn: '2026-09-25', dueWord: 'Fri',
      standing: 'Stock for Green Mart’s January order is due by Friday.',
    });
  });

  it('the team asked reads the same, from the check-in that asked', () => {
    const links = checkInLinks(ops, [handoff()] as any, mayOpen, { userId: 'u-fatuma', role: 'LEAD' }, today);
    expect(links.askedOfThisCheckIn[0]).toMatchObject({ dueSaid: 'by Friday', dueWord: 'Fri', team: 'Sales team, Q3' });
  });

  it('says Overdue once the day has gone, and says nothing invented where no time was given', () => {
    const late = checkInLinks(sales, [handoff({ dueOn: day('2026-09-21') })] as any, mayOpen, { userId: 'u-wairimu', role: 'LEAD' }, today);
    expect(late.waitingOnOtherTeams[0].dueWord).toBe('Overdue');
    const none = checkInLinks(sales, [handoff({ dueSaid: null, dueOn: null })] as any, mayOpen, { userId: 'u-wairimu', role: 'LEAD' }, today);
    expect(none.waitingOnOtherTeams[0]).toMatchObject({ dueSaid: null, dueOn: null, dueWord: null, standing: 'No date has been given yet.' });
  });

  it('a check-in the reader cannot open still gives nothing, due words included', () => {
    const only = new Map<string, any>([['ops', ops]]);
    const links = checkInLinks(ops, [handoff()] as any, only, { userId: 'u-fatuma', role: 'LEAD' }, today);
    expect(links.askedOfThisCheckIn).toEqual([]);
  });
});

describe('as everything asked of you serves it', () => {
  const row = (over: any = {}) => ({
    id: 'd-1', groundId: 'sales', onParticipantId: 'p-miriam', fromParticipantId: 'p-wairimu', onLabel: null,
    what: 'Westgate’s trade references', status: 'WAITING', namedTheThing: true, createdAt: new Date('2026-09-14T08:00:00Z'),
    dueSaid: 'today', dueOn: day('2026-09-23'), blockerKind: null,
    fromParticipant: { userId: 'u-wairimu', nameGiven: null, user: { firstName: 'Wairimu', lastName: 'Kamau' } },
    ground: { label: 'Sales team, Q3', initiatorId: 'u-wairimu', scenario: 'TEAM_PERFORMANCE', peersVisibleToEachOther: true }, ...over,
  });
  const mine = { groundIds: new Set(['sales']), participantIds: new Set(['p-miriam']) };

  it('Miriam reads "Today" and where it stands', () => {
    const out = askedOfYou([row()] as any, { userId: 'u-miriam', role: 'MEMBER' }, mine, day('2026-09-23'))!;
    expect(out.items[0]).toMatchObject({ dueSaid: 'today', dueWord: 'Today', standing: 'Westgate’s trade references are due today.' });
  });

  it('where people are kept apart, the due words come with no name', () => {
    const hidden = row({ ground: { label: 'Kwame, first 90 days', initiatorId: 'u-wairimu', scenario: 'PIP', peersVisibleToEachOther: false } });
    const out = askedOfYou([hidden] as any, { userId: 'u-miriam', role: 'MEMBER' }, mine, day('2026-09-23'))!;
    expect(out.items[0].who).toBeNull();
    expect(out.items[0].dueWord).toBe('Today');
  });

  it('nothing about time is invented when the person gave none', () => {
    const out = askedOfYou([row({ dueSaid: null, dueOn: null })] as any, { userId: 'u-miriam', role: 'MEMBER' }, mine, day('2026-09-23'))!;
    expect(out.items[0]).toMatchObject({ dueSaid: null, dueOn: null, dueWord: null, standing: 'No date has been given yet.' });
  });
});
