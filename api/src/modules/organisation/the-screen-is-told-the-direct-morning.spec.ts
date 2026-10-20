jest.mock('../grounds/people-and-setup', () => ({ ...jest.requireActual('../grounds/people-and-setup'), readPeopleAndSetup: jest.fn(async () => ({ on: true, view: 'lead', people: [{ name: 'Kevin' }] })) }));
jest.mock('../board/my-work', () => ({ ...jest.requireActual('../board/my-work'), readMyWork: jest.fn(async () => ({ on: true, view: 'own', heading: 'Your work' })) }));
jest.mock('../grounds/references-and-resources', () => ({ ...jest.requireActual('../grounds/references-and-resources'), readReferencesAndResources: jest.fn(async () => ({ on: true, view: 'member', sections: [] })) }));

import { withTheDirectMorningSaid } from './the-screen-is-told-the-direct-morning';
import { BoardController } from '../board/board.controller';
import { MyWorkController } from '../board/my-work.controller';
import { TheWeeklyReportController } from '../reports/the-weekly-report.controller';
import { GroundsService } from '../grounds/grounds.service';

/**
 * EACH SCREEN IS TOLD THE DIRECT MORNING, AS ONE YES OR NO, AND NOTHING ELSE CHANGES (Hafsah, 20 October 2026).
 *
 * The board, My work, the weekly report, People and setup, and References and resources each carry `directMorning`, read once
 * per request through the switch. Off, it says false and the payload is otherwise what it was. On, it says true. Who may read
 * what is decided before it, the same either way: a refusal is still a refusal.
 */
const prismaWith = (on: boolean | 'no row') => ({
  ground: { findUnique: jest.fn(async () => ({ organizationId: 'org-drop' })) },
  organization: { findUnique: jest.fn(async () => (on === 'no row' ? null : { directMorningOn: on })) },
  user: { findUnique: jest.fn(async () => ({ awaitingOrgApproval: false })) },
});

describe('withTheDirectMorningSaid', () => {
  it('adds one yes or no to an object, and passes anything else on as it is', () => {
    expect(withTheDirectMorningSaid({ a: 1 }, true)).toEqual({ a: 1, directMorning: true });
    expect(withTheDirectMorningSaid({ a: 1 }, false)).toEqual({ a: 1, directMorning: false });
    expect(withTheDirectMorningSaid(null, true)).toBeNull();
    expect(withTheDirectMorningSaid([1, 2], true)).toEqual([1, 2]);
  });
});

describe.each([
  ['off', false, false],
  ['on', true, true],
  ['with no row for the organisation', 'no row' as const, false],
])('each screen with the direct morning %s', (_name, on, says) => {
  it('the board says it, and its sections are the same sections', async () => {
    const board = { get: jest.fn(async () => ({ renders: true, title: 'Sales team, Q4', sections: [] })) };
    const c = new BoardController(board as any, prismaWith(on) as any);
    const served: any = await c.get('g-sales', 'u-grace');
    expect(served.directMorning).toBe(says);
    expect(served.title).toBe('Sales team, Q4');
  });

  it('My work says it', async () => {
    const c = new MyWorkController({} as any, prismaWith(on) as any);
    const served: any = await c.get('g-sales', 'u-kevin');
    expect(served.directMorning).toBe(says);
    expect(served.heading).toBe('Your work');
  });

  it('the weekly report says it', async () => {
    const weekly = { read: jest.fn(async () => ({ weekStart: '2026-10-12', people: [] })), noteTheLeadRead: jest.fn(async () => undefined) };
    const c = new TheWeeklyReportController(weekly as any, prismaWith(on) as any);
    const served: any = await c.week('g-sales', 'u-grace', 'LEAD', 'org-drop');
    expect(served.directMorning).toBe(says);
    expect(served.weekStart).toBe('2026-10-12');
  });

  it('People and setup, and References and resources, say it after the read rules ran', async () => {
    const svc: any = Object.create(GroundsService.prototype);
    svc.prisma = prismaWith(on);
    svc.assertMaySeeGround = jest.fn(async () => undefined);
    svc.contextEnabled = () => true;
    const people = await svc.peopleAndSetup('g-sales', 'org-drop', 'u-grace');
    expect(svc.assertMaySeeGround).toHaveBeenCalledWith('g-sales', 'u-grace');
    expect(people).toEqual({ on: true, view: 'lead', people: [{ name: 'Kevin' }], directMorning: says });
    const refs = await svc.referencesAndResources('g-sales', 'u-kevin');
    expect(refs).toEqual({ on: true, view: 'member', sections: [], directMorning: says });
  });
});

describe('a reader who may not see the check-in is refused, with the direct morning on', () => {
  it('People and setup refuses before anything is said', async () => {
    const svc: any = Object.create(GroundsService.prototype);
    svc.prisma = prismaWith(true);
    svc.assertMaySeeGround = jest.fn(async () => { throw new Error('Not yours to read'); });
    await expect(svc.peopleAndSetup('g-sales', 'org-drop', 'u-stranger')).rejects.toThrow('Not yours to read');
  });
});

import { needsSaidDirectly } from '../grounds/what-needs-you';

describe('needsSaidDirectly (Today and You, with the direct morning on)', () => {
  it('a check-in’s estimate is "A few minutes." and says nothing about how answers are read; every other need is as it was', () => {
    const needs = [
      { key: 'a', title: 'Your next check-in for Sales team, Q4', detail: 'About ten minutes.' },
      { key: 'b', title: 'Your check-in for Sales team, Q4', detail: 'About ten minutes. Everyone else’s answers are read against yours.' },
      { key: 'c', title: 'Read the report', detail: 'Ready since Monday.' },
      { key: 'd', title: 'Your own report for Sales team, Q4', detail: 'Only you see it.' },
    ];
    expect(needsSaidDirectly(needs)).toEqual([
      { key: 'a', title: 'Your next check-in for Sales team, Q4', detail: 'A few minutes.' },
      { key: 'b', title: 'Your check-in for Sales team, Q4', detail: 'A few minutes.' },
      { key: 'c', title: 'Read the report', detail: 'Ready since Monday.' },
      { key: 'd', title: 'Your own report for Sales team, Q4', detail: null },
    ]);
  });
});
