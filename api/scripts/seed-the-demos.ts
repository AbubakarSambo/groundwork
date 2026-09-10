/**
 * SEED THE THREE DEMOS, THROUGH THE REAL ENGINE.
 *
 *   npx ts-node -P tsconfig.json --transpile-only scripts/seed-the-demos.ts --lead hafsah.jumare@coamana.com --participant hjumare@gmail.com [--yes]
 *
 * Without --yes it only prints what it would delete. With it: clears every ground, check-in, report,
 * commitment, to-do and document of the two people in the lead's organisation (users, memberships and
 * the ops back office untouched), then builds three demos the way the product would - grounds
 * created as the lead, the participant invited and accepting, both people answering through the
 * check-in engine, sessions completed, reports synthesised and released by the reports listener.
 * Nothing is typed into the database as a transcript: every AI line is the engine's.
 *
 * Expect 20 to 40 minutes: it is dozens of model turns. Invitation emails go to the participant's
 * real address, because that is what the product does when a lead adds somebody.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { GroundsService } from '../src/modules/grounds/grounds.service';
import { ParticipantsService } from '../src/modules/participants/participants.service';
import { ConversationService } from '../src/modules/conversation/conversation.service';
import { DocumentsService } from '../src/modules/documents/documents.service';
import { AssistantService } from '../src/modules/assistant/assistant.service';
import { GroundsByApiService } from '../src/modules/public-api/grounds-by-api.service';
import { ScimService } from '../src/modules/people/scim.service';

const arg = (name: string, fallback?: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : fallback; };
const YES = process.argv.includes('--yes');
const LEAD = (arg('lead', 'hafsah.jumare@coamana.com') as string).toLowerCase();
const PARTICIPANT = (arg('participant', 'hjumare@gmail.com') as string).toLowerCase();
const ONLY = arg('only'); // 'bd' | 'eng' | 'sales' to seed one demo
const log = (m: string) => console.log(`[seed ${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Voice = { lead: string[]; participant: string[] };
interface Demo {
  key: string;
  label: string;
  scenario: string;
  moment: string;
  cadence: string;
  timelineDays: number;
  brief: string;
  participantRole: string;
  leadDoc: { name: string; text: string; note: string };
  objectives: { externalId: string; text: string; kind: string; personExternalId: 'lead' | 'participant'; owedTo?: 'lead' | 'participant'; target?: string; measure?: string }[];
  sessions: Voice[];
  /** How many of `sessions` to complete. The next one is left open. */
  complete: number;
  commitmentSaidInPassing: string;
}

const DEMOS: Demo[] = [
  {
    key: 'bd',
    label: 'Business Development: Habiba onboarding',
    scenario: 'NEW_HIRE', moment: 'STARTING', cadence: 'FORTNIGHTLY', timelineDays: 90,
    brief: 'Habiba joined the Business Development team on 1 September as Partnerships Associate. In her first 90 days she owns the NABG member outreach, the Bayer follow-ups, and the partner tracker. Success at 90 days: eight member conversations logged, two moved to proposal, and the tracker kept current every week.',
    participantRole: 'Partnerships Associate, started 1 September',
    leadDoc: { name: 'BD onboarding plan - Habiba.txt', note: 'The 90 day plan we agreed on her first day', text: 'Business Development onboarding plan, Habiba, Partnerships Associate.\n\nWeeks 1 to 2: shadow two member calls, read the NABG member list, set up the partner tracker.\nWeeks 3 to 6: own outreach to the first eight NABG members, log every conversation in the tracker within 24 hours.\nWeeks 7 to 12: move two members to proposal stage, run the Bayer follow-up calls with the lead present.\n\nWhat success looks like at 90 days: eight member conversations logged, two proposals sent, tracker current every Friday.\nCheck-ins every two weeks. Blockers raised the day they appear, not at the check-in.' },
    objectives: [
      { externalId: 'bd-8-conversations', text: 'Eight NABG member conversations logged in the tracker', kind: 'TARGET', personExternalId: 'participant', target: '8', measure: 'conversations logged' },
      { externalId: 'bd-2-proposals', text: 'Two members moved to proposal stage', kind: 'TARGET', personExternalId: 'participant', target: '2', measure: 'proposals sent' },
      { externalId: 'bd-tracker-weekly', text: 'Partner tracker updated every Friday', kind: 'COMMITMENT', personExternalId: 'participant', owedTo: 'lead' },
    ],
    sessions: [
      {
        lead: [
          'Habiba started on 1 September as Partnerships Associate. This is her first two weeks. What I am relying on her for is the NABG member outreach, keeping the partner tracker current, and shadowing the Bayer follow-ups before she runs them herself.',
          'In the first two weeks she was meant to shadow two member calls and set up the tracker. She sat in on one call, with Aliyu, and the tracker is set up with the twelve NABG names in it. The second shadow call did not happen because the member cancelled.',
          'What success looks like at 90 days: eight member conversations logged, two moved to proposal, and the tracker current every Friday. I told her this on day one and it is in the plan I gave her.',
          'The risk I see is that she is waiting to be introduced rather than reaching out herself. Two of the twelve names she could have emailed already. I have not said this to her yet.',
          'Nothing else. Next two weeks she should have started outreach to at least four members.',
        ],
        participant: [
          'I started on 1 September as Partnerships Associate. My first two weeks were mostly reading: the NABG member list, the old partner emails, and setting up the tracker. I sat in on one call with Aliyu and a member called Kano Agro.',
          'The tracker is set up with twelve NABG members, their contacts, last contact date and a stage column. I update it as I go. The second shadow call was cancelled by the member and has not been rebooked.',
          'What I understand success to be: I should have spoken to the members and moved some to proposals by the end of 90 days. I am not sure of the exact number. I think it was eight conversations.',
          'What is slowing me down is that I do not have introductions. I was told the lead would introduce me to the members, and only two introductions have been made so far. I could email the others cold but I was not sure that was wanted.',
          'I would like it to be clear whether I should be reaching out on my own, and to whom, before the next check-in.',
        ],
      },
      {
        lead: [
          'Two weeks on. Habiba has now had four member conversations: Kano Agro, Sahel Seeds, Green Belt Traders and one with a member whose name I do not have in front of me. All four are in the tracker with notes. That is on plan.',
          'The introductions point from last time: I made three more introductions after the first check-in and told her to go direct to the rest. She has done that with two. The tracker was updated on both Fridays.',
          'The Bayer follow-up call happened on Tuesday with me on it. She led the first ten minutes well and then handed to me on the pricing question, which is right at this stage.',
          'The gap now is proposals. None of the four conversations has moved to a proposal yet, and by week six I would expect one to be close. Sahel Seeds is the likeliest.',
          'For the next two weeks: one proposal drafted for Sahel Seeds, and the remaining four members contacted.',
        ],
        participant: [
          'Since the last check-in I have had four real conversations: Kano Agro, Sahel Seeds, Green Belt Traders and Dala Farms. All logged in the tracker with what they said and the next step.',
          'I was told to go direct to the members without waiting for an introduction, so I emailed the remaining six myself. Two replied, four have not. The introductions that were made helped: those calls happened within a week.',
          'The Bayer call: I opened it and ran the first part, then Hafsah took the pricing question. I would like to be able to answer the pricing question myself next time, and I have asked for the rate card.',
          'Sahel Seeds asked for a proposal. I have started a draft but I do not have a template and I am not sure who signs it off. That is the thing I need before the next check-in.',
          'I think I am on track for eight conversations. Two proposals by 90 days depends on getting the template and sign-off sorted this week.',
        ],
      },
      { lead: ['Session three is open.'], participant: ['Session three is open.'] },
    ],
    complete: 2,
    commitmentSaidInPassing: "I'll send Sahel Seeds the proposal draft by Friday",
  },
  {
    key: 'eng',
    label: 'Product and Engineering: the Monday outage',
    scenario: 'ACUTE_SHOCK', moment: 'STARTING', cadence: 'ONE_TIME', timelineDays: 14,
    brief: 'On Monday 8 September the API was down for two hours and forty minutes from 09:10. Two customers could not run check-ins. The deploy on Friday evening changed the database connection settings. This check-in is to get one clear account of what happened, what each of us did, and what changes so it does not happen again.',
    participantRole: 'Backend engineer, on call that morning',
    leadDoc: { name: 'Incident timeline - 8 September.txt', note: 'The timeline I put together from the logs on Monday afternoon', text: 'Incident timeline, Monday 8 September.\n\n17:40 Friday: deploy 2.14 goes out with a change to the database pool size, from 20 to 5, intended for the staging environment only.\n09:10 Monday: first alerts, API requests timing out. On-call engineer paged.\n09:25: on-call acknowledges, begins looking at the application logs.\n10:15: customer Lovedida reports check-ins not opening.\n10:50: pool exhaustion identified as the cause.\n11:20: config reverted, deploy 2.14.1 out.\n11:50: all clear, both customers told.\n\nOpen questions: why a staging-only change reached production; why detection took an hour from first alert to cause; whether the Friday evening deploy should have happened at all.' },
    objectives: [
      { externalId: 'eng-postmortem', text: 'Written post-mortem shared with the whole team within a week', kind: 'COMMITMENT', personExternalId: 'participant', owedTo: 'lead' },
      { externalId: 'eng-no-friday-deploys', text: 'No production deploys after 15:00 on Fridays', kind: 'GOAL', personExternalId: 'lead' },
    ],
    sessions: [
      {
        lead: [
          'On Monday the API was down for two hours and forty minutes. Two customers could not run check-ins and one of them, Lovedida, wrote to me directly. The cause was a database pool setting changed in a Friday evening deploy that was meant for staging only.',
          'What I did: I was in a meeting until 10:00 and saw the alerts then. I asked Tunde, who was on call, for a status and got one at 10:20 that said he was still looking at application logs. I found the config change in the deploy diff at 10:45 and we reverted at 11:20.',
          'What I think went wrong is three things. The staging-only change was not marked as such anywhere. The on-call took an hour to look at the deploy diff, which is the first place I would look after a Friday deploy. And we deployed at 17:40 on a Friday, which we had informally agreed not to do.',
          'I am not sure Tunde would agree with the second point. He may say the alert did not point at the database and that he followed the runbook. I want to hear his account before I decide anything.',
          'What I want out of this: a written post-mortem within the week, an explicit rule on Friday deploys, and a check in the deploy that refuses a staging config on production.',
        ],
        participant: [
          'I was on call Monday morning. The page came at 09:10 and I acknowledged at 09:25, I was on the bus. The alert said request timeouts on the API, nothing about the database. I followed the runbook, which starts with the application logs.',
          'The application logs showed requests waiting, not erroring, which the runbook does not cover. I spent about forty minutes on that before I thought about the pool. Hafsah found the config change in the diff at about 10:45 and I confirmed it was the pool at 10:50. Revert was out at 11:20.',
          'On the Friday deploy: I made the pool change for staging and it went out to both because our deploy applies the same config file to both environments. There is no way in the current setup to mark a change as staging only. I did not know that until Monday.',
          'What I think went wrong: the deploy applies one config to two environments, and the runbook does not say to check the last deploy first. I would add both. On the timing, I do not think an hour was unreasonable given what the alert said, but I accept it felt long from outside.',
          'I will write the post-mortem this week. I would like the rule on Friday deploys to be written down rather than informal, because I did not know it was a rule.',
        ],
      },
    ],
    complete: 1,
    commitmentSaidInPassing: "I'll have the post-mortem written up by Thursday",
  },
  {
    key: 'sales',
    label: 'Agent Network: weekly read',
    scenario: 'PULSE_CHECK', moment: 'ONGOING', cadence: 'WEEKLY', timelineDays: 60,
    brief: 'The agent network sales team is recruiting agents in Kano and Kaduna for the Q4 target of 120 active agents. This is a weekly read on how it is actually going: agents signed, agents active, and what is in the way. The number that matters is active agents, not signed.',
    participantRole: 'Field sales lead, Kano and Kaduna',
    leadDoc: { name: 'Q4 agent network targets.txt', note: 'The targets agreed for the quarter', text: 'Q4 agent network targets.\n\nActive agents by 31 December: 120 (from 64 today).\nActive means at least one transaction in the last 14 days.\nSigned agents are not the target. Signed and inactive agents cost onboarding time and produce nothing.\n\nWeekly: agents signed, agents active, agents lost. Blockers named the week they appear.\nKano: 70 active by year end. Kaduna: 50 active by year end.' },
    objectives: [
      { externalId: 'sales-120-active', text: '120 active agents by 31 December', kind: 'TARGET', personExternalId: 'participant', target: '120', measure: 'active agents' },
      { externalId: 'sales-weekly-numbers', text: 'Weekly numbers sent every Monday before the read', kind: 'COMMITMENT', personExternalId: 'participant', owedTo: 'lead' },
    ],
    sessions: [
      {
        lead: [
          'This is the weekly read on the agent network. We are at 64 active agents against a target of 120 by the end of December. The team is recruiting in Kano and Kaduna. Ibrahim leads the field team.',
          'This week I was told 19 agents were signed. What I do not know is how many of those are active, meaning at least one transaction in fourteen days. Last month we signed 31 and only 9 of them are active now.',
          'My concern is that the team is counting signatures. The target is active agents and the incentive is per signature, which I think is the problem, and I set that incentive.',
          'For next week I want the active count, not the signed count, and I want to know what happens to an agent in their first two weeks after signing.',
        ],
        participant: [
          'This week we signed 19 new agents, 12 in Kano and 7 in Kaduna. The team was out four days. Kaduna is slower because the field officer there started two weeks ago.',
          'Active agents: I do not have the exact number this week. From the app dashboard I think it is around 70, up from 64. I will get the exact figure on Monday.',
          'The issue with activation is that after signing, agents wait up to ten days for their account to be approved by the ops team, and by then many have lost interest. That is not a sales problem but it lands on our numbers.',
          'What I need is a faster approval, ideally same day, and then I think the active number moves. The signing target we can hit; the active target depends on approval.',
        ],
      },
      {
        lead: [
          'Second weekly read. Ibrahim sent the numbers on Monday as asked: 71 active, 22 signed this week, 4 lost. So active moved by 7 on 22 signed, which is the pattern I was worried about.',
          'He raised the approval delay last time and I checked it with ops: the median is six days, not ten, but six is still too long. Ops has agreed to a 48 hour target from this week.',
          'I have not changed the incentive yet. I want to see whether the approval fix moves activation before I change how people are paid.',
          'For next week: the active count again, and how many of this week\'s signed agents were approved within 48 hours.',
        ],
        participant: [
          'Monday numbers were sent: 71 active, 22 signed, 4 lost. The 4 lost were all agents from August who never transacted. Kano 14 signed, Kaduna 8, Kaduna picking up.',
          'The approval delay: ops told us 48 hours from this week. This week, of the 22 signed, 9 were approved within two days. The rest are still waiting. So it is better but not fixed.',
          'The field team is asking about the incentive. They are paid per signature and they know the target is active agents. Two of them asked me whether the incentive will change and I did not have an answer.',
          'What I want to raise is that if the incentive changes to active agents, the team needs a way to see activation, which they cannot today. Otherwise they are paid on a number they cannot see.',
        ],
      },
      {
        lead: [
          'Third read. 79 active, 18 signed, 2 lost. Approval within 48 hours for 14 of 18. The approval fix is working and activation is following: 8 more active this week on 18 signed, against 7 on 22 last week.',
          'I am now going to change the incentive to a split: half on signing, half on first transaction. I want Ibrahim\'s view on whether the team can see activation, which he raised last week, before I announce it.',
          'At this rate we reach about 105 active by year end, not 120. Either the rate has to rise or the target is wrong, and I would rather say so now than in December.',
        ],
        participant: [
          'Numbers sent Monday: 79 active, 18 signed, 2 lost. Kano 11 signed, Kaduna 7. Approval is much faster and it shows: agents who are approved in two days mostly transact in their first week.',
          'On the incentive: the team can now see activation in the app, ops added a screen last week, so a split incentive would be fair. I would announce it at the Monday meeting and give a two week transition.',
          'On the target: at 8 active a week we get to roughly 105 by December. To get to 120 we would need another field officer in Kaduna, where the demand is, and I would rather ask for that than promise a number we will miss.',
        ],
      },
      { lead: ['Session four is open.'], participant: ['Session four is open.'] },
    ],
    complete: 3,
    commitmentSaidInPassing: "I'll send Monday's active and signed numbers before 9am every week",
  },
];

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });
  const prisma = app.get(PrismaService);
  const grounds = app.get(GroundsService);
  const participants = app.get(ParticipantsService);
  const conversation = app.get(ConversationService);
  const documents = app.get(DocumentsService);
  const assistant = app.get(AssistantService);
  const byApi = app.get(GroundsByApiService);
  const scim = app.get(ScimService);

  const lead = await prisma.user.findFirst({ where: { email: LEAD, deletedAt: null } });
  if (!lead) throw new Error(`No user ${LEAD}`);
  const org = lead.organizationId;
  let participant = await prisma.user.findFirst({ where: { email: PARTICIPANT, deletedAt: null } });
  if (participant && participant.organizationId !== org) {
    const member = await prisma.organizationMembership.findFirst({ where: { userId: participant.id, organizationId: org } });
    if (!member) throw new Error(`${PARTICIPANT} is in a different organisation and not a member of ${org}. Stop: the demo needs both in one organisation.`);
  }
  const orgName = (await prisma.organization.findUnique({ where: { id: org }, select: { name: true } }))?.name;
  log(`Organisation: ${orgName} (${org}). Lead ${LEAD}. Participant ${PARTICIPANT}${participant ? '' : ' (no account yet; created on first accept)'}.`);

  /* ---------------- clear ---------------- */
  const theirGrounds = await prisma.ground.findMany({
    where: { organizationId: org, OR: [{ initiatorId: lead.id }, ...(participant ? [{ initiatorId: participant.id }] : []), { participants: { some: { email: { in: [LEAD, PARTICIPANT] } } } }] },
    select: { id: true, label: true, status: true, _count: { select: { participants: true } } },
  });
  const people = await prisma.person.findMany({ where: { organizationId: org, email: { in: [LEAD, PARTICIPANT] } }, select: { externalId: true, email: true } });
  const externalIds = people.map((p) => p.externalId);
  const counts = {
    commitments: await prisma.commitment.count({ where: { organizationId: org, personExternalId: { in: externalIds } } }),
    todos: await prisma.todo.count({ where: { organizationId: org, personExternalId: { in: externalIds } } }),
    proposals: await prisma.assistantProposal.count({ where: { organizationId: org, personExternalId: { in: externalIds } } }),
    assistantTurns: await prisma.assistantTurn.count({ where: { organizationId: org, personExternalId: { in: externalIds } } }),
  };
  log(`Would delete ${theirGrounds.length} ground(s):`);
  for (const g of theirGrounds) log(`  - ${g.label} [${g.status}, ${g._count.participants} people] ${g.id}`);
  log(`Plus ${counts.commitments} commitments, ${counts.todos} to-dos, ${counts.proposals} proposals, ${counts.assistantTurns} assistant turns for ${externalIds.join(', ') || 'nobody on the roster'}.`);
  log('Users, memberships and the ops back office are not touched.');
  if (!YES) { log('Dry run. Add --yes to do it.'); await app.close(); return; }

  for (const g of theirGrounds) {
    /* The record is the one relation that refuses a cascade, on purpose. A demo clear is the one place it goes too. */
    await prisma.recordEntry.deleteMany({ where: { participant: { groundId: g.id } } });
    await prisma.ground.delete({ where: { id: g.id } });
  }
  if (externalIds.length) {
    await prisma.commitment.deleteMany({ where: { organizationId: org, personExternalId: { in: externalIds } } });
    await prisma.todo.deleteMany({ where: { organizationId: org, personExternalId: { in: externalIds } } });
    await prisma.assistantProposal.deleteMany({ where: { organizationId: org, personExternalId: { in: externalIds } } });
    await prisma.assistantTurn.deleteMany({ where: { organizationId: org, personExternalId: { in: externalIds } } });
    await prisma.whatsAppThread.deleteMany({ where: { organizationId: org } }).catch(() => undefined);
  }
  await prisma.entryDraft.deleteMany({ where: { userId: { in: [lead.id, ...(participant ? [participant.id] : [])] } } }).catch(() => undefined);
  log('Cleared.');

  /* ---------------- roster ---------------- */
  await scim.upsert(org, 'demo', { externalId: LEAD, userName: LEAD, displayName: [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Hafsah', emails: [{ value: LEAD, primary: true }], active: true } as any);
  await scim.upsert(org, 'demo', { externalId: PARTICIPANT, userName: PARTICIPANT, displayName: participant ? [participant.firstName, participant.lastName].filter(Boolean).join(' ') || 'H Jumare' : 'H Jumare', emails: [{ value: PARTICIPANT, primary: true }], active: true } as any);
  const leadPerson = (await prisma.person.findFirst({ where: { organizationId: org, email: LEAD } }))!;
  const partPerson = (await prisma.person.findFirst({ where: { organizationId: org, email: PARTICIPANT } }))!;
  log(`Roster: ${leadPerson.externalId}, ${partPerson.externalId}.`);

  /* ---------------- demos ---------------- */
  for (const demo of DEMOS.filter((d) => !ONLY || d.key === ONLY)) {
    log(`--- ${demo.label} ---`);
    const ground = await grounds.create(org, lead.id, {
      label: demo.label, scenario: demo.scenario as any, moment: demo.moment as any, cadence: demo.cadence as any,
      timelineDays: demo.timelineDays, brief: demo.brief,
    } as any, lead.role);
    const gid = (ground as any).id as string;
    log(`Ground ${gid}`);

    const added: any = await grounds.addParticipant(gid, org, lead.id, { email: PARTICIPANT, roleAsDescribed: demo.participantRole } as any);
    const row = await prisma.groundParticipant.findFirst({ where: { groundId: gid, email: PARTICIPANT } });
    if (!row) throw new Error('participant row missing');
    if (!row.userId) {
      const token = row.inviteToken ?? (added as any)?.inviteToken;
      if (!token) throw new Error('no invite token to accept with');
      await participants.accept(token, undefined, participant?.id ?? null);
    }
    participant = participant ?? (await prisma.user.findFirst({ where: { email: PARTICIPANT } }))!;
    const partRow = await prisma.groundParticipant.findFirst({ where: { groundId: gid, email: PARTICIPANT } });
    if (!partRow?.userId) throw new Error('participant did not link to an account');
    log(`Participant accepted (${partRow.userId}).`);

    /* the lead's document, open to everyone */
    /* consentConfirmed true: these are plans and timelines the lead wrote, and the conversation heuristic reads "calls" in them as a transcript. */
    const doc: any = await documents.upload(gid, lead.id, { originalname: demo.leadDoc.name, mimetype: 'text/plain', buffer: Buffer.from(demo.leadDoc.text, 'utf8'), size: Buffer.byteLength(demo.leadDoc.text) } as any, true, demo.leadDoc.note);
    await documents.setVisibility(gid, doc.id, lead.id, 'OPEN').catch((e) => log(`  (document stays private: ${e?.message})`));
    log(`Document "${demo.leadDoc.name}" on the ground.`);

    /* objectives, as a customer's system would seed them */
    await byApi.seedObjectives(org, gid, demo.objectives.map((o) => ({
      externalId: o.externalId, text: o.text, kind: o.kind,
      personExternalId: o.personExternalId === 'lead' ? LEAD : PARTICIPANT,
      ...(o.owedTo ? { owedToPersonExternalId: o.owedTo === 'lead' ? LEAD : PARTICIPANT } : {}),
      ...(o.target ? { target: o.target } : {}), ...(o.measure ? { measure: o.measure } : {}),
      seenBySubject: true,
    })) as any).catch((e) => log(`  objectives: ${e?.message}`));
    log(`${demo.objectives.length} objective(s) seeded.`);

    /* sessions */
    for (let s = 0; s < demo.sessions.length; s++) {
      const n = s + 1;
      const done = n <= demo.complete;
      for (const side of ['lead', 'participant'] as const) {
        const userId = side === 'lead' ? lead.id : participant!.id;
        const pr = await prisma.groundParticipant.findFirst({ where: { groundId: gid, userId } });
        if (!pr) throw new Error(`${side} has no participant row`);
        let ci = await prisma.checkIn.findFirst({ where: { participantId: pr.id, sessionNumber: n } });
        if (!ci) {
          ci = await prisma.checkIn.create({ data: { groundId: gid, participantId: pr.id, sessionNumber: n, status: 'NOT_STARTED' } });
        }
        if (ci.availableFrom && ci.availableFrom > new Date()) {
          await prisma.checkIn.update({ where: { id: ci.id }, data: { availableFrom: new Date(Date.now() - 86_400_000) } });
        }
        if (!done) { log(`  session ${n}, ${side}: left open.`); continue; }
        log(`  session ${n}, ${side}: opening`);
        await conversation.open(ci.id, userId);
        for (const line of demo.sessions[s][side]) {
          const r = await conversation.sendMessage(ci.id, userId, line);
          log(`    > ${line.slice(0, 60)}…  < ${r.reply.replace(/\s+/g, ' ').slice(0, 80)}…`);
        }
        try {
          await conversation.complete(ci.id, userId);
        } catch (e: any) {
          log(`    complete refused (${e?.response?.message ?? e?.message}); one more answer and again`);
          await conversation.sendMessage(ci.id, userId, 'That is everything for this session. I am done.');
          await conversation.complete(ci.id, userId);
        }
        log(`  session ${n}, ${side}: complete.`);
      }
      if (done) {
        /* the listener synthesises and releases once both are in; give it a moment */
        for (let i = 0; i < 12; i++) {
          const rep = await prisma.report.findUnique({ where: { groundId: gid }, select: { releasedAt: true } });
          if (rep?.releasedAt) break;
          await sleep(5000);
        }
        const rep = await prisma.report.findUnique({ where: { groundId: gid }, select: { releasedAt: true } });
        log(`  session ${n}: shared report ${rep?.releasedAt ? 'released' : 'not released yet (the listener may still be working)'}.`);
      }
    }

    /* a commitment said in passing, in the assistant, by the participant */
    try {
      await assistant.respond(org, partPerson.id, 'hello');
      await assistant.respond(org, partPerson.id, demo.commitmentSaidInPassing);
      const r = await assistant.respond(org, partPerson.id, 'yes');
      log(`  commitment: ${(r.blocks.find((b: any) => b.type === 'text') as any)?.body?.slice(0, 90)}`);
    } catch (e: any) { log(`  commitment skipped: ${e?.message}`); }

    log(`Done: ${demo.label} -> /grounds/${gid}`);
  }
  await sleep(3000);
  await app.close();
}

main().catch((e) => { console.error('SEED FAILED:', e?.message ?? e, e?.stack ?? '', JSON.stringify(e?.response ?? null)); process.exit(1); });
