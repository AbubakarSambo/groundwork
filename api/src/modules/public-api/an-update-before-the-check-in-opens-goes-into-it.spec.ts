import * as fs from 'fs';
import * as path from 'path';

/**
 * Kevin, 13 October 2026 (polish round 1): his day's update, written before the 8am check-in opened, went to Ask and was lost. A message
 * that is not a request, a decision or a question, with nothing open and a check-in opening within eighteen hours, opens that one now.
 */
describe('an update sent before the check-in opens goes into it', () => {
  const door = fs.readFileSync(path.join(__dirname, 'whatsapp-for-an-organisation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  /* Changed 26 October 2026 (Hafsah after round 3): any message between check-ins is added, so there is no eighteen-hour window and no two-hour wait. */
  it('the WhatsApp door opens the next one with "What would you like to add?" before it reads what is open', () => {
    const forward = door.indexOf('status: CheckInStatus.NOT_STARTED, isSetup: false');
    expect(forward).toBeGreaterThan(-1);
    expect(door.indexOf('data: { availableFrom: new Date() }')).toBeGreaterThan(forward);
    expect(door.indexOf('this.conversation.open(later.id, userId, WHAT_WOULD_YOU_LIKE_TO_ADD)')).toBeGreaterThan(forward);
    expect(door.indexOf('const open = everyOpen.filter')).toBeGreaterThan(forward);
  });
  it('never for a thank-you (polish round 2: "Thanks, talk tomorrow!" opened the next day)', () => {
    const thanks = new RegExp(door.match(/const aPleasantry = [^;]*?\/(\^[^/]+)\/i\.test/)![1], 'i');
    for (const t of ['Thanks, talk tomorrow!', 'Thank you', 'Okay great', 'Cheers']) expect(thanks.test(t)).toBe(true);
    expect(thanks.test('Kilele Hotel wants ten more units next month')).toBe(false);
  });
  it('never for a request, a decision or a question', () => {
    expect(door).toContain("!looksLikeARequest(arrived.text) && !aDecisionIn(arrived.text) && !/\\?\\s*$/.test(arrived.text.trim())");
  });
});

/** Mercy, polish round 2: her "yes" to Ask's "Shall I send it to an admin to approve?" opened her check-in, and the leave was never sent. */
describe('a yes or no to what Ask just said back is Ask\'s', () => {
  /* Batch S round 2, T2: one resolver now decides who a message is for (assistant/who-a-message-is-for.ts), Ask waiting first. The same
     two promises are checked: it is asked before anything in the check-in reads the words, and Ask waits for fifteen minutes. */
  const door = fs.readFileSync(path.join(__dirname, 'whatsapp-for-an-organisation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const assistant = fs.readFileSync(path.join(__dirname, '..', 'assistant', 'assistant.service.ts'), 'utf8');
  it('is sent to Ask before anything in the check-in reads it', () => {
    const toAsk = door.indexOf('(await this.whoIsItFor(organizationId, who.personId, text, current.id, userId))');
    expect(toAsk).toBeGreaterThan(-1);
    expect(toAsk).toBeLessThan(door.indexOf('} else if (pending) {'));
  });
  it('only while Ask waits, for fifteen minutes', () => {
    expect(assistant).toContain("state: 'PARKED', createdAt: { gte: new Date(Date.now() - 15 * 60_000) }");
  });
});

/** Peter, polish round 2: two "yes" replies to two questions, seconds apart; the second was dropped as the same words again. */
describe('a quick yes or no is never dropped as the same words again', () => {
  const door = fs.readFileSync(path.join(__dirname, 'whatsapp-for-an-organisation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  it('the same-words check lets a yes or a no through', () => {
    const check = door.slice(door.indexOf('private async notTheSameWordsJustNow'));
    expect(check.indexOf('(?:yes|no|y|n|ok|okay|yeah|yep|nope|sure)')).toBeGreaterThan(-1);
    expect(check.indexOf('(?:yes|no|y|n|ok|okay|yeah|yep|nope|sure)')).toBeLessThan(check.indexOf("createHash('sha1')"));
  });
});
