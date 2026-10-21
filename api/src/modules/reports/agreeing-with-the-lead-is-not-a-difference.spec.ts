import { withoutDifferencesNobodyHad } from './agreeing-with-the-lead-is-not-a-difference';

/**
 * Grace's board from Tuesday to Thursday, engine test, second run: "You and Mercy Wairimu have different understandings of the team's
 * goal." The lines are Grace's, Mercy's and Joseph's own, word for word, by Thursday 15 October; the differences are the ones the
 * Thursday report stored.
 */
const said: Record<string, string[]> = {
  "Grace Achieng": [
    "I need to see each rep's deals to know what's real.",
    "hitting our target of 120 units sold by October 30th",
    "30 units for each of you",
    "each rep is aware of their individual target of 30 units",
    "My main responsibility is to support the team in hitting those targets and to close my own deals.",
    "I'm chasing a corporate lead at Lavington Business Park.",
    "I'm preparing a proposal for 20 units for Mr. Kiprop, their facilities manager, due next week.",
    "I don't have a specific date yet, just \"next week.\"",
    "I don't have an update on the current unit count today.",
    "I'll be checking in daily for their updates on deals in progress, sales with proof, and next steps. That's how we'll track progress.",
    "I need to get updates from Kevin, Mercy, Joseph, and Peter on their deals in progress, what was sold with proof, and what each does next.",
    "by October 30th",
    "each rep knows their individual target of 30 units.",
    "The 20 units for Mr. Kiprop are a separate potential deal I am working on.",
    "The team's sales are what Kevin, Mercy, Joseph, and Peter are closing.",
    "My proposed units for Mr. Kiprop would add to the overall target if he accepts the proposal.",
    "I sent the proposal for 20 units to Mr. Kiprop today.",
    "Mr. Kiprop would need to accept the proposal and either provide proof of payment or a signed order for the 20 units.",
    "a price of KES 4,800 per unit for orders of 10 or more.",
    "Each rep, Kevin, Mercy, Joseph, and Peter, is responsible for selling 30 units by October 30th.",
    "I don't have proof of his acceptance. He hasn't responded yet.",
    "I'm waiting for their updates. [INFERRED: from Kevin, Mercy, Joseph, and Peter]",
    "Mr. Kiprop has not answered yet.",
    "I'll follow up with him next week.",
    "I'll follow up with him on Monday.",
    "I'll send a reminder email on Monday, in addition to calling him.",
    "Mr Kiprop asked for a site visit next Tuesday.",
    "I have not done anything to arrange it yet. [INFERRED: 'it' refers to Mr Kiprop's site visit]",
    "I also met Mrs Atieno, but she hasn't decided anything about the dispensers and hasn't paid anything.",
    "I will call Mr. Kiprop on Monday if he doesn't respond tomorrow.",
  ],
  "Mercy Wairimu": [
    "Two of them already said they can't afford it",
    "I'll follow up with the remaining Kawangware kiosks this week to see if any are ready to commit.",
    "I'll follow up with the Kawangware kiosks by end of day Wednesday.",
    "I need to call Mrs. Achola at Greenfield Supermarket. I'll do that by the end of today.",
    "I want to see if I can get some orders from them.",
    "I don't have any proof of sales from them right now. No payments or signed orders yet.",
    "My target is 30 units",
    "We're all aiming for that 120 total as a team.",
    "by October 30th",
    "I visited 9 small kiosks in Kawangware",
    "spent the afternoon at Sunrise Primary School",
    "I also have Greenfield Supermarket as a lead.",
    "For active negotiations, it's really just the kiosks in Kawangware. Each of them is considering one unit.",
    "I don't have specific names from the Kawangware kiosks, I just visited lots of them.",
    "I'll follow up with the Kawangware kiosks next.",
    "I haven't called Mrs. Achola since last week.",
    "I'll also try to call Mrs. Achola at Greenfield; I know I should.",
    "At Sunrise Primary... they still have no budget this year.",
    "[Greenfield] need 25 units.",
    "Out of the 9 kiosks, 7 are still potential leads.",
    "For Kawangware... two still can't afford it.",
    "At Sunrise Primary, I went back yesterday and met the bursar.",
    "The school board decides.",
    "I'll check in with them in January when they might have a new budget.",
    "For Kawangware, the kiosks are still one unit each.",
    "My focus is definitely on hitting my 30 units.",
    "I don't have those details yet. I haven't spoken to Mrs. Achola since last week.",
    "I'm planning to revisit them tomorrow, Thursday. [INFERRED: 'them' are the Kawangware kiosks]",
    "The kiosk lead for 25 units is for Greenfield Supermarket, not individual small kiosks.",
    "I haven't made any sales this week, so my progress is still at zero units towards my 30.",
    "Nothing yet this week for me. No payments or signed orders have come in.",
    "The bursar said the same thing as the head teacher, that there's no budget until next year. [INFERRED: at Sunrise Primary]",
    "by October 30th",
    "The 120 units by October 30th is the team target, 30 for each of us.",
    "She needs it by Friday",
    "Still waiting for the signed order [INFERRED: implied by 'Still waiting']",
    "Mrs. Achola is ready to order 25 units.",
    "I sent over the quote for KES 125,000 today.",
    "My understanding is she will sign the order, and then they will process the payment.",
    "I'll follow up with Mrs. Achola on Friday if I haven't heard from her by then to see if she's reviewed the quote and is ready to sign.",
  ],
  "Joseph Kariuki": [
    "I'm going to follow up with Mrs. Atieno at Mama Pima Stores.",
    "My goal is to hit my target of 30 units, absolutely.",
    "about fifteen visits today alone.",
    "I've got some big deals in the pipeline that are basically closed.",
    "That 10-unit deal for Mama Pima is definitely part of my 30-unit target. It's basically closed.",
    "Mrs. Atieno is signing this week, so that 10-unit deal will be done.",
    "Things are moving forward nicely.",
    "My job is to get those water dispensers sold.",
    "Nothing, I've got this.",
    "Mama Pima is 15 units now, she's expanding.",
    "The owner of Juja Hardware is ready, just waiting for a price.",
    "I'll get that price to Juja Hardware this week for sure.",
    "I'm closing Juja Hardware and Mama Pima. That's 35 units.",
    "I need to know if we can offer a unit at KES 4,500.",
    "Our units are KES 5,000",
    "is that price allowed?",
    "I met the owner, Mr. Mutua, and he's interested in 5 units at KES 4,500 each",
    "Mama Pima paid a deposit.",
    "I'm expecting to hear back from her early next week.",
    "The Mama Pima deposit hasn't actually come through yet, she's still choosing.",
    "I was busy in the field yesterday, so I haven't had a chance to get a decision on the KES 4,500 price yet.",
    "Their [INFERRED: Juja Hardware's] need is for dispensers, the owner Mr. Mutua makes the decision, and he wants 5 units if the price is KES 4,500 each.",
    "Juja Hardware will sign on Monday.",
    "I have close to 30 units in the pipeline.",
    "She's [INFERRED: Mrs Atieno] still choosing between us and another supplier",
    "it's looking like maybe 5 units from her [INFERRED: Mrs Atieno].",
    "I need to hear her final decision on the number of units and confirmation of payment.",
  ],
};
const CUSTOMERS = ['Greenfield Supermarket', 'Juja Hardware', 'Kamau Electricals', 'Kilele Hotel', 'Lavington Business Park', 'Mama Pima Stores', "Mama Rose's Kiosk", 'Ngong Road Minimart', 'Roysambu Gym', 'Savannah Cafe', 'Sunrise Primary School', 'Upper Hill Offices'];
const PEOPLE = ['Grace', 'Kevin', 'Mercy', 'Joseph', 'Peter'];
const linesOf = (label: string) => said[label] ?? null;

const thursday = [
  {
    topic: 'The status of the deal with Mama Pima stores is described in two directly contradictory ways.',
    positions: [
      { participantLabel: 'Joseph Kariuki', view: 'the deal as progressing, first stating it was for 10 units and "basically closed" then updating it to 15 units with a deposit paid.' },
      { participantLabel: 'Grace Achieng', view: 'meeting with the same client, who they report has not yet paid anything or made a decision.' },
    ],
  },
  {
    topic: 'It is not clear whether your own sales contribute to the 120-unit team target or are in addition to it.',
    positions: [
      { participantLabel: 'Grace Achieng', view: 'a potential 20-unit sale they are working on as something that "would add to the overall target" suggesting it is separate from the team\'s 120 units.' },
      { participantLabel: 'Mercy Wairimu', view: 'the goal as "that 120 total as a team" which is the sum of the four representatives\' individual 30-unit targets.' },
    ],
  },
  {
    topic: 'There is no shared understanding of the rules for offering discounts on the price of a unit.',
    positions: [
      { participantLabel: 'Joseph Kariuki', view: 'Joseph Kariuki asked if it was permissible to offer a unit price of KES 4,500 to close a 5-unit deal.' },
      { participantLabel: 'Grace Achieng', view: 'a price of KES 4,800 per unit for orders of 10 or more.' },
    ],
  },
];

describe("The differences on Grace's board on Thursday 15 October", () => {
  const kept = withoutDifferencesNobodyHad(thursday, linesOf, CUSTOMERS, PEOPLE);

  it('leaves out the one that set Mercy against Grace, who both said 120 units and 30 each', () => {
    expect(kept.divergences.map((d) => d.topic)).not.toContain('It is not clear whether your own sales contribute to the 120-unit team target or are in addition to it.');
    expect(kept.leftOut).toEqual(['It is not clear whether your own sales contribute to the 120-unit team target or are in addition to it.']);
  });

  it("keeps Joseph's Mama Pima story against what Mrs Atieno told Grace, and the discount", () => {
    expect(kept.divergences.map((d) => d.topic)).toEqual([
      'The status of the deal with Mama Pima stores is described in two directly contradictory ways.',
      'There is no shared understanding of the rules for offering discounts on the price of a unit.',
    ]);
  });

  it('keeps a real difference about the target, where one person gives another number', () => {
    const peter: Record<string, string[]> = { ...said, 'Peter Njoroge': ['My target is 25 units by the end of the month.'] };
    const d = [{ topic: 'What each rep is aiming for.', positions: [{ participantLabel: 'Grace Achieng', view: 'each rep has a target of 30 units' }, { participantLabel: 'Peter Njoroge', view: 'his target is 25 units' }] }];
    expect(withoutDifferencesNobodyHad(d, (l) => peter[l] ?? null, CUSTOMERS, PEOPLE).divergences).toHaveLength(1);
  });

  it('a check-in that is not a sales one keeps every difference, as before', () => {
    expect(withoutDifferencesNobodyHad(thursday, linesOf, null, PEOPLE).divergences).toHaveLength(3);
  });
});
