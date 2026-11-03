import { readFileSync } from 'fs';
import { join } from 'path';
import { forHumans, hadCloseMarker } from './outbound';
import { stripCloseMarker } from '../conversation/prompt-library';
import { ConversationService } from '../conversation/conversation.service';

/*
 * THE MODEL'S OWN NOTE, READ BY THE PERSON IT IS ABOUT (speed run, 3 November 2026). Esther's check-in had several sessions behind it,
 * and three replies in a row opened with a pattern note the model wrote for itself. These are the three replies as she read them.
 */
const SEEN = [
  '[[:: M1+. Verified Delivery - "closed two new shops in Westlands", "11 of my 15 for the month" - this is specific output and shows progress toward a stated goal.]] That\'s movement, and puts you at 11 of your 15 for the month. What are the names of the two new shops?',
  '[[:: A1. Coordination Debt Absorber - "paperwork has not come back" suggests Esther is waiting on others, absorbing the delay.]] Naivas Kilimani\'s paperwork is still the hold-up. What is your next step to get that paperwork back, and by when?',
  /* The third never closed its brackets: it ran straight into the question. */
  '[[:: B5+. High-Leverage Communication - "followed up on Tuesday and again yesterday" is communication directly aimed at resolving a blocker.That\'s good information to have, but it means you are waiting. What else can move forward in the meantime that does not depend on that paperwork?',
];

describe('a note in double brackets never reaches a person, whatever it says', () => {
  it('the first two read as the replies they were, with nothing of the note left', () => {
    expect(forHumans(SEEN[0])).toBe('That\'s movement, and puts you at 11 of your 15 for the month. What are the names of the two new shops?');
    expect(forHumans(SEEN[1])).toBe('Naivas Kilimani\'s paperwork is still the hold-up. What is your next step to get that paperwork back, and by when?');
  });

  it('one that never closes is machinery to the end, so the reply is empty and is asked for again', () => {
    expect(forHumans(SEEN[2])).toBe('');
  });

  it('no pattern name or code is left in any of them', () => {
    for (const s of SEEN) {
      const read = forHumans(s);
      expect(read).not.toMatch(/\[\[|\]\]|M1\+|A1\.|B5\+|Verified Delivery|Coordination Debt|High-Leverage/);
    }
  });

  it('the close marker is still read as a close, and still taken out, beside a note', () => {
    const r = stripCloseMarker('[[:: D4+. Strategy to Execution]] Your report is ready now. Speak soon. [[SESSION_COMPLETE]]');
    expect(r).toEqual({ text: 'Your report is ready now. Speak soon.', hadMarker: true });
    expect(hadCloseMarker('[[:: note]] Done.')).toBe(false);
  });

  it('what was already taken out still is: a capitals marker, empty brackets, and ordinary brackets stay', () => {
    expect(forHumans('Done. [[NEEDS_REVIEW]]')).toBe('Done.');
    expect(forHumans('Speak soon. [[]] << >>')).toBe('Speak soon.');
    expect(forHumans('He said [sic] the deal closed.')).toBe('He said [sic] the deal closed.');
  });
});

describe('on every route', () => {
  it('the stream never shows any of the note while it is being written', async () => {
    for (const s of SEEN) {
      const svc = Object.create(ConversationService.prototype) as any;
      svc.anthropic = { respondStream: async function* () { for (let i = 0; i < s.length; i += 7) yield s.slice(i, i + 7); } };
      svc._knownForThisTurn = new Map(); svc._theirEarlierWordsForThisTurn = new Map();
      const shown: string[] = [];
      await svc.streamTheDraft({ id: 'c-1' }, 'system', [], [], 'I closed two new shops in Westlands.', (t: string) => shown.push(t));
      expect(shown.join('')).not.toMatch(/\[\[|M1\+|A1\.|B5\+|Verified Delivery|Coordination Debt|High-Leverage/);
      /* And what is not the note is still shown, as it is written. */
      if (s !== SEEN[2]) expect(shown.join('')).toContain(forHumans(s).split('. ').pop());
    }
  });

  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const CONVERSATION = strip(readFileSync(join(__dirname, '..', 'conversation', 'conversation.service.ts'), 'utf8'));
  const WHATSAPP = strip(readFileSync(join(__dirname, '..', 'public-api', 'whatsapp-for-an-organisation.service.ts'), 'utf8'));

  it('the plain route and the stream send what passed the boundary, and an empty one is asked for again', () => {
    const plain = CONVERSATION.slice(CONVERSATION.indexOf('async sendMessage(checkInId'), CONVERSATION.indexOf('async *sendMessageStream('));
    expect(plain).toMatch(/if \(!forHumans\(rawReply\)\.trim\(\)\)/);
    expect(plain).toMatch(/withoutQuotesTheyDidNotSay\(forHumans\(rawReply\), theirWords\)/);
    const stream = CONVERSATION.slice(CONVERSATION.indexOf('async *sendMessageStream('), CONVERSATION.indexOf('private async aSentenceThatQuotesTheBriefFor('));
    expect(stream).toMatch(/reply: r\.reply/);
  });

  it('WhatsApp sends the reply the plain route returned, and a message WhatsApp cannot carry goes by email with the same words', () => {
    const fromTheConversation = [...WHATSAPP.matchAll(/await this\.conversation\.sendMessage\([^)]*\{ door: 'whatsapp' \}\)/g)];
    expect(fromTheConversation.length).toBeGreaterThanOrEqual(3);
    expect(WHATSAPP).not.toMatch(/this\.anthropic\.respondStream/);
    const SEND = strip(readFileSync(join(__dirname, '..', 'whatsapp', 'whatsapp.service.ts'), 'utf8'));
    expect(SEND).toMatch(/await this\.byEmailInstead\(org, to, text, context, gate\.because\)/);
  });
});
