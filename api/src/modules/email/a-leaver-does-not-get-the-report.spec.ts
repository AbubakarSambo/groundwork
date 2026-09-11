import { readFileSync } from 'fs';
import { join } from 'path';
import { whetherToSend } from './nothing-goes-out-that-was-turned-off';

/**
 * A LEAVER DOES NOT GET THE REPORT. The nudge paths checked isActive and deletedAt; the report,
 * resolution, billing and stall broadcasts iterated the participants and did not. A leaver whose
 * address has been reassigned inside their old company should not receive a report. Same fix, same
 * place: the one door every mail goes through.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const service = strip(readFileSync(join(__dirname, 'email.service.ts'), 'utf8'));

describe('somebody who has left', () => {
  it('gets neither what we decided to send nor what they asked for', () => {
    const gone = { emailNotifications: true, unsubscribedAt: null, stillHere: false };
    expect(whetherToSend('asked for', gone).send).toBe(false);
    expect(whetherToSend('we decided to send it', gone).send).toBe(false);
  });
  it('but is not locked out of a sign-in they still hold', () => {
    expect(whetherToSend('the way back in', { emailNotifications: true, unsubscribedAt: null, stillHere: false })).toEqual({ send: true });
  });
  it('and the door reads whether they are still here from the user row', () => {
    expect(service).toMatch(/select: \{ emailNotifications: true, isActive: true, deletedAt: true \}/);
    expect(service).toMatch(/stillHere: user \? user\.isActive && !user\.deletedAt : undefined/);
  });
});
