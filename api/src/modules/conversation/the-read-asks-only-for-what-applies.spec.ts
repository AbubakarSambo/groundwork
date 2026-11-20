/**
 * THE READ ASKS ONLY FOR WHAT APPLIES (end-to-end check of 16 November, M-1; fix plan 17 November, group A).
 *
 * The model refused the assessment's read with 400 INVALID_ARGUMENT in 13 of the conversations of the second end-to-end run, on the real
 * model, after the schema was already cut from 306 to 215 fields. Measured on the real model: the full schema, a sixteen-message
 * conversation with an earlier assessment: refused 7 times in 20; the same conversation with the sections that cannot apply to it left
 * out: refused 0 times in 13. This reads the schema the model is handed, for each kind of conversation, and that the sections a
 * conversation can have are still all there.
 */
import { THE_ASSESSMENT_SCHEMA, theAssessmentSchemaFor } from './the-assessment';
import { assessTheConversation } from './assess-the-conversation';

const keys = (s: any) => Object.keys(s.input_schema.properties);
const size = (n: any): number => (n && typeof n === 'object' ? 1 + (Object.values(n.properties ?? {}) as any[]).reduce((a: number, v: any) => a + size(v), 0) + (n.items ? size(n.items) : 0) : 0);

describe('the schema for one conversation', () => {
  it('a person with nothing to compare against is not asked for setup, the comparison, or a lead\'s own update', () => {
    const s = theAssessmentSchemaFor({ hasSetup: false, compares: false, isTheLead: false });
    expect(keys(s)).not.toEqual(expect.arrayContaining(['setup']));
    expect(keys(s)).not.toContain('comparedWithLastTime');
    expect(keys(s)).not.toContain('herUpdate');
    expect(keys(s)).toContain('aboutTheLead');
    expect(size(s.input_schema)).toBeLessThan(size(THE_ASSESSMENT_SCHEMA.input_schema) * 0.7);
  });

  it('a person with an earlier assessment is asked for the comparison', () => {
    expect(keys(theAssessmentSchemaFor({ hasSetup: false, compares: true, isTheLead: false }))).toContain('comparedWithLastTime');
  });

  it('a lead in setup is asked for setup and her own update, and never for what is said against herself', () => {
    const s = theAssessmentSchemaFor({ hasSetup: true, compares: false, isTheLead: true });
    expect(keys(s)).toEqual(expect.arrayContaining(['setup', 'herUpdate']));
    expect(keys(s)).not.toContain('aboutTheLead');
  });

  it('every other section, and what is required, is always asked for', () => {
    const always = ['summary', 'marks', 'claims', 'promises', 'numbers', 'blockers', 'corrections', 'targets', 'nothingToRecord'];
    for (const o of [{ hasSetup: false, compares: false, isTheLead: false }, { hasSetup: true, compares: true, isTheLead: true }]) {
      const s = theAssessmentSchemaFor(o);
      expect(keys(s)).toEqual(expect.arrayContaining(always));
      expect(s.input_schema.required).toEqual(['summary', 'nothingToRecord']);
    }
    /* The full schema is untouched. */
    expect(keys(THE_ASSESSMENT_SCHEMA)).toEqual(expect.arrayContaining(['setup', 'comparedWithLastTime', 'aboutTheLead', 'herUpdate']));
  });

  it('the assessment hands the model that schema, not the full one', async () => {
    const seen: string[][] = [];
    const prisma: any = {
      checkIn: {
        findUnique: jest.fn(async () => ({
          id: 'ci-1', groundId: 'g', participantId: 'p-sam', sessionNumber: 1, startedAt: new Date(), completedAt: new Date(), whatWeHave: null, sessionReport: null,
          turns: [{ id: 't1', role: 'PERSON', content: 'I sold 20 this week.' }],
          participant: { partyType: 'PARTICIPANT', nameGiven: null, roleAsDescribed: null, user: { firstName: 'Sam', lastName: 'X', jobTitle: 'Sales' } }, ground: { label: 'Sales' },
        })),
        findMany: jest.fn(async () => []),
        update: jest.fn(async () => ({})),
      },
      groundObjective: { findMany: jest.fn(async () => []) },
      groundParticipant: { findMany: jest.fn(async () => []) },
      groundDocument: { findMany: jest.fn(async () => []) },
    };
    const anthropic = { extract: jest.fn(async (_s: string, _h: any[], tool: any) => { seen.push(keys(tool)); return { summary: '', nothingToRecord: [1] }; }) };
    await assessTheConversation({ prisma, anthropic: anthropic as any }, 'ci-1', { howItEnded: 'finished by the person', closedAt: new Date() });
    expect(seen[0]).not.toContain('setup');
    expect(seen[0]).not.toContain('comparedWithLastTime');
    expect(seen[0]).toContain('claims');
  });
});
