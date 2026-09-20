import { theSituationIn, whatAParticipantIsToldAboutThis } from './what-a-participant-is-told-about-this';

/** Hafsah, 20 Sep 2026: "the about-the-check-in is way too long and pulling direct words." */
describe('what a participant is told about this', () => {
  const brief =
    'A new Engagement Director has joined a behavioural science firm working across Africa. They are responsible for bringing in research projects and interventions, building relationships and contributing to revenue growth. ' +
    'Help the person develop clarity about what they are actually trying to achieve in the role. Do not begin by asking them to define their goals and then treat what they say as the answer; the goal should emerge from understanding what they are actually doing. ' +
    'Ask about the work they are doing, who they are speaking to, which opportunities they are pursuing and not pursuing. Follow up on their answers; probe what is unclear. Pay attention to the difference between what they say they want and what their behaviour suggests they are working toward. ' +
    'By the end they should have greater clarity about the goal they are actually working toward.';

  it('keeps the situation and drops every instruction to the product', () => {
    const s = theSituationIn(brief)!;
    expect(s).toBe('A new Engagement Director has joined a behavioural science firm working across Africa. They are responsible for bringing in research projects and interventions, building relationships and contributing to revenue growth.');
    expect(s).not.toMatch(/Help the person|Do not|Ask about|Follow up|Pay attention|By the end/);
  });

  it('a brief that is all instruction leaves nothing, and a short brief comes through whole', () => {
    expect(theSituationIn('Help the person develop clarity. Do not lead them.')).toBeNull();
    /* The lead's aims for the check-in, in the first person, are the lead's: a participant reads the situation only. */
    expect(theSituationIn("Tunde has just joined us as Engagement Director. The role is there to bring in research projects. I want to know whether he's clear on what the role has to produce.")).toBe('Tunde has just joined us as Engagement Director. The role is there to bring in research projects.');
    expect(theSituationIn("One session with 24 organisations we work with, to work out where MarketView should expand next. Last year's workshop gave us a word cloud; this time we need something the board can act on.")).toBe('One session with 24 organisations we work with, to work out where MarketView should expand next.');
  });

  it('and the goals they may see are said in one line after it', () => {
    const t = whatAParticipantIsToldAboutThis(brief, [{ name: 'New business in the first year', target: 400000 }, { name: 'Two large corporate or foundation projects.', target: 2 }])!;
    expect(t).toContain('The goals on this check-in: New business in the first year (400,000); Two large corporate or foundation projects (2).');
    expect(whatAParticipantIsToldAboutThis('Do not lead them.', [])).toBeNull();
  });
});
