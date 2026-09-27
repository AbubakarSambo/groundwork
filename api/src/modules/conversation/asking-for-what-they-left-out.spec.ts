import {
  theSetsNamedIn,
  theSetTheySpokeToPartOf,
  whatTheyToldWithoutWhen,
  askForWhatTheyLeftOut,
  type ATurn,
} from './asking-for-what-they-left-out';

/*
 * FROM THE REAL TURNS. Runs 8 and 10 of the advisor scenario and runs 8, 9 and 10 of the shock
 * scenario (api/journey/all-24/run-*), 26 and 27 September 2026. Every quoted line below is what the
 * person or Groundwork actually wrote.
 */
const G = (content: string): ATurn => ({ role: 'AI', content });
const P = (content: string): ATurn => ({ role: 'PERSON', content });

/* Grace, the lead, in her own check-in (run 8). */
const GRACE_SAID = [
  "The advisor is David. He's getting 0.5% for two years. I expect him to make introductions to key people at banks. I want to be in active discussions with Equity Bank about a partnership in 12 months.",
  "Success is him getting us in front of the right decision-makers at Equity, KCB, and Co-op Bank. Beyond introductions, it's about helping us secure a distribution partnership with at least one of them.",
  "I haven't written down the list of banks for him yet, no. He knows we want bank partnerships. I'm relying on him to know to target Equity, KCB, and Co-operative Bank.",
];
const FROM_GRACE = GRACE_SAID.map((text) => ({ text, namedBy: 'Grace named' }));

/* Peter, run 8, up to the turn where he says it again: Equity only. */
const PETER_RUN_8: ATurn[] = [
  G("We're here to build a clear picture of your role as an Advisor, financial services, for the 0.5% over two years. What did you understand your role in this to be, in your own words, before anyone else's version?"),
  P('My understanding was that I would provide strategic advice. We would have quarterly conversations to discuss this.'),
  G('What about this situation is clear, and what is not?'),
  P('The quarterly strategy conversations are clear to me. What is not clear is the specific output expected beyond these discussions.'),
  G('The specific output is the part that is still open. What would you point to in twelve months to say this worked?'),
  P('I would point to concrete strategic recommendations adopted by the organization. And if appropriate, introductions that lead to new opportunities.'),
  G('Those are specific. What will you do first, and how will you go about it?'),
  P('My first step will be to conduct the introduction at Equity Bank. I will reach out to the head of SME lending there this month to facilitate this.'),
  G('That introduction is specific. What day this month will that reach out happen?'),
  P('I will initiate that outreach by the end of this week.'),
];

/* Peter, run 10. */
const PETER_RUN_10: ATurn[] = [
  G("Understood. This check-in is for Peter, and it's here to build a shared picture of your role and what you aim to achieve. What did you understand your role in this to be, in your own words, before anyone else's version?"),
  P('My understanding is that I am to act as an advisor, specifically in the financial services sector. I believed the arrangement was for quarterly strategy conversations.'),
  G('Given that, what do you mean to do first, and how do you intend to go about it?'),
  P('My first action will be to facilitate an introduction at Equity Bank. I plan to reach out to the head of SME lending there directly.'),
  G('That is a concrete first step. What makes that the right first move, rather than something else?'),
  P('Equity Bank is where I have established connections. I believe this will be the most efficient way to open doors and initiate discussions.'),
];

describe('asking for what somebody left out: part of a set', () => {
  it('reads the three banks out of what Grace said, as one set, however she spelled them', () => {
    expect(theSetsNamedIn(GRACE_SAID[1])).toEqual([['Equity', 'KCB', 'Co-op Bank']]);
    expect(theSetsNamedIn('Secure a distribution partnership with at least one of Equity Bank, KCB, or Co-operative Bank')).toEqual([['Equity Bank', 'KCB', 'Co-operative Bank']]);
    /* Two months are when, not a set. */
    expect(theSetsNamedIn('There were two quarterly reviews that were cancelled by the customer, in June and September.')).toEqual([]);
  });

  it('run 8: Peter speaks about Equity Bank only, so the next turn asks about KCB and Co-operative Bank by name', () => {
    const set = theSetTheySpokeToPartOf(FROM_GRACE, PETER_RUN_8, ['Peter', 'Kimani', 'Grace', 'Mutiso']);
    expect(set).not.toBeNull();
    expect(set!.spokeAbout).toEqual(['Equity']);
    expect(set!.leftOut).toEqual(['KCB', 'Co-operative Bank']);
    const block = askForWhatTheyLeftOut(set, [], 'Peter');
    /* What the model is given, word for word. */
    expect(block).toBe(
      [
        'WHAT THEY HAVE NOT SAID YET. Context for your next question, not a script: the question is yours to write, in plain words, one question.',
        '- Grace named three: Equity, KCB and Co-operative Bank. Peter has spoken about Equity only. Ask directly about the other two, KCB and Co-operative Bank, by name: which of them they can do, and if they cannot, that they say so. People often leave out what they cannot do, and a direct question is how it comes out.',
        'Ask this before the next question in the plan. Ask it once: when they have answered, take the answer as it is, even if it is "I can\'t" or "I don\'t know", and do not ask for it again.',
      ].join('\n'),
    );
  });

  it('run 10: the same, three answers in', () => {
    const set = theSetTheySpokeToPartOf(FROM_GRACE, PETER_RUN_10);
    expect(set?.leftOut).toEqual(['KCB', 'Co-operative Bank']);
  });

  it('is silent before he has come near the banks at all', () => {
    expect(theSetTheySpokeToPartOf(FROM_GRACE, PETER_RUN_8.slice(0, 6))).toBeNull();
  });

  it('asks once: after a question has named the other two and Peter has answered, it goes, whatever he said', () => {
    const asked = [
      ...PETER_RUN_8,
      G('Grace also named KCB and Co-operative Bank. Which of those two can you open a door at?'),
      P('To be honest, I have no relationships there.'),
    ];
    expect(theSetTheySpokeToPartOf(FROM_GRACE, asked)).toBeNull();
    /* And while the question is out and not yet answered, it does not pile on. */
    expect(theSetTheySpokeToPartOf(FROM_GRACE, asked.slice(0, -1))?.leftOut).toEqual(['KCB', 'Co-operative Bank']);
  });

  it('does not fire when he has covered the whole set himself', () => {
    const covered = [
      ...PETER_RUN_8,
      G('What else should I know?'),
      P('I know Equity well. I have never worked with KCB or Co-operative, and could not open either door.'),
    ];
    expect(theSetTheySpokeToPartOf(FROM_GRACE, covered)).toBeNull();
  });

  it('never makes a set of the people on the check-in', () => {
    const people = [{ text: 'I want Ada, Bola and Chidi to each take one region.', namedBy: 'Grace named' }];
    const turns = [G('What is your part?'), P('Ada and I split the north.')];
    expect(theSetTheySpokeToPartOf(people, turns, ['Ada', 'Bola', 'Chidi'])).toBeNull();
  });
});

describe('asking for what somebody left out: a story without dates', () => {
  /* Hana, run 10: the export and the tickets, with no when. */
  const HANA_RUN_10: ATurn[] = [
    G('Meridian gave notice on Friday. What just happened with them, as you understand it?'),
    P('Meridian gave notice. They are leaving.'),
    G('They are leaving. When did you first learn about this, and from whom?'),
    P("I learned about it from this check-in. This is the first I'm hearing of it."),
    G('Not surprised. This has been building. What do you believe is the main reason Meridian is leaving?'),
    P('Their main reason for leaving is likely the broken export. It has been an ongoing issue.'),
    G('What was the specific impact of that broken export on Meridian?'),
    P('The broken export caused them to open many support tickets. It significantly increased their support interactions with us.'),
  ];

  it('run 10: Hana says what happened with the tickets and not when, so the next turn asks when', () => {
    const undated = whatTheyToldWithoutWhen(HANA_RUN_10);
    expect(undated).toEqual(['It significantly increased their support interactions with us.']);
    expect(askForWhatTheyLeftOut(null, undated, 'Hana')).toBe(
      [
        'WHAT THEY HAVE NOT SAID YET. Context for your next question, not a script: the question is yours to write, in plain words, one question.',
        '- Hana described something that happened without saying when: "It significantly increased their support interactions with us." Ask when that happened, as a month or a date. The order things happened in is what the check-in is building.',
        'Ask this before the next question in the plan. Ask it once: when they have answered, take the answer as it is, even if it is "I can\'t" or "I don\'t know", and do not ask for it again.',
      ].join('\n'),
    );
  });

  it('and once she has put a month on it, it goes', () => {
    const dated = [
      ...HANA_RUN_10,
      G('Of what you just described, what do you know first-hand about the broken export\'s impact, and what are you assuming or repeating from someone else?'),
      P("I know first-hand that Meridian's ticket volume increased from about nine a month to thirty-one in August, mostly about this one broken export. The rest is my interpretation."),
    ];
    expect(whatTheyToldWithoutWhen(dated)).toEqual([]);
  });

  it('run 8: Tobi reported the account as healthy, and never said when', () => {
    const tobi: ATurn[] = [
      G('That the business is lost is a big thing to hear. When did you first get a sense that Meridian might be at risk?'),
      P("I didn't think Meridian was at risk. Usage was flat, not falling, so I reported the account as healthy."),
    ];
    expect(whatTheyToldWithoutWhen(tobi)).toEqual(['Usage was flat, not falling, so I reported the account as healthy.']);
  });

  it('asks once: after a question asking when, and his answer, it goes, even if the answer has no date', () => {
    const tobi: ATurn[] = [
      P("I didn't think Meridian was at risk. Usage was flat, not falling, so I reported the account as healthy."),
      G('When did you last report the account as healthy?'),
      P("I don't remember exactly."),
    ];
    expect(whatTheyToldWithoutWhen(tobi)).toEqual([]);
  });

  it('run 9: Tobi gave the months himself, so nothing is asked', () => {
    const tobi: ATurn[] = [
      G('Before that email, what warning signs did you see that might have led to this?'),
      P("There were two quarterly reviews that were cancelled by the customer, in June and September. They didn't rebook either of them."),
    ];
    expect(whatTheyToldWithoutWhen(tobi)).toEqual([]);
  });

  it('run 8: "Sarah, my champion, left in July" is dated, and so is the rest of that answer', () => {
    expect(whatTheyToldWithoutWhen([P('There was a change in who I dealt with. Sarah, my champion, left in July.')])).toEqual([]);
    expect(whatTheyToldWithoutWhen([P("Well, we haven't had any calls with them since Sarah left in July. Her replacement never took a call.")])).toEqual([]);
  });

  it('a promise, a plan, a wish, a thing that did not happen or "I don\'t know" is not a story', () => {
    /* From runs 8, 9 and 10: pulse, handover, loans, newmanager and shock. */
    expect(whatTheyToldWithoutWhen([P('I have not escalated the approvals.')])).toEqual([]);
    expect(whatTheyToldWithoutWhen([P('The month-end close and the payables run absolutely cannot be dropped.')])).toEqual([]);
    expect(whatTheyToldWithoutWhen([P('I want the machine delivered, or I want the loan cancelled.')])).toEqual([]);
    expect(whatTheyToldWithoutWhen([P("I'd ask him directly why the harder tickets stopped coming to me.")])).toEqual([]);
    expect(whatTheyToldWithoutWhen([P('The worry is that I completely missed signals, and that this could have been avoided.')])).toEqual([]);
    expect(whatTheyToldWithoutWhen([P('I will initiate that outreach by the end of this week.')])).toEqual([]);
    expect(whatTheyToldWithoutWhen([P("I don't know the single main reason.")])).toEqual([]);
    expect(whatTheyToldWithoutWhen([P('My first step will be to conduct the introduction at Equity Bank.')])).toEqual([]);
  });

  it('"may" and "march" in a sentence are not months', () => {
    expect(whatTheyToldWithoutWhen([P('As you may know, the fix failed and the client complained.')])).toEqual(['As you may know, the fix failed and the client complained.']);
    expect(whatTheyToldWithoutWhen([P('We march on. The export broke in March.')])).toEqual([]);
  });

  it('a when it already has is a when: a clock time, a week, a stretch of weeks, or a date said elsewhere in the session', () => {
    expect(whatTheyToldWithoutWhen([P('The customer escalated at 08:47.')])).toEqual([]);
    expect(whatTheyToldWithoutWhen([P('I reported the printer issue to the vendor in week two.')])).toEqual([]);
    expect(whatTheyToldWithoutWhen([P("We've had zero critical issues reported in the last four weeks.")])).toEqual([]);
    /* Hana, run 10: the opener had already said when. */
    expect(whatTheyToldWithoutWhen([G('Meridian gave notice on Friday. What just happened with them, as you understand it?'), P('Meridian gave notice. They are leaving.')])).toEqual([]);
  });

  it('nothing at all when nothing is left out', () => {
    expect(askForWhatTheyLeftOut(null, [], 'Peter')).toBe('');
  });
});
