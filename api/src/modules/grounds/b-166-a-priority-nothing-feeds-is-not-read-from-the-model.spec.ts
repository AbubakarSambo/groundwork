import { buildPicture, type PictureInput } from './the-company-picture';

/** B-166: under all four priorities, "This priority is not moving because no teams are working on it. To make progress, teams would need to start checking in their work against it." */
const priorities: PictureInput['priorities'] = [
  { id: 's1', number: 1, title: 'Grow revenue', ownerExternalId: 'x-a', overdue: false, hasChildren: false, feedingGroundIds: [], finishedLast30: 0, blocked: 0, waiting: 0, teams: [] },
  { id: 's2', number: 2, title: 'Improve delivery', ownerExternalId: 'x-b', overdue: false, hasChildren: false, feedingGroundIds: ['g1'], finishedLast30: 2, blocked: 0, waiting: 0, teams: ['Sales'] },
];
const input: PictureInput = { priorities, handoffs: [], subjects: [], finishedOnPriorities: 0, groundsOnPriorities: [], names: [] } as any;
const model: any = { readings: [
  { priorityId: 's1', says: 'This priority is not moving because no teams are working on it. To make progress, teams would need to start checking in their work against it.' },
  { priorityId: 's2', says: 'One check-in feeds this priority, and 2 were finished in the last 30 days.' },
] };

describe('a priority no check-in feeds', () => {
  const picture = buildPicture(input, model);
  const says = (n: number) => picture.readings.find((r) => r.number === n)!.says;
  it('is read from the counts, not from the model', () => {
    expect(says(1)).toBe('No check-in feeds this priority yet, so nothing on the record can show it moving. Once a check-in reports against it, the record can show how it is going.');
  });
  it('a priority a check-in feeds keeps the model sentence the record supports', () => {
    expect(says(2)).toMatch(/feeds this priority/);
  });
});
