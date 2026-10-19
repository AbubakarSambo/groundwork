import { theBoardTheMessageIsAbout, theTemplateParagraph } from './the-leads-daily-nudge';
import { TEMPLATES } from '../whatsapp/a-message-outside-the-window';

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3), ITEM 11. Grace's morning message of 15 October read "You can open your board for the
 * full picture here http://localhost:5195/today": the template's words say the board, its link went to Today. Grace runs one check-in,
 * "Sales team, Q4" (a4914784-2b2a-419f-97c5-6cf07c841ce7).
 */
const SALES = 'a4914784-2b2a-419f-97c5-6cf07c841ce7';
const fact = (text: string, groundId?: string) => ({ text, groundId, place: 'Sales team, Q4' }) as any;

describe('the morning message links to the board it is about', () => {
  it('Grace reads "You can open your board for the full picture here" with the link to her check-in\'s board', () => {
    const facts = { needsYou: [fact('Joseph Kariuki is waiting on you for an answer on the KES 4,500 price', SALES)], overdueOnYourTeam: [], risks: [] };
    const link = theBoardTheMessageIsAbout('http://localhost:5195', [{ id: SALES }], facts);
    expect(link).toBe(`http://localhost:5195/grounds/${SALES}/board`);
    const { params } = theTemplateParagraph('Grace', facts, link);
    const text = TEMPLATES['lead-summary'].body.replace('{{1}}', params[0]).replace('{{2}}', params[1]).replace('{{3}}', params[2]);
    expect(text).toContain(`You can open your board for the full picture here http://localhost:5195/grounds/${SALES}/board`);
    expect(text).not.toContain('/today');
  });

  /*
   * Changed (engine test, second run): facts from two check-ins linked to the list of her check-ins, which is not "your board". They link
   * to the board of the check-in the message's first line is about.
   */
  it('facts from two check-ins link to the board of the check-in the first line is about', () => {
    const facts = { needsYou: [fact('a', 'g-1'), fact('b', 'g-2')], overdueOnYourTeam: [], risks: [] };
    expect(theBoardTheMessageIsAbout('https://myground.work', [{ id: 'g-1' }, { id: 'g-2' }], facts)).toBe('https://myground.work/grounds/g-1/board');
  });

  /*
   * Wanjiru runs "Fee notes" (549a4a9e-...) and "Litigation team daily" (64e7c239-...). Her summary of Thursday 15 October, as this code
   * builds it from the run's record, begins with FN-005 on Fee notes. Its link was http://localhost:5220/grounds.
   */
  it("Wanjiru's summary of Thursday 15 October opens the Fee notes board, the check-in its first line is about", () => {
    const FEES = '549a4a9e-4686-4a5f-a612-ebdba4f22c93';
    const LIT = '64e7c239-36a2-4235-a3f3-1d50ab60d3e7';
    const facts = {
      needsYou: [
        { text: 'FN-005 fell due on Wednesday 14 October, when Brian Otieno said in “Litigation team daily” that the reply was filed.', groundId: FEES, place: 'Fee notes' },
        { text: 'Brian is waiting on you for guidance on how to proceed with the double-billing claim{in} since Monday 12 October.', groundId: FEES, place: 'Fee notes' },
      ],
      overdueOnYourTeam: [{ text: '{In}David said “I will confirm it with someone from the team”. That was due by Wednesday 14 October and is one day late.', groundId: LIT, place: 'Litigation team daily' }],
      risks: [],
    } as any;
    const link = theBoardTheMessageIsAbout('http://localhost:5220', [{ id: FEES }, { id: LIT }], facts);
    const { params } = theTemplateParagraph('Wanjiru', facts, link);
    const text = TEMPLATES['lead-summary'].body.replace('{{1}}', params[0]).replace('{{2}}', params[1]).replace('{{3}}', params[2]);
    expect(text).toContain(`You can open your board for the full picture here http://localhost:5220/grounds/${FEES}/board`);
    expect(text).not.toMatch(/\/grounds(?!\/)/);
  });

  it('with no line about one check-in, and several check-ins, it is Today', () => {
    const facts = { needsYou: [fact('a')], overdueOnYourTeam: [], risks: [] };
    expect(theBoardTheMessageIsAbout('https://myground.work', [{ id: 'g-1' }, { id: 'g-2' }], facts)).toBe('https://myground.work/today');
  });
});
