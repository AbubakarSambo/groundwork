import { SEED_PROMPTS, REPORT_SYNTHESIS } from '../conversation/prompt-library';
import { EVERY_VERB_KEEPS_ITS_SUBJECT, WRITTEN_ONCE_FOR_SEVERAL_READERS } from '../conversation/plain-words';
import { SYNTHESIS_RULES } from './reports.service';
import { thePictureInstruction } from './the-picture-in-plain-sentences';
import { theJudgementInstruction, theJudgementOverARoom } from './the-judgement-over-the-answers';
import { theNetworkInstruction } from './a-hundred-accounts-are-not-two';
import { REWRITE_THE_LINES } from './every-line-is-read-before-it-is-kept';

/**
 * "EVERY VERB KEEPS ITS SUBJECT" GOES IN THE STORED PROMPT, THE NORMAL WAY.
 *
 * Hafsah, 27 September 2026: not appended in code after the stored PromptVersion text, but in the
 * stored prompt, so a report's promptVersionId shows it. REPORT_SYNTHESIS is the text seeded into
 * PromptVersion as `report_synthesis` (PromptsService.onModuleInit creates and activates a new version
 * whenever the file differs from the active row). The prompts built in code have no row, and for
 * them the rule in their code is the normal way.
 */
describe('every verb keeps its subject', () => {
  it('is in the text seeded as report_synthesis', () => {
    expect(REPORT_SYNTHESIS).toContain(EVERY_VERB_KEEPS_ITS_SUBJECT);
    expect(SEED_PROMPTS.find((s) => s.key === 'report_synthesis')!.content).toContain('AND EVERY VERB KEEPS ITS SUBJECT');
  });

  it('is NOT in what the synthesis appends in code after the stored prompt', () => {
    expect(SYNTHESIS_RULES).not.toContain('EVERY VERB KEEPS ITS SUBJECT');
    expect(WRITTEN_ONCE_FOR_SEVERAL_READERS).not.toContain('EVERY VERB KEEPS ITS SUBJECT');
    expect(SYNTHESIS_RULES).not.toContain(EVERY_VERB_KEEPS_ITS_SUBJECT);
  });

  it('but the example already in that block no longer teaches a verb with no subject', () => {
    /* An ordinary fix to an example that was always there, with no rule text added (27 September 2026). */
    for (const block of [WRITTEN_ONCE_FOR_SEVERAL_READERS, SYNTHESIS_RULES]) {
      const flat = block.replace(/\s+/g, ' ');
      expect(flat).toContain('Write "Participant A says Participant A was told the target was five renewals, and Participant A has completed six."');
      expect(flat).toContain('"You say you were told the target was five renewals, and you have completed six"');
      expect(flat).not.toMatch(/renewals, and has completed six|renewals, and have completed six/);
    }
  });

  it('is in each prompt built in code, which has no PromptVersion row', () => {
    for (const prompt of [
      thePictureInstruction({ peopleAnswered: 2, peopleExpected: 2, differenceTopics: [], aboutOnePerson: false } as any),
      theJudgementInstruction('Bisi', 'who to recognise'),
      theJudgementOverARoom('Bisi', 'who to recognise', 'Bisi'),
      theNetworkInstruction(40, 'What do you need next season?'),
    ]) expect(prompt).toContain(EVERY_VERB_KEEPS_ITS_SUBJECT);
    expect(REWRITE_THE_LINES).toContain('Every verb has its subject in front of it.');
  });
});
