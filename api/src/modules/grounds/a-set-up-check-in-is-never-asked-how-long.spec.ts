import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contextGaps } from './the-context-chat';

/* Comments are taken out before anything is matched, so a sentence in a comment cannot satisfy a check (a-guard-that-a-comment-satisfies-is-not-a-guard). */
const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');


/**
 * NIGHT QUALITY RUN 1, THE LEAD'S WALK. Esther opened "Add context" on her weekly check-in, already set up
 * with four people in it, and was asked first "How long should this run? You can give an end date or a
 * number of weeks." Her check-in had a weekly rhythm but no length chosen, so the gap came back. A
 * check-in somebody already has a session in is never asked how long it runs.
 */
describe('a set-up check-in is never asked how long it runs', () => {
  const esthers = { targetCount: 1, scenario: 'HELP_TEAM_UNDERSTAND', timelineDays: null, runsUntilEnded: false, cadence: 'WEEKLY', successLooksLike: 'every sale verifiable', partyCount: 5 } as any;

  it('never opens with the question Esther read', () => {
    const asks = contextGaps({ ...esthers, alreadySetUp: true }).map((g) => g.ask);
    expect(asks.join(' ')).not.toContain('How long should this run?');
  });

  it('a check-in still being set up is still asked', () => {
    expect(contextGaps({ ...esthers, alreadySetUp: false })[0].ask).toContain('How long should this run?');
  });

  it('both places that read the gaps say whether it is set up', () => {
    const src = withoutComments(readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8'));
    expect(src.match(/alreadySetUp: \(await \(this\.prisma\.checkIn\?\.count\?\.\(\{ where: \{ groundId, isSetup: false \} \}\)/g)?.length).toBe(2);
  });
});
