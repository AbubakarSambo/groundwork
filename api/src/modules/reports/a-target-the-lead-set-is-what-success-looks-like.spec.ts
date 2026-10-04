import { readFileSync } from 'fs';
import { join } from 'path';
import { whereYouAreAgainstWhatYouNamed } from './where-you-are-against-what-you-named';

/** Request 132 (g): "No standard is set. You have not said what success looks like" while the lead had set 6,000. */
const read = (stated: string | null) => whereYouAreAgainstWhatYouNamed({
  counting: 'everyone', stated, leadHasSaidIt: false, version: null, conditions: [], entries: [], readerIsTheLead: true, leadName: 'Wanjiru',
  // a person's own answer, so the section is read at all
} as any).saying;

describe('the section "What everybody said good looks like", as the lead reads it', () => {
  it('does not say no standard is set once the target is given as the standard', () => {
    const said = read('The plan is to have reached 6,000 farmers by now.');
    expect(said).not.toMatch(/No standard is set|have not said what success looks like/);
  });
  it('the report reads the lead\'s team target as the standard, for the lead only', () => {
    const src = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8');
    expect(src).toMatch(/theTargetTheLeadSet = !\(baseline\?\.successLooksLike \?\? ''\)\.trim\(\) && isInitiator/);
    expect(src).toMatch(/stated: baseline\?\.successLooksLike \?\? theTargetTheLeadSet \?\? null/);
  });
});
