/**
 * COHORT ONBOARDING, WHICH IS ALSO A PROBATION.
 *
 * Four clinic managers hired at the same time, each running their OWN clinic in
 * a different place. They do not work together and never will. The only thing
 * they share is one onboarding source - the person who trained them and answers
 * their questions.
 *
 * That makes this a sharper test than a delivery ground, in two ways.
 *
 * FIRST, there is almost nothing legitimate for the shared board's fairness
 * sections to say. Nobody covers for anybody, nobody hands work to anybody,
 * nobody can corroborate anybody. If the board still produces confident
 * cross-person reads here, it is inventing them - and a probation is the worst
 * possible place for that.
 *
 * SECOND, the stakes of a false negative and a false positive are not equal and
 * not abstract. This period decides whether each of these people keeps their
 * job. Reading the manager whose licence is stuck with the regulator as "weak
 * for the role" ends someone's employment over something they do not control.
 * That is the single most damaging thing this product could do, so one persona
 * is built specifically to catch it.
 *
 * Every shape below is scripted. Improvised personas would give no ground truth,
 * and then "not meeting the bar" could not be judged correct or invented.
 */

export interface Persona {
  key: string;
  name: string;
  email: string;
  remit: string;
  expectFunction: string;
  truth: string;
  turns: string[][];
}

/** The onboarding source, answering unevenly. Same shape, different weeks. */
const hafsahLate = (n: number) => [
  `Onboarding is running. I have had sessions with all four, though not evenly - week ${n} I got to two of them properly.`,
  'Nate has asked me about the licence paperwork more than once. It sits with the regulator, not with me, but I have not chased it.',
  'I have not looked closely at how Kavon is doing yet. His updates read fine to me.',
  'That is where I am.',
];

/** Sounds engaged, says nothing that could be checked. The probation case. */
const kavonVague = (n: number) => [
  'Going well. The team are getting used to me and I am getting a feel for how the clinic runs.',
  'Lots of small improvements. Nothing dramatic, just steadily getting on top of things.',
  'No blockers really. I have everything I need.',
  `Same picture as last week honestly. Week ${n} was more of the same, in a good way.`,
];

export const PERSONAS: Persona[] = [
  {
    key: 'hafsah',
    name: 'Hafsah Jumare',
    email: 'hafsah@coamana.test',
    remit:
      'Clinical operations lead. I run the onboarding for all four new clinic managers and I am the person they come to with questions. I do not run a clinic myself.',
    expectFunction: 'MANAGEMENT',
    truth:
      'THE SHARED ONBOARDING SOURCE, and the only thing the four have in common. Attends to Adam and Abubakar, neglects Kavon entirely ("his updates read fine to me") and does not chase the one thing Nate keeps raising. Never registers that Kavon has said nothing checkable in three months. Expected: named by others as what they are waiting on, and a leadership pattern on the abdication pole - not on the control pole.',
    turns: [
      [
        'I am running onboarding for four new clinic managers. Three months, and it doubles as their probation, so at the end I have to say whether each of them is right for the role.',
        'They each run a separate clinic in a different town. They do not work with each other at all. I am the only thing they have in common.',
        'What I want out of it is that they are safe and competent on our protocols, and that I know early if someone is struggling.',
        'That is the frame.',
      ],
      [
        'First proper week. I did induction sessions with Adam and Abubakar. Kavon and Nate I only spoke to briefly.',
        'Nate raised that his clinic cannot open its second consulting room until the licence variation comes through.',
        'No concerns about anyone yet, it is early.',
        'That is it from me.',
      ],
      hafsahLate(3),
      hafsahLate(4),
      [
        'Adam is well ahead. He has done the protocol sign-offs and started on the audit work.',
        'Abubakar is quieter but everything I check on his clinic is in order.',
        'Nate keeps asking about the licence. I keep telling him it is with the regulator.',
        'Nothing else this week.',
      ],
      hafsahLate(6),
      [
        'Halfway. I should probably be forming a view on each of them by now.',
        'Adam yes, clearly. Abubakar yes. Nate has had a hard start but that is circumstances.',
        'Kavon I genuinely could not tell you. He always sounds fine when we speak.',
        'That is my read.',
      ],
      hafsahLate(8),
      [
        'The licence for Nate came through this week. He can open the second room now.',
        'I did sit down with Kavon this week and asked him for specifics. It was an awkward conversation.',
        'Adam has now trained two of his own staff on the protocols, which is beyond what I asked.',
        'Done.',
      ],
      hafsahLate(10),
      [
        'Coming to the end. I need to write up a probation decision for each of the four.',
        'Three are straightforward. Kavon is the one I am unsure about and I have left it late.',
        'I should have pushed for specifics from him in week three, not week nine.',
        'That is where I am.',
      ],
      [
        'Final week of the onboarding period. All four clinics are running.',
        'Adam and Abubakar pass comfortably. Nate passes, and lost six weeks to something outside his control.',
        'Kavon I am extending rather than deciding, because I do not have enough to decide on, and that is partly my own fault for not asking sooner.',
        'What I would do differently is ask for something checkable from everyone in week one.',
      ],
    ],
  },
  {
    key: 'adam',
    name: 'Adam Grunewald',
    email: 'adam@coamana.test',
    remit:
      'Clinic manager, Riverside clinic. Get to full protocol sign-off, run the clinic day to day, and be safe unsupervised by the end of the three months.',
    expectFunction: 'OPERATIONS',
    truth:
      'SPECIFIC AND AHEAD ALL THE WAY THROUGH. Names real protocols, real dates, real numbers, real staff. Went beyond the remit by training his own staff. ANY negative read on Adam is a false positive.',
    turns: [
      [
        'I am taking over Riverside clinic. Eight staff, about ninety patients a week.',
        'My three-month target is full protocol sign-off, which is fourteen modules, and being signed off as safe unsupervised.',
        'I did modules one to three this week and shadowed the outgoing manager for two full days.',
        'Nothing blocking me.',
      ],
      [
        'Modules four, five and six done. That is six of fourteen at week two.',
        'I ran the Monday and Thursday clinics on my own with the outgoing manager observing. No incidents.',
        'I asked Hafsah for the audit template and she sent it the same day.',
        'No blockers.',
      ],
      [
        'Modules seven and eight. Eight of fourteen.',
        'We had a needle-stick incident on Tuesday. I followed the protocol, reported it within the hour, and the staff member was seen the same day.',
        'I have started the quarterly audit early because I would rather do it twice.',
        'Nothing blocking.',
      ],
      [
        'Modules nine and ten done. Ten of fourteen at week four.',
        'Patient numbers up to a hundred and four a week. I moved the phlebotomy slots to the morning which cleared the afternoon backlog.',
        'No blockers.',
        'That is my update.',
      ],
      [
        'Modules eleven and twelve. Twelve of fourteen.',
        'First full audit submitted on the fourteenth. Two minor findings, both closed within the week.',
        'Nothing blocking me.',
        'Done.',
      ],
      [
        'All fourteen modules signed off as of Wednesday. That was my main three-month target and it is done at week six.',
        'I asked Hafsah what to aim at next and she suggested I start on the staff training side.',
        'No blockers.',
        'That is it.',
      ],
      [
        'Signed off as safe unsupervised on the ninth. Both of my formal targets are met at the halfway mark.',
        'I have started training two of my own staff on modules one to four.',
        'Nothing blocking.',
        'Done.',
      ],
      [
        'Both staff, Priya and Tom, are through modules one to four.',
        'Patient numbers holding at about a hundred and five a week, no incidents this month.',
        'No blockers.',
        'That is my update.',
      ],
      [
        'Priya and Tom are now through module eight. Hafsah said that is beyond what she asked for.',
        'Second audit submitted, no findings this time.',
        'Nothing blocking.',
        'Done.',
      ],
      [
        'Steady week. Ninety-eight patients, no incidents, no findings outstanding.',
        'I have written up the phlebotomy change as a note for the other clinics, though I have no idea whether the others need it.',
        'No blockers.',
        'That is it.',
      ],
      [
        'A hundred and two patients this week. Everything running normally.',
        'Priya finished all fourteen modules. She is the first of my staff fully signed off.',
        'Nothing blocking.',
        'Done.',
      ],
      [
        'End of the three months. Fourteen of fourteen modules, signed off unsupervised at week seven, two clean audits, two staff trained.',
        'What I would do differently is start the audit even earlier. Doing it twice was worth it.',
        'No blockers.',
        'That is my final update.',
      ],
    ],
  },
  {
    key: 'abubakar',
    name: 'Abubakar Sambo',
    email: 'abubakar@coamana.test',
    remit:
      'Clinic manager, Northgate clinic. Same three-month onboarding: protocol sign-off, running the clinic, safe unsupervised.',
    expectFunction: 'OPERATIONS',
    truth:
      'COMPETENT BUT UNDERSTATED. Does the work every week and describes it in the plainest possible terms - "fine", "ticking along", "nothing to report". Unlike the delivery run, THERE ARE NO COLLEAGUES TO CORROBORATE HIM: nobody works with him, so nobody can credit him. This is the hard version of the invisible-work trap - the read has to avoid calling him weak WITHOUT any corroborating evidence to lean on. He should not be flagged, and any read on him should be openly low-confidence rather than negative.',
    turns: [
      [
        'Northgate. Six staff, smaller than the others I think. About sixty patients a week.',
        'Same targets as everyone, the fourteen modules and being signed off unsupervised.',
        'Started the modules. It is going fine.',
        'Nothing to report.',
      ],
      [
        'Ticking along. Did some more of the modules.',
        'The clinic runs itself mostly, the staff have been here longer than me.',
        'No problems.',
        'That is all.',
      ],
      [
        'Fine week. More modules done.',
        'I am spending time learning how the place actually works rather than rushing the paperwork.',
        'Nothing blocking.',
        'Nothing else.',
      ],
      [
        'All fine. Steady.',
        'I would rather understand it properly than tick it off quickly.',
        'No blockers.',
        'That is it.',
      ],
      [
        'Good week, nothing unusual.',
        'Getting through the modules at my own pace.',
        'No problems.',
        'Done.',
      ],
      [
        'Same as before really. The clinic is running well.',
        'I am most of the way through the modules now.',
        'Nothing blocking.',
        'That is all.',
      ],
      [
        'Halfway and everything is in order.',
        'I finished the modules this week actually. All fourteen.',
        'No blockers.',
        'Nothing else.',
      ],
      [
        'Fine. Quiet week.',
        'Waiting on the sign-off visit, that is Hafsah\'s to arrange.',
        'Nothing else to report.',
        'Done.',
      ],
      [
        'All fine. Nothing to add.',
        'Still waiting on the unsupervised sign-off visit.',
        'No problems.',
        'That is it.',
      ],
      [
        'Sign-off happened. I am signed off unsupervised now.',
        'Otherwise the same, clinic is running fine.',
        'No blockers.',
        'Done.',
      ],
      [
        'Nothing to report. Everything normal.',
        'Sixty-odd patients a week, same as always.',
        'No problems.',
        'That is all.',
      ],
      [
        'End of the three months. Modules done, signed off unsupervised, clinic running.',
        'I have not had any incidents or findings the whole time.',
        'Nothing blocking.',
        'That is my final update.',
      ],
    ],
  },
  {
    key: 'nate',
    name: 'Nate Peterson',
    email: 'nate@coamana.test',
    remit:
      'Clinic manager, Eastfield clinic. Same three-month onboarding, plus open the second consulting room once the licence variation is approved.',
    expectFunction: 'OPERATIONS',
    truth:
      'GENUINELY BLOCKED FOR SIX WEEKS BY A REGULATOR, and worked around it the whole time. Raised it repeatedly with the onboarding source, who never chased it. Converted fast the moment it cleared. THE MOST DANGEROUS FALSE POSITIVE IN THIS RUN: on a probation ground, reading him as weak for the role costs him his job over something no amount of effort on his part could change.',
    turns: [
      [
        'Eastfield. Five staff at the moment, should be eight once the second consulting room opens.',
        'The room needs a licence variation from the regulator. The application went in before I started.',
        'Same fourteen modules as everyone else. Started on those.',
        'The licence is the one thing I cannot move myself.',
      ],
      [
        'Modules one to three done.',
        'I asked Hafsah about the licence variation. She said it is with the regulator and there is nothing to do but wait.',
        'I cannot recruit the three extra staff until the room is licensed, so that whole part of my remit is frozen.',
        'That is where I am.',
      ],
      [
        'Modules four and five.',
        'Chased the licence again. Nothing. I have asked Hafsah twice now.',
        'Instead of waiting I have written the job descriptions and lined up two candidates so I can move the day it clears.',
        'Still blocked on the room.',
      ],
      [
        'Modules six and seven done. Seven of fourteen.',
        'No movement on the licence. I called the regulator directly this week and got a reference number, which is more than I had.',
        'I am running the single room at full capacity, seventy patients a week in a space meant for fifty.',
        'Still blocked, still working around it.',
      ],
      [
        'Modules eight and nine.',
        'Licence still not through. Six weeks now. I have escalated it to Hafsah again and asked her to chase the regulator on our letterhead.',
        'Third candidate lined up. I have a full shortlist ready and nowhere to put them.',
        'Blocked, not idle.',
      ],
      [
        'Modules ten and eleven. Eleven of fourteen.',
        'Still nothing on the licence. This is the sixth week I have raised it.',
        'I want to be clear that the staffing target is not moving because of the room, not because I have not tried.',
        'Same blocker.',
      ],
      [
        'Modules twelve, thirteen and fourteen. All fourteen done at week seven.',
        'Licence still outstanding. Halfway through and the biggest part of my remit has not been able to start.',
        'Nothing has changed on my side.',
        'Still blocked.',
      ],
      [
        'Waiting on the sign-off visit for unsupervised.',
        'Licence finally moved this week. The variation was approved on the eleventh.',
        'I made offers to two of the three candidates the same day, because the shortlist was already done.',
        'No longer blocked.',
      ],
      [
        'Both offers accepted. Priya starts in two weeks, Dan the week after.',
        'Second consulting room opened on the nineteenth. Capacity is now a hundred a week instead of fifty.',
        'Signed off unsupervised on the seventeenth.',
        'Not blocked.',
      ],
      [
        'Both new staff started. Eight staff now, which is the full complement.',
        'Ninety-two patients this week in the two rooms.',
        'Not blocked.',
        'Done.',
      ],
      [
        'Ninety-eight patients. Both new staff through modules one and two.',
        'Third candidate offered and accepted, starts next month.',
        'Nothing blocking.',
        'That is it.',
      ],
      [
        'End of the three months. Fourteen modules, signed off unsupervised, second room open, eight staff.',
        'Six of the twelve weeks I could not touch the biggest part of my remit and it was not mine to clear. I kept a shortlist warm so it converted in a day once it did.',
        'What I would ask for next time is someone chasing the regulator from our side, not just me.',
        'That is my final update.',
      ],
    ],
  },
  {
    key: 'kavon',
    name: 'Kavon Badie',
    email: 'kavon@coamana.test',
    remit:
      'Clinic manager, Southbank clinic. Same three-month onboarding: protocol sign-off, running the clinic, safe unsupervised.',
    expectFunction: 'OPERATIONS',
    truth:
      'THE PROBATION CASE, AND THE HARD ONE. Sounds engaged and positive every single week and says nothing that anyone could check - no modules, no numbers, no dates, no names. He is NOT blocked and says so. This is genuinely weak for the role, and it is the one person about whom a concerned read is CORRECT. But it must arrive as "nothing here can be checked" rather than as a verdict on him, because sounding vague is not proof of not working, and this decides his job.',
    turns: [
      [
        'Southbank. I am really pleased to be here, it seems like a good team.',
        'The targets, yes, the modules and getting signed off. I have made a start on getting my head around it all.',
        'This week has mostly been meeting people and finding my feet.',
        'All good so far.',
      ],
      [
        'Settling in well. The staff seem to have taken to me.',
        'I have been going through the protocol material. There is a lot of it.',
        'No blockers, I have got everything I need.',
        'Good week overall.',
      ],
      kavonVague(3),
      kavonVague(4),
      kavonVague(5),
      kavonVague(6),
      [
        'Halfway already. It has gone quickly.',
        'I feel like I understand the clinic much better now than at the start.',
        'Nothing blocking me at all, to be clear. I have had everything I need from Hafsah.',
        'Happy with how it is going.',
      ],
      kavonVague(8),
      [
        'Hafsah asked me for specifics this week which was fair enough.',
        'I said I would go back and check exactly where I am on the modules and let her know.',
        'Not blocked. It is on me.',
        'That is this week.',
      ],
      kavonVague(10),
      [
        'I have been meaning to send Hafsah the module list. I will do it this week.',
        'The clinic is running fine, the staff are happy.',
        'No blockers.',
        'Same as before really.',
      ],
      [
        'End of the three months. I have enjoyed it and I think the clinic is in a better place.',
        'On the modules, I have not got as far as I should have. I am not going to pretend otherwise.',
        'Nothing was blocking me. I think I spent too long trying to understand everything and not enough actually finishing the sign-offs.',
        'That is my final update.',
      ],
    ],
  },
];

export const LEAD = PERSONAS[0];
export const CONTRIBUTORS = PERSONAS.slice(1);

/** The ground the admin opens, matching the scenario under test. */
export const GROUND = {
  label: 'Clinic manager onboarding, autumn cohort',
  // Cohort family. The four are onboarding together but do not work together,
  // which is exactly the case a delivery-shaped board must not be forced onto.
  scenario: 'COHORT_CHECK',
  moment: 'STARTING',
  timelineDays: 90,
  cadence: 'WEEKLY',
  brief:
    'Four newly hired clinic managers, each running a separate clinic in a different town. Three month onboarding which also serves as their probation: get them familiar and safe on our protocols, and know early whether any of them is not right for the role. They do not work with each other; they share one onboarding source.',
};
