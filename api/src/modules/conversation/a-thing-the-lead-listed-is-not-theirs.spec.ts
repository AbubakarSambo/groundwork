import { thingsTheBriefLists, withoutAThingTheLeadListedAsTheirs, WHAT_IS_ASKED_INSTEAD } from './a-thing-the-lead-listed-is-not-theirs';

/** The brief and the three opening turns exactly as served (loans, re-a). Hauwa had a freezer, Grace a freezer, Esther a pump. */
const BRIEF =
  'Eight people took an asset loan from us six months ago - a grinding machine, a freezer, a tricycle, a borehole pump. '
  + 'Repayment is behind across the cohort. I do not want to ask "did you repay".';

describe('a thing the lead listed is not theirs', () => {
  it('reads the four assets out of the brief', () => {
    expect(thingsTheBriefLists(BRIEF)).toEqual(['grinding machine', 'freezer', 'tricycle', 'borehole pump']);
  });

  it('does not tell Hauwa, who has a freezer, that she has a grinding machine', () => {
    const live = "We're here to talk about what has happened with your grinding machine since you received it.";
    const r = withoutAThingTheLeadListedAsTheirs(live, BRIEF, []);
    expect(r.text).toBe(WHAT_IS_ASKED_INSTEAD);
    expect(r.text).not.toMatch(/grinding/i);
  });

  it('does not tell Grace she received a grinding machine, and keeps the question that followed', () => {
    const live = 'You received a grinding machine six months ago. What has your business done with it since?';
    const r = withoutAThingTheLeadListedAsTheirs(live, BRIEF, []);
    expect(r.text).toBe('What has your business done with it since?');
  });

  it('does not ask Esther what her business does with a grinding machine', () => {
    const r = withoutAThingTheLeadListedAsTheirs('And what is your business actually doing with the grinding machine?', BRIEF, ['I have the pump in Oyo.']);
    expect(r.text).toBe(WHAT_IS_ASKED_INSTEAD);
  });

  it('leaves it alone when the person said it themselves', () => {
    const t = 'What has your grinding machine been earning?';
    expect(withoutAThingTheLeadListedAsTheirs(t, BRIEF, ['My grinding machine is in Kaduna.'])).toEqual({ text: t, cut: [] });
  });

  it('leaves a turn that does not address them about a listed thing', () => {
    const t = 'Some people had a freezer and some a pump. What did you receive?';
    expect(withoutAThingTheLeadListedAsTheirs(t, BRIEF, [])).toEqual({ text: t, cut: [] });
  });

  it('does nothing when the brief lists nothing', () => {
    const t = 'What did you do with your pump?';
    expect(withoutAThingTheLeadListedAsTheirs(t, 'Repayment is behind.', [])).toEqual({ text: t, cut: [] });
  });
});
