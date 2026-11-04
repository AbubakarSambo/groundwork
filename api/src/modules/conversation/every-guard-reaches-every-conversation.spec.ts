import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A GUARD THAT REACHES ONE PATH IS A GUARD THAT REACHES NOBODY IN PARTICULAR.
 *
 * Three times in one evening, a fix was written correctly and landed somewhere the person never
 * goes:
 *
 *   - `/start?new=1` made the page ask instead of silently restoring a stale setup. It worked. The
 *     three "Start a check-in" buttons on the check-ins list never passed it.
 *   - The extraction that turns "500 contracts" into a target had run on the signed-in check-in
 *     since it was written. The entry commit - the path every lead takes first - never called it.
 *   - Five shape guards, each built from a fault a lead hit on a real screen, all wired into
 *     conversation.service. The entry chat ran the invention screen and nothing else.
 *
 * Each was found by running the product, and each could have been found by this file.
 *
 * THERE ARE TWO CONVERSATIONS IN THIS PRODUCT and a person meets the entry one first. Anything worth
 * guarding in one is worth guarding in the other, so this asserts the list rather than trusting that
 * whoever adds the sixth guard remembers there are two places to put it.
 *
 * WHAT "REACHES" MEANS IS DELIBERATELY WEAK. The signed-in path can ask the model again; the entry
 * path usually cannot, because the stream has left, so it names the fault in a log instead. Both
 * count. What does not count is the guard existing and the path never mentioning it.
 */
describe('every guard reaches every conversation', () => {
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const checkIn = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
  const entry = strip(readFileSync(join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8'));

  /* Every shape guard over what a reply looks like. Add a guard, add it here. */
  const GUARDS = [
    'isADeadEnd',
    'opensByRepeatingThem',
    'theyPushedBackOnTheQuestions',
    'alreadyAskedTwice',
    'isAVerdictAboutSomebodyElse',
    'isAnEssay',
    'screen',
  ];

  it.each(GUARDS)('%s is reached by the signed-in check-in', (guard) => {
    expect(checkIn).toContain(`${guard}(`);
  });

  /*
   * CHANGED 4 November 2026 (fix plan, release batch 1, group 5). The entry chat only logged five of these after its reply had gone, and
   * round 39's leads still said setup asked the same things again and again: the word matchers are removed from the setup path, which is
   * told what setup knows instead. The invention screen, which drops a sentence before it is shown, still runs there.
   */
  it('the entry chat keeps the invention screen and no longer reads its replies with word matchers after the fact', () => {
    expect(entry).toContain('screen(');
    for (const guard of GUARDS.filter((g) => g !== 'screen')) expect(entry).not.toContain(`${guard}(`);
  });

  it('and the list is not empty, so an accident cannot make this pass', () => {
    expect(GUARDS.length).toBeGreaterThanOrEqual(5);
  });

  /**
   * THE GIVE-BACKS ARE NOT IN THAT LIST, ON PURPOSE.
   *
   * They hand somebody a fact off the board: who else is waiting on this, where their own number
   * leaves them, what they have already said about the person they just named. On the entry chat
   * there is no board. No ground exists yet, nobody else has checked in, and no target has been
   * written, so every one of them would have nothing to offer and would be a query returning empty
   * on every turn of the first conversation.
   *
   * Written down because the rule above says a guard belongs on both paths, and somebody reading it
   * would otherwise reasonably conclude these were forgotten too. They were not. If the entry chat
   * ever runs a session where a board already exists, this becomes wrong and should be revisited.
   */
  it('the give-backs are deliberately absent from the entry chat, which has no board to draw on', () => {
    const GIVE_BACKS = ['oneThingBack', 'whatIsWorthSaying', 'whereThatLeavesThem', 'whatIsAlreadyOnThem'];
    for (const g of GIVE_BACKS) expect(checkIn).toContain(`${g}(`);
    for (const g of GIVE_BACKS) expect(entry).not.toContain(`${g}(`);
  });
});
