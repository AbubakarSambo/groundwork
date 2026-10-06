import type { ThePeopleStepRules, TheAnchorInvitation } from './the-anchor-served-shapes';

/**
 * THE PEOPLE STEP'S RULES AND THE TEAM'S INVITATION (docs/anchor-scenario.md, sections 13 and 14; decision 96,
 * items 1, 3 and 8; request 149). Fixed words, the same for every lead, except the lead's own first name.
 */

/** 20 includes the lead: the lead plus 19 (decision 96, item 3). */
export const THE_PEOPLE_STEP_RULES: ThePeopleStepRules = {
  limit: 20,
  theLeadCounts: true,
  mayAdd: 19,
  heading: 'Who needs to be part of this?',
  intro: 'Add up to 20 people. They don’t need to report directly to you. They simply need to be part of the work you’re trying to move.',
  contextLabel: 'What do they do / why are they part of this?',
  button: 'Start my Groundwork.',
  limitSentence: 'This one-month Groundwork holds 20 people, and you are one of them, so you can add 19 more.',
};

/**
 * THE LIMIT, HELD WHEN THE PEOPLE STEP IS COMMITTED (decision 99, item 2). The lead plus 19. The people are counted once
 * each, by address, and the lead's own address is not counted again. Past the limit the commit is refused with a plain
 * sentence that says how many to take off.
 */
export function tooManyForTheAnchor(emails: string[], leadEmail?: string | null): string | null {
  const lead = (leadEmail ?? '').trim().toLowerCase();
  const added = new Set(emails.map((e) => (e ?? '').trim().toLowerCase()).filter((e) => e && e !== lead)).size;
  if (added <= THE_PEOPLE_STEP_RULES.mayAdd) return null;
  const over = added - THE_PEOPLE_STEP_RULES.mayAdd;
  return `${THE_PEOPLE_STEP_RULES.limitSentence} You have added ${added}, so please take ${over === 1 ? 'one person' : `${over} people`} off before you start.`;
}

/**
 * The invitation. Line one says "one to one", not "privately" (decision 96, item 1). Line two says the lead has
 * shared what she is trying to get across only when that has happened, and otherwise that she wants to hear
 * their side (item 8). Nothing records that she has shared it yet, so that is always false for now.
 */
export function theAnchorInvitation(leadFirstName: string | null, leadHasShared = false): TheAnchorInvitation {
  const lead = (leadFirstName ?? '').trim();
  const she = lead || 'Your lead';
  return {
    subject: `${she} is trying a different way to help the team get on the same page.`,
    heading: `${she} is trying a different way to help the team get on the same page.`,
    lines: [
      'For the next month, Groundwork will check in with each person one to one about the work you’re doing, what you’re seeing, what’s getting in the way and how it connects to the bigger picture.',
      leadHasShared
        ? `${she} has shared what they are trying to get across. Groundwork now wants to understand your side too.`
        : `${she} wants to hear your side.`,
      'There aren’t right answers. The point is to help the team understand one another better and make the work move.',
    ],
    leadHasSharedWhatTheyAreSeeing: leadHasShared,
    button: 'Start your first check-in',
  };
}
