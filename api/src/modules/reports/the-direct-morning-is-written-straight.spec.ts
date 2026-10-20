import { Logger } from '@nestjs/common';
import { ReportsService, POST_REPORT_GUIDE_PROMPT } from './reports.service';
import { theRoomJudgementTemplate, theJudgementOverARoom, THE_JUDGEMENT_ROOM_KEY } from './the-judgement-over-the-answers';
import {
  withTheDirectMorning, whichDirectBlockRan, THE_DIRECT_TEAM_REPORT, THE_DIRECT_JUDGEMENT, THE_DIRECT_OWN_REPORT, THE_DIRECT_MORNING_BLOCKS,
} from './the-direct-morning-is-written-straight';

/**
 * WHAT THE MODEL IS TOLD, FOR AN ORGANISATION WITH THE DIRECT MORNING ON AND FOR ONE WITH IT OFF (20 October 2026).
 *
 * Each test builds the instruction exactly as the service hands it to the model, from a stored `PromptVersion` where one is
 * active, and reads the assembled text. On: the code's block is the LAST thing in it, after the stored version, so it runs
 * whatever version is stored. Off: not one character changes. No model is called.
 */

const org = (on: boolean) => ({ id: 'org-1', directMorningOn: on });
const STORED_SYNTHESIS = { id: 'pv-synthesis-7', content: 'STORED SYNTHESIS v7. Your job is to produce a report that shows all parties a shared picture. No recommendations for what either person should do.' };

function theSynthesis(on: boolean) {
  const systems: string[] = [];
  const upserts: any[] = [];
  const prisma: any = {
    organization: { findUnique: jest.fn(async () => org(on)) },
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: {
      findUnique: jest.fn(async () => ({ id: 'g1', organizationId: 'org-1', initiatorId: 'init-1', participants: [{ id: 'p1', partyType: 'INITIATOR', roleAsDescribed: 'founder' }] })),
      update: jest.fn(async () => ({})),
    },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org-1' })) },
    groundParticipant: {
      findMany: jest.fn(async (args: any) => (args?.select?.checkIns
        ? [{ id: 'p1', partyType: 'INITIATOR', roleAsDescribed: 'founder', checkIns: [] }]
        : [{ id: 'p1', partyType: 'INITIATOR', roleAsDescribed: 'founder' }])),
      findFirst: jest.fn(async () => null),
    },
    workMention: { findMany: jest.fn(async () => []) },
    recordEntry: { findMany: jest.fn(async () => [{ participant: { id: 'p1' }, type: 'COMMITMENT', text: 'I will call Green Mart on Friday.' }]), count: jest.fn(async () => 1) },
    checkIn: { count: jest.fn(async () => 1), findMany: jest.fn(async () => [{ participantId: 'p1' }]), findFirst: jest.fn(async () => ({ specificityDimensions: null, sessionNumber: 1 })) },
    groundDocument: { count: jest.fn(async () => 0), groupBy: jest.fn(async () => []), findMany: jest.fn(async () => []) },
    patternDetection: { findMany: jest.fn(async () => []) },
    adminProfile: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({})) },
    leadContextNote: { findMany: jest.fn(async () => []) },
    report: { findUnique: jest.fn(async () => null), upsert: jest.fn(async (a: any) => { upserts.push(a); return { id: 'r1' }; }) },
  };
  const prompts: any = { getActive: jest.fn(async (key: string) => { if (key === 'report_synthesis') return STORED_SYNTHESIS; throw new Error('none'); }) };
  const anthropic: any = {
    extract: jest.fn(async (system: string) => { systems.push(system); return { sharedPicture: 's', agreements: [], divergences: [], centralQuestion: 'q' }; }),
    respond: jest.fn(async () => null),
  };
  const service = new ReportsService(prisma, prompts, anthropic, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any, { tell: async () => [] } as any);
  return { run: () => service.synthesize('g1'), systems, upserts };
}

describe('the team report, as the model is told to write it', () => {
  it('on: the stored version runs first, every code block after it, and the direct block last', async () => {
    const { run, systems, upserts } = theSynthesis(true);
    await run();
    const synthesis = systems.find((s) => s.startsWith('STORED SYNTHESIS v7.'))!;
    expect(synthesis).toBeDefined();
    expect(synthesis.endsWith(`\n\n${THE_DIRECT_TEAM_REPORT}`)).toBe(true);
    expect(synthesis.indexOf('SYNTHESIS RULES')).toBeLessThan(synthesis.indexOf('THE DIRECT MORNING.'));
    expect(synthesis).toContain('it overrides every earlier line, stored or not, about voice, style, framing and what may be recommended');
    expect(synthesis).toContain('A recommendation of what to do next is allowed and wanted');
    /* And the report says which stored version ran, and that the direct block ran after it. */
    const data = upserts.find((u) => u?.create?.promptVersionId)?.create;
    expect(data.promptVersionId).toBe('pv-synthesis-7');
    expect(data.engagement.theDirectMorning).toBe(THE_DIRECT_MORNING_BLOCKS);
    /* The judgement written beside it in the same synthesis carries the block too. */
    expect(systems.some((s) => s.includes('You are writing the judgement') && s.endsWith(THE_DIRECT_JUDGEMENT))).toBe(true);
  });

  it('off: the instruction is exactly what it was, with no direct block, and the report records none', async () => {
    const on = theSynthesis(true);
    const off = theSynthesis(false);
    await on.run();
    await off.run();
    const was = off.systems.find((s) => s.startsWith('STORED SYNTHESIS v7.'))!;
    const now = on.systems.find((s) => s.startsWith('STORED SYNTHESIS v7.'))!;
    expect(was).not.toContain('THE DIRECT MORNING');
    expect(now).toBe(`${was}\n\n${THE_DIRECT_TEAM_REPORT}`);
    /* Every other call (the opening written from the facts) is the same text off, and the same text plus the block on. */
    for (const s of off.systems) expect(s).not.toContain('THE DIRECT MORNING');
    const data = off.upserts.find((u) => u?.create?.promptVersionId)?.create;
    expect(data.promptVersionId).toBe('pv-synthesis-7');
    expect('theDirectMorning' in data.engagement).toBe(false);
    expect(on.systems.length).toBe(off.systems.length);
  });
});

function theJudgement(on: boolean, stored: { id: string; content: string } | null) {
  const seen: string[] = [];
  const model = { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null) };
  const prisma: any = new Proxy({
    ground: { ...model, findUnique: jest.fn(async () => ({ organizationId: 'org-1' })) },
    organization: { findUnique: jest.fn(async () => org(on)) },
  }, { get: (t: any, p: string) => (t[p] ??= model) });
  const svc = Object.create(ReportsService.prototype) as any;
  svc.prisma = prisma;
  svc.logger = new Logger('test');
  svc.prompts = { getActive: jest.fn(async (key: string) => { if (stored && key === THE_JUDGEMENT_ROOM_KEY) return stored; throw new Error('none'); }) };
  svc.anthropic = { extract: jest.fn(async (instruction: string) => { seen.push(instruction); return { theGap: 'participant A has said nothing yet.', whatToDo: [], whatTheNumbersSay: [], whatWeFailedToAsk: [], whatThisCannotTellYou: [] }; }) };
  const room = {
    people: [
      { who: 'the initiator', isLead: true, role: null, finding: null, participantId: 'p1' },
      { who: 'participant A', isLead: false, role: null, finding: 'participant A has said nothing yet.', participantId: 'p2' },
    ],
    leadName: 'Wairimu Kamau',
    differences: [],
  };
  return { run: () => svc.judgeTheAnswers('g1', room), seen };
}

describe('the board\'s judgement, as the model is told to write it', () => {
  const CODE = theJudgementOverARoom('whoever called this check-in', 'what to do next about the people and the work it covers', 'Wairimu Kamau');

  it('off, with nothing stored: the code text, exactly, and no block recorded', async () => {
    const { run, seen } = theJudgement(false, null);
    const out = await run();
    expect(seen[0]).toBe(CODE);
    expect(out.judgement.promptVersionId).toBeNull();
    expect('theDirectMorning' in out.judgement).toBe(false);
  });

  it('on, with nothing stored: the code text, then the direct block', async () => {
    const { run, seen } = theJudgement(true, null);
    const out = await run();
    expect(seen[0]).toBe(`${CODE}\n\n${THE_DIRECT_JUDGEMENT}`);
    expect(out.judgement.theDirectMorning).toBe(THE_DIRECT_MORNING_BLOCKS);
  });

  it('on, with a version stored: the stored text runs, and the direct block still comes after it', async () => {
    const content = `${theRoomJudgementTemplate()}\n\nA NEW RULE FOR THIS VERSION.`;
    const { run, seen } = theJudgement(true, { id: 'pv-judgement-2', content });
    const out = await run();
    expect(seen[0]).toContain('A NEW RULE FOR THIS VERSION.');
    expect(seen[0].indexOf('A NEW RULE FOR THIS VERSION.')).toBeLessThan(seen[0].indexOf('THE DIRECT MORNING.'));
    expect(seen[0].endsWith(THE_DIRECT_JUDGEMENT)).toBe(true);
    expect(out.judgement.promptVersionId).toBe('pv-judgement-2');
    expect(out.judgement.theDirectMorning).toBe(THE_DIRECT_MORNING_BLOCKS);
  });

  it('off, with a version stored: the stored text exactly as before', async () => {
    const content = `${theRoomJudgementTemplate()}\n\nA NEW RULE FOR THIS VERSION.`;
    const { run, seen } = theJudgement(false, { id: 'pv-judgement-2', content });
    await run();
    expect(seen[0]).not.toContain('THE DIRECT MORNING');
    expect(seen[0].endsWith('A NEW RULE FOR THIS VERSION.')).toBe(true);
  });
});

describe('the blocks themselves', () => {
  it('off is the prompt, character for character; on is the prompt and the block after it', () => {
    expect(withTheDirectMorning(POST_REPORT_GUIDE_PROMPT, THE_DIRECT_OWN_REPORT, false)).toBe(POST_REPORT_GUIDE_PROMPT);
    expect(withTheDirectMorning(POST_REPORT_GUIDE_PROMPT, THE_DIRECT_OWN_REPORT, true)).toBe(`${POST_REPORT_GUIDE_PROMPT}\n\n${THE_DIRECT_OWN_REPORT}`);
    expect(whichDirectBlockRan(false)).toEqual({});
    expect(whichDirectBlockRan(true)).toEqual({ theDirectMorning: THE_DIRECT_MORNING_BLOCKS });
  });

  it('delete the alignment framing and the hedges, and allow a recommendation', () => {
    for (const block of [THE_DIRECT_TEAM_REPORT, THE_DIRECT_JUDGEMENT]) {
      for (const p of ['a shared picture', 'the gap', 'what the gap reveals', 'the question to carry', 'described differently', 'settled and still open', 'a conversation worth having']) {
        expect(block).toContain(`"${p}"`);
      }
      expect(block).toMatch(/Never these words or ideas/);
      expect(block).toContain('"No recommendations for what either person should do", "Do not say what either person should do next" and "Do not produce a verdict" no longer apply to the work');
      expect(block).toMatch(/Say the fact, or say nothing\./);
    }
  });

  it('keep every wall: labels stay labels, no name is written, no label or score on a person, and the guide still names nobody', () => {
    for (const block of [THE_DIRECT_TEAM_REPORT, THE_DIRECT_JUDGEMENT]) {
      expect(block).toContain('Never write a name yourself');
      expect(block).toMatch(/never a label or score such as "at risk", "underperforming" or "PIP"/);
      expect(block).toContain('It does not change the facts you may use, the fields you return, who reads what, or any earlier rule about quotations, labels, counting accounts, inferences, numbers or what a person said in private.');
      /* No real person's name is in an example, so none can be copied into a stored report. */
      expect(block).not.toMatch(/Grace|Joseph|Kevin|Mercy|Peter|Wanjiru|Brian|Aisha|Njeri|David/);
    }
    expect(THE_DIRECT_OWN_REPORT).toContain('never name anybody else and never quote anybody');
  });
});

describe('each person\'s own guide after the report, as the model is told to write it', () => {
  function theGuide(on: boolean) {
    const seen: string[] = [];
    const anthropic: any = { extract: jest.fn(async (system: string) => { seen.push(system); return { openingLine: 'The Green Mart order is not signed yet.', questionToCarry: 'When will Green Mart sign?', toAcknowledge: 'The order needs a signature by Friday.' }; }) };
    const prisma: any = {
      organization: { findUnique: jest.fn(async () => org(on)) },
      ground: { findUnique: jest.fn(async () => ({ organizationId: 'org-1' })) },
      workMention: { findMany: jest.fn(async () => []) },
      recordEntry: { findMany: jest.fn(async () => [{ type: 'INTENT', text: 'I will get the Green Mart order signed by Friday.' }]) },
      groundParticipant: { findMany: jest.fn(async () => [{ email: 'eric.abbott@meridian.test', user: { firstName: 'Eric', lastName: 'Abbott' } }]) },
      report: { update: jest.fn(async () => ({})) },
    };
    const config: any = { get: jest.fn((key: string) => (key === 'app.postReportGuideEnabled' ? true : undefined)) };
    const service: any = new ReportsService(prisma, {} as any, anthropic, {} as any, config, {} as any, {} as any, { tell: async () => [] } as any);
    return { run: () => service.generatePostReportGuides({ groundId: 'g1', sharedPicture: 'x', agreements: [], divergences: [], centralQuestion: 'q', engagement: {} }, ['p1']), seen };
  }

  it('off: the guide\'s instruction exactly as it was', async () => {
    const { run, seen } = theGuide(false);
    await run();
    expect(seen[0]).toBe(POST_REPORT_GUIDE_PROMPT);
  });

  it('on: the same instruction, its rule against naming anybody kept, and the direct block after it', async () => {
    const { run, seen } = theGuide(true);
    await run();
    expect(seen[0]).toBe(`${POST_REPORT_GUIDE_PROMPT}\n\n${THE_DIRECT_OWN_REPORT}`);
    expect(seen[0]).toContain('NEVER NAME ANYONE AND NEVER QUOTE ANYONE');
  });
});
