import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * EVERY EMPTY STATE POINTED AT A CONTROL THAT WAS NOT THERE.
 *
 * Item B on the Context fix list. The page could change a line of what a check-in knows, share it,
 * make it private and retire it, and could not create one: every line arrived through the context
 * chat. On a check-in where the chat is off, the lead read five empty buckets each saying "say it in
 * the conversation at the top", with no conversation at the top.
 *
 * THE CHAT IS STILL THE WAY IN. That decision stands - it asks the follow-up a form cannot, and a
 * line that arrives with nothing around it is worth less. This is the door for when there is no
 * chat, and the page offers it only then.
 */
const SERVICE = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8');
const CONTROLLER = readFileSync(join(__dirname, 'grounds.controller.ts'), 'utf8');
const PAGE = readFileSync(join(__dirname, '../../../../client/src/components/gw/ContextPage.tsx'), 'utf8');

describe('adding one line of what a check-in knows', () => {
  it('has a route at all, which it did not', () => {
    expect(CONTROLLER).toMatch(/@Post\(':id\/context'\)/);
    expect(CONTROLLER).toMatch(/class AddContextLineDto \{/);
    expect(SERVICE).toMatch(/async addContextLine\(/);
  });

  /* The same permission as changing one: the lead, or an admin standing in for them. */
  it('and belongs to whoever runs the check-in', () => {
    const fn = SERVICE.slice(SERVICE.indexOf('async addContextLine('), SERVICE.indexOf('async changeContextLine('));
    expect(fn).toMatch(/ground\.initiatorId !== requestingUserId && !adminsThisOrg\(viewer, ground\)/);
    expect(fn).toMatch(/can add what it knows/);
  });

  /*
   * A LINE ABOUT A PERSON CANNOT BE TYPED IN AT ALL.
   *
   * `ABOUT_A_PERSON` is the lead's read of somebody, never shared and never quoted, and it belongs
   * to a conversation that can ask what it rests on. Refused rather than accepted and hidden, which
   * is how a form becomes a way to file opinions about people.
   */
  it('and never about a person', () => {
    const fn = SERVICE.slice(SERVICE.indexOf('async addContextLine('), SERVICE.indexOf('async changeContextLine('));
    expect(fn).toMatch(/ABOUT_SOMEBODY\.has\(kind as any\)/);
    expect(fn).toMatch(/WHY_A_LINE_ABOUT_SOMEBODY_STAYS_YOURS/);
    /* And the route will not even accept the word. */
    expect(CONTROLLER).toMatch(/@IsIn\(\['STRATEGY', 'WAY_OF_WORKING', 'DECISION', 'UNSETTLED', 'NOTE'\]\)/);
  });

  /* The same door every other writer goes through - ended, held, or out of time. */
  it('and refuses on a check-in nothing can be added to', () => {
    const fn = SERVICE.slice(SERVICE.indexOf('async addContextLine('), SERVICE.indexOf('async changeContextLine('));
    expect(fn).toMatch(/const refused = whyItRefuses\(ground\.status, ground\.endState/);
  });

  /* Typed, not heard and not pasted, and the record says which. */
  it('and the record says it was typed in', () => {
    const fn = SERVICE.slice(SERVICE.indexOf('async addContextLine('), SERVICE.indexOf('async changeContextLine('));
    expect(fn).toMatch(/source: 'TYPED'/);
    expect(fn).toMatch(/authorUserId: requestingUserId/);
  });
});

describe('and the page offers it only where there is no conversation', () => {
  it('the typing block is behind the chat being off', () => {
    expect(PAGE).toMatch(/\{isTheLead && !contextEnabled && \(/);
    expect(PAGE).toMatch(/addLine\.mutate\(\{ kind: typingInto, text: lineDraft \}\)/);
  });

  /* And the block that says "say it in the conversation" still only shows when there is one. */
  it('and the say-it-in-the-chat block still needs a chat', () => {
    expect(PAGE).toMatch(/\{isTheLead && contextEnabled && \(/);
    const at = PAGE.indexOf('Say any of these in the conversation at the top');
    expect(at).toBeGreaterThan(-1);
    const before = PAGE.slice(Math.max(0, at - 900), at);
    expect(before).toContain('isTheLead && contextEnabled');
  });
});
