import { GroundScenario } from '@prisma/client';
import { EntryService } from './entry.service';
import { theClassifierPrompt, readTheClassification, THE_SCENARIOS_IN_WORDS } from './which-situation-this-is';
import { whatSetupKnowsNow } from './what-setup-knows';
import { THE_KINDS_IN_WORDS, HOW_A_KIND_IS_CHOSEN, THE_KIND_OF_WORK_PROMPT } from '../board/the-kind-of-work';
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
function aService(modelSays: string) {
  const s = Object.create(EntryService.prototype) as any;
  s.anthropic = { respond: jest.fn().mockResolvedValue(modelSays), extract: jest.fn() };
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
    expect(THE_KIND_OF_WORK_PROMPT).toContain(THE_KINDS_IN_WORDS);
    expect(THE_KIND_OF_WORK_PROMPT).toContain(HOW_A_KIND_IS_CHOSEN);
    expect(THE_KINDS_IN_WORDS).toContain('Choosing between a few options, such as suppliers or vendors, is a decision');
    expect(THE_KINDS_IN_WORDS).toContain('"founder\'s own check-in": a founder, owner or chief executive checking in on their own');
    expect(p).toMatch(/"kind": "<the kind's name exactly as written above, or none>"/);
  });

  it('the setup read is told the situation in those same words', () => {
    expect(THE_SCENARIOS_IN_WORDS.NEW_PROJECT).toBe('Get a new project off to a good start. Get everyone clear on the work, their role, and what needs to happen.');
  });
});

describe('reading the one answer', () => {
  it('keeps a kind only when it is one of the fifteen', () => {
    expect(readTheClassification('{"scenario":"PULSE_CHECK","confidence":"high","kind":"founder\'s own check-in"}')).toEqual({ scenario: 'PULSE_CHECK', confidence: 'high', kind: "founder's own check-in" });
    expect(readTheClassification('{"scenario":"CRISIS_ALIGNMENT","confidence":"high","kind":"none"}')).toEqual({ scenario: 'CRISIS_ALIGNMENT', confidence: 'high' });
    expect(readTheClassification('{"scenario":"CRISIS_ALIGNMENT","confidence":"high","kind":"a supplier review"}')).toEqual({ scenario: 'CRISIS_ALIGNMENT', confidence: 'high' });
  });
});

describe('the door makes one call, and the lead reads the situation it settled', () => {
  it('a supplier to pick is a big decision, with no kind of work, from one call', async () => {
    const s = aService('{"scenario":"CRISIS_ALIGNMENT","confidence":"high","kind":"none"}');
    const r = await s.classifyIntent('we have to pick a new supplier by end of month');
    expect(r).toEqual({ scenario: 'CRISIS_ALIGNMENT', confidence: 'high' });
    expect(s.anthropic.respond).toHaveBeenCalledTimes(1);
    expect(s.anthropic.extract).not.toHaveBeenCalled();
    expect(whatTheLeadReads(r.scenario)).toBe('Work through a big decision');
  });

  it('a rollout across depots is a new project', async () => {
    const r = await aService('{"scenario":"NEW_PROJECT","confidence":"high","kind":"none"}').classifyIntent('rolling out a new stock system across 4 depots');
    expect(whatTheLeadReads(r.scenario)).toBe('Get a new project off to a good start');
  });

  it('a founder\'s own check-in runs as its switchboard row says, keeping a read on live work', async () => {
    const r = await aService('{"scenario":"PULSE_CHECK","confidence":"high","kind":"founder\'s own check-in"}').classifyIntent('founder here, want to keep a read on everything');
    expect(whatTheLeadReads(r.scenario)).toBe('Keep a read on live work');
  });

  it('a kind the same reading names still decides the situation, so the board and the report agree', async () => {
    const r = await aService('{"scenario":"CRISIS_ALIGNMENT","confidence":"low","kind":"support desk"}').classifyIntent('support tickets are piling up and I can\'t see who is on what');
    expect(r).toEqual({ scenario: 'OKR_ALIGNMENT', confidence: 'high' });
    expect(whatTheLeadReads(r.scenario)).toBe('Set goals and keep the team on track');
  });

  it('an engineering release is a new project, as the prototype draws it (Hafsah, 22 November 2026)', async () => {
    const r = await aService('{"scenario":"NEW_PROJECT","confidence":"high","kind":"engineering release"}').classifyIntent('new project kicking off - mobile app release v2');
    expect(r).toEqual({ scenario: 'NEW_PROJECT', confidence: 'high' });
    expect(whatTheLeadReads(r.scenario)).toBe('Get a new project off to a good start');
  });
});
