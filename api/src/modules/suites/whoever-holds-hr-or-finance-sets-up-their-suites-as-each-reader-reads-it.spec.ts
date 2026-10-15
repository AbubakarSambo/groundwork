import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { aLeaveOrganisation } from './a-leave-organisation-for-specs';
import { REFUSED, RULES_HISTORY_REFUSED } from './suites.service';
import { DUTIES_REFUSED } from './who-holds-each-duty';
import { WORKFLOWS_REFUSED } from './the-approval-steps';
import { LEAVE_RULES_REFUSED } from './the-leave-rules';
import { SPEND_RULES_REFUSED } from './the-spending-rules';

/**
 * WHOEVER HOLDS THE HR OR FINANCE DUTY SETS UP THEIR SUITES (decision 85: "The company/admin/HR/finance
 * lead sets up the rules once"), AS EACH PERSON IS SERVED IT.
 *
 * Baridi Appliances, 5 October 2026. Grace is an admin. Joy, a member, looks after HR, so she sets up
 * leave and performance reviews. Kamau, a lead, looks after finance, so he sets up spending and time
 * sheets. Wairimu is a lead with no duty, Aisha a member with none. Who holds each duty is still set by
 * an admin only.
 */

const DUTIES = { hr: 'u-joy', finance: 'u-kamau', departmentHeads: { Sales: 'u-joseph' } };
const REVIEWS = { on: true, answers: { every: 'Every 6 months', writer: 'Their manager' } };

describe('Joy, a member who looks after HR', () => {
  it('reads on the Suites page only the two suites she sets up, with their questions and answers', async () => {
    const o = aLeaveOrganisation({ duties: DUTIES });
    const page: any = await o.suites.forReader(o.as('u-joy'));
    expect(page.reader).toBe('duty');
    expect(page.youSetUp.map((s: any) => [s.key, s.on])).toEqual([['leave', true], ['reviews', false]]);
    expect(page.youSetUp[0].answers).toEqual({ days: 21, approver: 'Their manager' });
    expect(page.people.map((p: any) => p.name)).toContain('Joseph Mwangi');
  });

  it('switches performance reviews on, and Grace reads it in the rules history as Joy’s change', async () => {
    const o = aLeaveOrganisation({ duties: DUTIES });
    await o.suites.switch(o.as('u-joy'), 'reviews', REVIEWS);
    const { changes } = await o.suites.rulesHistory(o.as('u-grace'));
    expect(changes[0].said).toBe('Joy switched on performance reviews on 5 October.');
    expect(changes[0].by).toBe('Joy');
  });

  it('sets the leave rules and the approval steps for leave, and reads only the steps for leave', async () => {
    const o = aLeaveOrganisation({ duties: DUTIES });
    await o.suites.setLeaveRules(o.as('u-joy'), { thresholds: [{ above: 10, steps: [['manager', 'admin'], ['departmentHead', 'admin']] }] });
    const wf = await o.suites.setWorkflows(o.as('u-joy'), { leave: { escalateAfter: 2 } });
    expect(wf.suites.map((s) => s.key)).toEqual(['leave']);
    expect(wf.suites[0].said).toContain('If the person it waits for has not answered after 2 working days, or is on approved leave that day, it goes to the next person on that step’s list.');
    const { changes } = await o.suites.rulesHistory(o.as('u-grace'));
    expect(changes.map((c) => c.said)).toEqual(['Joy changed the approval steps on 5 October.', 'Joy changed the leave rules on 5 October.']);
  });

  it('reads who holds each duty, to set up her suites, but may not change it', async () => {
    const o = aLeaveOrganisation({ duties: DUTIES });
    expect((await o.suites.duties(o.as('u-joy'))).said).toEqual(['Kamau Njenga looks after finance.', 'Joy Mutua looks after HR.', 'Joseph Mwangi heads Sales.']);
    await expect(o.suites.setDuties(o.as('u-joy'), { hr: 'u-aisha' })).rejects.toThrow(new ForbiddenException(DUTIES_REFUSED.onlyAnAdmin));
  });

  it('may not set up spending, time sheets or any other suite, and is told who may in a plain sentence', async () => {
    const o = aLeaveOrganisation({ duties: DUTIES });
    await expect(o.suites.switch(o.as('u-joy'), 'spend', { on: false })).rejects.toThrow(new ForbiddenException(REFUSED.onlyAnAdminOrFinance));
    await expect(o.suites.switch(o.as('u-joy'), 'todos', { on: true })).rejects.toThrow(new ForbiddenException(REFUSED.onlyAnAdmin));
    await expect(o.suites.spendRules(o.as('u-joy'))).rejects.toThrow(new ForbiddenException(SPEND_RULES_REFUSED.onlyAnAdmin));
    await expect(o.suites.setWorkflows(o.as('u-joy'), { spend: { escalateAfter: 2 } })).rejects.toThrow(new ForbiddenException(WORKFLOWS_REFUSED.notYourSuite));
    await expect(o.suites.setWorkflows(o.as('u-joy'), { leave: { escalateAfter: 2 }, time: { escalateAfter: 2 } })).rejects.toThrow(new ForbiddenException(WORKFLOWS_REFUSED.notYourSuite));
    await expect(o.suites.rulesHistory(o.as('u-joy'))).rejects.toThrow(new ForbiddenException(RULES_HISTORY_REFUSED));
  });

  it('is checked as an admin is: answers that do not make sense are refused', async () => {
    const o = aLeaveOrganisation({ duties: DUTIES });
    await expect(o.suites.switch(o.as('u-joy'), 'reviews', { on: true, answers: { every: 'Sometimes' } })).rejects.toThrow(BadRequestException);
  });
});

describe('Kamau, a lead who looks after finance', () => {
  it('reads the lead’s page, and the two suites he sets up', async () => {
    const o = aLeaveOrganisation({ duties: DUTIES });
    const page: any = await o.suites.forReader(o.as('u-kamau'));
    expect(page.reader).toBe('lead');
    expect(page.suites.map((s: any) => s.key)).toEqual(['leave']);
    expect(page.youSetUp.map((s: any) => s.key)).toEqual(['time', 'spend']);
  });

  it('sets the spending rules, and may not touch leave', async () => {
    const o = aLeaveOrganisation({ duties: DUTIES });
    expect((await o.suites.setSpendRules(o.as('u-kamau'), { categories: [{ name: 'Fuel' }] })).rules).toEqual({ categories: [{ name: 'Fuel' }] });
    await expect(o.suites.leaveRules(o.as('u-kamau'))).rejects.toThrow(new ForbiddenException(LEAVE_RULES_REFUSED.onlyAnAdmin));
    await expect(o.suites.switch(o.as('u-kamau'), 'leave', { on: false })).rejects.toThrow(new ForbiddenException(REFUSED.onlyAnAdminOrHr));
  });
});

describe('everybody else is served exactly what they were before', () => {
  it('Wairimu, a lead with no duty, reads the lead’s page with nothing to set up, and is refused every setter', async () => {
    const o = aLeaveOrganisation({ duties: DUTIES });
    expect(await o.suites.forReader(o.as('u-wairimu'))).toEqual({ reader: 'lead', suites: [{ key: 'leave', name: expect.any(String), line: expect.any(String) }] });
    await expect(o.suites.switch(o.as('u-wairimu'), 'leave', { on: false })).rejects.toThrow(new ForbiddenException(REFUSED.onlyAnAdminOrHr));
    await expect(o.suites.leaveRules(o.as('u-wairimu'))).rejects.toThrow(ForbiddenException);
    await expect(o.suites.duties(o.as('u-wairimu'))).rejects.toThrow(new ForbiddenException(DUTIES_REFUSED.onlyAnAdmin));
    await expect(o.suites.workflows(o.as('u-wairimu'))).rejects.toThrow(new ForbiddenException(WORKFLOWS_REFUSED.onlyAnAdmin));
  });

  it('Aisha, a member with no duty, is refused the page', async () => {
    const o = aLeaveOrganisation({ duties: DUTIES });
    await expect(o.suites.forReader(o.as('u-aisha'))).rejects.toThrow(new ForbiddenException(REFUSED.onlyAdminsAndLeads));
  });

  it('Grace, an admin, still sets up every suite and reads every step', async () => {
    const o = aLeaveOrganisation({ duties: DUTIES });
    expect((await o.suites.workflows(o.as('u-grace'))).suites.map((s) => s.key)).toEqual(['leave', 'time', 'spend']);
    await o.suites.switch(o.as('u-grace'), 'reviews', REVIEWS);
  });
});
