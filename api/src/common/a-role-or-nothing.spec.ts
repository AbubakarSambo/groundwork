import { PartyType } from '@prisma/client';
import { aRoleOrNothing, theSettersRole } from './a-role-or-nothing';
import { aRoleInTheirOwnWords } from '../modules/grounds/the-leads-words-about-someone';
import { whatToWorkOnNext } from '../modules/reports/what-to-work-on-next';
import { onlyWhatTheySaid } from '../modules/conversation/their-role-in-the-first-check-in';

/**
 * A ROLE IS A ROLE, OR NOTHING (staging test, 15 October 2026). Hafsah set up two check-ins and answered "I own my own
 * 10 deals and the weekly review." and "I sign it off.". Those answers became her role, and her board said "This is
 * session 1 of 56 of your work as i own my own 10". What she reads now, and what is saved.
 */
const HER_ANSWERS = ['I own my own 10 deals and the weekly review.', 'I sign it off.', 'I run the clinic St Mary\'s refers into', 'owns the weekly review', 'Mostly sales, and I do the books on Fridays.'];
const ROLES = ['Head of sales', 'her manager', 'the managing partner', 'Managing partner', 'Operating partner', 'Sales rep in Kilimani', 'Poultry farmer', 'Lead for the Nairobi team'];

const note = (roleAsDescribed: string) => {
  /* As reports.service.ts hands it to the note: the lead's own words, said only when they are a role. */
  const role = aRoleOrNothing(aRoleInTheirOwnWords({ partyType: PartyType.INITIATOR, roleAsDescribed }));
  return whatToWorkOnNext({
    patterns: [], role, roleToSay: role, noticedBehaviour: null, sessionNumber: 1, totalSessions: 56, scenario: 'TEAM_UPDATES',
    waitingOn: [], holdingUp: [], saidSomethingSpecific: true, anythingDocumented: true, detectedFunction: null, functionConfidence: null,
  } as any).whyItMatters;
};

describe('a piece of one of her answers is never her role', () => {
  it.each(HER_ANSWERS)('"%s" is not kept as a role', (said) => {
    expect(aRoleOrNothing(said)).toBeNull();
  });
  it.each(ROLES)('"%s" is kept as a role', (role) => {
    expect(aRoleOrNothing(role)).toBe(role);
  });

  it('setting up the check-in saves no role from her answer, and a real one when she gave it', () => {
    expect(theSettersRole({ report: { yourRole: 'I own my own 10 deals and the weekly review.' } })).toBeNull();
    expect(theSettersRole({ report: { yourRole: 'I sign it off.' }, roleAsDescribed: 'Managing partner' })).toBe('Managing partner');
    expect(theSettersRole({ report: { yourRole: 'Head of sales.' } })).toBe('Head of sales');
  });

  it('her board says "this work", not "your work as i own my own 10", for a role saved before the fix', () => {
    expect(note('I own my own 10 deals and the weekly review.')).toMatch(/^This is check-in 1 of 56 of this work\./);
    expect(note('I sign it off.')).not.toMatch(/your work as/);
    expect(note('Head of sales')).toMatch(/^This is check-in 1 of 56 of your work as head of sales\./);
  });

  it('the first check-in does not take "I sign it off" as what she calls her job', () => {
    expect(onlyWhatTheySaid({ roleName: 'I sign it off' }, ['I sign it off.'])).toEqual({});
    expect(onlyWhatTheySaid({ roleName: 'sales representative' }, ['I am a sales representative in Kilimani.'])).toEqual({ roleName: 'sales representative' });
  });
});
