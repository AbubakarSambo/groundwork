import { readFileSync } from 'fs';
import { join } from 'path';

/*
 * `whoIsReadingIt` is handed the ground through `as any`, so a field the query never selected is
 * not a type error - it arrives undefined, and undefined is falsy. initiatorId was missing from the
 * open path's select, so every lead opening their own check-in read as isLead false and was handed
 * the narrowed participant view of targets they set themselves, with "everybody's own number is
 * their own" said back to them. Seen live on a second check-in. whoSeesTargets was missing the same
 * way, so a check-in set so everybody sees every number was still read under the narrow rule.
 *
 * Source-asserted because the cast is what removed the compiler's opinion. Comments are stripped
 * first, so an explanation of the rule cannot stand in for the rule.
 */
describe('the lead is not a stranger to their own targets', () => {
  const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('there is one place the brief is read from, not two that can disagree', () => {
    expect(src).toMatch(/const WHAT_THE_BRIEF_IS_READ_FROM = \{/);
  });

  for (const field of ['initiatorId', 'whoSeesTargets', 'objectives']) {
    it(`and it fetches ${field}, which briefFor needs to answer correctly`, () => {
      const shape = src.split('const WHAT_THE_BRIEF_IS_READ_FROM = {')[1]?.split('} as const;')[0] ?? '';
      expect(shape).toContain(`${field}:`);
    });
  }

  it('every read that feeds a brief spreads it rather than listing its own fields', () => {
    const spreads = src.split('...WHAT_THE_BRIEF_IS_READ_FROM').length - 1;
    const callsBriefFor = src.split('this.briefFor(').length - 1;
    /*
     * Two reads feed briefFor - opening a session and loading a transcript - and both spread the
     * constant. Other ground reads in this file fetch targets for other reasons; they are not
     * asserted here, because it is briefFor's `as any` that makes a missing field silent.
     */
    expect(spreads).toBeGreaterThanOrEqual(2);
    expect(callsBriefFor).toBeGreaterThan(0);
  });
});
