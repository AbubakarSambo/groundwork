import { ReportsService } from './reports.service';
import { askTheReportsDoor } from './one-persons-circumstances-stay-their-own';
import { makeService, theCohort } from './__fixtures__/a-cohort-for-the-session-report';

/**
 * PRIVACY SWEEP 5 OCTOBER 2026, FINDING 5 (reports are stored without names; names go in only when served).
 *
 * Stored reports hold names inside quoted words ("Aisha is current", "Seyi tells me partnerships are close"), because a quote is
 * what the person said (a-quote-is-what-they-said) and the read never rewrites the inside of one. So a reader who may not read
 * that person's name still read it, inside the quote. Read through the door every report read goes through, as the person
 * reviewed, a cohort colleague and the lead.
 */
const person = (id: string, userId: string, partyType: string, first: string, last: string, minute: number) => ({
  id, userId, partyType, email: `${first}@x.test`, managingOnly: false, roleAsDescribed: null, nameGiven: null, organisationGiven: null,
  createdAt: new Date(`2026-09-01T09:0${minute}:00Z`), user: { firstName: first, lastName: last },
});
const service = () => new ReportsService({} as any, {} as any, {} as any, {} as any, { get: () => '' } as any, { emit: () => Promise.resolve() } as any, {} as any, {} as any);

const SAID = 'Priya told me "Tobi has not sat with Priya since week two, and Priya is waiting on the outage review." That is what I heard.';

function read(scenario: string, peers: boolean | null, readerUserId: string, picture = SAID) {
  const participants = [
    person('p-lead', 'u-lead', 'INITIATOR', 'Hafsah', 'Lead', 0),
    person('p-tobi', 'u-tobi', 'PARTICIPANT', 'Tobi', 'Adeyemi', 1),
    person('p-priya', 'u-priya', 'PARTICIPANT', 'Priya', 'Nair', 2),
    person('p-sam', 'u-sam', 'PARTICIPANT', 'Samuel', 'Okoro', 3),
  ];
  const me = participants.find((p) => p.userId === readerUserId)!;
  const ground = { scenario, peersVisibleToEachOther: peers, initiatorId: 'u-lead', participants, report: { sharedPicture: picture, sharedAs: null } };
  return askTheReportsDoor(service() as any, ground, me.id, readerUserId === 'u-lead').sharedPicture as string;
}

describe('a name inside a quote, for a reader who may not read it', () => {
  it('Tobi, on his first 90 days, reads no colleague\'s name inside the quote, and the rest of the quote as it was said', () => {
    const text = read('NEW_HIRE', null, 'u-tobi');
    expect(text).not.toContain('Priya');
    expect(text).not.toContain('Samuel');
    expect(text).toContain('"');
    expect(text).toMatch(/has not sat with (?:a|one) colleague since week two/i);
    expect(text).toContain('That is what I heard.');
  });

  it('the lead reads the quote exactly as it was said', () => {
    expect(read('NEW_HIRE', null, 'u-lead')).toContain('"Tobi has not sat with Priya since week two, and Priya is waiting on the outage review."');
  });

  it('a person who reads the colleagues\' names, where the lead has switched that on, reads the quote as it was said', () => {
    expect(read('OKR_ALIGNMENT', true, 'u-sam')).toContain('has not sat with Priya since week two');
  });

  it('Priya reads her own name in the quote, as it was said', () => {
    expect(read('OKR_ALIGNMENT', true, 'u-priya')).toContain('Priya');
  });
});

describe('and in the rounds, which are stored text too', () => {
  const round = {
    sessionNumber: 1, sharedPicture: 'Lola told me "Seyi has not paid since week two." Most people are on time.', agreements: [], divergences: [], centralQuestion: null,
    takenAt: new Date('2026-09-23T17:00:00Z'), amendedAt: null, amendedNote: null,
  };

  it('Kwame, the person reviewed, reads no colleague\'s name inside the quote, and the lead reads it as it was said', async () => {
    const ground = theCohort('NEW_HIRE');
    const kwame: any = await makeService(ground, { rounds: [round] }).rounds('g1', 'user-kwame', 'org-1');
    expect(JSON.stringify(kwame)).not.toContain('Seyi');
    expect(JSON.stringify(kwame)).not.toContain('Lola');
    expect(JSON.stringify(kwame)).toContain('Most people are on time.');
    const lead: any = await makeService(ground, { rounds: [round] }).rounds('g1', 'user-lead', 'org-1');
    expect(JSON.stringify(lead)).toContain('Seyi has not paid since week two.');
  });
});
