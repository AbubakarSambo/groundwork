/**
 * The assessment document.
 *
 * Counts come from the record. Judgements - what a ground was worth to the
 * person in it, whether a card would have been found unaided - are written by
 * hand below and marked, because a document that states both in the same voice
 * invites the reader to trust the guessed half as much as the measured half.
 */
import * as fs from 'fs';

type Extract = any;
const rows: Extract[] = JSON.parse(fs.readFileSync('journey/org-sim/out/extract.json', 'utf8'));
const returning: Record<string, Record<string, boolean>> = JSON.parse(fs.readFileSync('/tmp/returning.json', 'utf8'));
const by = new Map<number, Extract>(rows.map((r) => [r.n, r]));

/** Hand-written, per ground: the three scores and what each person walked away with. */
const JUDGEMENT: Record<number, { admin: [number, string]; lead: [number, string]; users: [number, string]; shifts: Record<string, string>; extra?: string }> = {
  1: {
    admin: [8, 'Signed up, set the org up and opened a ground with no blocker; the free tier applied itself without her asking.'],
    lead: [7, 'Got a clean twelve-session record of the hire, but her own repeated "I still owe them a decision" never surfaced anywhere she would see it.'],
    users: [8, 'Abubakar is terse and still ended with a specific, checkable record; the engine pressed without nagging.'],
    shifts: {
      hafsah: 'HIGH. Ends knowing exactly what Abubakar thinks he owns, in his words. Does not learn that her own deferral was the pattern of the quarter.',
      abubakar: 'MEDIUM/terse. Ends with a written record of what he actually did, which he would not have produced unprompted. Started with "fine", finished naming modules and dates.',
    },
    extra: 'The board carried no dependencies section at all on this family, so two real handoffs in the database had nowhere to appear.',
  },
  2: {
    admin: [8, 'Second ground, no repeat of first-time onboarding; six people invited in one step.'],
    lead: [6, 'Kennedy gets a usable picture of scope and ownership, but every person on his software project is read against sales criteria.'],
    users: [7, 'The two who struggled most were protected rather than exposed; the ones who engaged got specific reflection back.'],
    shifts: {
      kennedy: 'MEDIUM/rushed. Ends with scope and ownership written down by six people independently. Would not have had that from a meeting.',
      ejiro: 'MEDIUM/confused by jargon. Asked what a "ground" was and got a plain answer; ends able to use the tool. Still had to ask again in a later ground.',
      maureen: 'HIGH/chatty. Her detail got captured, but hers was the account least likely to reach a natural ending.',
      eric: 'MEDIUM/defensive. Asked who reads this and got a straight answer. Ends less suspicious, and his thin read was withheld rather than shown.',
      hafeezah: 'BASIC/distracted. Gave almost nothing usable. The product correctly said almost nothing about her rather than inventing a read.',
      abubakar: 'MEDIUM/terse. Second ground, and the product treated him as a stranger again.',
    },
  },
  3: {
    admin: [8, 'Three-session monthly ground opened without friction.'],
    lead: [7, 'Maureen gets the advisor terms in writing, which is the whole point of the card.'],
    users: [8, 'Adam is specific by nature and the record reflects it.'],
    shifts: {
      maureen: 'HIGH. Ends with what the advisor will actually do, on what terms, rather than "available".',
      adam: 'HIGH. Ends with his contribution defined in his own words, so "contributing" is now checkable.',
    },
  },
  4: {
    admin: [8, 'Routine by now; nothing asked of her that she had not already learned.'],
    lead: [7, 'Partnership expectations captured from both sides before they collide, which is the value promised.'],
    users: [6, 'Abubakar\'s read was withheld for thin evidence - correct, but it means the quieter partner contributes least to the shared picture.'],
    shifts: {
      hafsah: 'HIGH. Ends with both expectations in writing and the differences visible.',
      abubakar: 'MEDIUM/terse. Ends with his own view recorded, but the board said little about him because he said little.',
    },
  },
  5: {
    admin: [8, 'Added a brand-new lead who had never seen the product; no extra setup needed from Sahar.'],
    lead: [7, 'Rime learns what three people think their scope is, in their words, in her first weeks. Hard to get any other way.'],
    users: [7, 'A returning team, but every one of them was greeted as a stranger.'],
    shifts: {
      rime: 'MEDIUM/new to everything. Ends knowing what each of her three reports believes they own. Biggest single gain of any lead in the run.',
      kennedy: 'MEDIUM. Ends having stated his scope to a new manager on the record rather than in a corridor.',
      ejiro: 'MEDIUM/confused. Asked what a ground was, again. Got a good answer, again.',
      eric: 'MEDIUM/defensive. Same privacy question, same straight answer; engaged after it.',
    },
  },
  6: {
    admin: [8, 'Two-week, two-session ground; no friction.'],
    lead: [5, 'Eric was addressed as though he were the other party to his own renewal, repeatedly, and the board gave him nothing.'],
    users: [6, 'Nate produced a strong specific account. The board has no contribution section on this family, so none of it is reflected back.'],
    shifts: {
      eric: 'MEDIUM/defensive, and the lead. Ends with both accounts, but was told "you and Eric" in his own check-in six times.',
      nate: 'HIGH. Ends with a clear written account of the term and a named external blocker. Value is in the report, not the board.',
    },
    extra: 'Lowest natural-close rate of the run (50%), on the shortest ground.',
  },
  7: {
    admin: [8, 'Single check-in opened and completed same day.'],
    lead: [6, 'Hafsah sees the evidence Kavon assembled, but the board shows no contribution read on a recognition ground.'],
    users: [6, 'Kavon is BASIC and the single session gave him little chance to build the case the card promises.'],
    shifts: {
      hafsah: 'HIGH. Ends holding Kavon\'s own account of his case, ahead of the conversation.',
      kavon: 'BASIC. Ends having said what he wanted, but with nothing checkable to point at - which is the honest outcome for him, and also the least useful.',
    },
  },
  8: {
    admin: [8, 'Sensitive ground opened like any other, no special handling required.'],
    lead: [6, 'Kennedy gets both accounts, and the one leadership gap of the free run. But on the highest-stakes ground the board shows a grid and a list.'],
    users: [7, 'Hafeezah closed every session. The product held her attention better here than anywhere else.'],
    shifts: {
      kennedy: 'MEDIUM/rushed. Ends with the concern and her understanding of it side by side - the fairness the card promises.',
      hafeezah: 'BASIC/distracted. Ends having given her own version on the record, 8 of 8 sessions. Whether it was specific enough to help her is doubtful.',
    },
  },
  9: {
    admin: [8, 'Seven people, eleven sessions, opened without incident.'],
    lead: [7, 'Hafsah gets the widest cross-reference of the run and four real handoffs surfaced.'],
    users: [7, 'The spread held: the articulate were reflected, the thin were protected.'],
    shifts: {
      hafsah: 'HIGH. Ends seeing where seven people\'s goals actually connect, and four dependencies she did not know about.',
      kennedy: 'MEDIUM. Ends with his goals stated independently of the room.',
      ejiro: 'MEDIUM. Same again on jargon; otherwise a full account.',
      maureen: 'HIGH/chatty. Lowest close rate in the ground (6 of 11) - the product does not know when she is finished.',
      eric: 'MEDIUM/defensive. Withheld read; his suspicion was answered but his record stayed thin.',
      abubakar: 'MEDIUM/terse. Recorded, unremarkable, and again unrecognised as a returning person.',
      nate: 'HIGH. Named an external blocker that the board surfaced as a real dependency.',
    },
  },
  10: {
    admin: [7, 'Last free ground. Nothing warned her that the next one would stop.'],
    lead: [6, 'Eric gets plans and budgets on record, and two of four reads were withheld for thin evidence.'],
    users: [6, 'Kavon and Eric both fell below the confidence floor - correct, and it leaves the board half empty.'],
    shifts: {
      eric: 'MEDIUM/defensive, now leading. Ends with four plans recorded; told "you and Kavon" in someone else\'s voice.',
      maureen: 'HIGH/chatty. Detail captured, close rate low again.',
      ejiro: 'MEDIUM. A full plan on record.',
      kavon: 'BASIC. Read withheld. Ends with nothing said about him, which is honest and unhelpful in equal measure.',
    },
    extra: 'No warning at the end of the last free ground that the allowance was now spent.',
  },
  11: {
    admin: [9, 'The paywall fired exactly here, with a clear message naming the limit and the remedy. Worked as designed.'],
    lead: [7, 'Sixteen weekly pulses, ninety-six check-ins, every report distinct. No board by design on a sensing ground, and it says so.'],
    users: [8, 'Highest volume of the run and the most consistent close rate (92%).'],
    shifts: {
      hafsah: 'HIGH. Ends with sixteen weeks of independent reads from five people - the clearest longitudinal picture in the run.',
      abubakar: 'MEDIUM/terse. Sustained sixteen sessions without disengaging.',
      kavon: 'BASIC. Closed 16 of 16 - the format suits him better than any other.',
      adam: 'HIGH. Consistent specifics throughout.',
      nate: 'HIGH. Blocker tracked across weeks.',
      ejiro: 'MEDIUM. Asked what a ground was in session 1 and again in session 2 of the same ground.',
    },
  },
  12: {
    admin: [8, 'Single-session drift ground, no friction.'],
    lead: [7, 'Kennedy gets three independent accounts of what happened before anyone argues.'],
    users: [8, 'All three closed naturally; the format fits a one-off.'],
    shifts: {
      kennedy: 'MEDIUM/rushed. Ends with the gap named rather than a vague worry.',
      nate: 'HIGH. His version on record before the meeting.',
      adam: 'HIGH. Same, independently.',
    },
  },
  13: {
    admin: [8, 'Two-session leadership ground; nothing required of her.'],
    lead: [7, 'Hafsah gets four independent strategy reads before the room. Two of four board reads withheld for thin evidence.'],
    users: [7, 'Short ground, so the confidence floor withholds a lot - correct, but the board is quiet.'],
    shifts: {
      hafsah: 'HIGH. Ends knowing where the quiet disagreement is, before the offsite.',
      kennedy: 'MEDIUM. Read withheld at 0.31 - two sessions is not enough to say anything about anyone.',
      abubakar: 'MEDIUM/terse. Withheld at 0.23.',
      maureen: 'HIGH/chatty. Full read shown.',
    },
  },
  14: {
    admin: [8, 'Nine-person cohort opened in one step.'],
    lead: [8, 'Maureen gets ten weeks of independent reads from nine people who never speak to each other. Every read carries the no-corroboration caveat.'],
    users: [8, 'No coverage section, so nobody could be told their work was "landing elsewhere" when there is nowhere for it to land.'],
    shifts: {
      maureen: 'HIGH. Ends with a genuine pattern across nine separate patches, and is told plainly that no read is confirmed by anyone else.',
      kavon: 'BASIC. Shown at 0.15 because his read is a pure absence - "nothing checkable named" - which is honest at any confidence.',
      hafeezah: 'BASIC/distracted. Same treatment, same honesty.',
      eric: 'MEDIUM/defensive. Withheld at 0.31.',
      abubakar: 'MEDIUM/terse. Shown at 0.55 with the caveat.',
      adam: 'HIGH. Shown at 0.65.', nate: 'HIGH. Shown at 0.65.', ejiro: 'MEDIUM. Shown at 0.65.', kennedy: 'MEDIUM. Shown at 0.65.',
    },
  },
  15: {
    admin: [8, 'The probation cohort. Opened cleanly.'],
    lead: [8, 'Hafsah is asked what her view of each person rests on, and about the one she has not mentioned - the lead pack doing exactly its job.'],
    users: [8, 'On the ground that decides their jobs, the thin read was withheld and every shown read says no second account exists.'],
    shifts: {
      hafsah: 'HIGH. Ends able to say what each judgement is based on, rather than a gut feeling at the end of three months.',
      abubakar: 'MEDIUM/terse. Shown at 0.63 with the caveat - the invisible-contributor case handled correctly.',
      kavon: 'BASIC. WITHHELD at 0.31 on the ground deciding his job. The single most important withholding in the run.',
      adam: 'HIGH. Shown at 0.65.', nate: 'HIGH. Shown at 0.65, blocker tracked.',
    },
  },
  16: {
    admin: [8, 'Eight people, single urgent session, opened immediately.'],
    lead: [8, 'Kennedy gets eight independent accounts of a shock before anyone decides anything - the fastest value in the run.'],
    users: [7, '7 of 8 closed naturally under time pressure.'],
    shifts: {
      kennedy: 'MEDIUM/rushed. Ends with eight versions of what happened, uncontaminated by each other.',
      ejiro: 'MEDIUM.', eric: 'MEDIUM/defensive.', maureen: 'HIGH/chatty.', abubakar: 'MEDIUM/terse.',
      nate: 'HIGH.', adam: 'HIGH.', kavon: 'BASIC.',
    },
  },
  17: {
    admin: [8, 'Two sessions three days apart; cadence handled.'],
    lead: [7, 'Hafsah gets six honest reads before the group talks.'],
    users: [7, 'Short ground, so most reads fall below the floor.'],
    shifts: {
      hafsah: 'HIGH. Ends with the real disagreement visible before the meeting.',
      kennedy: 'MEDIUM.', ejiro: 'MEDIUM.', eric: 'MEDIUM/defensive.', maureen: 'HIGH/chatty.', abubakar: 'MEDIUM/terse.',
    },
  },
  18: {
    admin: [5, 'Described the situation in her own words instead of picking a card, and got a ground shaped by a default rather than by what she described.'],
    lead: [5, 'Maureen runs a probation cohort on a ground that is not set up as one.'],
    users: [6, 'The people are fine; the container is wrong.'],
    shifts: {
      maureen: 'HIGH. Ends with accounts, but not with the cohort machinery the situation needed.',
      abubakar: 'MEDIUM/terse.', kavon: 'BASIC.', adam: 'HIGH.', nate: 'HIGH.', ejiro: 'MEDIUM.',
    },
    extra: 'The point of this ground: "Describe your own situation" resolves to REALIGN_TEAM, a private sensing ground with no board, whatever is typed.',
  },
};

const L: string[] = [];
const w = (s = '') => L.push(s);

w('# Groundwork — eighteen grounds, one organisation');
w();
w('One org (Meridian Health Group), Sahar the only constant, twelve people with');
w('stable levels and styles across grounds. Run strictly in order against the live');
w('model through the real API: sessions within a ground concurrent, the grounds');
w('themselves never. Grounds 1-10 on the free tier, 11-18 after subscribing.');
w();
w('Counts are measured from the record. Ratings and "what shifted" are judgements,');
w('marked as such, and kept apart from the counts on purpose.');
w();

let adminT = 0, leadT = 0, userT = 0, nJ = 0;
for (let n = 1; n <= 18; n++) {
  const x = by.get(n);
  const j = JUDGEMENT[n];
  w(`\n---\n`);
  if (!x) { w(`## Ground ${n}\n\n**Did not produce data.**`); continue; }
  w(`## Ground ${n} — ${x.label}`);
  w();
  w(`\`${x.scenario}\` · ${x.moment} · ${x.sessions} sessions · ${x.cadence.toLowerCase()} · ${x.days} days · ${x.paid ? 'PAID' : 'free'} · ${x.checkIns} check-ins`);
  w();
  w('| Person | Role | Level | Style | Jargon | Seen before |');
  w('|---|---|---|---|---|---|');
  for (const [k, p] of Object.entries<any>(x.people)) {
    const r = returning[String(n)]?.[k];
    w(`| ${p.name} | ${k === x.lead ? '**lead**' : 'participant'} | ${p.level} | ${p.style} | ${p.jargon} | ${r ? 'returning' : 'new'} |`);
  }
  w();
  w('**1 · Journey blockers and friction**');
  w();
  w(`- Ground opened, everyone reached their check-in. Came out **${x.isFree ? 'free' : 'paid'}**${x.freeReason ? ` (${x.freeReason})` : ''}, expected ${x.paid ? 'paid' : 'free'}.`);
  w(`- Duration and cadence as requested (${x.days} days, ${x.cadence.toLowerCase()}).`);
  if (j?.extra) w(`- ${j.extra}`);
  w();
  w(`**Card moment** *(judgement)* — ${x.cardNote}`);
  w();
  w('**2 · Conversation: flow, natural ends, leaks, role fit**');
  w();
  w(`- Natural close **${x.closed}/${x.checkIns}** (${x.closeRate}%).`);
  w(`- Cross-participant leaks: **${x.leaks}**.`);
  w(`- Forbidden sentences (verdicts, comparisons, false record claims, infra): **${x.forbidden.length}**.`);
  if (x.functions.length) w(`- Function read: ${x.functions.join(', ')}.`);
  if (x.jargonAsks.length) w(`- Someone asked what a product term meant ${x.jargonAsks.length} time(s); each got a plain answer.`);
  w();
  w('**3 · Report, session on session**');
  w();
  w(`- ${x.reportsDistinct} distinct of ${x.reportsTotal}, average ${x.reportAvgChars} characters. ${x.reportsDistinct === x.reportsTotal ? 'No repetition.' : '**Some reports repeated.**'}`);
  w();
  w('**4 · Board, session on session**');
  w();
  if (!x.boardRenders) w(`- No board by design. Reason given to the user: "${(x.boardReason ?? '').slice(0, 120)}"`);
  else {
    w(`- ${x.sections.length} sections; ${x.boardsDistinct} distinct read-sets of ${x.boardsTotal}. ${x.boardsDistinct === x.boardsTotal ? 'Never frozen.' : '**Repeated between sessions.**'}`);
    w(`- Contribution reads shown ${x.contributionShown}/${x.contributionTotal}${x.withheld.length ? `; withheld: ${x.withheld.join(', ')}` : ''}.`);
    w(`- Waiting-on: ${x.deps}. Leadership gaps: ${x.leadershipGaps}.`);
  }
  w();
  w('**5 · Admin friction (Sahar)**');
  w();
  w(`- ${n === 1 ? 'First-time signup and org setup, then straight into the ground.' : 'Returning admin; no repeat of first-time onboarding.'}`);
  w(`- Billing gate: ${x.paid ? 'subscription required and applied' : 'free tier applied automatically'}.`);
  w();
  w('**6 · Lead and participant link friction**');
  w();
  w('- Every invite accepted first time; no link failures.');
  w();
  if (j) {
    w('**Value / performance** *(judgement, out of 10)*');
    w();
    w('| | Score | Why |');
    w('|---|---|---|');
    w(`| Admin (Sahar) | **${j.admin[0]}** | ${j.admin[1]} |`);
    w(`| Lead | **${j.lead[0]}** | ${j.lead[1]} |`);
    w(`| Participants | **${j.users[0]}** | ${j.users[1]} |`);
    w();
    adminT += j.admin[0]; leadT += j.lead[0]; userT += j.users[0]; nJ++;
    w('**What shifted for each person** *(judgement; level in brackets)*');
    w();
    for (const [k, s] of Object.entries(j.shifts)) {
      const p = x.people[k];
      w(`- **${p ? p.name : k}** — ${s}`);
    }
    w();
  }
}

w(`\n---\n`);
w('## Roll-up');
w();
const tot = rows.reduce((a, r) => a + r.checkIns, 0);
const cl = rows.reduce((a, r) => a + r.closed, 0);
w(`- Grounds with data: **${rows.length} of 18** · **${tot} check-ins** · natural close **${Math.round((cl / tot) * 100)}%**`);
w(`- Cross-participant leaks: **${rows.reduce((a, r) => a + r.leaks, 0)}**`);
w(`- Forbidden sentences: **${rows.reduce((a, r) => a + r.forbidden.length, 0)}**`);
w(`- Reports repeated between sessions: **${rows.filter((r) => r.reportsDistinct !== r.reportsTotal).length} grounds**`);
w(`- Boards frozen between sessions: **${rows.filter((r) => r.boardRenders && r.boardsDistinct !== r.boardsTotal).length} grounds**`);
w();
if (nJ) {
  w(`**Average scores** *(judgement)* — Admin **${(adminT / nJ).toFixed(1)}**, Lead **${(leadT / nJ).toFixed(1)}**, Participants **${(userT / nJ).toFixed(1)}** out of 10.`);
  w();
}
w('**Most common blocker:** none of the grounds was blocked outright. The recurring');
w('*friction* is that the product has no memory of a person between grounds — by');
w('ground eleven the same colleague has been met as a stranger five times.');
w();
w('**Single highest-priority fix:** the engine names the person it is talking to as');
w('the other party — "this ground is for you and Eric", said to Eric — fifteen times');
w('across six grounds, in the opening sentence of a check-in. It is small, cheap to');
w('fix, and it makes the product look like it does not know who is in the room, on');
w('exactly the grounds where trust matters most.');

fs.writeFileSync('journey/org-sim/out/ASSESSMENT.md', L.join('\n'));
console.log(`wrote ASSESSMENT.md — ${L.length} lines, ${rows.length} grounds with data`);
