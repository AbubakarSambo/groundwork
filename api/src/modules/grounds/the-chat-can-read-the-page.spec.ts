import * as fs from 'fs';
import * as path from 'path';
import { contextChatPrompt } from './the-context-chat';

/**
 * THE ONE CONTROL ON THE PAGE COULD NOT SEE THE PAGE.
 *
 * "Are these targets right?" and "what is not settled?" were unanswerable: the conversation knew how
 * many things were recorded and not what any of them said, so it deflected to the next gap question.
 * Everything in this block is already on the lead's screen beside the chat, so it discloses nothing.
 */
describe('the chat can read the page it sits on', () => {
  const prompt = contextChatPrompt('Harvestline sales and delivery', 'TEAM_UPDATES', [], [], [
    { heading: 'Targets', lines: ['signed revenue: 12,000,000 [the whole check-in]', 'qualified pipeline: 3,000,000 [Sarah]'] },
    { heading: 'Not settled, not to be treated as fact', lines: ['The 12m target: is it for signed, booked, or collected revenue?'] },
    { heading: 'Notes', lines: [] },
  ]);

  it('carries what is on the check-in, under its own headings', () => {
    expect(prompt).toContain('WHAT IS ON THIS CHECK-IN, IN FULL');
    expect(prompt).toContain('Targets:');
    expect(prompt).toContain('  - signed revenue: 12,000,000 [the whole check-in]');
    expect(prompt).toContain('  - The 12m target: is it for signed, booked, or collected revenue?');
  });

  it('leaves out a heading with nothing under it', () => {
    expect(prompt).not.toContain('Notes:');
  });

  it('answers from that list and invents nothing', () => {
    expect(prompt).toContain('ANSWER A QUESTION ABOUT IT FROM THAT LIST AND NOTHING ELSE');
    expect(prompt).toContain('do not invent a line that is not there');
    expect(prompt).toContain('If they ask about something the list does not hold, say it is not here');
  });

  it('and says nothing of the kind on a check-in that holds nothing', () => {
    const empty = contextChatPrompt('A new check-in', 'TEAM_UPDATES', [], [], []);
    expect(empty).not.toContain('WHAT IS ON THIS CHECK-IN, IN FULL');
  });

  it('the service reads it once and hands it over', () => {
    const src = fs.readFileSync(path.join(__dirname, 'grounds.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(src).toContain('const onRecord = await this.whatIsOnThisCheckIn(groundId)');
    expect(src).toContain('contextChatPrompt(ground.label, ground.scenario, gaps, alreadyHolds, onRecord)');
    /* The lead's read of people is in it, because the lead is the only person this chat answers. */
    const reader = src.slice(src.indexOf('private async whatIsOnThisCheckIn('), src.indexOf('private async whatThisCheckInHolds('));
    expect(reader).toContain('never quoted to them');
  });
});
