import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EntryCommitDto } from './entry.controller';

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

  it('still rejects a malformed reportSummary.alignmentStatus (not one of the 5 real values)', async () => {
    const errors = await validateAsPipeline({
      ...basePayload,
      reportSummary: { alignmentStatus: 'NotARealStatus', whatGroundworkSaw: 'x' },
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('a payload with no reportSummary at all (the lead/coordinator path) is still accepted', async () => {
    const errors = await validateAsPipeline({ ...basePayload, brief: 'Context for the lead.' });
    expect(errors).toHaveLength(0);
  });
});
