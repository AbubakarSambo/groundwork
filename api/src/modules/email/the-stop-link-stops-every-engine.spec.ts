import { readFileSync } from 'fs';
import { join } from 'path';
import { whetherToSend } from './nothing-goes-out-that-was-turned-off';

/**
 * THE STOP LINK STOPS EVERY ENGINE. `remindersStoppedAt` was read by one nudge engine of three; the
 * per-kind switches were read by the digest alone; and whether a person could stop being chased
 * depended on which of three code paths chased them. One arbiter now, in the one function every mail
 * goes through, each rule specced on its own because its blast radius is exactly why it lives there.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const service = strip(readFileSync(join(__dirname, 'email.service.ts'), 'utf8'));
const on = { emailNotifications: true, unsubscribedAt: null };

describe('the rules, one at a time', () => {
  it('the stop link stops what we decided to send, and nothing they asked for', () => {
    const stopped = { ...on, remindersStoppedAt: new Date() };
    expect(whetherToSend('we decided to send it', stopped).send).toBe(false);
    expect(whetherToSend('asked for', stopped).send).toBe(true);
  });
  it('the digest switch governs the digest; the nudge switch governs nudges; neither governs the other', () => {
    expect(whetherToSend('we decided to send it', { ...on, wantsDigest: false }, 'sendRoundDigest').send).toBe(false);
    expect(whetherToSend('we decided to send it', { ...on, wantsDigest: false }, 'sendNudge').send).toBe(true);
    expect(whetherToSend('we decided to send it', { ...on, wantsNudges: false }, 'sendNudge').send).toBe(false);
    expect(whetherToSend('we decided to send it', { ...on, wantsNudges: false }, 'sendAbsenceReminder').send).toBe(false);
    expect(whetherToSend('we decided to send it', { ...on, wantsNudges: false }, 'sendRoundDigest').send).toBe(true);
  });
  it('an operational alert to our own roster is exempt from the customer-facing preference', () => {
    expect(whetherToSend('operational', { ...on, unsubscribedAt: new Date(), emailNotifications: false, stillHere: true })).toEqual({ send: true });
  });
});

describe('the arbiter reads it all', () => {
  it('reads the participant\'s stop from the context, once, for every sender', () => {
    expect(service).toMatch(/private async wouldTheyRatherNot\(to: string, sender: string, context\?: DeliveryContext\)/);
    expect(service).toMatch(/groundParticipant\.findUnique\(\{ where: \{ id: context\.participantId \}, select: \{ remindersStoppedAt: true \} \}\)/);
    expect(service).toMatch(/await this\.wouldTheyRatherNot\(options\.to, sender, context\)/);
  });
  it('every nudge names its participant, so every nudge carries its way out', () => {
    expect(service).toMatch(/async sendNudge\([^)]*participantId: string(, simplerWords\?: boolean \| null)?\)/);
    for (const rel of ['../grounds/grounds.cron.ts', '../conversation/remind.service.ts']) {
      const src = strip(readFileSync(join(__dirname, rel), 'utf8'));
      for (const call of src.match(/sendNudge\([\s\S]*?\);/g) ?? []) expect(call).toMatch(/\.id,?\s*(\(checkIn\.ground as any\)\.simplerWords,?\s*)?\)/);
    }
  });
});
