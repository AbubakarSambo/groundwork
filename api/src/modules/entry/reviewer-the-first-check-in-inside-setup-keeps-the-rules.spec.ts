import { EntryService } from './entry.service';

/**
 * REVIEWER, 14 OCTOBER 2026. Grace's first check-in, inside set-up, ignored "finish", answered "I have to go" with "You have to
 * go. Before you do...", said "The owner of Kilele Hotel paid for 40 units today." back to her, and asked about her job twice.
 * The guard is driven here with the model's reply given, and what Grace reads is checked.
 */
function guard(modelSays: string) {
  const svc = Object.create(EntryService.prototype) as any;
  svc.anthropic = { respond: jest.fn(async () => modelSays) };
  svc.logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return (messages: { role: 'user' | 'assistant'; content: string }[]) => svc.guardedReplyWithClose('system', messages);
}

describe('the first check-in inside set-up keeps the check-in’s rules', () => {
  it('"I have to go" closes it, with nothing more asked and their leaving not said back', async () => {
    const r = await guard('You have to go. Before you do, what is the one thing you want me to know about Kilele?')([
      { role: 'assistant', content: 'What moved on Kilele Hotel today?' },
      { role: 'user', content: 'The owner of Kilele Hotel paid for 40 units today.' },
      { role: 'assistant', content: 'What comes next for Bahari Cafe?' },
      { role: 'user', content: 'I have to go.' },
    ]);
    expect(r.closed).toBe(true);
    expect(r.reply).not.toMatch(/You have to go|Before you do|one thing you want me to know/);
  });

  it('"finish" closes it too', async () => {
    const r = await guard('Thanks. What else happened today?')([
      { role: 'assistant', content: 'What moved today?' }, { role: 'user', content: 'Kevin closed Bahari Cafe.' },
      { role: 'assistant', content: 'What comes next?' }, { role: 'user', content: 'finish' },
    ]);
    expect(r.closed).toBe(true);
  });

  it('their own sentence is not handed back to them', async () => {
    const r = await guard('The owner of Kilele Hotel paid for 40 units today. What shows the payment came in?')([
      { role: 'assistant', content: 'What moved on Kilele Hotel today?' },
      { role: 'user', content: 'The owner of Kilele Hotel paid for 40 units today.' },
    ]);
    expect(r.reply).toBe('What shows the payment came in?');
  });

  it('the job question is not asked a second time', async () => {
    const r = await guard('Thanks. From what you said, most of your work is sales. Is that right?')([
      { role: 'assistant', content: 'What is your role?' }, { role: 'user', content: 'I run the sales team at Kilima Water.' },
    ]);
    expect(r.reply).not.toMatch(/most of your work is sales/);
    expect(r.reply).toMatch(/\?$/);
  });
});
