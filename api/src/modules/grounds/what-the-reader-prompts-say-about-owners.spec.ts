import { A_DUMP_PROMPT } from './a-dump-is-many-things';
import { A_PLAN_PROMPT } from './a-plan-is-many-proposals';

/**
 * DUMPS AND DOCUMENTS (4 October 2026). The reading prompts for a pasted dump and for a plan are in
 * the code, and nothing in the prompt store overrides them (the extraction calls pass these strings
 * straight to the model), so the file is the version that runs. What they actually do on four
 * realistic dumps is recorded in docs/existing-users.md, "Dumps and documents"; these checks only
 * stop the instructions that made the difference from being cut out.
 */
describe('the reading prompts tell the model whose a number is', () => {
  it('the dump reader gives a priority owner its numbers, and none to the whole team as well', () => {
    expect(A_DUMP_PROMPT).toContain('The numbers in that priority belong to that owner');
    expect(A_DUMP_PROMPT).toContain('never also in the numbers for the whole team');
    expect(A_DUMP_PROMPT).toContain('never the label that names the owner');
  });
  it('the dump reader makes each task under a person one action for them, and leaves a customer\'s action out', () => {
    expect(A_DUMP_PROMPT).toContain('one entry for each task, with that person as the owner');
    expect(A_DUMP_PROMPT).toContain('clearly not part of this team');
    expect(A_DUMP_PROMPT).toContain('Never write "I", "me" or "my"');
  });
  it('the dump reader does not take a figure the paste says is not approved as anybody\'s number', () => {
    expect(A_DUMP_PROMPT).toContain('not approved, not agreed, only a request, a maybe or a guess');
  });
  it('the dump reader does not make a count inside a job into a target, and finds a question put to a named person', () => {
    expect(A_DUMP_PROMPT).toContain('belongs to that job and is not a number the person is to reach');
    expect(A_DUMP_PROMPT).toContain('addressed to a named person');
  });
  it('the plan reader makes a dated job a commitment, takes a number the whole team is held to, and never reads a day as a number', () => {
    expect(A_PLAN_PROMPT).toContain('is a commitment and not a goal');
    expect(A_PLAN_PROMPT).toContain('A number the whole team is held to');
    expect(A_PLAN_PROMPT).toContain('The day of a date is never the number.');
  });
  it('the plan reader links a named owner to every goal under it, and skips what the plan says is not agreed', () => {
    expect(A_PLAN_PROMPT).toContain('is the personName of every goal and commitment in that priority');
    expect(A_PLAN_PROMPT).toContain('is not an item');
  });
});
