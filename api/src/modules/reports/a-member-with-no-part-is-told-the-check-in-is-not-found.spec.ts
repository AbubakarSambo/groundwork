import { makeService, theCohort } from './__fixtures__/a-cohort-for-the-session-report';

/**
 * A MEMBER WITH NO PART IN A CHECK-IN IS TOLD "That check-in could not be found, so go back to your check-ins and open it from the list.", EVEN BEFORE ITS REPORT EXISTS (second review, new leak B; GW-PRI-04).
 *
 * With no report written yet, the read counted any member of the organisation as "mine" and told them "The report is written once
 * everybody has answered. Four people have not finished yet. You will be emailed when it is ready." Every other route says "Check-in
 * not found". Read through the real service, as the person who is in it, an admin, and a member who is not.
 */
const noReportYet = (scenario = 'COHORT_CHECK') => ({ ...theCohort(scenario), report: null });

describe('the report of a check-in that has none yet', () => {
  it('a member of the organisation with no part in it is told "That check-in could not be found, so go back to your check-ins and open it from the list."', async () => {
    await expect(makeService(noReportYet(), { userRole: 'MEMBER' }).get('g1', 'user-stranger', 'org-1')).rejects.toThrow('That check-in could not be found, so go back to your check-ins and open it from the list.');
  });

  it('a person in it is told when it will be written, as before', async () => {
    await expect(makeService(noReportYet()).get('g1', 'user-kwame', 'org-1')).rejects.toThrow(/There is no report yet/);
  });

  it('an admin of the organisation, who may read a cohort check-in, is told that too', async () => {
    await expect(makeService(noReportYet(), { userRole: 'ADMIN' }).get('g1', 'user-admin', 'org-1')).rejects.toThrow(/There is no report yet/);
  });

  it('an admin without access to a first 90 days is told "That check-in could not be found, so go back to your check-ins and open it from the list."', async () => {
    await expect(makeService(noReportYet('PIP'), { userRole: 'ADMIN' }).get('g1', 'user-admin', 'org-1')).rejects.toThrow('That check-in could not be found, so go back to your check-ins and open it from the list.');
  });
});
