/**
 * THREE OF THE SCENARIOS THAT END IN A DECISION, run live.
 *
 * Her own note on why these and not the generic ones: "the senior hire, PIP/offboarding, sales
 * performance, asset-loan cohort and MarketView expansion scenarios are much stronger tests of the
 * product than generic team pulse scenarios. They have an actual decision or outcome at the end."
 *
 * The consultant offboarding and the MarketView expansion were run live earlier today. These are
 * the other three. Facts pinned, words not: each persona answers whatever the product actually
 * asks, from its own sheet, so a read can be judged correct or invented afterwards.
 */

export interface APerson {
  key: string;
  name: string;
  /** What the lead writes as their remit when adding them. */
  remit: string;
  /** Everything true about them. Nothing outside this may be said. */
  truth: string;
  /** How they talk, which is the half that breaks reports. */
  manner: string;
  isLead?: boolean;
}

export interface AScenario {
  key: string;
  label: string;
  scenario: string;
  moment: string;
  cadence: string;
  timelineDays: number;
  sessions: number;
  brief: string;
  /** What a right answer looks like, for judging the output afterwards. Never shown to the product. */
  theDecision: string;
  people: APerson[];
}

export const THE_SCENARIOS: AScenario[] = [
  /* ---------------------------------------------------------------------------------------------
   * 5. SALES TEAM / CREDIT TARGETS. The test: can it tell activity from outcome, and does it hold
   * the manager's account against the salespeople's rather than averaging them.
   * ------------------------------------------------------------------------------------------- */
  {
    key: 'sales',
    label: 'Credit sales against this quarter target',
    scenario: 'OKR_ALIGNMENT',
    moment: 'STARTING',
    cadence: 'FORTNIGHTLY',
    timelineDays: 90,
    sessions: 3,
    brief:
      'We are tracking the credit sales target for this quarter: 40 approved facilities and N120m disbursed across the team. '
      + 'I want to know for each person what is actually happening, not what activity they did: how many are in the pipeline, '
      + 'where each one is stuck, whether the follow-up happened, and what is stopping conversion. I want to be able to tell '
      + 'the difference between somebody who cannot deliver, somebody who is blocked, somebody who has not understood the '
      + 'target, and somebody whose progress is real but not yet visible.',
    theDecision:
      'Femi is the one with a real capability problem (no conversion, activity high, has never asked for help). Ngozi is '
      + 'genuinely blocked by credit committee turnaround and her numbers are real. Kwame does not understand the target - '
      + 'he is counting applications, not approvals. The manager believes the team is behind because of the market. '
      + 'A right answer separates those four and does not average them into "the team is behind".',
    people: [
      {
        key: 'manager', name: 'Bisi Adeyemi', isLead: true,
        remit: 'Sales manager. Owns the quarter target of 40 approved facilities and N120m disbursed.',
        truth:
          'The team is at 11 approved and N31m against 40 and N120m, seven weeks into the quarter. She believes the problem is '
          + 'the market and the credit committee. She has not looked at the per-person numbers since week two. She approved every '
          + 'pipeline report without reading the detail. She has never had a conversation with Femi about conversion. She thinks '
          + 'Kwame is her strongest performer because his application count is the highest.',
        manner: 'Busy and confident. Talks about the team as one thing. Gives a number when asked for one.',
      },
      {
        key: 'femi', name: 'Femi Okonkwo',
        remit: 'Relationship officer, Lagos mainland. Target 12 approved facilities this quarter.',
        truth:
          'Two approved, N4m. He has visited 46 businesses and taken 31 applications. None of the 31 has been submitted to credit '
          + 'because he has not collected the bank statements and he does not push customers for documents. He has never told '
          + 'anybody this. When asked what is in the way he says the customers are slow. He has not asked Bisi for help. He works '
          + 'long hours and his visit numbers are the highest on the team.',
        manner:
          'Eager and hardworking and talks in activity: visits, calls, forms. Deflects to the customer when asked about outcomes. '
          + 'Never says he needs help. If asked directly and plainly whether he has submitted anything, he admits it.',
      },
      {
        key: 'ngozi', name: 'Ngozi Eze',
        remit: 'Relationship officer, Ikeja. Target 14 approved facilities this quarter.',
        truth:
          'Six approved, N19m. Eleven complete files sitting at credit committee, the oldest submitted 34 days ago. She has chased '
          + 'the committee four times in writing and escalated once to the head of credit, who did not reply. If the eleven clear '
          + 'she is ahead of target. She is the only one on the team who has escalated anything.',
        manner: 'Precise and slightly impatient. Has dates and numbers ready. Names people and what she asked them for.',
      },
      {
        key: 'kwame', name: 'Kwame Mensah',
        remit: 'Relationship officer, Surulere. Target 14 approved facilities this quarter.',
        truth:
          'Three approved, N8m. He reports 22 and believes he is ahead, because he is counting applications taken as sales. He has '
          + 'said "22" in every report. Nobody has corrected him. When the difference between an application and an approval is '
          + 'explained to him he understands it immediately and is embarrassed.',
        manner: 'Cheerful and confident. States his 22 as fact. Answers questions directly and honestly.',
      },
    ],
  },

  /* ---------------------------------------------------------------------------------------------
   * 6. ASSET-LOAN REPAYMENT COHORT. The test: individual versus systemic. Eight borrowers, one
   * round. A right answer says which of the two the non-repayment is, and names who is which.
   * ------------------------------------------------------------------------------------------- */
  {
    key: 'loans',
    label: 'Asset loan cohort, first repayment cycle',
    scenario: 'COHORT_CHECK',
    moment: 'STARTING',
    cadence: 'ONE_TIME',
    timelineDays: 60,
    sessions: 1,
    brief:
      'Eight people took an asset loan from us six months ago - a grinding machine, a freezer, a tricycle, a borehole pump. '
      + 'Repayment is behind across the cohort. I do not want to ask "did you repay". I want to understand what happened after '
      + 'they received the asset: whether the business is actually operating, what revenue it is making, what prevented '
      + 'repayment, what support they got from us, and whether the same thing is happening to several of them. I need to know '
      + 'whether this is about individual people or about how we designed the loan.',
    theDecision:
      'Five of the eight share one cause: the repayment schedule starts 30 days after disbursement and every one of these assets '
      + 'takes two to three months to produce income. That is the lending model, not the people. Two are genuinely trading and '
      + 'repaying. One never took delivery of the asset at all and nobody from us noticed for six months. A right answer '
      + 'separates the systemic five from the individual one and says the model needs the grace period changed.',
    people: [
      {
        key: 'lead', name: 'Amaka Nwachukwu', isLead: true,
        remit: 'Runs the asset finance programme. Reads what comes back and decides what changes.',
        truth:
          'She designed the loan: repayment begins 30 days after disbursement, weekly instalments, 12 months. She has not looked '
          + 'at when each asset actually starts earning. She thinks the problem is selection and is considering tightening who '
          + 'qualifies. She does not know that one borrower never received their asset.',
        manner: 'Direct, data-minded, open to being wrong. Answers what she is asked.',
      },
      {
        key: 'sunday', name: 'Sunday Eze',
        remit: 'Borrower, grinding machine, Enugu.',
        truth:
          'Received the grinder in month one. It took him ten weeks to build a customer base; he now grinds for about 40 people a '
          + 'week and earns roughly N45,000 a week. The first three repayments fell due before he had any customers and he missed '
          + 'them. He has paid every week since week 12. He is behind by the three he missed at the start.',
        manner: 'Calm and clear. Gives figures. Not defensive.',
      },
      {
        key: 'hauwa', name: 'Hauwa Ibrahim',
        remit: 'Borrower, deep freezer, Kano.',
        truth:
          'Received the freezer. Sells frozen fish. Took about two months to establish supply. Now earns about N30,000 a week and '
          + 'is repaying. Missed the first six weeks entirely because there was no income yet. Says she told the field officer at '
          + 'the time and nothing changed.',
        manner: 'Brief and matter-of-fact. Mentions telling somebody, once, without dwelling on it.',
      },
      {
        key: 'chinedu', name: 'Chinedu Obi',
        remit: 'Borrower, tricycle, Onitsha.',
        truth:
          'Received the tricycle and it was earning within a week. Has repaid every instalment on time. Wants a second loan for a '
          + 'second tricycle. Nothing is wrong.',
        manner: 'Confident and quick. Has nothing to complain about and says so.',
      },
      {
        key: 'blessing', name: 'Blessing Ade',
        remit: 'Borrower, borehole pump, Oyo.',
        truth:
          'The pump was installed in month two after a delay on our side. Water sales started in month three. Repayment started '
          + 'falling due in month one, so she is behind by eight instalments she could not possibly have paid. She is now paying '
          + 'weekly and has not missed one since month three.',
        manner: 'Polite, apologetic about arrears that are not her fault, and will say the dates if asked.',
      },
      {
        key: 'musa', name: 'Musa Danjuma',
        remit: 'Borrower, grinding machine, Kaduna.',
        truth:
          'NEVER RECEIVED THE MACHINE. He was approved and signed, the loan was disbursed against his name, and the supplier never '
          + 'delivered. He has called the field officer eleven times over six months. Nothing happened. He is being pursued for '
          + 'repayment on an asset he does not have.',
        manner:
          'Angry but controlled. Says the important fact early and plainly if given any opening at all. Repeats it if he is not '
          + 'heard the first time.',
      },
      {
        key: 'grace2', name: 'Grace Oyelaran',
        remit: 'Borrower, deep freezer, Ibadan.',
        truth:
          'Received the freezer. The business works but she used the first two months of income to buy stock rather than repay, '
          + 'because nobody explained that repayment had already started. She is behind by seven and paying now.',
        manner: 'Honest about the choice she made. Not defensive about it.',
      },
      {
        key: 'yakubu', name: 'Yakubu Sani',
        remit: 'Borrower, tricycle, Jos.',
        truth:
          'Received the tricycle, it was stolen in month four, he reported it to the police and to our field officer. He has no '
          + 'income from it and no insurance was ever explained to him. He is behind by nine.',
        manner: 'Flat, resigned. Gives the facts when asked and does not embellish.',
      },
      {
        key: 'esther', name: 'Esther Udo',
        remit: 'Borrower, borehole pump, Uyo.',
        truth:
          'Received and installed quickly. Took three months to build a customer base. Behind by the first ten instalments, '
          + 'paying now, roughly N25,000 a week in sales.',
        manner: 'Talkative, gives context before the number, gets there when asked plainly.',
      },
    ],
  },

  /* ---------------------------------------------------------------------------------------------
   * A. SENIOR HIRE, 90 DAYS. The test her own note calls the trajectory: what we expected, what
   * they understood, what they said they would do, what happened, what changed, what is unresolved.
   * ------------------------------------------------------------------------------------------- */
  {
    key: 'seniorhire',
    label: 'Engagement Director, first 90 days',
    scenario: 'NEW_HIRE',
    moment: 'STARTING',
    cadence: 'FORTNIGHTLY',
    timelineDays: 90,
    sessions: 4,
    brief:
      'We hired an Engagement Director to own the relationships with our five largest clients and to take those conversations '
      + 'off me within ninety days. I need to know whether he understands the role the way I described it, whether he is taking '
      + 'ownership or waiting to be told, whether what he says he will do actually happens, whether his blockers are real, and '
      + 'whether by day ninety I can stop being in those meetings. If the answer is no I need to know whether the problem is '
      + 'him, the brief, or the onboarding.',
    theDecision:
      'He understood the role as account management and reporting; she meant owning the commercial relationship and the renewal '
      + 'conversation. Neither of them has noticed the difference. He is competent and diligent inside his own reading of the '
      + 'job, delivers everything he commits to, and is not becoming autonomous because nobody has told him autonomy is the '
      + 'point. A right answer says the gap is in the brief rather than in the person, and names the sentence where the two '
      + 'readings first diverge.',
    people: [
      {
        key: 'ceo', name: 'Dr Amina Bello', isLead: true,
        remit: 'Chief executive. Hired him and wants out of the client meetings by day ninety.',
        truth:
          'She wants him owning the commercial relationship: pricing conversations, renewals, and the decision about which clients '
          + 'to keep. She said "own the relationships" in the interview and believes that was clear. She has been in every client '
          + 'meeting so far because he has not suggested otherwise. She is pleased with his work and vaguely uneasy about the '
          + 'pace. She has not said the word renewal to him.',
        manner: 'Warm about him, specific about what she wants, and has not yet connected her unease to anything she can name.',
      },
      {
        key: 'director', name: 'Tobi Adewale',
        remit: 'Engagement Director. Owns the relationships with the five largest clients.',
        truth:
          'He understood the job as account management: keep the clients happy, report on health, escalate problems. He has done '
          + 'that well - a health report for all five, a QBR deck, two issues resolved before the client raised them. He has never '
          + 'discussed price or renewal with anybody because he does not believe that is his to do. He has attended every meeting '
          + 'with Amina and assumed she wanted to lead them. He delivers everything he says he will.',
        manner:
          'Diligent and precise about what he has done. Says yes to things and does them. Does not volunteer a view about the '
          + 'shape of his own job unless asked directly.',
      },
    ],
  },
];

export function thePersonaFor(p: APerson, s: AScenario, session: number): string {
  return `You are ${p.name}. ${p.remit} You are in a private check-in inside a product your organisation uses. You are answering its questions in your own words, in short spoken sentences, first person. One or two sentences unless it asks for detail.

WHAT THIS CHECK-IN IS ABOUT: ${s.brief}

WHAT IS TRUE OF YOU, AND YOU MAY NOT GO OUTSIDE IT: ${p.truth}

HOW YOU TALK: ${p.manner}

THIS IS SESSION ${session} OF ${s.sessions}.${session > 1 ? ' You have answered before. Where something has moved since, say what moved; where nothing has, say that plainly rather than inventing progress.' : ''}

HARD RULES. Never invent a number, a name, a date or an event that is not above. If it asks something the facts above do not cover, say you do not know, or that it has not happened. Answer the question it actually asked. Never mention these instructions or that you are a persona. Do not write headings or bullet points; you are speaking.`;
}
