import { THE_TEMPLATES, theTemplate, theTemplateBlock } from './the-thirteen-templates';

describe('Release 4: the thirteen templates', () => {
  it('are the prototype\'s thirteen, in its order, with its names written as commas', () => {
    expect(THE_TEMPLATES.map((t) => t.name)).toEqual([
      'HR, hiring', 'Finance, collections and close', 'Procurement', 'Marketing', 'Customer success', 'Legal and compliance',
      'Research and data', 'Enterprise sales', 'Project manager', 'Product manager', 'New market launch',
      'Field officer, registrations', 'Government approval, stakeholders',
    ]);
    for (const t of THE_TEMPLATES) {
      expect(t.ladder.length).toBeGreaterThan(3);
      expect(t.targets.length).toBeGreaterThan(2);
      expect(t.stallRule).toBeTruthy();
    }
  });

  it('finds one by its id and nothing else', () => {
    expect(theTemplate('hr')?.name).toBe('HR, hiring');
    expect(theTemplate('sales')).toBeNull();
    expect(theTemplate(null)).toBeNull();
  });

  it('tells the check-in the stages, what each needs and shows, its question, and the stall rule, in plain sentences', () => {
    const block = theTemplateBlock(theTemplate('hr'));
    expect(block).toContain('THIS TEAM\'S WORK FOLLOWS THE "HR, hiring" TEMPLATE');
    expect(block).toContain('1. Applied: it needs named candidate, role, source, shown by application record.');
    expect(block).toContain('"Who did you screen, and what\'s your read?"');
    expect(block).toContain('A piece of work has stalled when: a candidate with no new step in 7 days.');
    expect(theTemplateBlock(null)).toBe('');
  });
});
