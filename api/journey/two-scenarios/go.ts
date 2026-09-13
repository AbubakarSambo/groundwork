import { PrismaClient } from '@prisma/client';
import { call, mailMark, mailSince, tokenIn } from '../hundred/harness';
import { aRound, checkEverySurface, aFreshLead, theEmailArrives, table, record, log, type Person } from './run';
import { nothingInternalLeaked } from './what-every-surface-should-hold';

/**
 * THE RUN. Both cards, three people, three rounds, and the answers that broke things before.
 *
 * Everything is created through the API the product uses, so a break in setup is a finding rather
 * than something to work around.
 */
/**
 * EVERY SITUATION THE PRODUCT OFFERS, NOT THE TWO THAT WERE ASKED FOR FIRST.
 *
 * The two goal cards keep three rounds, because the movement reads and the last-round questions only
 * exist from the third. Everything else runs two, which is enough to reach the middle stage and
 * still lets the whole set finish inside a couple of hours. The snapshot runs one, because one
 * honest read from everybody, once, is the entire situation - it has no second session by design.
 *
 * The briefs are what somebody would type, not the card's own marketing line: routing reads the
 * words a person uses, and feeding it our own vocabulary back would be testing a mirror.
 */
const CARDS: { name: string; scenario: string; brief: string; rounds?: number }[] = [
  /* The two this harness was written for. */
  { name: 'keep the team on track', scenario: 'OKR_ALIGNMENT', rounds: 3,
    brief: 'We are setting shared goals for this period and I want everyone aligned on what matters most.' },
  /*
   * THE CASCADE CARD IS NOT ITS OWN SCENARIO. Both goal cards run on OKR_ALIGNMENT and what tells
   * them apart is the sentence somebody picked the card with - a cascade is detected from the brief
   * rather than declared at setup. Building this table I gave it BOARD_STRATEGY, which is a
   * different card entirely ("Board or leadership strategy"), so the cascade went untested and the
   * strategy card was tested with a brief that is not its own. Twenty-three cards on twenty-two
   * scenarios, and this is the pair that share one.
   */
  { name: 'connect goals across', scenario: 'OKR_ALIGNMENT', rounds: 3,
    brief: 'We have one overarching goal and separate teams are setting their own goals and targets underneath it. I want to know whether they connect to the main goal and add up together.' },
  { name: 'align on strategy', scenario: 'BOARD_STRATEGY',
    brief: 'The leadership team does not see the direction the same way and I want to know where we actually differ.' },

  /* Delivery. */
  { name: 'a new project', scenario: 'NEW_PROJECT',
    brief: 'We are kicking off a piece of work and I want to agree what it produces and who owns which part.' },
  { name: 'a role changing hands', scenario: 'ROLE_HANDOVER',
    brief: 'Someone is handing their role to someone else and I want to be sure nothing falls down the gap.' },
  { name: 'a new cofounder', scenario: 'NEW_COFOUNDER',
    brief: 'I have brought in a cofounder and we have never written down who decides what.' },
  { name: 'a workplan and a budget', scenario: 'WORKPLAN_BUDGET',
    brief: 'We have a workplan and a budget for the year and I want to track what is actually being spent against what we said we would do.' },

  /* Onboarding. */
  { name: 'a new hire', scenario: 'NEW_HIRE',
    brief: 'Someone joined six weeks ago and I want to know whether they and I agree on what good looks like.' },
  { name: 'a new manager', scenario: 'NEW_MANAGER',
    brief: 'I have just taken over managing this team and I do not know what they think they are meant to be doing.' },
  { name: 'a new advisor', scenario: 'NEW_ADVISOR',
    brief: 'We have taken on an advisor and nobody has said out loud what we expect from each other.' },

  /* Evaluation. Peers are hidden from each other here, which is the point of running them. */
  { name: 'a performance plan', scenario: 'PIP',
    brief: 'Someone is not where they need to be and I want a fair record of what was agreed and what happened.' },
  { name: 'a contract coming up for renewal', scenario: 'CONTRACT_RENEWAL',
    brief: 'A supplier contract is up in two months and I want both sides to say how it has actually gone.' },
  { name: 'recognising somebody', scenario: 'RECOGNITION',
    brief: 'I want to put on record what someone has actually carried this year before promotion conversations.' },

  /* Agreement, between two sides of a contract. */
  { name: 'reviewing a contract', scenario: 'CONTRACT_REVIEW',
    brief: 'We signed an agreement with another company and I want both sides to say whether it is being kept.' },
  { name: 'tracking an implementation', scenario: 'IMPLEMENTATION_TRACKING',
    brief: 'We are delivering against a signed agreement and I want to track the milestones with the other side.' },

  /* Sensing. None of these has a board, which is the thing worth proving. */
  { name: 'things have drifted', scenario: 'DRIFT',
    brief: 'Something has gone quietly wrong between people here and nobody is saying it out loud.' },
  { name: 'a crisis', scenario: 'CRISIS_ALIGNMENT',
    brief: 'Something has gone badly wrong this week and I need everyone\'s account before we decide anything.' },
  { name: 'getting the team back on the same page', scenario: 'REALIGN_TEAM',
    brief: 'The team has pulled in different directions and I want to get us back to one understanding.' },
  { name: 'something just happened', scenario: 'ACUTE_SHOCK',
    brief: 'We lost our biggest customer on Tuesday and I want the picture before anybody reacts.' },
  { name: 'describe your own situation', scenario: 'OPEN_READ',
    brief: 'I am not sure what this is yet. I want each person to give me their own read, privately.' },

  /* Recurring, cohort, snapshot. */
  { name: 'a regular read on live work', scenario: 'PULSE_CHECK',
    brief: 'I want a weekly read on what my team is doing against what they own.' },
  { name: 'a cohort', scenario: 'COHORT_CHECK',
    brief: 'I am running a programme with a group of people who do not work together, and I want each of their own reads.' },
  { name: 'one read, once', scenario: 'SNAPSHOT', rounds: 1,
    brief: 'I want one honest read from everybody, one time, about what is going well and what is stuck.' },
];

/**
 * DELIBERATELY POOR ANSWERS. A run where everybody answers well proves nothing - the product was
 * already fine with those. These are the shapes that broke things before: a dodge, a hedged number,
 * a blocker with no owner, a flat refusal to guess.
 *
 * TWO SETS, because the goal cards have a number in them and most situations do not. Feeding "we
 * need to hit 270 units" into a check-in about somebody's first six weeks would be testing how the
 * product copes with a nonsense answer, which is a different question from the one being asked here.
 */
const ABOUT_A_NUMBER: Record<string, string[][]> = {
  lead: [
    ['We need to hit 270 units this year.', 'It matters because the board signed it off.', 'Nothing is blocked yet.'],
    ['Not much has changed.', 'Two people are behind, I think.', 'I will talk to them this week.'],
    ['We landed short, around 240.', 'The finance approvals were the problem.', 'Next year we start the approvals earlier.'],
  ],
  member: [
    ['Yeah all good, pipeline is strong.', 'I should hit my number.', 'The system will show it.'],
    ['About a third of the way there I would say.', 'Waiting on finance, been three weeks.', 'I emailed them twice.'],
    ['I genuinely do not know.', 'I would be guessing.', 'Nothing else to add.'],
  ],
  partner: [
    ['Grow the region and keep the dealers happy.', 'We would be at about 40 million I think.', 'By end of next year.'],
    ['I am not sure how it ties to the group target, nobody has told us.', 'I asked the CFO once, last month.', 'I will chase on Monday.'],
    ['It mostly came together.', 'The launch date slipped.', 'Keep the weekly call, drop the rest.'],
  ],
};

/** The same badness, with nothing in it that assumes a target. */
const ABOUT_ANYTHING: Record<string, string[][]> = {
  lead: [
    ['I want us all pulling the same way on this.', 'It matters because it keeps coming up.', 'Nothing is blocked that I know of.'],
    ['Not much has changed since last time.', 'A couple of people seem behind, I think.', 'I will pick it up with them.'],
    ['It mostly came together in the end.', 'The timing was the problem.', 'Next time we start earlier.'],
  ],
  member: [
    ['Yeah, all good from my side.', 'I think I am doing what is expected.', 'It will be obvious soon enough.'],
    ['Somewhere in the middle I would say.', 'Waiting on someone else, been a few weeks.', 'I sent a message about it.'],
    ['I genuinely do not know.', 'I would only be guessing.', 'Nothing else to add.'],
  ],
  partner: [
    ['Keep things moving and keep people happy.', 'Hard to put a figure on it, honestly.', 'Some time next year.'],
    ['Nobody has told us how this connects to anything.', 'I asked once, last month.', 'I will chase it on Monday.'],
    ['It went roughly as expected.', 'One date slipped.', 'Keep the regular call, drop the rest.'],
  ],
};

const answersFor = (scenario: string) =>
  scenario === 'OKR_ALIGNMENT' || scenario === 'BOARD_STRATEGY' ? ABOUT_A_NUMBER : ABOUT_ANYTHING;

const db = new PrismaClient();

async function main() {
  for (const card of CARDS) {
    log(`--- ${card.name}  (${card.scenario}, ${card.rounds ?? 2} round${(card.rounds ?? 2) === 1 ? '' : 's'})`);
    const stamp = Date.now();
    const people: Person[] = [
      { who: 'member', email: `member.${stamp}@journey.test`, role: 'Marketing analyst' },
      { who: 'partner', email: `partner.${stamp}@journey.test`, role: 'Head of Sales, West Africa' },
    ];

    /*
     * ONE ACT, NOT THREE. The lead talks to the entry chat, signs up out of it and commits the
     * conversation - which is where the check-in, the participants and the invitations all come
     * from. Doing it any other way skips the only path that writes the report object two of the
     * eight surfaces draw from.
     *
     * A fresh lead per card, so each card gets its own organisation and its own allowance.
     */
    const mark = mailMark();
    const fresh = await aFreshLead(card.brief, card.scenario, `${card.name} ${stamp}`, people);
    const lead: Person = { who: 'lead', email: fresh.email, role: '', token: fresh.token };
    record(card.name, 0, 'setup', 'set the check-in up through the entry chat', fresh.groundId ? true : (fresh.why ?? 'no check-in came out of the chat'));
    const groundId = fresh.groundId;
    if (!groundId || !lead.token) continue;

    await theEmailArrives();
    for (const p of people) {
      const mail = mailSince(mark).filter((m) => m.to === p.email);
      const link = mail.map((m) => m.link).filter(Boolean).pop() ?? null;
      const accepted = link ? await call('POST', '/participants/accept', { token: tokenIn(link) }) : null;
      p.token = accepted?.data?.accessToken ?? null;
      record(card.name, 0, 'setup', `the ${p.who} can get in`,
        p.token ? true : `no way in: ${link ? `accept returned ${accepted?.status}` : 'no invitation link arrived'}`);
    }

    /*
     * And the lead names each person's role, the way they do from the panel. It matters to both
     * cards: one of the two has to read as a partner rather than a team member, and that judgement
     * is made from this label.
     */
    const roster = await call('GET', `/grounds/${groundId}`, undefined, lead.token);
    for (const p of people) {
      const row = (roster.data?.participants ?? []).find((x: any) => x.email === p.email);
      const named = row ? await call('PATCH', `/participants/${row.id}`, { roleAsDescribed: p.role }, lead.token) : null;
      record(card.name, 0, 'setup', `the ${p.who} has a role`, named && named.status < 300 ? true
        : `could not name the ${p.who}'s role: ${row ? `PATCH returned ${named?.status}` : 'they are not on the roster'}`);
    }

    const label = await call('GET', `/grounds/${groundId}`, undefined, lead.token);
    record(card.name, 0, 'setup', 'names the right card', nothingInternalLeaked(JSON.stringify(label.data ?? {})));

    const rounds = card.rounds ?? 2;
    const answers = answersFor(card.scenario);
    for (let round = 1; round <= rounds; round += 1) {
      for (const p of [lead, ...people]) {
        if (!p.token) continue;
        const mine = await call('GET', `/grounds/${groundId}/my-checkin-status`, undefined, p.token);
        let ci = (mine.data?.checkIns ?? []).find((c: any) => c.sessionNumber === round);
        /*
         * A later round is opened on the cadence by the scheduler, not by anything a person can
         * press - so a run that wants three rounds in a minute has to write the row itself. This is
         * the one place the harness reaches past the API, and it is setup rather than the thing
         * under test: everything that happens IN the round still goes through the product.
         */
        if (!ci) {
          const pid = mine.data?.participantId;
          if (pid) {
            const made = await db.checkIn.create({ data: { groundId, participantId: pid, sessionNumber: round, status: 'NOT_STARTED' } })
              .catch(() => null);
            if (made) ci = { id: made.id, sessionNumber: round };
          }
        }
        record(card.name, round, 'setup', `the ${p.who} has a round`, ci ? true : `no check-in at session ${round} and none could be opened`);
        /* Kept, because three of the eight surfaces are about one person's own sitting. */
        if (ci) p.checkInId = ci.id;
        /*
         * THE LEAD'S FIRST ROUND IS ALREADY DONE, BY THE CHAT THEY JUST HAD. Committing an entry
         * conversation closes the committer's own first sitting - it IS their first check-in. The
         * harness tried to hold a second conversation inside it and got three empty replies and a
         * refusal to close, all of them correct.
         */
        if (ci && ci.status === 'COMPLETED') {
          record(card.name, round, 'setup', `the ${p.who} does not answer twice`, true);
        } else if (ci) {
          await aRound(p, ci.id, answers[p.who][round - 1]);
        }
      }
      /* The close card is read as the MEMBER, because that is the one this is written for. */
      await checkEverySurface(card.name, round, rounds, groundId, lead, people[0].token ? people[0] : lead);
    }
  }

  await db.$disconnect();
  process.exit(table() ? 0 : 1);
}

main().catch((e) => { log(`the run itself fell over: ${e?.stack ?? e}`); process.exit(2); });
