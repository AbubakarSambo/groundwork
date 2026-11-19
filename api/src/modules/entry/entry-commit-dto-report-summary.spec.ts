import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as fs from 'fs';
import * as path from 'path';
import { EntryCommitDto } from './entry.controller';
import { theReportAsItIsKept } from './the-report-as-it-is-kept';

/**
 * GW-REPORTSUMMARY-DTO-DRIFT tripwire.
 *
 * The client has sent `reportSummary` (not `report`) in the commit payload
 * since 2026-06-24 (e078b0d), and entry.service.ts's commit() has read it
 * since 2026-07-16 (909b087) - but EntryCommitDto never grew a matching
 * field. The app's global ValidationPipe runs with
 * { whitelist: true, forbidNonWhitelisted: true } (main.ts), so every real
 * commit carrying reportSummary - i.e. every commit where the committer
 * completed their own check-in session before saving, the majority path -
 * 400'd with "property reportSummary should not exist" and no ground was
 * ever created. This replicates the actual ValidationPipe behavior
 * (plainToInstance + validate, not just constructing the class), because a
 * bare unit test against the class alone would not have caught this - the
 * whitelist violation only happens at the transform/validate boundary.
 */
async function validateAsPipeline(plain: Record<string, unknown>) {
  const instance = plainToInstance(EntryCommitDto, plain, { excludeExtraneousValues: false });
  return validate(instance as object, { whitelist: true, forbidNonWhitelisted: true });
}

describe('GW-REPORTSUMMARY-DTO-DRIFT: EntryCommitDto accepts the real client payload shape', () => {
  const basePayload = {
    groundLabel: 'A real ground',
    history: [{ role: 'user', content: 'hi' }],
    contributors: [],
  };

  it('accepts a commit payload WITH reportSummary - the exact shape the client sends after completing a check-in', async () => {
    const errors = await validateAsPipeline({
      ...basePayload,
      reportSummary: { alignmentStatus: 'Clear', whatGroundworkSaw: 'Both sides agree on scope.' },
    });
    expect(errors).toHaveLength(0);
  });

  it('still rejects a genuinely unknown property (the whitelist itself still works)', async () => {
    const errors = await validateAsPipeline({
      ...basePayload,
      somethingThatShouldNeverExist: 'nope',
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(JSON.stringify(errors)).toMatch(/somethingThatShouldNeverExist/);
  });

  /*
   * Updated 19 November 2026 (Hafsah's screenshot: Clinton's "Save this" answered "Something you sent could not be used"). This
   * test used to say a report with an unknown status REFUSES the save. The person did not type the report, the model wrote it, so
   * refusing the save for it leaves them stuck with nothing to correct. The save takes it, and the server gives it its shape.
   */
  it('a report the model wrote oddly never refuses the save', async () => {
    const errors = await validateAsPipeline({
      ...basePayload,
      reportSummary: {
        alignmentStatus: 'clear',
        whatGroundworkSaw: 'x'.repeat(7000),
        yourRole: 'r'.repeat(600),
        confidence: 0.4,
        areasRequiringAlignment: [{ title: null, observation: 'Who signs off', whyItMatters: null, recommendedMove: 'Ask.', severity: 'high' }],
        mentionedPeople: [{ name: 'Tolu', context: null, kind: 'colleague' }, { name: null }],
        honestClose: null,
        leadsReveal: null,
      },
    });
    expect(errors).toHaveLength(0);
  });

  it('and the server gives that report its one shape: known fields as text, everything else left out', () => {
    const kept = theReportAsItIsKept({
      alignmentStatus: 'clear',
      whatGroundworkSaw: 'It is clear who owns the launch.',
      confidence: 0.4,
      areasRequiringAlignment: [{ title: null, observation: 'Who signs off', whyItMatters: null, recommendedMove: 'Ask.', severity: 'high' }, 'not a row'],
      mentionedPeople: [{ name: 'Tolu', context: null, kind: 'colleague' }, { name: null }],
      honestClose: null,
    })!;
    expect(kept.alignmentStatus).toBe('Clear');
    expect(kept.areasRequiringAlignment).toEqual([{ observation: 'Who signs off', whyItMatters: '', recommendedMove: 'Ask.' }]);
    expect(kept.mentionedPeople).toEqual([{ name: 'Tolu', context: '' }]);
    expect(kept.honestClose).toEqual({ aligned: '', open: '', revisit: '', risk: '' });
    expect(kept).not.toHaveProperty('confidence');
    expect(theReportAsItIsKept(undefined)).toBeUndefined();
  });

  it('a whole report passes through unchanged', () => {
    const whole = {
      whatGroundworkSaw: 'Both sides agree on scope.', yourRole: 'her manager', alignmentStatus: 'Mixed' as const, alignmentBasis: 'Two of three points.',
      areasRequiringAlignment: [{ title: 'Sign-off', observation: 'o', whyItMatters: 'w', recommendedMove: 'm' }],
      alignmentReached: [{ title: 'Scope', note: 'n' }],
      honestClose: { aligned: 'a', open: 'o', revisit: 'r', risk: 'k' },
      mentionedPeople: [{ name: 'Tolu', context: 'runs finance' }], suggestedParties: [{ role: 'CFO', reason: 'pays' }],
      alsoCameUp: [{ name: 'Kilele', context: 'a client' }], alsoCameUpNote: 'A note.', leadsReveal: { lines: ['one'] },
    };
    expect(theReportAsItIsKept(whole)).toEqual(whole);
  });

  /* THE SAME FAULT FROM THE OTHER SIDE. The screen sent `inviteNote` on every save where the lead had typed a note beside the
     link, and no route on the server has ever taken it, so the pipe refused the whole save for it. Every key the screen's save
     sends is one the route declares. */
  it('every key the screen sends on a save is one the route takes', () => {
    const page = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'enter', 'EntryChatPage.tsx'), 'utf8');
    const from = page.indexOf('function buildCommitPayload(');
    const built = page.slice(from, page.indexOf('\n  }\n', from)).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const sent = [...built.matchAll(/^ {8}(\w+)[:,]/gm)].map((m) => m[1]);
    expect(sent).toEqual(expect.arrayContaining(['groundLabel', 'contributors', 'reportSummary']));
    const controller = fs.readFileSync(path.join(__dirname, 'entry.controller.ts'), 'utf8');
    const dto = controller.slice(controller.indexOf('export class EntryCommitDto {'), controller.indexOf('export class PeopleOnLinesDto'));
    expect(sent.filter((k) => !new RegExp(`\\b${k}\\??: `).test(dto))).toEqual([]);
  });

  it('a payload with no reportSummary at all (the lead/coordinator path) is still accepted', async () => {
    const errors = await validateAsPipeline({ ...basePayload, brief: 'Context for the lead.' });
    expect(errors).toHaveLength(0);
  });
});
