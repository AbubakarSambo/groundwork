import { EntryService } from './entry.service';
import { howSheDescribesHerself, notTheLeadHerself, aLineThatDescribesNothing } from './the-lead-is-you-in-her-report';

/**
 * THE LEAD IS "YOU" IN HER OWN REPORT, AND A ROLE SHE GAVE IS KEPT (local test, 15 October 2026).
 *
 * Hafsah set up Muchemi & Co's litigation check-in and said, in setup, that she is the partner who signs things off and
 * that Otieno raises the fee notes. Her first report then said "The partner's role has not been described ... Ask the
 * partner what they expect", offered "The partner" as somebody to invite, and said of Otieno "They were named as a person
 * involved, but their role in these specific matters was not described". What she reads now, from the same model output.
 */
const HER_SETUP_WORDS = [
  'A daily check-in for the litigation team: what is due on our matters, filings and court dates, and who is waiting on whom',
  'I am the partner, and I sign off every filing. Brian drafts, Aisha attends mentions, and Otieno raises the fee notes.',
];
const SESSION = [
  { role: 'assistant' as const, content: 'What are you working to right now?' },
  { role: 'user' as const, content: 'Getting the Matter A defence filed on time on 22 October, and no missed court dates this term.' },
];
const WHAT_THE_MODEL_WROTE = {
  whatGroundworkSaw: 'Your account describes three active legal matters.',
  alignmentStatus: 'Not yet assessed', alignmentBasis: 'One account.', honestClose: 'x',
  areasRequiringAlignment: [
    { title: 'The Matter C submission is at risk', observation: 'Waiting on two signed witness statements.', whyItMatters: 'The deadline could be missed.', recommendedMove: 'Confirm with the client.' },
    { title: "The partner's role has not been described", observation: 'The partner was named as being involved, but their expectations have not been stated.', whyItMatters: 'x', recommendedMove: 'Ask the partner what they expect from this project.' },
  ],
  alignmentReached: [],
  suggestedParties: [],
  mentionedPeople: [
    { name: 'Brian Kiptoo', context: 'He is responsible for writing the first draft of the defence for Matter A.' },
    { name: 'Otieno Ouma', context: 'They were named as a person involved, but their role in these specific matters was not described.' },
    { name: 'The partner', context: 'They were named as a person involved, but their role and expectations were not described.' },
  ],
};

function aService() {
  const anthropic: any = { respond: jest.fn(async () => ''), extract: jest.fn(async () => JSON.parse(JSON.stringify(WHAT_THE_MODEL_WROTE))) };
  const prisma: any = { ground: { findUnique: jest.fn(async () => null) }, scenarioPack: { findFirst: jest.fn(async () => null) }, platformSetting: { findUnique: jest.fn(async () => null) } };
  const service = new EntryService(anthropic, prisma, {} as any, {} as any, {} as any, {} as any, {} as any);
  return { service, anthropic };
}

describe('Hafsah\'s first report on Muchemi & Co', () => {
  it('is written knowing what she said in setup, as her own words about herself and each person', async () => {
    const { service, anthropic } = aService();
    await service.report(SESSION as any, 'TEAM_UPDATES', 'Litigation', undefined, ['Brian Kiptoo', 'Aisha Hassan', 'Otieno Ouma', 'the partner'], HER_SETUP_WORDS);
    const sent: string = anthropic.extract.mock.calls[0][1][0].content;
    expect(sent).toContain('Otieno raises the fee notes');
    expect(sent).toContain('that is me, the person checking in, and not somebody else');
    expect(sent).toContain('already named who is involved: Brian Kiptoo, Aisha Hassan, Otieno Ouma.');
  });

  it('never offers "the partner" as somebody else to ask or invite', async () => {
    const { service } = aService();
    const out: any = await service.report(SESSION as any, 'TEAM_UPDATES', 'Litigation', undefined, ['Otieno Ouma', 'the partner'], HER_SETUP_WORDS);
    const everything = JSON.stringify(out);
    expect(everything).not.toMatch(/the partner/i);
    /* Updated 19 November 2026: the pretend model wrote `heading` and `whatWeNoticed`, names the report's schema does not have and
       nothing reads. The report now keeps only its own fields (the-report-as-it-is-kept.ts), so the pretend model writes those. */
    expect(out.areasRequiringAlignment.map((a: any) => a.observation)).toEqual(['Waiting on two signed witness statements.']);
  });

  it('keeps the role she gave, and saves no untrue "was not described" as Otieno\'s role', async () => {
    const { service } = aService();
    const out: any = await service.report(SESSION as any, 'TEAM_UPDATES', 'Litigation', undefined, ['Otieno Ouma'], HER_SETUP_WORDS);
    const people = [...(out.mentionedPeople ?? []), ...(out.alsoCameUp ?? [])];
    const otieno = people.find((p: any) => p.name === 'Otieno Ouma');
    expect(otieno).toBeDefined();
    expect(otieno.context).toBe('');
    expect(people.find((p: any) => p.name === 'Brian Kiptoo').context).toBe('He is responsible for writing the first draft of the defence for Matter A.');
  });
});

describe('the three reads underneath', () => {
  it('how she describes herself', () => {
    expect(howSheDescribesHerself(HER_SETUP_WORDS)).toContain('partner');
    expect(howSheDescribesHerself(['Otieno is the partner on Matter B.'])).toEqual([]);
  });
  it('a name that is only her own description of herself is left out, and nobody else', () => {
    expect(notTheLeadHerself(['Brian', 'the partner', 'Partner'], HER_SETUP_WORDS)).toEqual(['Brian']);
    expect(notTheLeadHerself(['the partner'], ['Otieno is the partner.'])).toEqual(['the partner']);
  });
  it('a line saying nobody described a role describes nothing', () => {
    expect(aLineThatDescribesNothing('They were named as a person involved, but their role in these specific matters was not described.')).toBe(true);
    expect(aLineThatDescribesNothing('He raises the fee notes.')).toBe(false);
  });
});
