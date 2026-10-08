import * as fs from 'fs';
import * as path from 'path';
import { isAGreetingOrARequestToStart } from './a-whatsapp-message-is-routed';

/**
 * B-108 and B-101: "Hi, I want to do my check-in" was handed to the check-in as the first answer, and the reply quoted it back as something said last
 * time ("You mentioned last time that you wanted to do your check-in"), after the opener had already asked its own question. So one message carried two
 * openers. A greeting, or a short message that only asks to start, opens the check-in and is not put in it.
 */
describe('words that only ask to begin are not the first answer', () => {
  it.each([
    'Hi', 'Hello there', 'Good morning', 'Hi, I want to do my check-in', 'I want to start my check-in', 'start', 'Begin', 'Let me finish my check-in now', 'I would like to do my check-in please',
  ])('"%s" opens the check-in and is not an answer', (said) => {
    expect(isAGreetingOrARequestToStart(said)).toBe(true);
  });
  it.each([
    'Not much yet', 'It is blocked', 'Behind again', 'We signed nine shops this week and the stock came late.',
    'When is my next check-in?', 'I did my check-in with Baraka yesterday and he said the price list is still with legal, so I have been waiting on it since Monday.',
  ])('"%s" is an answer or a question, and goes on', (said) => {
    expect(isAGreetingOrARequestToStart(said)).toBe(false);
  });
  it('and the WhatsApp door uses it when it opens a check-in that has not begun', () => {
    const door = fs.readFileSync(path.join(__dirname, 'whatsapp-for-an-organisation.service.ts'), 'utf8');
    expect(door).toContain('if (isAGreetingOrARequestToStart(text) || beginning) { await say(reply); return; }');
  });
});
