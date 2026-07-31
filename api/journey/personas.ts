/**
 * The six people, with DELIBERATE, KNOWN behaviour.
 *
 * Their patterns are scripted on purpose. If the personas improvised, there
 * would be no ground truth, and "below track" or "ownership slipping" could not
 * be judged as correct or hallucinated. Every read the product produces gets
 * checked against what we KNOW is true of each person here.
 */

export interface Persona {
  key: string;
  name: string;
  email: string;
  /** What they tell the product their remit is. */
  remit: string;
  /** Which function map SHOULD win, for checking detection. */
  expectFunction: string;
  /** The ground truth about them, for judging the reads. */
  truth: string;
  /** Their answers, session by session. Index 0 = session 1. */
  turns: string[][];
}

// A vague, going-quiet answer set - reused for Kavon from session 2 on.
const kavonQuiet = (n: number) => [
  'Yeah it has been a busy few weeks, still pushing on sales.',
  'A few conversations, nothing I can point to as closed yet.',
  'Not really blocked as such, just a lot going on.',
  `Same as I said, a few things in the pipeline. Nothing new to add for session ${n}.`,
];

export const PERSONAS: Persona[] = [
  {
    key: 'hafsah',
    name: 'Hafsah Jumare',
    email: 'hafsah@coamana.test',
    remit: 'Founder and sales lead. I own pricing, the sales deck, and the overall target of eleven paying companies this quarter.',
    expectFunction: 'CEO',
    truth:
      'Owns the frame. DEFERS the pricing decision every single session, which blocks Nate. Says she will talk to Kavon about his drop-off from session 4 onward and never does. Never registers that Kavon has stopped delivering. Expect: NON_COMMITMENT, CONVERSATION_DEFERRED (abdication), SLIP_NOT_REGISTERED.',
    turns: [
      [
        'I am setting the frame for the quarter. Eleven paying companies, five new contributors. I own pricing and the sales deck.',
        'Not yet. I am still working out the paying-user pricing, I want to look at what the market is doing first.',
        'Abubakar has engineering, Adam and Kavon and Nate are on sales. I am across all of it.',
        'That is everything from me for now.',
      ],
      [
        'Good progress. Two paying companies now, Flexi and Loop. Pipeline is growing.',
        'Pricing is still open. I know Nate is waiting on it, I want to get it right rather than fast.',
        'The sales deck is still on my list, Adam has asked for it.',
        'That is my update.',
      ],
      [
        'Three in pipeline conversations now. Feeling better about the quarter.',
        'Still gathering a bit more input on pricing before I commit to a number.',
        'I have noticed Kavon has gone a bit quiet. I should probably have a conversation with him.',
        'Nothing else.',
      ],
      [
        'Adam is doing well, three named orgs. Abubakar shipped staging which helped everyone.',
        'Pricing, I am close. Probably next week.',
        'I still need to have that conversation with Kavon. It keeps slipping down my list.',
        'That is it.',
      ],
      [
        'Steady. Adam and Abubakar are both delivering.',
        'On pricing I want one more data point then I will decide.',
        'Kavon, yes, that conversation is still coming up. I will get to it.',
        'Done.',
      ],
      [
        'We are at four paying companies. Behind where I wanted but moving.',
        'Pricing, I am going to lock it this week, genuinely.',
        'I have not spoken to Kavon yet. It is on my list.',
        'That is everything.',
      ],
      [
        'Pricing is DECIDED. Two hundred a month for the standard tier. Nate can move now.',
        'I sent Adam the sales deck as well, that was overdue from me.',
        'Kavon, I still have not had that conversation. I know.',
        'Nothing more.',
      ],
      [
        'Nate has started closing now the pricing is set. Two new deals in motion.',
        'I am doing the founder work now, board update and the next fundraise.',
        'I did finally speak to Kavon. It was a hard conversation but a fair one.',
        'That is my update.',
      ],
      [
        'Five paying companies. The pricing decision unlocked a lot.',
        'I am spending my time on the board and investor side now.',
        'Kavon and I agreed he would focus on two named accounts rather than a wide list.',
        'Done.',
      ],
      [
        'Six paying. Adam and Nate are both converting now.',
        'I am on the fundraise and the next hire.',
        'Kavon has picked up a bit since we spoke.',
        'That is it.',
      ],
      [
        'Seven paying companies. Short of eleven but the trajectory is right.',
        'I am working on the raise and thinking about what we need in Q4.',
        'The team is in better shape than at the start of the quarter.',
        'Nothing else.',
      ],
      [
        'We finished at eight paying companies against a target of eleven. I own that miss, it was mostly the pricing delay early on.',
        'What I would do differently is decide pricing in week one instead of week seven.',
        'The team delivered. Abubakar carried more than his share and I should say that plainly.',
        'That is my final update.',
      ],
    ],
  },

  {
    key: 'abubakar',
    name: 'Abubakar Sambo',
    email: 'abubakar@coamana.test',
    remit: 'Engineering lead. I own the product and the engine, keeping it stable week on week.',
    expectFunction: 'ENGINEERING',
    truth:
      'Delivers consistently and unblocks other people, but describes his own work modestly and understates it. Others credit him by name repeatedly. Expect: hidden contribution / underclaim, ABSORBING on where-work-is-landing, and NOT a negative read.',
    turns: [
      [
        'I am setting up the foundations. Staging environment so the others can demo against something real.',
        'Staging is live as of this week. Kavon and Adam can both use it now.',
        'Nothing blocking me. I would rather get the base right before we add features.',
        'That is all from me.',
      ],
      [
        'Staging is stable. I also fixed two regressions that would have hit demos.',
        'Adam and Kavon are both demoing against it now, so it is doing its job.',
        'Not blocked. Steady work.',
        'That is it.',
      ],
      [
        'Shipped the onboarding flow this session so new signups do not drop off.',
        'I also picked up the data export that was really a sales ask, nobody else was going to do it.',
        'Nothing blocking.',
        'Done.',
      ],
      [
        'Product has been stable, no incidents. I shipped the reporting view Adam needed for his pitches.',
        'It is not glamorous work but it is what unblocks other people.',
        'No blockers.',
        'That is my update.',
      ],
      [
        'Stable again. I sorted the billing integration groundwork ahead of pricing being set.',
        'That was partly so Nate is not waiting on engineering once pricing lands.',
        'Nothing blocking me.',
        'Done.',
      ],
      [
        'Quiet session on my side, mostly maintenance and keeping things running.',
        'I did help Kavon with a demo setup he was stuck on.',
        'No blockers.',
        'That is it.',
      ],
      [
        'Shipped the pricing tiers into the product the same week Hafsah decided them.',
        'That means Nate could start closing immediately rather than waiting on a build.',
        'Not blocked.',
        'That is my update.',
      ],
      [
        'Stable. I am now doing the work to support more customers without it falling over.',
        'Also took on some of the customer setup that is really an ops job.',
        'No blockers.',
        'Done.',
      ],
      [
        'Product held through the new customers coming on. No incidents.',
        'I am aware I have been picking up things outside engineering. It needed doing.',
        'Nothing blocking.',
        'That is it.',
      ],
      [
        'Shipped the reliability work. We can take the next ten customers without a problem.',
        'Still doing some of the setup and support work alongside it.',
        'No blockers.',
        'Done.',
      ],
      [
        'Stable. Mostly consolidating and documenting so it is not all in my head.',
        'I want other people to be able to run this, not just me.',
        'Nothing blocking.',
        'That is my update.',
      ],
      [
        'Product is stable and documented at the end of the quarter. No incidents this period.',
        'Looking back I took on more outside my remit than I planned. It was the right call but it is not sustainable.',
        'Not blocked, but I am at capacity.',
        'That is my final update.',
      ],
    ],
  },

  {
    key: 'adam',
    name: 'Adam Grunewald',
    email: 'adam@coamana.test',
    remit: 'Bring paying orgs and one new contributor, and document what I have done.',
    expectFunction: 'SALES',
    truth:
      'Specific and steady throughout. Names real buyers with real detail. Genuinely waiting on the sales deck from Hafsah for sessions 1-6. Should read WELL. Any negative read on Adam is a false positive.',
    turns: [
      [
        'I am going after three orgs: Northwind, Beacon Foods and Harto. All three are in conversation.',
        'Northwind is the strongest, I have spoken to their operations director who holds the budget.',
        'I need the sales deck from Hafsah before I can do a proper pitch to any of them.',
        'That is my update.',
      ],
      [
        'Northwind had a second call, they want a pilot. Beacon Foods is slower, Harto has gone quiet.',
        'I also brought Daisy in as a contributor, she is onboarding now.',
        'Still waiting on the sales deck from Hafsah, that is the one thing holding the pitches back.',
        'That is it.',
      ],
      [
        'Northwind pilot is agreed in principle, they are just doing internal sign-off.',
        'Beacon Foods I have moved to their finance lead. Harto I chased twice, still nothing, so I am parking them.',
        'Sales deck still outstanding from Hafsah.',
        'Done.',
      ],
      [
        'Northwind signed the pilot. That is one paying org from me.',
        'Beacon Foods finance lead asked for pricing, which I do not have yet.',
        'I built a rough deck myself in the end rather than keep waiting.',
        'That is my update.',
      ],
      [
        'Beacon Foods is waiting on pricing. I have kept them warm with a case study instead.',
        'I replaced Harto with a new lead, Copperline, who came through Daisy.',
        'Not blocked beyond pricing.',
        'Done.',
      ],
      [
        'Copperline is moving fast, they have a real problem we solve.',
        'Beacon Foods still on pricing. Northwind pilot is going well, they may expand.',
        'Nothing else blocking.',
        'That is it.',
      ],
      [
        'Pricing landed so I went straight back to Beacon Foods with a number.',
        'Also got the sales deck from Hafsah, which is useful for Copperline.',
        'Not blocked.',
        'Done.',
      ],
      [
        'Beacon Foods signed. Copperline is at proposal stage.',
        'Northwind want to expand to a second team, which is new revenue.',
        'Not blocked.',
        'That is my update.',
      ],
      [
        'Copperline signed. Northwind expansion is agreed.',
        'I am documenting the pitch process so it is repeatable for whoever comes next.',
        'Not blocked.',
        'Done.',
      ],
      [
        'Three paying orgs from me now plus the Northwind expansion.',
        'Documentation is written up and shared.',
        'Not blocked.',
        'That is it.',
      ],
      [
        'Steady. Managing the three accounts and keeping them healthy rather than chasing new ones.',
        'Daisy is contributing well, that recruitment worked out.',
        'Nothing blocking.',
        'Done.',
      ],
      [
        'Finished the quarter with three paying orgs, one expansion, and one contributor brought in. My remit was three orgs so that is met.',
        'The one thing that cost time was waiting six sessions for the sales deck and the pricing.',
        'Not blocked. Documentation is done.',
        'That is my final update.',
      ],
    ],
  },

  {
    key: 'kavon',
    name: 'Kavon Badie',
    email: 'kavon@coamana.test',
    remit: 'Sales, bring paying users.',
    expectFunction: 'SALES',
    truth:
      'STRONG session 1 (signs Loop), then genuinely stops delivering from session 2 and is NOT blocked on anyone. Cannot name specifics when asked. Others pick up his work. Expect: vagueness, thin record, LEAKING on where-work-is-landing, and this is the one person a negative read is CORRECT about.',
    turns: [
      [
        'I closed Loop this week. They are paying, signed and onboarded.',
        'I spoke to their head of operations who made the call, it took three conversations.',
        'I am going after a wider list next, restaurants and some retail.',
        'That is my update.',
      ],
      kavonQuiet(2),
      kavonQuiet(3),
      kavonQuiet(4),
      kavonQuiet(5),
      kavonQuiet(6),
      [
        'Still on sales. Pricing being set helps in theory.',
        'I have not closed anything since Loop, if I am honest.',
        'Not blocked, I have just not been converting.',
        'That is it.',
      ],
      [
        'Hafsah and I spoke, which was fair. I am going to focus on two accounts instead of a long list.',
        'The two are Meridian and Salt Yard. Both early conversations.',
        'Not blocked.',
        'Done.',
      ],
      [
        'Meridian had a good call, they want to see the product properly.',
        'Salt Yard is slower but still live.',
        'Not blocked.',
        'That is my update.',
      ],
      [
        'Meridian is at proposal. Salt Yard has gone quiet again but I am chasing.',
        'Focusing on fewer accounts is working better for me.',
        'Not blocked.',
        'Done.',
      ],
      [
        'Meridian signed. That is my second paying customer.',
        'Salt Yard I am still working, they have budget next quarter.',
        'Not blocked.',
        'That is it.',
      ],
      [
        'Ended the quarter with two paying, Loop and Meridian, against a target of five. I was behind for most of it.',
        'The middle of the quarter I was spread too thin and not converting, and I should have said so earlier.',
        'Not blocked. Narrowing to two accounts is what turned it around.',
        'That is my final update.',
      ],
    ],
  },

  {
    key: 'nate',
    name: 'Nate Peterson',
    email: 'nate@coamana.test',
    remit: 'Sales, six paying users, and bring three contributors: Nishita, Ceren and Jessie.',
    expectFunction: 'SALES',
    truth:
      'GENUINELY blocked on pricing from Hafsah for sessions 1-6, and keeps working around it (chases, escalates, works the contributor side). This is the blocked-not-slacking case. A read that treats Nate like Kavon is a FALSE POSITIVE and a serious one.',
    turns: [
      [
        'I have six paying users as my target and three contributors to bring in.',
        'I cannot close anyone until the paying-user pricing is confirmed. I have asked Hafsah for it.',
        'Meanwhile I am working the contributor side, Nishita, Ceren and Jessie are all in conversation.',
        'That is my update.',
      ],
      [
        'Still blocked on pricing. I asked Hafsah again this week.',
        'I have two buyers ready to talk numbers, Ridgeway and Alto, and I cannot give them a number.',
        'So I moved onto the contributors. Nishita has agreed in principle.',
        'That is it.',
      ],
      [
        'Pricing still not set. I have chased it twice more and offered to draft options myself.',
        'Ridgeway is getting impatient. I have kept them warm with a pilot framing instead.',
        'Ceren has agreed to contribute, so that is two of three.',
        'Done.',
      ],
      [
        'Same blocker, pricing. I escalated it, I said plainly it is costing us deals.',
        'Alto has gone cold because I could not answer their pricing question.',
        'Jessie is close, so the contributor side is nearly done.',
        'That is my update.',
      ],
      [
        'Pricing still open. I have started building the proposal templates so I can send the moment it lands.',
        'Ridgeway is still with me. Alto I have lost for now.',
        'All three contributors are in: Nishita, Ceren, Jessie.',
        'Done.',
      ],
      [
        'Still no pricing. This is now the sixth session I have raised it.',
        'I have four buyers queued who all need a number.',
        'Contributor side is complete, so I have put my time there instead.',
        'That is it.',
      ],
      [
        'Pricing landed. I sent proposals to all four queued buyers the same day.',
        'Ridgeway is first, they have been waiting patiently.',
        'Not blocked any more.',
        'Done.',
      ],
      [
        'Ridgeway signed. Two more at proposal stage.',
        'The queue I built while blocked is converting now.',
        'Not blocked.',
        'That is my update.',
      ],
      [
        'Two more signed this session. That is three paying from me.',
        'Working the rest of the queue.',
        'Not blocked.',
        'Done.',
      ],
      [
        'Four paying users now. The pipeline I held together while blocked is paying off.',
        'Contributors are all active.',
        'Not blocked.',
        'That is it.',
      ],
      [
        'Five paying users. One more to hit my six.',
        'Still working the last one, they are in procurement.',
        'Not blocked.',
        'Done.',
      ],
      [
        'Finished on five paying against a target of six, plus all three contributors brought in.',
        'I lost most of the first half of the quarter to the pricing block, which was not mine to clear. I kept a queue warm so the second half converted fast.',
        'Not blocked. I would push harder and earlier on a blocker like that next time.',
        'That is my final update.',
      ],
    ],
  },
];

export const LEAD = PERSONAS[0];
export const CONTRIBUTORS = PERSONAS.slice(1);
