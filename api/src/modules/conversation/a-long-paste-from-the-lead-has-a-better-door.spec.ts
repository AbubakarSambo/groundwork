import { readFileSync } from 'fs';
import { join } from 'path';
import { whereToTakeALongPaste, WHERE_TO_TAKE_A_LONG_PASTE_IN_ASK_GROUNDWORK, WHERE_TO_TAKE_A_LONG_PASTE_ON_THE_CONTEXT_PAGE } from './a-long-paste-from-the-lead-has-a-better-door';

const SALES_UPDATE = readFileSync(join(__dirname, '../../../journey/dumps/sales.txt'), 'utf8');

describe('a long paste from the lead in their own check-in', () => {
  it('is told where it can be put on the check-in, in Ask Groundwork when that takes context', () => {
    expect(whereToTakeALongPaste({ isTheLead: true, message: SALES_UPDATE, askGroundworkTakesContext: true })).toBe(WHERE_TO_TAKE_A_LONG_PASTE_IN_ASK_GROUNDWORK());
    expect(WHERE_TO_TAKE_A_LONG_PASTE_IN_ASK_GROUNDWORK()).toBe(
      'That is a lot to read. To put the numbers, dates, decisions and questions in it on this check-in, paste it into Ask Groundwork. It will say back what it found, and nothing is saved until you say yes.');
  });

  it('is told to paste it into Ask Coamana when the organisation is Coamana', () => {
    expect(whereToTakeALongPaste({ isTheLead: true, message: SALES_UPDATE, askGroundworkTakesContext: true, ask: 'Ask Coamana' })).toBe(
      'That is a lot to read. To put the numbers, dates, decisions and questions in it on this check-in, paste it into Ask Coamana. It will say back what it found, and nothing is saved until you say yes.');
  });

  it('is told the Context and resources page while Ask Groundwork does not yet take context', () => {
    expect(whereToTakeALongPaste({ isTheLead: true, message: SALES_UPDATE, askGroundworkTakesContext: false })).toBe(WHERE_TO_TAKE_A_LONG_PASTE_ON_THE_CONTEXT_PAGE);
    expect(WHERE_TO_TAKE_A_LONG_PASTE_ON_THE_CONTEXT_PAGE).toContain("Context and resources page");
  });

  it('a short answer, or anybody who is not the lead, is told nothing, so no ordinary check-in changes', () => {
    expect(whereToTakeALongPaste({ isTheLead: true, message: 'We closed Kano Fresh Mart this week.', askGroundworkTakesContext: true })).toBeNull();
    expect(whereToTakeALongPaste({ isTheLead: false, message: SALES_UPDATE, askGroundworkTakesContext: true })).toBeNull();
  });

  it('is said in the turn the person reads, before the reply, on every route', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(src).toContain('const ourOwnWords = [contextNotSaid, tookTheNumbers, whereToTakeIt, offerAnswered.weSay]');
    expect(src).toContain('reply: [contextNotSaid, tookTheNumbers, whereToTakeIt, offerAnswered.weSay, withRoomLeft]');
  });
});
