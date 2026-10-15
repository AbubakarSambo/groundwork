import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { aLeaveOrganisation, TODAY } from './a-leave-organisation-for-specs';
import { theStepsFor } from './who-may-decide';
import { LEAVE_RULES_REFUSED } from './the-leave-rules';

/**
 * LEAVE BY LENGTH (decision 85, Hafsah's own example: "If it's more than 10 working days, department
 * head also approves"), AS EACH PERSON IS SERVED IT.
 *
 * Leave has thresholds by working days, the way spending has thresholds by amount: each with its own
 * steps, through the same steps and the one resolver (who-may-decide.ts). Baridi Appliances, Monday
 * 5 October 2026: Aisha asks; Wairimu, her manager, approves first; Joseph heads Sales; Grace is an
 * admin; Miriam is a colleague.
 */

const LONGER = { thresholds: [{ above: 10, steps: [['manager', 'admin'], ['departmentHead', 'admin']] }] };
const TWO_DAYS = ['2026-10-12', '2026-10-13'] as const;
const TEN_DAYS = ['2026-10-12', '2026-10-23'] as const;
const TWELVE_DAYS = ['2026-10-12', '2026-10-27'] as const;

/* ------------------------------------------- before and after ------------------------------------------- */

describe('with no thresholds set, leave runs exactly as before, whatever its length', () => {
  /*
   * The table, before and after. "Before" is the call every leave request made until now, with no
   * length: theStepsFor('leave', answers). "After" is the call made now, with the request's working
   * days. With no thresholds, the two are the same for every length.
   */
  const SET = [
    ['no leave rules row', {}],
    ['an empty leave rules row', { rules: {} }],
    ['leave rules with no thresholds', { rules: { tellHr: 'approved', noticeDays: 14 } }],
    ['approval steps set, no thresholds', { workflow: { steps: [['manager', 'admin'], ['hr', 'admin']] }, rules: {} }],
  ] as const;
  const LENGTHS = [1, 2, 5, 10, 11, 15, 30];
  for (const [label, answers] of SET) {
    it.each(LENGTHS)(`${label}: ${'%i'} working days take the same steps as before`, (days) => {
      expect(theStepsFor('leave', answers as any, days)).toEqual(theStepsFor('leave', answers as any));
    });
  }

  it('Aisha’s say-back for twelve days reads as it always did, with no sentence about length', async () => {
    const o = aLeaveOrganisation();
    expect((await o.ask('u-aisha', ...TWELVE_DAYS)).say).toBe(
      'You asked for leave from Monday 12 October to Tuesday 27 October, which is 12 working days. You have 21 days of leave left this year, and nobody else in Sales is off then. Shall I send it to Wairimu to approve?',
    );
  });

  it('Wairimu’s approval of twelve days ends it, and Joseph is never asked', async () => {
    const o = aLeaveOrganisation();
    const { row } = await o.send('u-aisha', ...TWELVE_DAYS);
    await o.leave.decide(o.as('u-wairimu'), row.id, 'approved');
    expect(row.status).toBe('approved');
    expect((await o.leave.mine(o.as('u-aisha'), TODAY)).requests[0].where).toBe('Your leave from Monday 12 October to Tuesday 27 October is approved by Wairimu.');
  });
});

/* ------------------------------------------- with Hafsah's example set ------------------------------------------- */

describe('with "more than 10 working days, the head of the team also approves" set', () => {
  it('the steps, by length: up to ten days the manager alone, above ten the manager and then the head of the team', () => {
    const answers = { rules: LONGER };
    expect([1, 10, 11, 15].map((days) => [days, theStepsFor('leave', answers, days)])).toEqual([
      [1, [['manager', 'admin']]],
      [10, [['manager', 'admin']]],
      [11, [['manager', 'admin'], ['departmentHead', 'admin']]],
      [15, [['manager', 'admin'], ['departmentHead', 'admin']]],
    ]);
  });

  it('above two thresholds, the higher one’s steps', () => {
    const answers = { rules: { thresholds: [...LONGER.thresholds, { above: 20, steps: [['manager', 'admin'], ['departmentHead', 'admin'], ['chiefExecutive', 'admin']] }] } };
    expect(theStepsFor('leave', answers, 21)).toEqual([['manager', 'admin'], ['departmentHead', 'admin'], ['chiefExecutive', 'admin']]);
    expect(theStepsFor('leave', answers, 20)).toEqual([['manager', 'admin'], ['departmentHead', 'admin']]);
  });

  it('Aisha, asking for two days, reads what she always read', async () => {
    const o = aLeaveOrganisation({ rules: LONGER });
    expect((await o.ask('u-aisha', ...TWO_DAYS)).say).toBe(
      'You asked for leave from Monday 12 October to Tuesday 13 October, which is 2 working days. You have 21 days of leave left this year, and nobody else in Sales is off then. Shall I send it to Wairimu to approve?',
    );
  });

  it('Aisha, asking for exactly ten days, is not over it', async () => {
    const o = aLeaveOrganisation({ rules: LONGER });
    expect((await o.ask('u-aisha', ...TEN_DAYS)).say).not.toContain('more than ten working days');
  });

  it('Aisha, asking for twelve days, is told before her yes who approves after Wairimu', async () => {
    const o = aLeaveOrganisation({ rules: LONGER });
    expect((await o.ask('u-aisha', ...TWELVE_DAYS)).say).toBe(
      'You asked for leave from Monday 12 October to Tuesday 27 October, which is 12 working days. You have 21 days of leave left this year, and nobody else in Sales is off then. This is more than ten working days, so Wairimu approves it first, and then Joseph, who heads Sales. Shall I send it to Wairimu to approve?',
    );
  });

  it('Wairimu decides first; after her yes it waits for Joseph, and each reads it in their own words', async () => {
    const o = aLeaveOrganisation({ rules: LONGER });
    const { row, told } = await o.send('u-aisha', ...TWELVE_DAYS);
    expect(told).toBe('I have sent your leave request from Monday 12 October to Tuesday 27 October to Wairimu. It is not approved until they decide, and you will see it under your leave.');
    expect(await o.onTheBoard('u-wairimu', row.id)).toEqual({ where: 'It is waiting for you.', mayDecide: true });
    expect(await o.onTheBoard('u-joseph', row.id)).toEqual({ where: 'It is waiting for Wairimu.', mayDecide: false });

    await o.leave.decide(o.as('u-wairimu'), row.id, 'approved');
    expect(row.status).toBe('waiting');
    expect(await o.onTheBoard('u-joseph', row.id)).toEqual({ where: 'Wairimu has approved it, and it is now waiting for you.', mayDecide: true });
    expect(await o.onTheBoard('u-grace', row.id)).toEqual({ where: 'Wairimu has approved it, and it is now waiting for Joseph, who heads Sales.', mayDecide: false });
    expect((await o.leave.mine(o.as('u-aisha'), TODAY)).requests[0].where).toBe(
      'Your leave from Monday 12 October to Tuesday 27 October is approved by Wairimu and is now waiting for Joseph, who heads Sales.',
    );
    /* Wairimu cannot decide it twice. */
    await expect(o.leave.decide(o.as('u-wairimu'), row.id, 'approved')).rejects.toThrow(ForbiddenException);

    await o.leave.decide(o.as('u-joseph'), row.id, 'approved');
    expect(row.status).toBe('approved');
    expect((await o.leave.mine(o.as('u-aisha'), TODAY)).requests[0].where).toBe('Your leave from Monday 12 October to Tuesday 27 October is approved by Wairimu and Joseph.');
  });

  it('two days, approved by Wairimu, end there: Joseph is never asked', async () => {
    const o = aLeaveOrganisation({ rules: LONGER });
    const { row } = await o.send('u-aisha', ...TWO_DAYS);
    await o.leave.decide(o.as('u-wairimu'), row.id, 'approved');
    expect(row.status).toBe('approved');
  });

  it('Miriam, a colleague, is still refused the board', async () => {
    const o = aLeaveOrganisation({ rules: LONGER });
    await o.send('u-aisha', ...TWELVE_DAYS);
    await expect(o.leave.board(o.as('u-miriam'), TODAY)).rejects.toThrow(ForbiddenException);
  });
});

/* ------------------------------------------- Grace, who sets it ------------------------------------------- */

describe('Grace, an admin, sets leave by length and reads it back', () => {
  it('reads it said back in full sentences, and in the rules history', async () => {
    const o = aLeaveOrganisation();
    const out = await o.suites.setLeaveRules(o.as('u-grace'), LONGER);
    expect(out.rules).toEqual(LONGER);
    expect(out.said).toEqual([
      'There are no kinds of leave set, so every request is simply leave, and each person has 21 days a year.',
      'Leave of more than ten working days goes first to the person’s manager, or else an admin, and then to whoever heads their team, or else an admin.',
      'Shorter leave follows the approval steps as they are.',
      'A rule never stops a request. The person is told when one applies, before they send it, and so is whoever decides it.',
    ]);
    const { changes } = await o.suites.rulesHistory(o.as('u-grace'));
    expect(changes[0].said).toBe('Grace changed the leave rules on 5 October.');
    expect(changes[0].details).toEqual(['This was added. Leave of more than ten working days goes first to the person’s manager, or else an admin, and then to whoever heads their team, or else an admin.']);
  });

  it('is refused lengths that do not make sense, in a plain sentence', async () => {
    const o = aLeaveOrganisation();
    for (const thresholds of [[{ above: 0, steps: [['manager']] }], [{ above: 10, steps: [] }], [{ above: 10, steps: [['manager']] }, { above: 10, steps: [['hr']] }], [{ above: 2.5, steps: [['manager']] }]]) {
      await expect(o.suites.setLeaveRules(o.as('u-grace'), { thresholds })).rejects.toThrow(new BadRequestException(LEAVE_RULES_REFUSED.badThresholds));
    }
  });

  it('clearing it takes every request back to the steps as they are', async () => {
    const o = aLeaveOrganisation({ rules: LONGER });
    expect((await o.suites.setLeaveRules(o.as('u-grace'), { thresholds: null })).rules).toEqual({});
    expect((await o.ask('u-aisha', ...TWELVE_DAYS)).say).not.toContain('Joseph');
  });
});
