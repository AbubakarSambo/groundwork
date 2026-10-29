import * as fs from 'fs';
import * as path from 'path';
import { theOutboxKey, mayItGo } from './the-one-outbox';

/**
 * THE SAME MESSAGE NEVER GOES TWICE (fix plan, pattern 6; quarter test). The whole pattern: two paths, two timers or two copies of the
 * server each decide to send the same thing. These tests hold one key per message and that both senders claim it before sending.
 */
function anOutbox() {
  const keys = new Set<string>();
  return { outboxClaim: { create: async ({ data }: any) => { if (keys.has(data.key)) { const e: any = new Error('dup'); e.code = 'P2002'; throw e; } keys.add(data.key); return data; } } };
}
const AT = new Date('2026-11-20T08:54:00Z');

describe('one key per message', () => {
  it('"your check-in is open" for the same check-in goes once a day, even four minutes apart', async () => {
    const db = anOutbox();
    const open = (at: Date) => theOutboxKey({ channel: 'whatsapp', to: '+254722000002', kind: 'checkin-open', about: 'ci-1', text: 'Hi Brian, your check-in is open.', at });
    expect(await mayItGo(db, open(AT))).toBe(true);
    expect(await mayItGo(db, open(new Date(AT.getTime() + 4 * 60_000)))).toBe(false);
  });

  it('one apology in half an hour, however many messages come in while the model is out', async () => {
    const db = anOutbox();
    const sorry = 'The conversation could not be reached just now, so this session cannot continue this minute.';
    const go = await Promise.all([0, 9, 18].map((s) => mayItGo(db, theOutboxKey({ channel: 'whatsapp', to: '+254722000002', text: sorry, at: new Date(AT.getTime() + s * 1000) }))));
    expect(go).toEqual([true, false, false]);
  });

  it('an invitation goes to a person once a day, whichever check-in it is for', async () => {
    const db = anOutbox();
    const invite = (about: string) => theOutboxKey({ channel: 'email', to: 'aisha@muchemi.test', kind: 'sendParticipantInvite', about, text: 'Wanjiru would like your take', at: AT });
    expect(await mayItGo(db, invite('g-lit'))).toBe(true);
    expect(await mayItGo(db, invite('g-fees'))).toBe(false);
  });

  it('a reply to what somebody wrote is never held, unless the very same words go twice in a minute', async () => {
    const db = anOutbox();
    const reply = (text: string, s: number) => theOutboxKey({ channel: 'whatsapp', to: '+254722000002', kind: 'reply', text, at: new Date(AT.getTime() + s * 1000) });
    expect(await mayItGo(db, reply('Noted.', 0))).toBe(true);
    expect(await mayItGo(db, reply('What did Njeri say about it?', 5))).toBe(true);
    expect(await mayItGo(db, reply('Noted.', 10))).toBe(false);
    expect(await mayItGo(db, reply('Noted.', 120))).toBe(true);
  });

  it('a key it cannot claim for another reason lets the message go', async () => {
    expect(await mayItGo({ outboxClaim: { create: async () => { throw new Error('connection reset'); } } }, 'k')).toBe(true);
    expect(await mayItGo({}, 'k')).toBe(true);
  });
});

describe('both senders claim the key before anything goes', () => {
  const src = (f: string) => fs.readFileSync(path.join(__dirname, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  /* Updated 29 October: the claim moved from the top of each sender down to the one door to each provider (Wanjiru's summary went three
     times by a path that skipped the top). the-one-door.spec.ts holds that nothing else reaches either provider. */
  it('WhatsApp and email, at their one door', () => {
    const wa = src('../modules/whatsapp/whatsapp.service.ts');
    expect(wa).toMatch(/private async toMeta\([\s\S]*?mayItGo\(this\.prisma, key as string\)/);
    expect(wa).toMatch(/theOutboxKey\(\{ channel: 'whatsapp'/);
    expect(src('../modules/email/email.service.ts')).toMatch(/private async deliverNow\([\s\S]*?mayItGo\(this\.prisma, key\)/);
    expect(src('../modules/email/email.service.ts')).toMatch(/theOutboxKey\(\{ channel: 'email'/);
  });
});
