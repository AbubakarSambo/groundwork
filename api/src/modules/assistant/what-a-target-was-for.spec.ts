/**
 * The assistant could see the number and not what it was for.
 */
import { asALine, whatIsMissingAcrossThem } from './what-a-target-was-for';

const full = {
  title: 'Ten companies onboarded',
  target: '10',
  dueDate: '31 October',
  justification: 'Ten is what the pipeline can carry this quarter.',
  approach: 'Two a week off the target list; blockers cleared same day.',
};

describe('one objective as somebody reads it', () => {
  it('says why the number is the number and how it moves', () => {
    const line = asALine(full);
    expect(line).toContain('why that number: Ten is what the pipeline can carry');
    expect(line).toContain('how it moves: Two a week');
  });

  it('and puts them on their own lines, not inside the parenthesis', () => {
    /* Packed into the line they read as more qualifiers on the number, which is
       the opposite of the point: they are what the number is FOR. */
    const [first] = asALine(full).split('\n');
    expect(first).toBe('- Ten companies onboarded (target: 10), due 31 October');
  });

  it('and says nothing at all where nothing was recorded', () => {
    /* Most objectives arrived from a planning tool that never asked. A line
       saying so against each one is furniture within a week. */
    const line = asALine({ title: 'Ship the rewrite' });
    expect(line).toBe('- Ship the rewrite');
  });

  it('and shows one without needing the other', () => {
    expect(asALine({ ...full, approach: null })).toContain('why that number');
    expect(asALine({ ...full, approach: null })).not.toContain('how it moves');
  });
});

describe('what is missing across all of them', () => {
  it('is said once when not a single one carries a reason', () => {
    const said = whatIsMissingAcrossThem([{ title: 'a' }, { title: 'b' }]);
    expect(said).toContain('None of these records why');
    expect(said).toContain('whether the reason for it still holds');
  });

  it('and not at all when any of them does', () => {
    /* The ones that have a reason already show what a good one looks like;
       nagging past that is the product having an opinion about somebody's
       planning tool. */
    expect(whatIsMissingAcrossThem([{ title: 'a' }, full])).toBeNull();
  });

  it('and never when there is nothing to say it about', () => {
    expect(whatIsMissingAcrossThem([])).toBeNull();
  });

  it('and counts an approach on its own as a reason to stay quiet', () => {
    expect(whatIsMissingAcrossThem([{ title: 'a', approach: 'Two a week.' }])).toBeNull();
  });
});
