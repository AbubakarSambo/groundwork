import { WhatsAppForAnOrganisationService } from './whatsapp-for-an-organisation.service';

/**
 * RUN 10: a first message of "Hi" or "Thanks, ready" opened the check-in and the first question arrived as if nobody had spoken. What the person
 * reads is the model's few words first, then the question. Where the model gives nothing, or cannot be reached, they read the question as before.
 */
const QUESTION = 'Lucy Solar, session 2.\n\nWhat did you get done this week?';
function door(extract: (...a: any[]) => Promise<any>) {
  const d: any = Object.create(WhatsAppForAnOrganisationService.prototype);
  d.anthropic = { extract };
  return d as WhatsAppForAnOrganisationService;
}

describe('the courtesy of a first message', () => {
  it('reads the model\'s reply first, then the question', async () => {
    const read = await door(async () => ({ reply: 'Hello Sam, good to hear from you.' })).withTheCourtesyOfAFirstMessage('Hi', QUESTION);
    expect(read).toBe(`Hello Sam, good to hear from you.\n\n${QUESTION}`);
  });
  it('reads the question alone where the words were not a greeting', async () => {
    expect(await door(async () => ({ reply: '' })).withTheCourtesyOfAFirstMessage('start', QUESTION)).toBe(QUESTION);
  });
  it('reads the question alone where the model cannot be reached', async () => {
    expect(await door(async () => { throw new Error('down'); }).withTheCourtesyOfAFirstMessage('Hi', QUESTION)).toBe(QUESTION);
    const noModel: any = Object.create(WhatsAppForAnOrganisationService.prototype);
    noModel.anthropic = {};
    expect(await noModel.withTheCourtesyOfAFirstMessage('Hi', QUESTION)).toBe(QUESTION);
  });
});
