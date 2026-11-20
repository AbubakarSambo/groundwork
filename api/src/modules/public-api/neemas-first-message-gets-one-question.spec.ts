import * as fs from 'fs';
import * as path from 'path';

/**
 * WhatsApp test, 20 November 2026, C34. Neema's "busy today, met 3 shops in westlands, 2 want samples" opened her check-in, and one message
 * came back with the opening ("This takes about ten minutes. ... What is the one thing you are trying to achieve this period?") and the reply
 * ("It sounds like a busy day... What number tells me that you are done...?"): two questions and the help text. A message that is an answer
 * opens the check-in the way Add something does, and only the reply to what she wrote is sent.
 */
const door = fs.readFileSync(path.join(__dirname, 'whatsapp-for-an-organisation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const openPath = door.slice(door.indexOf("if (current.status === 'NOT_STARTED') {", door.indexOf('let reply = \'\';')), door.indexOf('const r = await this.conversation.sendMessage(current.id, userId!, text'));

describe("Neema's first message gets one question back", () => {
  it('a first message that is an answer opens with "What would you like to add?", kept on the record and not sent', () => {
    expect(openPath).toContain('const anAnswer = !beginning && !isAGreetingOrARequestToStart(text);');
    expect(openPath).toContain('this.conversation.open(current.id, userId!, anAnswer && !theyAnsweredTheOpening ? WHAT_WOULD_YOU_LIKE_TO_ADD : undefined)');
  });
  it('what is sent before the reply holds no opening question: only the header, the words that switch once, and any missed notice', () => {
    const sentFirst = openPath.slice(openPath.indexOf('reply = anAnswer && !theyAnsweredTheOpening'), openPath.indexOf(': `${sessionHeader(current)}${theWords}\\n\\n'));
    expect(sentFirst).toContain('`${sessionHeader(current)}${theWords}${missed ? `\\n\\n${missed.text}` : \'\'}`');
    expect(sentFirst).not.toContain('first.reply');
  });
  it('a greeting or START still opens with the opening question, as before', () => {
    expect(openPath).toContain("if (isAGreetingOrARequestToStart(text) || beginning) { await say(reply); return; }");
  });
});
