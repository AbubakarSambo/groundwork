import { GroundScenario } from '@prisma/client';
import { EntryService } from './entry.service';
import { theClassifierPrompt, readTheClassification, THE_SCENARIOS_IN_WORDS, THE_CLASSIFICATION_SCHEMA } from './which-situation-this-is';
import { KINDS_OF_WORK } from '../board/the-kind-of-work';
import { whatSetupKnowsNow } from './what-setup-knows';
import { THE_KINDS_IN_WORDS, HOW_A_KIND_IS_CHOSEN } from '../board/the-kind-of-work';
import { THE_SCENARIO_TABLE } from '../conversation/the-scenario-table';

/**
 * ONE READING SETS THE SITUATION AND THE KIND OF WORK (release test, 21 November 2026, bugs 3 and 107 to 110).
 *
 * Typed at /start: "we have to pick a new supplier by end of month" became "Get a new project off to a good start", because the
 * classifier described CRISIS_ALIGNMENT as a crisis while its card says "Work through a big decision"; "choosing between 3 packaging
 * vendors" became "Work out where to focus", because a second call read a where-next workshop and overrode the situation; "founder here,
 * want to keep a read on everything" saved no kind. One call now reads both, from the situations as their cards say them and the kinds as
 * the kind's own read at setup says them.
 */
/* Changed 22 November 2026: the model answers by filling the schema's fields (extract), not with free text (respond). */
function aService(modelSays: Record<string, string>) {
  const s = Object.create(EntryService.prototype) as any;
  s.anthropic = { respond: jest.fn(), extract: jest.fn().mockResolvedValue(modelSays) };
  s.prisma = { usageEvent: { create: jest.fn().mockResolvedValue({}) } };
  s.logger = { log: jest.fn(), warn: jest.fn() };
  return s;
}

/** What the lead reads on the setup panel for the situation served ("The kind of check-in"). */
const whatTheLeadReads = (scenario: string | null) => whatSetupKnowsNow({}, scenario ? { classifiedScenario: scenario } : {}).kindName ?? null;

describe('the situations are said once, as their cards say them', () => {
  it('each situation in the reading is its card: the name and the line the lead reads', () => {
    const p = theClassifierPrompt('we have to pick a new supplier by end of month');
    for (const key of Object.values(GroundScenario)) {
      const row = (THE_SCENARIO_TABLE as any)[key];
      expect(p).toContain(`${key} - ${row.name}. ${row.description}`);
    }
    expect(p).toContain('CRISIS_ALIGNMENT - Work through a big decision. Bring different views together around an important decision.');
    expect(p).not.toMatch(/crisis or outage/);
  });

  it('the kind of work is read in the same words the kind\'s own read at setup uses', () => {
    const p = theClassifierPrompt('choosing between 3 packaging vendors');
    expect(p).toContain(THE_KINDS_IN_WORDS);
    expect(p).toContain(HOW_A_KIND_IS_CHOSEN);
    expect(THE_KINDS_IN_WORDS).toContain('Choosing between a few options, such as suppliers or vendors, is a decision');
    expect(THE_KINDS_IN_WORDS).toContain('"founder\'s own check-in": a founder, owner or chief executive checking in on their own');
    /* Changed 22 November 2026: the answer's fields are the product's own lists, so a situation or kind it does not have cannot be written. */
    expect(THE_CLASSIFICATION_SCHEMA.input_schema.properties.scenario.enum).toEqual(Object.values(GroundScenario));
    expect(THE_CLASSIFICATION_SCHEMA.input_schema.properties.kind.enum).toEqual([...KINDS_OF_WORK, 'none']);
  });

  it('the setup read is told the situation in those same words', () => {
    expect(THE_SCENARIOS_IN_WORDS.NEW_PROJECT).toBe('Get a new project off to a good start. Get everyone clear on the work, their role, and what needs to happen.');
  });
});

describe('reading the one answer', () => {
  it('keeps a kind only when it is one of the fifteen', () => {
    expect(readTheClassification({ scenario: 'PULSE_CHECK', confidence: 'high', kind: "founder's own check-in" })).toEqual({ scenario: 'PULSE_CHECK', confidence: 'high', kind: "founder's own check-in" });
    expect(readTheClassification({ scenario: 'CRISIS_ALIGNMENT', confidence: 'high', kind: 'none' })).toEqual({ scenario: 'CRISIS_ALIGNMENT', confidence: 'high' });
    expect(readTheClassification({ scenario: 'CRISIS_ALIGNMENT', confidence: 'high', kind: 'a supplier review' })).toEqual({ scenario: 'CRISIS_ALIGNMENT', confidence: 'high' });
  });
});

describe('the door makes one call, and the lead reads the situation it settled', () => {
  it('a supplier to pick is a big decision, with no kind of work, from one call', async () => {
    const s = aService({ scenario: 'CRISIS_ALIGNMENT', confidence: 'high', kind: 'none' });
    const r = await s.classifyIntent('we have to pick a new supplier by end of month');
    expect(r).toEqual({ scenario: 'CRISIS_ALIGNMENT', confidence: 'high' });
    expect(s.anthropic.extract).toHaveBeenCalledTimes(1);
    expect(s.anthropic.respond).not.toHaveBeenCalled();
    expect(whatTheLeadReads(r.scenario)).toBe('Work through a big decision');
  });

  it('a rollout across depots is a new project', async () => {
    const r = await aService({ scenario: 'NEW_PROJECT', confidence: 'high', kind: 'none' }).classifyIntent('rolling out a new stock system across 4 depots');
    expect(whatTheLeadReads(r.scenario)).toBe('Get a new project off to a good start');
  });

  it('a founder\'s own check-in runs as its switchboard row says, keeping a read on live work', async () => {
    const r = await aService({ scenario: 'PULSE_CHECK', confidence: 'high', kind: "founder's own check-in" }).classifyIntent('founder here, want to keep a read on everything');
    expect(whatTheLeadReads(r.scenario)).toBe('Keep a read on live work');
  });

  it('a kind the same reading names still decides the situation, so the board and the report agree', async () => {
    const r = await aService({ scenario: 'CRISIS_ALIGNMENT', confidence: 'low', kind: 'support desk' }).classifyIntent('support tickets are piling up and I can\'t see who is on what');
    expect(r).toEqual({ scenario: 'OKR_ALIGNMENT', confidence: 'high', kind: 'support desk' });
    expect(whatTheLeadReads(r.scenario)).toBe('Set goals and keep the team on track');
  });

  it('an engineering release is a new project, as the prototype draws it (Hafsah, 22 November 2026)', async () => {
    const r = await aService({ scenario: 'NEW_PROJECT', confidence: 'high', kind: 'engineering release' }).classifyIntent('new project kicking off - mobile app release v2');
    expect(r).toEqual({ scenario: 'NEW_PROJECT', confidence: 'high', kind: 'engineering release' });
    expect(whatTheLeadReads(r.scenario)).toBe('Get a new project off to a good start');
  });
});

/*
 * THE TYPED SITUATIONS THAT STILL WENT WRONG (release test, 22 November 2026, bugs 1 to 3). Read with Gemini at the door: the model
 * wrote situations the product does not have ("FOUNDER_OWN_CHECKIN", "A_GOVERNMENT_PROGRAMME"), and the kind it named went with the
 * answer, so the check-in became a new project. A situation that is not one of ours is now no situation, and the kind stands.
 */
describe('a kind is kept when the situation is not one of ours', () => {
  it('reads the kind on its own', () => {
    expect(readTheClassification({ scenario: 'FOUNDER_OWN_CHECKIN', confidence: 'high', kind: "founder's own check-in" })).toEqual({ scenario: null, confidence: 'low', kind: "founder's own check-in" });
  });

  it('so "founder here" runs as its kind\'s situation, and the lead reads "Keep a read on live work"', async () => {
    const r = await aService({ scenario: 'FOUNDER_OWN_CHECKIN', confidence: 'high', kind: "founder's own check-in" }).classifyIntent('founder here, want to keep a read on everything');
    expect(r).toEqual({ scenario: 'PULSE_CHECK', confidence: 'high', kind: "founder's own check-in" });
    expect(whatTheLeadReads(r.scenario)).toBe('Keep a read on live work');
  });

  it('and a ministry-funded rollout runs as a government programme', async () => {
    const r = await aService({ scenario: 'A_GOVERNMENT_PROGRAMME', confidence: 'high', kind: 'a government programme' }).classifyIntent('county ag extension rollout, ministry funded');
    expect(whatTheLeadReads(r.scenario)).toBe('Keep a read on live work');
  });

  it('the call asks for the schema, on the fast model', async () => {
    const s = aService({ scenario: 'NEW_HIRE', confidence: 'high', kind: 'none' });
    const r = await s.classifyIntent('we have a new guy starting monday in the depot');
    expect(s.anthropic.extract.mock.calls[0][2]).toBe(THE_CLASSIFICATION_SCHEMA);
    expect(s.anthropic.extract.mock.calls[0][3]).toEqual({ fast: true });
    expect(whatTheLeadReads(r.scenario)).toBe('Help a new hire get started');
  });
});

/*
 * THE DOOR'S KIND IS THE ONE THE CHECK-IN IS SAVED WITH (typed situations, 22 November 2026). The kind was read again at the save and the
 * two reads disagreed ("county ag extension rollout, ministry funded" lost its government programme). The setup carries this reading's
 * kind to the save, and the second read is gone.
 */
describe('the kind travels from the door to the save', () => {
  it('a kind read with a situation she chose is kept where it runs as that situation, and dropped where it does not', async () => {
    const goals = await aService({ scenario: 'OKR_ALIGNMENT', confidence: 'high', kind: 'sales org' }).classifyIntent('need to set quarterly goals for my 3 teams. each team hits its own revenue target, 12m in total', undefined, 'OKR_ALIGNMENT');
    expect(goals).toEqual({ scenario: 'OKR_ALIGNMENT', confidence: 'high', kind: 'sales org' });
    const hire = await aService({ scenario: 'NEW_HIRE', confidence: 'high', kind: 'distribution operations' }).classifyIntent('we have a new guy starting monday in the depot', undefined, 'NEW_HIRE');
    expect(hire).toEqual({ scenario: 'NEW_HIRE', confidence: 'high' });
  });

  it('what setup knows keeps the kind once read, as it keeps the situation', () => {
    const first = whatSetupKnowsNow({}, { classifiedScenario: 'PULSE_CHECK', kindOfWork: 'a government programme' } as any);
    expect(whatSetupKnowsNow(first, {} as any).kindOfWork).toBe('a government programme');
  });

  it('the save is given that kind, and nothing reads the kind a second time when the check-in is made', () => {
    const { readFileSync } = require('fs');
    const { join } = require('path');
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const entry = strip(readFileSync(join(__dirname, 'entry.service.ts'), 'utf8'));
    expect(entry).toMatch(/kindOfWork: dto\.kindOfWork/);
    const grounds = strip(readFileSync(join(__dirname, '..', 'grounds', 'grounds.service.ts'), 'utf8'));
    const create = grounds.slice(grounds.indexOf('  async create('), grounds.indexOf('  async createForLead('));
    expect(create).not.toMatch(/readTheKindOfWork/);
    expect(create).toMatch(/oneOfTheKinds\(dto\.kindOfWork\)/);
  });

  it('a check-in an admin sets up for a lead, and a brief the lead changes, are read by the same one reading, with no prompt of their own', () => {
    const { readFileSync } = require('fs');
    const { join } = require('path');
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const grounds = strip(readFileSync(join(__dirname, '..', 'grounds', 'grounds.service.ts'), 'utf8'));
    const forLead = grounds.slice(grounds.indexOf('  async createForLead('), grounds.indexOf('  async createForLead(') + 12000);
    expect(forLead).toMatch(/void this\.readTheKindOfWork\(ground\.id\)/);
    const theRead = grounds.slice(grounds.indexOf('  async readTheKindOfWork('), grounds.indexOf('  async readTheKindOfWork(') + 2500);
    expect(theRead).toMatch(/readTheSituationAndTheKind\(this\.anthropic, words\)/);
    expect(grounds).not.toMatch(/THE_KIND_OF_WORK_PROMPT|THE_KIND_OF_WORK_SCHEMA/);
    expect(strip(readFileSync(join(__dirname, 'entry.service.ts'), 'utf8'))).toMatch(/readTheSituationAndTheKind\(this\.anthropic, description, mode\)/);
  });
});
