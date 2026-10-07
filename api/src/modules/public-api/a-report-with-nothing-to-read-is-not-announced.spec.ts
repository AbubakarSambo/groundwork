import { nothingToReadYet, reportAsText, THANKS_YOUR_ANSWER_IS_IN } from './a-whatsapp-message-is-routed';

/** B-021: Zawadi and Amani were told "Your report ... is ready. Not everyone has answered yet, so there is nothing to agree or differ with." */
const forming = { state: 'forming', whereThingsStand: { agreed: 0, stillOpen: 0, saying: 'Not everyone has answered yet, so there is nothing to agree or differ with.' }, atAGlance: [] };

describe('what a person is told after they answer, while others have not', () => {
  it('is thanked, and told when they will hear, not told a report is ready', () => {
    expect(nothingToReadYet(forming)).toBe(true);
    expect(THANKS_YOUR_ANSWER_IS_IN('Sales team, Q4')).toBe('Thank you, your answer for Sales team, Q4 is in. The shared picture is made once everyone has answered, and you will be told as soon as there is something to read.');
  });
  it('is told the report is ready when there is something in it', () => {
    expect(nothingToReadYet({ ...forming, whereThingsStand: { agreed: 2, stillOpen: 1, saying: '2 settled, 1 still open.' } })).toBe(false);
    expect(nothingToReadYet({ ...forming, state: 'final' })).toBe(false);
    expect(reportAsText({ ...forming, whereThingsStand: { agreed: 2, stillOpen: 1, saying: '2 settled, 1 still open.' } }, 'Sales team, Q4')).toContain('Your report for Sales team, Q4 is ready.');
  });
});
