import { withoutADateNobodyGave, calendarDaysIn } from './a-date-nobody-gave';

/** The exact turn Ngozi read (api/journey/all-24/re-a/sales.json, session 1). */
describe('a date nobody gave', () => {
  const LIVE = "By the end of the quarter, so by December 31st.\n\nYou don't have a specific disbursed amount target. That's noted. What is stopping those facilities from converting?";
  const NGOZI = ["I'm aiming for 14 approved facilities.", "I don't have a specific disbursed amount target. I expect to achieve the 14 approvals by the end of the quarter."];

  it('does not tell Ngozi her quarter ends on 31 December', () => {
    const r = withoutADateNobodyGave(LIVE, NGOZI);
    expect(r.text).not.toMatch(/December|31st/);
    expect(r.text).toMatch(/What is stopping those facilities from converting\?/);
    expect(r.cut).toHaveLength(1);
  });

  it('reads days written either way round', () => {
    expect(calendarDaysIn('31 December and December 31st and 31st of December')).toEqual(['11-31', '11-31', '11-31']);
  });

  it('lets through a day somebody said', () => {
    expect(withoutADateNobodyGave('So by 30 September.', ['The quarter ends on 30 September.']).cut).toEqual([]);
  });

  it('lets through the day the product put to them, and any question naming a day', () => {
    expect(withoutADateNobodyGave('End of the year, so 31 December 2026. Is that right?', ['by year end', 'Your next date is 31 December 2026']).cut).toEqual([]);
    expect(withoutADateNobodyGave('When you say the end of the quarter, do you mean 31 December?', NGOZI).cut).toEqual([]);
  });

  it('does not cut a turn to nothing', () => {
    expect(withoutADateNobodyGave('So by December 31st.', NGOZI)).toEqual({ text: 'So by December 31st.', cut: [] });
  });
});
