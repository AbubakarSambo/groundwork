import { theProjectBoard, theFundersBrief, aMilestoneAcceptedIsAnInvoiceToRaise, theRelease5ProjectsIsOn } from './release-5-projects';
import { MASTERCARD_RECORDS, TODAY } from './__fixtures__/a-funded-project';
import { FROM_A_MILESTONE } from './raising-invoices-on-time';
import { theTargetLines } from '../engagement/the-direct-morning';

const COLON_JOIN = /[a-z]: [A-Za-z0-9]/;

describe('Release 5: the project board, from the project\'s own records', () => {
  const b = theProjectBoard(MASTERCARD_RECORDS as any, TODAY, { invoicesFollow: true, financeName: 'Brian' });

  it('draws the plan as the milestones in order, each with its day and its share, in full sentences', () => {
    expect(b.plan.map((r) => [r.title, r.says])).toEqual([
      ['Milestone 1, the inception report', 'Due 30 November. 30% of the contract is paid when it is accepted. It is started.'],
      ['Milestone 2, field data from 6 markets', 'Due 31 January. 40% of the contract is paid when it is accepted.'],
      ['Milestone 3, the final report and workshop', 'Due 15 March. 30% of the contract is paid when it is accepted.'],
    ]);
  });

  it('draws money in and out by month, and names the tightest month with how short it is', () => {
    expect(b.money.months.map((m) => [m.month, m.says, m.tightest])).toEqual([
      ['November', 'What is left of the start-up grant comes in, KES 1,000,000. Hiring the field team goes out, KES 650,000.', false],
      ['December', 'Travel to 6 markets goes out, KES 560,000.', true],
      ['January', '40% of the contract on approval comes in, KES 2,400,000.', false],
    ]);
    expect(b.money.tightestSays).toBe('The tightest month is December, KES 210,000 short if nothing else comes in by then.');
  });

  it('names who keeps in touch with each stakeholder and what they need, and says what is not known yet', () => {
    expect(b.stakeholders.map((s) => [s.title, s.says, s.tone])).toEqual([
      ['The Mastercard programme lead', 'Mercy keeps in touch with them. They need monthly updates, evidence over opinion.', 'rec'],
      ['County trade officers in 6 counties', 'Brian keeps in touch with them. What they need is still to be learned.', 'att'],
    ]);
  });

  it('puts the funder\'s next update in what is coming up, with a brief drawn from the record, and the next milestone\'s invoice', () => {
    expect(b.comingUp.map((c) => c.title)).toEqual(['Update for The Mastercard programme lead in 10 days', 'The inception report, and its invoice']);
    expect(b.comingUp[0].rehearse).toBe(true);
    expect(b.comingUp[1].says).toBe('When it is accepted, Brian is told the amount and terms, so the invoice goes out the same day.');
  });

  it('says what is off track from the record: the money gap and a stakeholder whose needs nobody knows', () => {
    expect(b.offTrack).toEqual([
      'The tightest month is December, KES 210,000 short if nothing else comes in by then.',
      'County trade officers in 6 counties could be at risk. Brian keeps in touch with them. What they need is still to be learned.',
    ]);
  });

  it('calls a milestone late once its day has passed and it is not delivered', () => {
    const late = theProjectBoard(MASTERCARD_RECORDS as any, '2026-12-05');
    expect(late.plan[0]).toMatchObject({ says: 'Due 30 November. 30% of the contract is paid when it is accepted. It is started, and it is late.', tone: 'con' });
    expect(late.offTrack[0]).toBe('Milestone 1, the inception report, was due on 30 November and is not delivered yet.');
  });

  it('never joins pieces with a colon, and says nothing of the invoice when invoices do not follow', () => {
    const text = JSON.stringify(theProjectBoard(MASTERCARD_RECORDS as any, TODAY));
    expect(text).not.toMatch(/and its invoice/);
    for (const r of [...b.plan, ...b.stakeholders, ...b.comingUp]) expect(r.says).not.toMatch(COLON_JOIN);
  });
});

describe('Release 5: the funder\'s brief, before each update', () => {
  it('starts from what they asked last time, then where each milestone and the money stand, from the record only', () => {
    const brief = theFundersBrief(MASTERCARD_RECORDS as any, MASTERCARD_RECORDS[6] as any, TODAY);
    expect(brief).toBe('The update for The Mastercard programme lead. Last time they asked: “How many traders have you spoken to, and in which markets?” Milestone 1, the inception report, is started, due 30 November. Milestone 2, field data from 6 markets, is planned, due 31 January. Milestone 3, the final report and workshop, is planned, due 15 March. The tightest month is December, KES 210,000 short if nothing else comes in by then. They need monthly updates, evidence over opinion.');
  });
});

describe('Release 5: a milestone accepted is an invoice to raise', () => {
  const prismaWith = (org: any, kind = 'a funded project') => {
    const created: any[] = [];
    return {
      created,
      prisma: {
        ground: {
          findUnique: async () => ({ organizationId: 'o1', scenario: 'NEW_PROJECT', kindOfWork: kind, label: 'Mastercard market study' }),
          findMany: async () => [{ id: 'fees' }],
        },
        organization: { findUnique: async () => org },
        workItem: {
          findMany: async ({ where }: any) => (where.kind === 'milestone' ? [{ id: 'm1', name: 'The inception report', fields: { Amount: 'KES 1,800,000', Client: 'Mastercard Foundation', 'Accepted on': '2026-11-28' } }] : []),
          create: async ({ data }: any) => { created.push(data); return data; },
        },
      },
    };
  };

  it('writes one bill, not yet raised, in the organisation\'s collections check-in, due from the day it was accepted', async () => {
    const { prisma, created } = prismaWith({ release3InvoicesOn: true, release5ProjectsOn: true });
    expect(await aMilestoneAcceptedIsAnInvoiceToRaise(prisma, 'g1')).toBe(1);
    expect(created[0]).toMatchObject({ groundId: 'fees', kind: 'bill', stage: 'Not yet raised', name: 'Mastercard market study, The inception report' });
    expect(created[0].fields[FROM_A_MILESTONE]).toEqual({ milestone: "Mastercard market study's The inception report", day: '2026-11-28', milestoneId: 'm1' });
  });

  it('writes nothing with either switch off, or on a check-in that is not a project', async () => {
    for (const org of [{ release3InvoicesOn: false, release5ProjectsOn: true }, { release3InvoicesOn: true, release5ProjectsOn: false }]) {
      const { prisma, created } = prismaWith(org);
      expect(await aMilestoneAcceptedIsAnInvoiceToRaise(prisma, 'g1')).toBe(0);
      expect(created).toEqual([]);
    }
    const { prisma } = prismaWith({ release3InvoicesOn: true, release5ProjectsOn: true }, 'sales team');
    expect(await aMilestoneAcceptedIsAnInvoiceToRaise(prisma, 'g1')).toBe(0);
  });

  it('reads the switch off for an organisation it cannot find', async () => {
    /* Always on (15 November 2026): nothing is read, so a missing row or organisation no longer turns the project board off. */
    expect(await theRelease5ProjectsIsOn({ organization: { findUnique: async () => null } }, 'o1')).toBe(true);
    expect(await theRelease5ProjectsIsOn({}, null)).toBe(true);
  });
});

describe('Release 5: the lead\'s morning on a project', () => {
  it('says the next milestone and the tightest month, as the board does', () => {
    const project = theProjectBoard(MASTERCARD_RECORDS as any, TODAY);
    const t = theTargetLines({ releaseFiveProjects: true, project, kindOfWork: 'a funded project' }, new Date('2026-11-01T05:00:00Z'), 'Africa/Nairobi');
    expect(t.lines.map((l) => l.text)).toEqual([
      'Milestone 1, the inception report, is next. Due 30 November. 30% of the contract is paid when it is accepted. It is started.',
      'The tightest month is December, KES 210,000 short if nothing else comes in by then.',
    ]);
  });
});
