import { readFileSync } from 'fs';
import { join } from 'path';
import { OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE } from './prompt-library';

/*
 * "It is repeat and going around in circles."
 *
 * The guard for this is a retry: spot the reply, ask again without the restatement. Run against a
 * live third check-in it caught one turn in three, because it compares words and a paraphrase
 * shares few of them - "Amir is not really up to it and I have been covering for him" came back as
 * "You've been covering for Amir because you feel he's not up to it", the same sentence at a
 * quarter of the overlap. Telling that from a real give-back is judgement, and judgement is the
 * model's; what was missing is that nothing ever asked it, because the instruction existed only
 * after a reply had already gone wrong.
 */
describe('the rule against restating reaches every turn, not only the ones a guard catches', () => {
  const read = (...p: string[]) =>
    readFileSync(join(__dirname, ...p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('says the thing itself, not a euphemism for it', () => {
    expect(OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE).toMatch(/NEVER OPEN BY SAYING THEIR OWN ANSWER BACK/);
    expect(OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE).toMatch(/in their words or in yours/);
  });

  it('and says what to open with instead, because a rule with no alternative is ignored', () => {
    expect(OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE).toMatch(/Open with something they do not already have/);
  });

  it('leaves the deliberate give-backs alone, which are facts the person does not hold', () => {
    expect(OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE).toMatch(/a figure from the record/);
  });

  it('ships unconditionally in the check-in prompt, beside the vocabulary rule', () => {
    const service = read('conversation.service.ts');
    expect(service).toMatch(
      /return \[systemPrompt, theirLanguage, VOCABULARY_RULE, A_CORRECTION_IS_NOT_A_SCOLDING, ANSWER_THE_REMARK, OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE,/,
    );
  });

  it('and in the setup prompt, where the fault was read first', () => {
    const entry = read('..', 'entry', 'entry.service.ts');
    expect(entry).toMatch(/const ONBOARD_SYSTEM = `\$\{OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE\}/);
  });

  it('in code, not in the database prompt row, so it reaches every environment and shows in a diff', () => {
    const library = read('prompt-library.ts');
    expect(library).toMatch(/export const OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE = \[/);
  });
});
