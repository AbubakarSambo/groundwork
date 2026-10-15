import { describe, it, expect } from 'vitest'
import { opensStraightOnTheQuestion, justTheQuestion, whereTheLinkGoes } from './the-link-opens-on-the-question'

describe('the link opens on the question', () => {
  it('skips the accept screen for a team update, and for nothing else', () => {
    expect(opensStraightOnTheQuestion('TEAM_UPDATES')).toBe(true)
    expect(opensStraightOnTheQuestion('GOAL_ALIGNMENT')).toBe(false)
    expect(opensStraightOnTheQuestion(null)).toBe(false)
  })

  /* Somebody being asked about work involving a colleague reads what happens to their words first. */
  it('sends a team update to a bare chat and everyone else to the ordinary one', () => {
    expect(whereTheLinkGoes('c1', 'TEAM_UPDATES')).toBe('/checkin/c1?just=1')
    expect(whereTheLinkGoes('c1', 'ROLE_HANDOVER')).toBe('/checkin/c1')
  })

  it('and the mark on the address is what makes it bare', () => {
    expect(justTheQuestion('?just=1')).toBe(true)
    expect(justTheQuestion('?just=0')).toBe(false)
    expect(justTheQuestion('')).toBe(false)
  })
})

/** 21 Sep 2026: opened from an inbox in a browser with no session, the one-line link spun on "Opening your question" for ever. */
describe('the one-line link opens the question on every visit', () => {
  it('accept() is called whether or not the link was accepted before, and the spinner ends with the mutation', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'InvitePage.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    /* `straightToTheReport` joined it on 22 Sep 2026: a report link for somebody who answered through an open link goes straight through too. */
    expect(src).toMatch(/if \(preview && \(opensStraightOnTheQuestion\(preview\.scenario\) \|\| straightToTheReport\) && accept\.isIdle\) \{\s*accept\.mutate\(\)/);
    expect(src).not.toMatch(/&& !preview\.alreadyAccepted && accept\.isIdle/);
    /* U.3: "waiting" left the page, because waiting for an admin is its own page now (/join/waiting). */
    expect(src).toMatch(/\(opensStraightOnTheQuestion\(preview\.scenario\) \|\| straightToTheReport\) && !failed && !emailedTo && \(accept\.isPending \|\| accept\.isIdle \|\| accept\.isSuccess\)/);
  });
  it('and the server signs the link\'s own recipient in again for that situation', () => {
    const svc = require('fs').readFileSync(require('path').join(__dirname, '../../../../api/src/modules/participants/participants.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(svc).toMatch(/if \(user && ground\.scenario === GroundScenario\.TEAM_UPDATES && theirOpenCheckIn\) \{\s*const accessToken = this\.jwt\.sign\(sessionClaims\(user, 'link'\)\);/);
  });
});
