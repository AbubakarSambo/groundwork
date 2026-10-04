import { whereThisIsHeading } from './where-this-is-heading';
import { GroundScenario } from '@prisma/client';

/** Request 129 item 7: "People in this check-in said different things about 1 thing." */
const heading = (items: any[]) => whereThisIsHeading({
  scenario: GroundScenario.NEW_PROJECT, hadAnObjective: true, readerIsTheLead: true, leadName: 'Bisi Adeyemi', board: { divergence: { items } }, decided: null,
});
describe('where this is heading, as the lead reads the difference between people', () => {
  it('names the one thing', () => {
    const s = heading([{ topic: 'the refund rule' }]).signals.map((x) => x.says);
    expect(s).toContain('People in this check-in said different things about the refund rule.');
  });
  it('never says "1 thing"', () => {
    const s = heading([{ topic: '' }]).signals.map((x) => x.says).join(' ');
    expect(s).not.toMatch(/\b1 thing/);
    expect(s).toMatch(/about one thing\./);
  });
  it('counts several', () => {
    expect(heading([{ topic: 'a' }, { topic: 'b' }]).signals.map((x) => x.says)).toContain('People in this check-in said different things about 2 things.');
  });
});
