import { isAProject, THE_PROJECT_KINDS } from './release-5-projects';
import { KINDS_OF_WORK } from './the-kind-of-work';

/* Client delivery is a type of project, not its own situation (Hafsah, 25 October): the same project board, offered with Release 5. */
describe('client delivery is a project', () => {
  it('is a kind of work, and a project', () => {
    expect(KINDS_OF_WORK).toContain('client delivery');
    expect(THE_PROJECT_KINDS).toEqual(['a funded project', 'client delivery']);
    expect(isAProject('client delivery')).toBe(true);
    expect(isAProject('a funded project')).toBe(true);
    expect(isAProject('sales team')).toBe(false);
    expect(isAProject(null)).toBe(false);
  });
});
