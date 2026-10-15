import { of, lastValueFrom } from 'rxjs';
import { withoutInternalNames, aPersonNeverReadsAnInternalName } from './no-internal-name-reaches-a-person';
import { NoInternalNameInAResponse } from './no-internal-name-in-a-response';

/*
 * Night quality run 2, Naomi Wekesa's walk: the first reply in setup read the line below, word for word.
 * One last-line check now runs on every sentence served or sent.
 */
const NAOMI_READ = "I'm here to help you get this new project, NEW_PROJECT, off to a good start, ensuring clarity on the work and everyone's role.";

describe('no internal name reaches a person', () => {
  it('the reply Naomi read loses the key and keeps the sentence', () => {
    expect(withoutInternalNames(NAOMI_READ).text).toBe("I'm here to help you get this new project off to a good start, ensuring clarity on the work and everyone's role.");
  });

  it('a key mid-sentence becomes plain words where the code knows them, and goes where it does not', () => {
    expect(withoutInternalNames('Your check-in is IN_PROGRESS now.').text).toBe('Your check-in is in progress now.');
    expect(withoutInternalNames('This check-in is about OKR_ALIGNMENT.').text).toBe('This check-in is about setting shared goals.');
    expect(withoutInternalNames('You joined as PARTICIPANT_ROLE today.').text).toBe('You joined as today.');
  });

  it('template placeholders go', () => {
    expect(withoutInternalNames('Hi {{1}}, your check-in for {{2}} is open.').text).toBe('Hi, your check-in for is open.');
    expect(withoutInternalNames('Welcome to ${orgName}, <name>.').text).toBe('Welcome to,.');
    expect(withoutInternalNames('Thanks [NAME]. TODO: say more here.').text).toBe('Thanks. say more here.');
    expect(withoutInternalNames('Your check-in, Entry session, is saved.').caught).toContain('Entry session');
  });

  it("never alters a person's own quoted words", () => {
    const said = 'You said "we parked NEW_PROJECT and the TODO list" last week.';
    expect(withoutInternalNames(said).text).toBe(said);
    expect(withoutInternalNames('You said “the IN_PROGRESS column”.').text).toBe('You said “the IN_PROGRESS column”.');
  });

  it('leaves ordinary sentences, capitals and acronyms alone', () => {
    const s = 'OKR and PIP are words people use. Ridge Bakery delivers to Eldoret Palms by 6 AM.';
    expect(withoutInternalNames(s)).toEqual({ text: s, caught: [] });
  });

  it('logs what it took out', () => {
    const warned: string[] = [];
    aPersonNeverReadsAnInternalName(NAOMI_READ, 'the entry chat', { warn: (m) => warned.push(m) });
    expect(warned[0]).toContain('NEW_PROJECT');
  });
});

describe('every response the API serves passes the same check', () => {
  const run = async (url: string, body: unknown) => {
    const ctx: any = { switchToHttp: () => ({ getRequest: () => ({ url }) }) };
    return lastValueFrom(new NoInternalNameInAResponse().intercept(ctx, { handle: () => of(body) } as any) as any);
  };

  it("the entry chat's reply, as served, never says NEW_PROJECT; a key that is only data stays", async () => {
    const out: any = await run('/api/v1/entry/chat', { reply: NAOMI_READ, scenario: 'NEW_PROJECT', status: 'IN_PROGRESS' });
    expect(out.reply).not.toContain('NEW_PROJECT');
    expect(out.scenario).toBe('NEW_PROJECT');
    expect(out.status).toBe('IN_PROGRESS');
  });

  it("a person's own turn is passed through as they wrote it", async () => {
    const turns = [{ role: 'PERSON', content: 'We call it NEW_PROJECT in the shop.' }, { role: 'AI', content: NAOMI_READ }];
    const out: any = await run('/api/v1/check-ins/1/turns', turns);
    expect(out[0].content).toBe('We call it NEW_PROJECT in the shop.');
    expect(out[1].content).not.toContain('NEW_PROJECT');
  });

  it('the prompt editor and the published API are not read', async () => {
    const prompt = { content: 'GROUND: NEW_PROJECT {{name}}' };
    expect(await run('/api/v1/prompts/1', prompt)).toEqual(prompt);
    expect(await run('/api/org/v1/subjects', prompt)).toEqual(prompt);
  });
});

describe('what is sent, by WhatsApp and by mail, and what is saved as a turn', () => {
  it('a WhatsApp reply never carries NEW_PROJECT', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { WhatsAppService } = require('../modules/whatsapp/whatsapp.service');
    const sent: string[] = [];
    const wa: any = Object.create(WhatsAppService.prototype);
    wa.logger = { warn: () => undefined, log: () => undefined };
    wa.sendOnOurNumber = async (_o: any, _t: string, text: string) => { sent.push(text); return { sent: true }; };
    await wa.sendMessage('+254700000000', NAOMI_READ);
    expect(sent[0]).not.toContain('NEW_PROJECT');
    expect(sent[0]).toContain('this new project off to a good start');
  });

  it('a saved turn never carries NEW_PROJECT', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ConversationService } = require('../modules/conversation/conversation.service');
    const svc: any = Object.create(ConversationService.prototype);
    svc.logger = { warn: () => undefined, log: () => undefined };
    svc.prisma = {};
    const saved: string = await svc.theTurnAsItIsSaved({}, NAOMI_READ).catch((e: any) => `threw ${e?.message}`);
    expect(saved).not.toContain('NEW_PROJECT');
  });
});
