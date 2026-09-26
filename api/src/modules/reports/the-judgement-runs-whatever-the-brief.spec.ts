import { theJudgementOverARoom, thisIsARoom } from './the-judgement-over-the-answers';

/**
 * EIGHT OF THE TWENTY-FOUR REPORTS HAD NO JUDGEMENT, AND ONE NUMBER EXPLAINED ALL EIGHT.
 *
 * `theFrameFor` refused to read a brief under forty words, on the reasoning that such a brief is a
 * question rather than a specification. `judgeTheAnswers` then opened with a return on an empty
 * frame. So a lead who wrote plainly got no judgement at all, and nothing said why.
 *
 * The eight with no judgement were exactly the eight grounds whose brief was under forty words.
 * `drift` was judged at exactly forty. `board` was not, at thirty-nine.
 *
 * Hafsah, 26 September 2026: "The judgement must run whatever the length of the lead's
 * description, so remove the 40-word threshold." Removed, and the guard below it removed too,
 * because a room read never used the frame in the first place.
 */
describe('what the room judgement is told', () => {
  const it_ = theJudgementOverARoom('whoever called this check-in', 'what to do next', 'Caroline Mensah');

  /*
   * THE WORKPLAN REPORT ACCUSED THE LEAD OF SOMETHING NOBODY SAID. Live on the run of 26
   * September, on the lead's own report: "You are describing a spending problem, but the record
   * shows a planning problem THAT YOU CREATED. You have not set a budget or done the work they
   * said they would." Nobody in that check-in said any of that. The licence for it was the rule
   * directly above, which invites a finding about how the lead is running things.
   */
  it('forbids a charge no account made, and says where the line is', () => {
    expect(it_).toContain("NOTHING IS ANYBODY'S FAULT UNLESS AN ACCOUNT SAYS SO");
    expect(it_).toContain('unless one of the blocks actually says it');
    expect(it_).toContain('a charge nobody made is an invention');
  });

  it('shows the difference with the pair of sentences that made it', () => {
    expect(it_).toContain('"Nobody wrote the target down" is what the record holds');
    expect(it_).toContain('"You created this problem" is a charge');
  });

  it('puts the limit immediately after the licence it limits', () => {
    const licence = it_.indexOf('Where the record shows something about how they are running it');
    const limit = it_.indexOf("NOTHING IS ANYBODY'S FAULT UNLESS AN ACCOUNT SAYS SO");
    expect(licence).toBeGreaterThan(-1);
    expect(limit).toBeGreaterThan(licence);
  });

  /*
   * AND THE FINDING IT MISSED. The right answer for that scenario is that the plan comes to 141%
   * of the budget because two leads have both costed the same contractor, and neither knows. That
   * fact is in neither person's block. It only exists between them.
   */
  it('tells it to read across the blocks, which is where that finding lives', () => {
    expect(it_).toContain('THE SAME THING IN TWO BLOCKS IS USUALLY THE FINDING');
    expect(it_).toContain('two people’s accounts who do not know about each other'.replace('’', "'"));
    expect(it_).toContain('Two people costing the same contractor into two different plans');
    expect(it_).toContain('it only exists between them');
  });

  it('still says everything it said before, so nothing was traded away for these', () => {
    expect(it_).toContain('THE ONE RULE: every sentence names a PERSON');
    expect(it_).toContain('NEVER MERGE TWO PEOPLE WHOSE REASONS DIFFER');
    expect(it_).toContain('NEVER DECIDE ABOUT A PERSON');
    expect(it_).toContain('THE PERSON RUNNING THIS IS Caroline Mensah');
  });

  it('a check-in of two or three people is a room, which is the path all this is on', () => {
    expect(thisIsARoom(2)).toBe(true);
    expect(thisIsARoom(3)).toBe(true);
  });
});
