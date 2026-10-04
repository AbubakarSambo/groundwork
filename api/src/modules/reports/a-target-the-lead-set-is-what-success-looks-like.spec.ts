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

/** Request 136 item 6: "You have not said it, and nobody answering this check-in has said it either." in a check-in with one person. */
describe('what success looks like, in a check-in of one person', () => {
  const sole = (onlyTheLeadIsHere: boolean) => whereYouAreAgainstWhatYouNamed({
    counting: 'everyone', stated: null, leadHasSaidIt: false, version: null, conditions: [], entries: [], readerIsTheLead: true, leadName: 'Wanjiru', onlyTheLeadIsHere,
  } as any).saying;
  it('does not speak of nobody else answering', () => {
    const said = sole(true) as string;
    expect(said).toBe('You have not said what success looks like yet. It appears here as soon as you do. Until then, the report can say what you have said, but not whether things are going well.');
    expect(said).not.toMatch(/nobody answering/);
  });
  it('still says it for a team', () => {
    expect(sole(false)).toMatch(/nobody answering this check-in has said it either/);
  });
});
