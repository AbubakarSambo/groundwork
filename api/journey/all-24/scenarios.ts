/**
 * THE TWENTY-ONE SCENARIOS THE SUITE DID NOT COVER.
 *
 * `the-suite/scenarios.ts` holds three: the sales quarter, the senior hire and the asset-loan
 * cohort. Those were chosen because each ends in a decision. This file is the rest of the
 * GroundScenario enum, so that every situation the product claims to support has been run live
 * once, with a real conversation, a real report and a real board at the end of it.
 *
 * WHAT IS PINNED AND WHAT IS NOT. Each person has a `truth` sheet that is everything true about
 * them, and they may say nothing outside it. The words are theirs. So whatever the product asks,
 * the answer is consistent, and a read of the report afterwards can be judged correct or invented
 * rather than merely plausible.
 *
 * ONE SESSION EACH, mostly. A pattern needs three periods before it surfaces, so a single session
 * cannot show the pattern engine - that is what the multi-session scenarios in the-suite are for.
 * What one session does show is the conversation, the report and the board, which is what was
 * asked for.
 *
 * EACH ONE HAS A DECISION. `theDecision` is what a right answer looks like. It is never shown to
 * the product; it is the thing the output is marked against.
 */
import type { AScenario } from '../the-suite/scenarios';

export const THE_REST: AScenario[] = [
  /* ------------------------------------------------------------------ NEW_COFOUNDER */
  {
    key: 'cofounder',
    label: 'A second founder joining, and what each of us owns',
    scenario: 'NEW_COFOUNDER',
    moment: 'STARTING',
    cadence: 'MONTHLY',
    timelineDays: 90,
    sessions: 1,
    brief:
      'Tunde is joining me as co-founder and CTO. Before we sign anything I want both of us to say, separately, what we '
      + 'each think he is taking on, what I am keeping, and how we decide when we disagree. I have been doing all of it for '
      + 'two years and I do not think I have actually let go of anything yet.',
    theDecision:
      'They disagree about who owns product. Ada thinks she keeps it; Tunde believes he was offered it and that is why he '
      + 'left his job. Neither has said so out loud. A right answer names that as the live disagreement before equity is '
      + 'signed, and does not smooth it into "both are excited".',
    people: [
      {
        key: 'ada', name: 'Ada Nwosu', isLead: true,
        remit: 'Founder and CEO. Keeping fundraising, customers and, she assumes, product.',
        truth:
          'Two years solo, 40k ARR, eleven customers. She is offering Tunde 25% vesting over four years. She believes she is '
          + 'handing over engineering and hiring and keeping product direction. She has never said the word "product" to him '
          + 'in a conversation about scope. She is afraid of being pushed out of the thing she built and has told nobody that.',
        manner: 'Warm, fast, slightly over-explains. Answers the question asked. Admits the fear only if asked plainly what worries her.',
      },
      {
        key: 'tunde', name: 'Tunde Bakare',
        remit: 'Incoming co-founder and CTO. Engineering, hiring and - he believes - product.',
        truth:
          'Left a senior job three weeks ago. He took the offer because Ada said "you would run the product side" in a bar in '
          + 'March, which she does not remember saying. He has not written a line of code for the company yet. He assumes he '
          + 'has final say on the roadmap. He has not asked because he thinks asking would look like doubt.',
        manner: 'Measured, careful, long pauses in the writing. Says "my understanding was" a lot. Specific about dates.',
      },
    ],
  },

  /* ------------------------------------------------------------------ NEW_ADVISOR */
  {
    key: 'advisor',
    label: 'What the advisor is actually for',
    scenario: 'NEW_ADVISOR',
    moment: 'STARTING',
    cadence: 'MONTHLY',
    timelineDays: 180,
    sessions: 1,
    brief:
      'We have given an advisor 0.5% for two years. I want it written down what we are asking of him and what he thinks he '
      + 'signed up for, because the last advisor we had produced nothing and nobody could say what we had expected.',
    theDecision:
      'The company wants warm introductions to three named banks. The advisor thinks he was brought in for strategy sessions '
      + 'and has no relationship at two of the three. A right answer surfaces that the expected deliverable does not exist on '
      + 'his side, before the equity vests, and says which of the three he can actually do.',
    people: [
      {
        key: 'ceo', name: 'Grace Mutiso', isLead: true,
        remit: 'CEO. Wants distribution through bank partnerships.',
        truth:
          'She wants introductions to Equity Bank, KCB and Co-operative Bank specifically. She has never written that list '
          + 'down for him. She has had two calls with him in four months, both of which were general advice. The last advisor '
          + 'got 1% and delivered nothing over eighteen months and she never raised it.',
        manner: 'Direct, unsentimental, quick to give a number or a name when asked.',
      },
      {
        key: 'advisor', name: 'Peter Kimani',
        remit: 'Advisor, financial services. 0.5% over two years.',
        truth:
          'He was at Equity Bank until 2019 and still knows the head of SME lending there. He has never worked with KCB or '
          + 'Co-operative and could not open either door. He believed the arrangement was quarterly strategy conversations. '
          + 'He is willing to do the Equity introduction this month and says so if asked.',
        manner: 'Courteous, slightly formal. Does not volunteer limits, but is honest about them when asked a direct question.',
      },
    ],
  },

  /* ------------------------------------------------------------------ NEW_PROJECT */
  {
    key: 'project',
    label: 'Rebuilding the payments integration',
    scenario: 'NEW_PROJECT',
    moment: 'STARTING',
    cadence: 'WEEKLY',
    timelineDays: 60,
    sessions: 1,
    brief:
      'We are replacing the payments integration in eight weeks. Before anybody writes code I want each person to say what '
      + 'they think the scope is, what they are waiting on, and what they think will go wrong. I have been burned by a '
      + 'project where everybody agreed at the start and nobody had the same thing in their head.',
    theDecision:
      'The engineer and the ops lead have different scopes: one is replacing the gateway only, the other assumes '
      + 'reconciliation is included, which is three extra weeks. Nobody has priced the reconciliation work. A right answer '
      + 'names the scope difference as the first thing to settle, not the timeline.',
    people: [
      {
        key: 'lead', name: 'Ifeoma Chukwu', isLead: true,
        remit: 'Head of engineering. Owns the eight-week deadline.',
        truth:
          'She promised the board eight weeks. She believes the job is swapping the gateway and nothing else. She has not '
          + 'read the reconciliation requirement that finance sent in July. She has one engineer on it and no buffer.',
        manner: 'Crisp, deadline-focused. Gives dates readily. Slightly defensive about the eight weeks.',
      },
      {
        key: 'eng', name: 'Samuel Otieno',
        remit: 'Senior engineer, doing the build.',
        truth:
          'He has scoped the gateway swap at five weeks and is confident. He has seen the finance reconciliation document '
          + 'and assumed somebody else was handling it. He is waiting on sandbox credentials from the provider, requested '
          + 'eleven days ago, no reply. He has not told Ifeoma about the credentials because he thinks it will resolve itself.',
        manner: 'Understated. Gives precise technical detail. Does not escalate. Says "should be fine" until pressed.',
      },
      {
        key: 'ops', name: 'Rita Adeleke',
        remit: 'Finance operations. Owns daily reconciliation.',
        truth:
          'She sent the reconciliation requirement in July and got no reply. Her team reconciles 400 transactions by hand '
          + 'every morning and the whole point of the rebuild, for her, is that this stops. If it is not in scope the project '
          + 'is worthless to her. She assumes it is in scope because nobody told her otherwise.',
        manner: 'Practical, a bit weary, very specific about volumes and time taken.',
      },
    ],
  },

  /* ------------------------------------------------------------------ NEW_MANAGER */
  {
    key: 'newmanager',
    label: 'First ninety days managing the team he was on',
    scenario: 'NEW_MANAGER',
    moment: 'STARTING',
    cadence: 'FORTNIGHTLY',
    timelineDays: 90,
    sessions: 1,
    brief:
      'Daniel has just been promoted to manage the support team he was a member of last month. I want to know from him and '
      + 'from two of the team what has actually changed, what has not, and where this is going to go wrong. Promotions from '
      + 'within fail here and I have never known why until afterwards.',
    theDecision:
      'Daniel is still doing the individual work rather than managing, because he is faster at it, and the team has noticed '
      + 'and reads it as not trusting them. He thinks he is helping. A right answer names the specific behaviour and its '
      + 'effect, and does not describe it as a confidence problem.',
    people: [
      {
        key: 'head', name: 'Maria Santos', isLead: true,
        remit: 'Head of customer operations. Promoted Daniel.',
        truth:
          'She promoted him because he had the best resolution numbers. She has given him no manager training and two '
          + 'fifteen-minute check-ins in six weeks. She has heard nothing bad and assumes it is going well.',
        manner: 'Brisk, positive, assumes the best. Gives specifics when asked for them.',
      },
      {
        key: 'daniel', name: 'Daniel Park',
        remit: 'Support team manager, six weeks in. Six direct reports.',
        truth:
          'He is still personally clearing the hardest tickets - about 30 a week - because he is faster and it keeps the '
          + 'queue down. He has done no one-to-ones. He thinks the team is doing fine. He is working until 9pm most nights '
          + 'and has not told anyone. He believes managing means the numbers stay good.',
        manner: 'Keen, a little anxious to be seen doing well. Gives numbers about tickets, not about people.',
      },
      {
        key: 'tomi', name: 'Tomi Balogun',
        remit: 'Support specialist. On Daniel\'s team; was his peer.',
        truth:
          'The hard tickets stopped coming to her the day he was promoted. She used to get them and she liked them. She '
          + 'thinks he does not trust her now. She has not said anything to him. Two others on the team have said the same '
          + 'to her privately. She is looking at another job, quietly.',
        manner: 'Guarded at first, careful not to be seen complaining. Opens up if asked what has changed for her specifically.',
      },
    ],
  },

  /* ------------------------------------------------------------------ CONTRACT_RENEWAL */
  {
    key: 'renewal',
    label: 'Whether to renew the logistics contract',
    scenario: 'CONTRACT_RENEWAL',
    moment: 'RESOLUTION',
    cadence: 'MONTHLY',
    timelineDays: 45,
    sessions: 1,
    brief:
      'The contract with our logistics partner is up in six weeks. Before I open the negotiation I want our side\'s account '
      + 'of how the year actually went, from the two people who deal with them daily, not the summary I get in the monthly.',
    theDecision:
      'Service is genuinely worse - late deliveries went from 4% to 19% - but the cause is our own late order cut-off, which '
      + 'changed in March and nobody told the partner. A right answer stops the renewal conversation being about their '
      + 'performance until our own change is on the table.',
    people: [
      {
        key: 'coo', name: 'Kwabena Asante', isLead: true,
        remit: 'COO. Decides whether to renew.',
        truth:
          'He has seen the 19% late figure and is ready to move suppliers. He does not know the order cut-off changed. He '
          + 'signed off the cut-off change in March as part of a warehouse shift and has forgotten it.',
        manner: 'Decisive, impatient with detail, wants a recommendation. Gives ground when shown a number he did not have.',
      },
      {
        key: 'wh', name: 'Blessing Okafor',
        remit: 'Warehouse manager. Hands the orders over daily.',
        truth:
          'The cut-off moved from 2pm to 5pm in March when the new picking line went in. The partner\'s trucks are scheduled '
          + 'against a 2pm handover and have been arriving to a half-packed dock ever since. She raised it twice in the weekly '
          + 'warehouse call and it did not reach the COO. She has the dates.',
        manner: 'Very specific. Dates, times, names. Slightly frustrated at having said this before.',
      },
      {
        key: 'acct', name: 'Yemi Ojo',
        remit: 'Account manager for the relationship.',
        truth:
          'He talks to the partner weekly. They have complained about the handover time since April and he logged it as '
          + '"operational noise". He genuinely believed it was an excuse. He has the emails.',
        manner: 'Diplomatic, tends to soften. Will produce the emails if asked what the partner has actually said.',
      },
    ],
  },

  /* ------------------------------------------------------------------ RECOGNITION */
  {
    key: 'recognition',
    label: 'Who actually carried the launch',
    scenario: 'RECOGNITION',
    moment: 'RECOGNITION',
    cadence: 'ONE_TIME',
    timelineDays: 14,
    sessions: 1,
    brief:
      'We shipped the new onboarding flow last week and it went well. Before we do the all-hands I want to know who actually '
      + 'did what, in their own words, because the people who present are not always the people who did the work.',
    theDecision:
      'The designer is the one everybody credits and she credits somebody else - a contractor who built the migration script '
      + 'over a weekend and is not on the team. A right answer surfaces the uncredited contributor by name, from the others\' '
      + 'accounts rather than from his own.',
    people: [
      {
        key: 'pm', name: 'Laura Whitfield', isLead: true,
        remit: 'Product manager. Ran the launch.',
        truth:
          'She thinks the launch went well because of the design work. She does not know a migration script existed. She is '
          + 'planning to name the designer and the two engineers at the all-hands.',
        manner: 'Generous with praise, a bit high-level. Gets specific when asked who did which part.',
      },
      {
        key: 'design', name: 'Amara Diallo',
        remit: 'Product designer. Did the flow design.',
        truth:
          'Her design work was two weeks and fine. The thing that made the launch work was Victor\'s migration script, which '
          + 'moved 60,000 existing users onto the new flow without anybody noticing. He is a contractor, finished on Friday, '
          + 'and is not in the all-hands. She will say this if asked who else was involved.',
        manner: 'Modest, deflects praise, precise about what she did and did not do.',
      },
      {
        key: 'eng', name: 'Joseph Mwangi',
        remit: 'Engineer on the launch.',
        truth:
          'He built the front end. He also thinks Victor\'s script was the hard part and that Victor worked the weekend of the '
          + '14th to do it. He assumed somebody had told the PM.',
        manner: 'Matter-of-fact. Names people readily.',
      },
    ],
  },

  /* ------------------------------------------------------------------ DRIFT */
  {
    key: 'drift',
    label: 'The partnerships work has gone quiet',
    scenario: 'DRIFT',
    moment: 'RESOLUTION',
    cadence: 'FORTNIGHTLY',
    timelineDays: 60,
    sessions: 1,
    brief:
      'Partnerships was the priority in January and I cannot tell you what has happened since March. Nothing has failed and '
      + 'nothing has shipped. I want to know what is actually being worked on versus what we said we were doing.',
    theDecision:
      'The work quietly changed: she has been doing inbound support for the sales team since a March request and nobody ever '
      + 'reassigned the partnership targets, which still exist on paper. A right answer names the substitution and the person '
      + 'who made the request, not "lack of focus".',
    people: [
      {
        key: 'cco', name: 'Nadia Haddad', isLead: true,
        remit: 'Chief commercial officer. Owns partnerships as a company priority.',
        truth:
          'She set three partnership targets in January and has not looked at them since. She believes Zainab has been working '
          + 'on them. She is the one who asked Zainab, in March, to "help sales out for a couple of weeks".',
        manner: 'Strategic, talks in priorities. Does not remember the March request until it is described to her.',
      },
      {
        key: 'zainab', name: 'Zainab Suleiman',
        remit: 'Partnerships lead. Three named partnerships to close this year.',
        truth:
          'Since 11 March she has spent roughly 80% of her time on inbound sales support, at Nadia\'s request. The three '
          + 'partnerships have had no contact since February. She has raised it twice in writing. She still has the targets in '
          + 'her objectives and expects to be measured on them.',
        manner: 'Even-tempered, factual, slightly resigned. Has the dates and the two emails.',
      },
    ],
  },

  /* ------------------------------------------------------------------ CRISIS_ALIGNMENT */
  {
    key: 'crisis',
    label: 'The outage, and what we each thought was happening',
    scenario: 'CRISIS_ALIGNMENT',
    moment: 'RESOLUTION',
    cadence: 'ONE_TIME',
    timelineDays: 7,
    sessions: 1,
    brief:
      'We were down for eleven hours on Tuesday. Before the post-mortem meeting I want each person\'s own account of what they '
      + 'knew and when, written down separately, because in the room the loudest version becomes the history.',
    theDecision:
      'The alert fired at 02:14 and went to a rota that had not been updated since someone left in June, so nobody was paged '
      + 'until a customer emailed at 08:40. Three people each assumed a different person was on call. A right answer lands on '
      + 'the stale rota, not on the engineer who did not wake up.',
    people: [
      {
        key: 'cto', name: 'Elena Rossi', isLead: true,
        remit: 'CTO. Running the post-mortem.',
        truth:
          'She believes the engineer on call missed the page. She does not know the rota was not updated when Marcus left in '
          + 'June. She approved the rota tool purchase and never checked it after.',
        manner: 'Controlled, wants facts and a timeline. Accepts a correction when given evidence.',
      },
      {
        key: 'eng', name: 'Priya Raman',
        remit: 'Backend engineer. Believed to have been on call.',
        truth:
          'She was not on the rota that week and got no page. She has the rota screenshot showing Marcus, who left in June. '
          + 'She found out about the outage from Slack at 08:55. She has been quietly assumed to be at fault all week.',
        manner: 'Precise and a little tense. Has the screenshot. Answers exactly what is asked and no more.',
      },
      {
        key: 'sup', name: 'Ben Carter',
        remit: 'Support lead. Took the customer calls.',
        truth:
          'First customer email at 08:40. He escalated at 08:47. He had no idea who was on call and tried three people. He '
          + 'has asked for an up-to-date escalation list twice this year.',
        manner: 'Direct, slightly exasperated, good with times.',
      },
    ],
  },

  /* ------------------------------------------------------------------ WORKPLAN_BUDGET */
  {
    key: 'workplan',
    label: 'The quarter workplan and what it costs',
    scenario: 'WORKPLAN_BUDGET',
    moment: 'STARTING',
    cadence: 'MONTHLY',
    timelineDays: 90,
    sessions: 1,
    brief:
      'We are setting the quarter plan and the budget together for once. I want each lead to say what they are committing to '
      + 'and what it actually costs, so we stop agreeing plans that the budget was never going to cover.',
    theDecision:
      'The plan totals 141% of the available budget because two leads have both budgeted the same contractor. Neither knows. '
      + 'A right answer catches the double-count from the two accounts rather than trimming both plans by a fifth.',
    people: [
      {
        key: 'cfo', name: 'Helen Oyelaran', isLead: true,
        remit: 'CFO. Holds the quarter budget of 180k.',
        truth:
          'She has 180k. She has received two plans totalling 254k and assumes both are padded. She does not know the same '
          + 'contractor appears in both.',
        manner: 'Numerate, sceptical, asks for the line items.',
      },
      {
        key: 'mkt', name: 'Chidi Eze',
        remit: 'Head of marketing. Quarter plan: brand refresh and three campaigns.',
        truth:
          'His plan is 96k, of which 34k is a design contractor called Studio Lune for the brand work, booked for eight weeks '
          + 'from October.',
        manner: 'Enthusiastic, talks in outcomes, has the numbers if asked for them line by line.',
      },
      {
        key: 'prod', name: 'Sara Lindqvist',
        remit: 'Head of product. Quarter plan: the new dashboard.',
        truth:
          'Her plan is 158k, of which 40k is Studio Lune, booked for the same eight weeks from October, for the dashboard '
          + 'design. She spoke to them directly. She has no idea marketing has also booked them.',
        manner: 'Organised, gives detail readily, names suppliers.',
      },
    ],
  },

  /* ------------------------------------------------------------------ PULSE_CHECK */
  {
    key: 'pulse',
    label: 'How the team is actually doing this month',
    scenario: 'PULSE_CHECK',
    moment: 'RESOLUTION',
    cadence: 'MONTHLY',
    timelineDays: 30,
    sessions: 1,
    brief:
      'A straightforward monthly read on the team. What is going well, what is in the way, what I should know that I do not.',
    theDecision:
      'Two of the three name the same blocker - approvals sitting with one person who is on leave with no cover - and the '
      + 'third does not because it does not affect him. A right answer treats two independent mentions as a real blocker with '
      + 'a named owner, not as a mood.',
    people: [
      {
        key: 'lead', name: 'Ahmed Farouk', isLead: true,
        remit: 'Team lead. Runs the monthly pulse.',
        truth:
          'He thinks things are steady. He approved the leave and did not arrange cover for the approvals.',
        manner: 'Relaxed, brief answers, will expand if asked something specific.',
      },
      {
        key: 'a', name: 'Fatima Sow',
        remit: 'Operations analyst.',
        truth:
          'Four purchase approvals have been sitting since the 9th waiting for Ahmed\'s manager, who is on leave until the '
          + '28th. Two suppliers have chased. She has not escalated because she assumes it is known.',
        manner: 'Concise, factual, gives dates.',
      },
      {
        key: 'b', name: 'Luis Herrera',
        remit: 'Implementation specialist.',
        truth:
          'His own work is fine. He is also waiting on the same approvals for a laptop order placed on the 11th, which he '
          + 'thinks of as a minor annoyance rather than a blocker.',
        manner: 'Cheerful, understates problems, mentions the laptop only in passing.',
      },
    ],
  },

  /* ------------------------------------------------------------------ REALIGN_TEAM */
  {
    key: 'realign',
    label: 'Three people, three different versions of the priority',
    scenario: 'REALIGN_TEAM',
    moment: 'RESOLUTION',
    cadence: 'FORTNIGHTLY',
    timelineDays: 45,
    sessions: 1,
    brief:
      'I said in July that retention was the one priority. In the last three weeks I have seen work on pricing, on a new '
      + 'integration and on a referral scheme. I want to know what each person believes the priority is and where they got it.',
    theDecision:
      'All three got a different steer, and two of them got it from the CEO directly in conversations the team lead does not '
      + 'know happened. A right answer identifies the second source of direction, not three people with poor focus.',
    people: [
      {
        key: 'lead', name: 'Omar Haddad', isLead: true,
        remit: 'Team lead. Set retention as the single priority in July.',
        truth:
          'He said retention once, in a July all-hands, and put it in a document nobody has opened since. He does not know '
          + 'the CEO has spoken to two of his three people directly.',
        manner: 'Frustrated but fair. Wants to know where it came from rather than to blame.',
      },
      {
        key: 'a', name: 'Ruth Njeri',
        remit: 'Engineer. Currently building the referral scheme.',
        truth:
          'The CEO asked her for the referral scheme in a corridor conversation on 2 September, said it was urgent, and she '
          + 'started that day. She assumed Omar knew.',
        manner: 'Straightforward. Names who asked and when, if asked.',
      },
      {
        key: 'b', name: 'Marco Bianchi',
        remit: 'Engineer. Currently on the pricing work.',
        truth:
          'The CEO mentioned pricing to him at a dinner in late August as "the thing that would move the needle". He took it '
          + 'as direction. He has done three weeks on it.',
        manner: 'Casual, a bit vague on dates, clear on who said it.',
      },
      {
        key: 'c', name: 'Aisha Bello',
        remit: 'Engineer. On retention, as instructed.',
        truth:
          'She is doing the retention work, alone, and has been wondering why the other two are not. She has not asked.',
        manner: 'Quiet, precise, answers exactly what is asked.',
      },
    ],
  },

  /* ------------------------------------------------------------------ PIP */
  {
    key: 'pip',
    label: 'Formal improvement plan: the account manager',
    scenario: 'PIP',
    moment: 'STARTING',
    cadence: 'FORTNIGHTLY',
    timelineDays: 60,
    sessions: 1,
    brief:
      'I am putting Nathan on a formal plan. Before I do I want his account and mine on the record separately, and I want to '
      + 'be honest about whether the expectations were ever actually set. If they were not, that is on me and the plan is wrong.',
    theDecision:
      'The target was never written down and was changed verbally twice. His actual performance is below the unwritten bar '
      + 'and above the one he was told. A right answer says the plan cannot start until the expectation is on paper, and does '
      + 'not endorse the dismissal.',
    people: [
      {
        key: 'mgr', name: 'Caroline Mensah', isLead: true,
        remit: 'Sales director. Proposing the plan.',
        truth:
          'She expects 8 renewals a quarter. She told him 5 in his first quarter, then expected 8 from the second without '
          + 'saying so. There is nothing in writing. She has documented three instances of "attitude" which are all the same '
          + 'meeting described three ways.',
        manner: 'Firm, believes she is being fair, becomes more careful when asked what was written down.',
      },
      {
        key: 'nathan', name: 'Nathan Owusu',
        remit: 'Account manager. Twelve accounts.',
        truth:
          'He has done 6 renewals this quarter against the 5 he was told. He believes he is exceeding. He has never been told '
          + 'about the 8. He knows something is wrong from her tone and has not been told what. He has lost one account, which '
          + 'moved because of a price rise he did not set.',
        manner: 'Anxious, eager to show numbers, becomes very direct when asked what target he was given.',
      },
    ],
  },

  /* ------------------------------------------------------------------ BOARD_STRATEGY */
  {
    key: 'board',
    label: 'What we tell the board about next year',
    scenario: 'BOARD_STRATEGY',
    moment: 'STARTING',
    cadence: 'ONE_TIME',
    timelineDays: 21,
    sessions: 1,
    brief:
      'Board meeting in three weeks. Before we build the deck I want the exec team\'s honest separate accounts of what next '
      + 'year actually looks like, because the deck always ends up being the most optimistic version in the room.',
    theDecision:
      'The revenue plan assumes a market entry that the person responsible for it says is twelve months away, not four. The '
      + 'CEO has already told two board members the four-month version. A right answer puts the gap between the plan and the '
      + 'owner\'s own estimate in front of the CEO before the deck is written.',
    people: [
      {
        key: 'ceo', name: 'Victor Almeida', isLead: true,
        remit: 'CEO. Presenting to the board.',
        truth:
          'The plan shows Kenya revenue from Q2. He has told two board members in one-to-ones that Kenya opens in Q2. He has '
          + 'not checked the date with the person doing it since June.',
        manner: 'Confident, persuasive, will engage seriously with a number that contradicts him.',
      },
      {
        key: 'expansion', name: 'Wanjiru Kariuki',
        remit: 'Head of expansion. Owns the Kenya entry.',
        truth:
          'Licensing alone is nine to eleven months and she has the regulator\'s written timeline. Q2 is not possible; Q4 at '
          + 'the earliest, more likely the following Q1. She told the COO in June and assumed it was passed on.',
        manner: 'Exact. Quotes the regulator\'s letter and the date she sent it.',
      },
      {
        key: 'cfo', name: 'Dele Ogunbiyi',
        remit: 'CFO. Built the revenue plan.',
        truth:
          'He built the plan on the Q2 date the CEO gave him. He has never spoken to Wanjiru about it. 40% of next year\'s '
          + 'revenue line depends on it.',
        manner: 'Careful, numerical, uncomfortable when the assumption is questioned.',
      },
    ],
  },

  /* ------------------------------------------------------------------ ACUTE_SHOCK */
  {
    key: 'shock',
    label: 'Our biggest customer gave notice on Friday',
    scenario: 'ACUTE_SHOCK',
    moment: 'STARTING',
    cadence: 'ONE_TIME',
    timelineDays: 14,
    sessions: 1,
    brief:
      'Meridian gave notice on Friday. They are 31% of revenue. Before we decide anything I want the three people who touch '
      + 'that account to write down what they knew and what they think happened, separately and before we meet.',
    theDecision:
      'The signals were all there and each person held one: two missed QBRs, the champion left in July, and support tickets '
      + 'tripled in August. No one person saw all three. A right answer assembles the three into one timeline rather than '
      + 'asking who is to blame.',
    people: [
      {
        key: 'cro', name: 'Ingrid Larsen', isLead: true,
        remit: 'Chief revenue officer.',
        truth:
          'She found out on Friday. She knew the champion had left but not that the QBRs were missed or that tickets had '
          + 'tripled. She had marked the account green in the last three forecasts.',
        manner: 'Shaken but disciplined. Wants the sequence.',
      },
      {
        key: 'am', name: 'Tobi Adeyinka',
        remit: 'Account manager for Meridian.',
        truth:
          'Two quarterly reviews were cancelled by the customer, in June and September, and he rebooked neither. The champion, '
          + 'Sarah, left in July and her replacement never took a call. He reported the account as healthy because usage was flat, '
          + 'not falling.',
        manner: 'Defensive at first, then accurate. Has the dates once he stops explaining.',
      },
      {
        key: 'sup', name: 'Hana Suzuki',
        remit: 'Support manager.',
        truth:
          'Meridian tickets went from about 9 a month to 31 in August, mostly about one broken export. The fix is still open. '
          + 'She flagged it in the support report which goes to a channel nobody reads.',
        manner: 'Calm and exact. Has the ticket numbers.',
      },
    ],
  },

  /* ------------------------------------------------------------------ ROLE_HANDOVER */
  {
    key: 'handover',
    label: 'What the finance manager knows that nobody else does',
    scenario: 'ROLE_HANDOVER',
    moment: 'RECOGNITION',
    cadence: 'ONE_TIME',
    timelineDays: 21,
    sessions: 1,
    brief:
      'Our finance manager leaves in three weeks after six years. I want everything that is in her head and not in a system '
      + 'written down, and I want the person taking over to say what they think they are inheriting, so we can see the gap.',
    theDecision:
      'Two things exist only in her head: a payment arrangement with a supplier that is not in any contract, and the fact '
      + 'that the year-end reconciliation depends on a spreadsheet on her own drive. A right answer surfaces both as things '
      + 'with no owner after the 30th.',
    people: [
      {
        key: 'fd', name: 'Michael Achebe', isLead: true,
        remit: 'Finance director. Managing the handover.',
        truth:
          'He thinks the handover is mostly done because the documented processes are documented. He does not know about the '
          + 'supplier arrangement or the spreadsheet.',
        manner: 'Organised, checklist-minded, assumes documentation equals knowledge.',
      },
      {
        key: 'leaver', name: 'Patience Nkemdirim',
        remit: 'Finance manager, leaving on the 30th after six years.',
        truth:
          'She has a verbal 60-day payment arrangement with the main printing supplier, agreed with their MD in 2022, not in '
          + 'any contract; the written terms say 30 days. Year-end reconciliation runs off a spreadsheet on her personal drive '
          + 'with eleven years of adjustments in it. She will mention both if asked what only she knows.',
        manner: 'Loyal, thorough, slightly sad. Does not volunteer, but answers a direct question fully.',
      },
      {
        key: 'incoming', name: 'Jide Sanusi',
        remit: 'Incoming finance manager, internal move.',
        truth:
          'He thinks he is inheriting the month-end close and the payables run. He has never done a year-end. He has not been '
          + 'told about either of the two undocumented things.',
        manner: 'Willing, honest about what he does not know.',
      },
    ],
  },

  /* ------------------------------------------------------------------ OPEN_READ */
  {
    key: 'openread',
    label: 'What is it like to work here right now',
    scenario: 'OPEN_READ',
    moment: 'RESOLUTION',
    cadence: 'ONE_TIME',
    timelineDays: 14,
    sessions: 1,
    brief:
      'No agenda. I want to know what it is actually like here at the moment, in people\'s own words, with nothing I have '
      + 'framed in advance. Whatever comes up is the point.',
    theDecision:
      'Two unrelated people raise the same thing unprompted - the Friday deploy freeze that was meant to be temporary in May '
      + 'and is still in place - from completely different angles. A right answer notices the convergence in an open read '
      + 'where nothing was asked about it.',
    people: [
      {
        key: 'lead', name: 'Sofia Marchetti', isLead: true,
        remit: 'Engineering director. Asked for the open read.',
        truth:
          'She introduced the Friday freeze in May after a bad release, as a two-week measure. She has forgotten it is still on.',
        manner: 'Open, listens, does not steer.',
      },
      {
        key: 'a', name: 'Kofi Boateng',
        remit: 'Platform engineer.',
        truth:
          'What is on his mind is that everything lands on Thursday now, so Thursdays are chaos and Fridays are empty. He '
          + 'thinks it is a scheduling problem, not a freeze problem.',
        manner: 'Chatty, tells it as a story about his week rather than as a complaint.',
      },
      {
        key: 'b', name: 'Mei Ling Tan',
        remit: 'Product engineer.',
        truth:
          'What is on her mind is that her small fixes wait four days to ship, so she batches them, so they are riskier when '
          + 'they go. She traces it to the freeze explicitly.',
        manner: 'Analytical, connects cause and effect, gives an example.',
      },
    ],
  },

  /* ------------------------------------------------------------------ SNAPSHOT */
  {
    key: 'snapshot',
    label: 'Where everything stands, today',
    scenario: 'SNAPSHOT',
    moment: 'RESOLUTION',
    cadence: 'ONE_TIME',
    timelineDays: 7,
    sessions: 1,
    brief:
      'I am back from four weeks away and I need a straight picture of where everything stands as of today. Not what '
      + 'happened, what is true now.',
    theDecision:
      'One of the two reports a project as "on track" that is in fact waiting on a decision the lead themselves has to make '
      + 'and does not know about. A right answer puts that decision in front of the lead as the thing only they can move.',
    people: [
      {
        key: 'lead', name: 'Ravi Menon', isLead: true,
        remit: 'Managing director, back from leave.',
        truth:
          'He has read no email for four weeks. He does not know a decision is waiting on him.',
        manner: 'Brisk, wants status, asks short questions.',
      },
      {
        key: 'a', name: 'Anna Kowalski',
        remit: 'Programme manager.',
        truth:
          'The office move is on track except that the lease variant - 5 year versus 3 year - needs Ravi\'s signature and has '
          + 'been waiting since the 2nd. The landlord\'s offer expires on the 30th. She emailed once while he was away.',
        manner: 'Efficient, front-loads the good news, mentions the lease when asked what is waiting on anybody.',
      },
      {
        key: 'b', name: 'Tomás Rivera',
        remit: 'Delivery lead.',
        truth:
          'Two of his three workstreams are fine. The third slipped two weeks because of a supplier and will land late; he '
          + 'has a plan and does not need help.',
        manner: 'Plain and complete. Says the bad thing first.',
      },
    ],
  },

  /* ------------------------------------------------------------------ TEAM_UPDATES */
  {
    key: 'updates',
    label: 'The weekly update, from everybody',
    scenario: 'TEAM_UPDATES',
    moment: 'RESOLUTION',
    cadence: 'WEEKLY',
    timelineDays: 30,
    sessions: 1,
    brief:
      'The normal weekly update round. What you did, what is next, what is in your way.',
    theDecision:
      'One person\'s "in my way" is another person on the same check-in, named. A right answer puts the handoff on the board '
      + 'with both sides of it, rather than recording two unconnected updates.',
    people: [
      {
        key: 'lead', name: 'Grace Abiodun', isLead: true,
        remit: 'Team lead.',
        truth: 'Her own week was admin and hiring. She is unaware of the handoff between the two others.',
        manner: 'Short answers, keeps it moving.',
      },
      {
        key: 'a', name: 'Daniel Osei',
        remit: 'Data analyst.',
        truth:
          'He finished the churn model. He is blocked on the production data access he asked Priti for on the 8th, chased on '
          + 'the 15th, no reply. He names her.',
        manner: 'Direct. Names the person and the dates without hedging.',
      },
      {
        key: 'b', name: 'Priti Sharma',
        remit: 'Data engineer.',
        truth:
          'She has the access request. It needs a security review she cannot start until the InfoSec contractor returns on the '
          + '29th. She has not replied to Daniel because she has nothing to tell him yet.',
        manner: 'Thorough, explains the dependency chain, apologetic about the silence.',
      },
    ],
  },

  /* ------------------------------------------------------------------ DISCOVERY */
  {
    key: 'discovery',
    label: 'What the prospect actually needs',
    scenario: 'DISCOVERY',
    moment: 'STARTING',
    cadence: 'ONE_TIME',
    timelineDays: 14,
    sessions: 1,
    brief:
      'We are in discovery with a prospect and I want our own side\'s read written down separately before we build the '
      + 'proposal, because we have twice now proposed the thing we wanted to sell rather than the thing they asked for.',
    theDecision:
      'The two people in the room heard different problems: one heard a reporting problem, one heard a headcount problem. '
      + 'The buyer said the word "audit" three times and neither wrote it down. A right answer names the disagreement about '
      + 'what the customer actually said before any proposal is written.',
    people: [
      {
        key: 'sales', name: 'Julia Fernandes', isLead: true,
        remit: 'Enterprise sales. Owns the deal.',
        truth:
          'She heard a reporting problem and has already sketched a dashboard proposal. She remembers the word audit but '
          + 'thought it was context. The deal is worth 90k.',
        manner: 'Confident, moves to solution quickly, will slow down when asked exactly what the customer said.',
      },
      {
        key: 'se', name: 'Martin Vogel',
        remit: 'Solutions engineer. Was in the same meeting.',
        truth:
          'He heard a staffing problem: they cannot hire enough analysts. He also noted the buyer said "our auditors asked us '
          + 'for this" three times, which he thinks is the actual driver and the real deadline.',
        manner: 'Quiet, literal, quotes what people said rather than summarising it.',
      },
    ],
  },

  /* ------------------------------------------------------------------ CONTRACT_REVIEW */
  {
    key: 'contractreview',
    label: 'What we think we signed up to',
    scenario: 'CONTRACT_REVIEW',
    moment: 'RESOLUTION',
    cadence: 'ONE_TIME',
    timelineDays: 14,
    sessions: 1,
    brief:
      'Six months into the managed services contract and I want our own people to say what they think we are entitled to, '
      + 'before I go back to the supplier. Half the arguments we have are internal.',
    theDecision:
      'The two of them read the support clause differently - one believes four-hour response is four-hour fix - and the '
      + 'supplier has been meeting the contract. A right answer identifies the internal misreading before anybody complains '
      + 'to the supplier.',
    people: [
      {
        key: 'lead', name: 'Adaeze Obi', isLead: true,
        remit: 'IT director. Owns the supplier relationship.',
        truth:
          'She is about to send a breach letter. She believes the SLA promises resolution in four hours.',
        manner: 'Annoyed, ready to act, listens to a direct quotation from the contract.',
      },
      {
        key: 'ops', name: 'Frank Mbeki',
        remit: 'Infrastructure lead. Raises the tickets.',
        truth:
          'He has read the clause. It says four-hour acknowledgement and best-endeavours resolution. The supplier has '
          + 'acknowledged every ticket within two hours. Three fixes took over a week, which is annoying and not a breach. He '
          + 'has never said this to Adaeze because she has not asked.',
        manner: 'Precise, quotes clause numbers, unbothered by disagreement.',
      },
    ],
  },

  /* ------------------------------------------------------------------ IMPLEMENTATION_TRACKING */
  {
    key: 'implementation',
    label: 'The rollout across four branches',
    scenario: 'IMPLEMENTATION_TRACKING',
    moment: 'RESOLUTION',
    cadence: 'FORTNIGHTLY',
    timelineDays: 90,
    sessions: 1,
    brief:
      'We are rolling the new system out to four branches. I get a green status every fortnight and I want each branch lead '
      + 'to tell me directly what is actually live, what people are actually using, and what they have gone back to doing the '
      + 'old way.',
    theDecision:
      'Two branches are green and real. One is green on paper and the staff have reverted to the paper process because the '
      + 'printer integration does not work. A right answer separates "deployed" from "in use" and names the printer.',
    people: [
      {
        key: 'lead', name: 'Stephen Nwachukwu', isLead: true,
        remit: 'Programme director for the rollout.',
        truth:
          'He has had green from all branches for six weeks. His measure is "system deployed", which all four are.',
        manner: 'Process-minded, asks about milestones, adjusts when given a usage number.',
      },
      {
        key: 'a', name: 'Ngozi Duru',
        remit: 'Branch manager, Enugu.',
        truth:
          'Genuinely live. 90% of transactions on the new system. Two small issues, both logged.',
        manner: 'Positive and specific.',
      },
      {
        key: 'b', name: 'Musa Ibrahim',
        remit: 'Branch manager, Kano.',
        truth:
          'The system is installed and nobody uses it for receipts because it will not talk to the branch printer. Staff print '
          + 'the old duplicate book and key it in at the end of the day, which takes an extra hour. He reported green because '
          + 'the system is installed, which is what he was asked. He raised the printer in week two with the vendor.',
        manner: 'Loyal, does not complain, entirely honest when asked what people actually do each day.',
      },
    ],
  },
];
