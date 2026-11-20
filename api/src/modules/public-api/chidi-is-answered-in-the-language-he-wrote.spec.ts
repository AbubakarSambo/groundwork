import { readFileSync } from 'fs';
import { join } from 'path';
import { WRITE_IN_THEIR_LANGUAGE, theLanguageTheyWroteIn } from './the-language-they-write-in';

/**
 * WhatsApp test, 20 November 2026, C1. Chidi wrote "closed kilele 450k on tues, still chasing naivas PO" and was answered
 * "Kilele imefungwa na 450k Juma. Hongera kwa hilo. ..." in Swahili, with the deal credited to "Juma" ("on tues" turned into
 * Jumanne and cut short). The cause was a language read once from that one message and stored on him, which then told every
 * turn to answer in Swahili. Nothing stored decides the language now: every turn tells the model to follow the latest message.
 */
const CONVERSATION = readFileSync(join(__dirname, '../conversation/conversation.service.ts'), 'utf8');
const WHATSAPP = readFileSync(join(__dirname, 'whatsapp-for-an-organisation.service.ts'), 'utf8');
const CHIDI = 'closed kilele 450k on tues, still chasing naivas PO';

describe('Chidi is answered in the language he wrote, and nobody he did not name is put in', () => {
  it('every check-in turn carries the one instruction, and no stored language reaches the prompt', () => {
    expect(CONVERSATION).toMatch(/const theirLanguage = WRITE_IN_THEIR_LANGUAGE;/);
    expect(CONVERSATION).not.toMatch(/participant\?\.language/);
    expect(WRITE_IN_THEIR_LANGUAGE).toMatch(/never from the names in them/);
    expect(WRITE_IN_THEIR_LANGUAGE).toMatch(/Never translate a day, and never put a name in that they did not say\./);
  });

  it('nothing on WhatsApp reads or stores a language from one message any more', () => {
    expect(WHATSAPP).not.toMatch(/readLanguageOnce|plainlyEnglish|data: \{ language:/);
  });

  it('the report on his phone is in the language of all his words together, and English when the model cannot say', async () => {
    const words = [CHIDI, 'english pls. buyer said friday, im on it with mercy in procurement', 'its 1.2m, half my Q4 number'];
    const extract = jest.fn(async () => ({ language: 'en' }));
    expect(await theLanguageTheyWroteIn(extract as any, words)).toBe('en');
    expect((extract.mock.calls[0] as any)[1][0].content).toContain(CHIDI);
    expect(await theLanguageTheyWroteIn(undefined, words)).toBe('en');
    expect(await theLanguageTheyWroteIn((async () => { throw new Error('off'); }) as any, words)).toBe('en');
    expect(await theLanguageTheyWroteIn((async () => ({ language: 'xx' })) as any, words)).toBe('en');
  });
});
