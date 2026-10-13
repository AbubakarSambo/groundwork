import { CheckInStatus, TurnRole } from '@prisma/client';
import { NOT_NAMED_YET } from '../suites/correct-their-job';
import { theyDeclined, type AThingToCover } from './what-this-session-has-covered';
import { aClaimThatMattersInTheirLastAnswer } from './asking-for-proof-kindly';

/**
 * THE ROLE INTERVIEW, IN A PERSON'S FIRST CHECK-IN (decision 129).
 *
 * Before this, an admin sent four fixed questions and the person answered them in Ask Groundwork
 * (assistant/the-role-interview.ts, request 25). That still works. This is the other door, and the one
 * that reaches everybody: in a person's FIRST check-in, the conversation also learns what they are
 * responsible for, what doing well looks like for them, who they depend on and who depends on them, and
 * what usually gets in their way.
 *
 * THE CONVERSATION STAYS THE MODEL'S. The model is given the four things as context and a checklist
 * (which of them this session has already covered, which are left), and asks in its own words, one at a
 * time, where they fit. Nothing here is a script and nothing here holds the close.
 *
 * WHAT IS KEPT, AND WHO READS IT. After the check-in, a second, small reading takes out of the person's
 * own words what they said about their job, and every part must be words they said (a line the person did
 * not say is dropped). It is kept as a row only the person reads, until they say yes in Ask Groundwork to
 * the role map showing what they own. Their job title is set only if there is none yet. A title that is
 * already there is never changed without their yes.
 */

export const FIRST_CHECK_IN_ROLE_KEY = 'first_check_in_role';
export const ROLE_READING_KEY = 'role_reading';
/** A request waiting for the person in Ask Groundwork: may the role map show what they said they own. */
export const SHARE_WITH_THE_ROLE_MAP_KIND = 'role_share_from_check_in';

/** What the person is asked in Ask Groundwork after their first check-in, in plain sentences. Their words are quoted, never reworded. */
export const theRoleMapQuestion = (roleName: string, owns: string): string =>
  `In your first check-in you told me about your job as ${roleName}. You said you are responsible for "${owns.replace(/["\u201c\u201d]/g, "'").replace(/[.!?\s]+$/, '')}". Shall I let the role map show this under ${roleName}? It is about the job and not about you. Everything else you said about your job stays private to you.`;

/** The things the conversation learns about the job, in the words used about them. Never questions to be read out. */
/** How each thing is asked in a conversation. Only these words count as having asked it, so a turn about something else is never taken for one of these. */
const ASKED_AS: Record<string, RegExp> = {
  /* One question, about their job and what doing well is in it, however it is worded. What they depend on and what gets in their way are read from the answers the check-in already asks for. */
  'role-owns': /\b(?:what did you understand your (?:role|part)|understand(?:ing)? (?:of )?your role in this|what is your (?:job|role)(?: title)?(?: called)?|what do you do (?:here|for work|at \w+)|your job title|what do you call your (?:job|role)|what (?:would|do) you call (?:your|the) (?:job|role)|responsible for|you own|in charge of|accountable for|what does your (?:job|role) (?:cover|involve|include)|what (?:is|are) (?:your|the) main (?:responsibilit|part)|what is your job (?:made of|about)|your day[- ]to[- ]day|doing (?:it |this |the job |your job |your role )?well|good looks like|what does (?:a )?good|success (?:in|for) your (?:job|role))/i,
};

/** The one thing asked in the first check-in. The rest of the job (who they depend on, what gets in their way) is taken from the answers the check-in already asks for. */
export const ROLE_TOPICS: (AThingToCover & { field: 'owns' })[] = [
  { id: 'role-owns', field: 'owns', what: 'what they are responsible for in their job, and what doing well looks like in it' },
];

/**
 * THE WORDS THE MODEL IS GIVEN FOR THIS PART OF A FIRST CHECK-IN. Stored as a prompt version (`first_check_in_role`), so
 * the version that runs is the one stored, this text is what a start seeds and the fallback, and the version that asked
 * is written on the row it led to.
 */
export const FIRST_CHECK_IN_ROLE_PROMPT = [
  'THIS IS THE FIRST TIME THIS PERSON HAS DONE A CHECK-IN, AND WE DO NOT YET KNOW THEIR JOB WELL.',
  'As well as everything else, learn what they are responsible for in their job and what doing well looks like in it, in their own words. Ask both in ONE question, once, where the conversation turns to their work, and never as your first question.',
  'Never ask a separate question about who they depend on or what gets in their way. The questions you already ask about the work tell us that.',
  'Do not ask again what they have already told you without being asked. Say back what you heard in a few of their own words and move on. Leave it if they do not want to say or do not know.',
  'Ask about the job and the work, never about how good they are. Do not say that this is a part of a first check-in, that something is outstanding, or that it is saved anywhere. Nobody is being marked.',
].join('\n');

export const ROLE_READING_PROMPT = [
  'You read what one person said in their first check-in, and pick out only what they said about their own job.',
  'Use only their own words. Copy each part from ONE of their answers, exactly as they said it, trimmed to the sentence or sentences that answer it. Never write anything of your own, never join words from two different answers, and never guess. If they did not say it, leave it out.',
  'Each answer is shown under the question it answered, so you can tell what it is about. Take a part from whichever single answer says it, including answers to the check-in\'s own questions about the work, such as what they need from others or what is blocked. A worry about a customer or a deal is not part of their job.',
  'roleName: what they call their job, if they said it, in a few words such as "sales representative". Otherwise leave it out.',
  'owns: what they said they are responsible for in their job. Prefer the answer where they describe their own job, over an answer about this one piece of work or project.',
  'doingWell: what they said doing well looks like in their job. Prefer that over what finishing this one piece of work looks like.',
  'dependsOn: who they said they depend on or need things from, and who depends on them. One entry for both is fine.',
  'inTheWay: what they said gets in their way or holds them up.',
  'Copy only from the lines that start with "They said". The lines that start with "They were asked" are only there so you know what was being answered.',
].join('\n');

export const ROLE_READING_SCHEMA = {
  name: 'what_they_said_about_their_job',
  description: 'What the person said about their own job, copied from their own words, and nothing else.',
  input_schema: {
    type: 'object',
    properties: {
      roleName: { type: 'string', description: 'What they call their job, in a few words, only if they said it.' },
      owns: { type: 'string', description: 'What they said they are responsible for, in their words.' },
      doingWell: { type: 'string', description: 'What they said doing well looks like in their job, in their words.' },
      dependsOn: { type: 'string', description: 'Who they said they depend on, and who depends on them, in their words.' },
      inTheWay: { type: 'string', description: 'What they said usually gets in their way, in their words.' },
    },
  },
} as const;

export type WhatTheySaidAboutTheirJob = Partial<Record<'roleName' | 'owns' | 'doingWell' | 'dependsOn' | 'inTheWay', string>>;

/** The longest piece kept for any one part. A longer one is cut at a word, so the row stays what they said and stays readable. */
export const LONGEST_PART = 600;

/**
 * Only what the person's own turns hold. A part the model wrote that is not in their words is dropped, so what is kept
 * is always theirs. A job name has to be short, and has to appear in what they said.
 */
export function onlyWhatTheySaid(read: WhatTheySaidAboutTheirJob | null | undefined, theirTurns: string[]): WhatTheySaidAboutTheirJob {
  const norm = (t: string) => t.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const turns = theirTurns.map(norm);
  const out: WhatTheySaidAboutTheirJob = {};
  for (const key of ['roleName', 'owns', 'doingWell', 'dependsOn', 'inTheWay'] as const) {
    let v = String((read as any)?.[key] ?? '').replace(/\s+/g, ' ').trim();
    if (!v) continue;
    if (v.length > LONGEST_PART) v = `${v.slice(0, LONGEST_PART).replace(/\s+\S*$/, '')}`;
    const wanted = norm(v.replace(/[.!?]+$/, ''));
    /* One answer, as they said it: the words must run on unbroken inside a single turn, never be stitched from two. */
    if (!wanted || !turns.some((t) => t.includes(wanted))) continue;
    if (key === 'roleName') {
      if (v.split(/\s+/).length > 6 || v.length > 80) continue;
      out.roleName = v.replace(/[.!?]+$/, '');
      continue;
    }
    out[key] = v;
  }
  return out;
}

/** The kinds of check-in that do not learn the role: a team update has one line and a setup conversation is not an account. */
export const NOT_FOR_THE_ROLE = new Set(['TEAM_UPDATES']);

interface Deps {
  prisma: any;
  anthropic: { extract: <T>(system: string, history: any[], tool: any, options?: any) => Promise<T | null> };
  prompts?: { getActive?: (key: string) => Promise<{ id: string; content: string } | null> } | null;
}

/** A read that must never break the conversation or the close: a failure, or a missing table in a hand-built test, is an empty answer. */
async function attempt<T>(read: () => Promise<T> | T, otherwise: T): Promise<T> {
  try { const v = await read(); return v === undefined ? otherwise : v; } catch { return otherwise; }
}

/** The stored version of a prompt that runs, else the code's text. */
async function theVersionThatRuns(deps: Deps, key: string, fallback: string): Promise<{ content: string; id: string | null }> {
  const stored = await attempt(() => deps.prompts?.getActive?.(key) ?? null, null);
  return stored?.content?.trim() ? { content: stored.content, id: stored.id ?? null } : { content: fallback, id: null };
}

/** What we know of a person's job already, in their own words: their own title on their account, else the roster's. */
export async function whatIsKnownOfTheirJob(deps: Deps, userId: string, organizationId?: string): Promise<{ roleName: string; from: 'account' | 'roster' } | null> {
  const user = await attempt(() => deps.prisma.user?.findUnique?.({ where: { id: userId }, select: { jobTitle: true, organizationId: true } }), null);
  if (user?.jobTitle?.trim()) return { roleName: user.jobTitle.trim(), from: 'account' };
  const person = await attempt(() => deps.prisma.person?.findFirst?.({
    where: { linkedUserId: userId, ...(organizationId ? { organizationId } : {}) },
    select: { title: true },
  }), null);
  if (person?.title?.trim()) return { roleName: person.title.trim(), from: 'roster' };
  return null;
}

/**
 * IS THIS THE PERSON'S FIRST CHECK-IN. No earlier finished check-in of theirs anywhere (a setup conversation is not one), and
 * nothing about their job kept yet. Somebody who has no sign-in is not read: there is nobody to keep it for.
 */
export async function isTheirFirstCheckIn(deps: Deps, checkIn: { id: string; participantId: string }): Promise<{ userId: string; organizationId: string } | null> {
  const participant = await attempt(() => deps.prisma.groundParticipant?.findUnique?.({
    where: { id: checkIn.participantId },
    select: { userId: true, ground: { select: { organizationId: true, scenario: true } } },
  }), null);
  const userId = participant?.userId as string | null | undefined;
  const organizationId = participant?.ground?.organizationId as string | undefined;
  if (!userId || !organizationId) return null;
  if (NOT_FOR_THE_ROLE.has(String(participant?.ground?.scenario ?? ''))) return null;
  /* A set-up conversation, a clarification and a correction are not a person's first check-in. */
  const thisOne = await attempt(() => deps.prisma.checkIn?.findUnique?.({ where: { id: checkIn.id }, select: { isSetup: true, isClarification: true, isSelfCorrection: true } }), null);
  if (thisOne && (thisOne.isSetup || thisOne.isClarification || thisOne.isSelfCorrection)) return null;
  const finishedBefore = await attempt(() => deps.prisma.checkIn?.count?.({
    where: { id: { not: checkIn.id }, status: CheckInStatus.COMPLETED, isSetup: false, participant: { userId } },
  }), 0);
  if (finishedBefore) return null;
  const person = await attempt(() => deps.prisma.person?.findFirst?.({ where: { organizationId, linkedUserId: userId }, select: { externalId: true } }), null);
  /* A person who has never used Ask has no roster entry yet. Ask makes theirs with their account id as its key, so what is kept before that is kept under the same key. */
  const kept = await attempt(() => deps.prisma.roleInterviewAnswer?.count?.({ where: { organizationId, personExternalId: { in: [person?.externalId, userId].filter(Boolean) } } }), 0);
  if (kept) return null;
  return { userId, organizationId };
}

const AN_ACKNOWLEDGEMENT = /^\s*(ok(ay)?|yes|yeah|yep|no|fine|sure|good|noted|right|alright)[\s.!,]*$/i;

/**
 * WHAT THIS SESSION HAS DONE WITH EACH THING, READ OFF THE TURNS. A thing is asked when an AI turn asks it in the words above, and is
 * answered by the person's next turn when it says something (five words or more) and does not decline. A thing asked twice, or declined,
 * is left. Free words about a job are not numbers, so unlike the record's own check there is no asking for "the specific".
 */
export function coverageOf(topics: AThingToCover[], turns: { role: 'AI' | 'PERSON'; content: string }[]) {
  const notAsked: AThingToCover[] = []; const left: AThingToCover[] = []; const answered: { what: string; answer: string }[] = [];
  for (const topic of topics) {
    let asked = 0; let best: string | null = null; let declined = false;
    turns.forEach((t, i) => {
      if (t.role !== 'AI' || !ASKED_AS[topic.id]?.test(t.content ?? '')) return;
      asked += 1;
      const reply = (turns.slice(i + 1).find((x) => x.role === 'PERSON')?.content ?? '').trim();
      if (!reply || AN_ACKNOWLEDGEMENT.test(reply)) return;
      if (theyDeclined(reply)) { declined = true; return; }
      if (reply.split(/\s+/).length >= 5) best = reply;
    });
    if (best) answered.push({ what: topic.what, answer: (best as string).replace(/\s+/g, ' ').slice(0, 240) });
    else if (declined || asked >= 1) left.push(topic);
    else notAsked.push(topic);
  }
  return { notAsked, left, answered };
}

/**
 * WHICH TURN ASKS ABOUT THE JOB. The model works through the spine of the check-in and, left alone, closes before it ever asks about the
 * job (a first live walk, 10 October 2026: seven turns, not one question about it). So the shape is the product's and the words are the model's:
 * from the person's second answer, on every other turn, the one thing not yet asked is named for THIS turn, to be asked in the model's own
 * words before it goes back to what it was doing. Never twice in a row, never once everything is covered, never as the opener.
 */
export function theTurnToAskIt(notAsked: AThingToCover[], turns: { role: 'AI' | 'PERSON'; content: string }[]): { text: string; thing: AThingToCover | null } {
  const none = { text: '', thing: null };
  if (!notAsked.length) return none;
  const theirAnswers = turns.filter((t) => t.role === 'PERSON').length;
  if (theirAnswers < 2) return none;
  const lastAi = [...turns].reverse().find((t) => t.role === 'AI')?.content ?? '';
  if (Object.values(ASKED_AS).some((re) => re.test(lastAi))) return none;
  const next = notAsked[0];
  /*
   * PROOF COMES FIRST (decision 132). With the job question on, real requests for a document, receipt or screenshot fell from 17 to 11
   * and 14 in the control run: the turn given to the job was the turn the person had just said something was done. So where their
   * latest answer holds a claim that matters, this turn is the proof's, the job question is not named (and no reply is asked for again
   * for it), and the job is asked on a later turn. The words of the ask stay the model's.
   */
  const claim = aClaimThatMattersInTheirLastAnswer(turns);
  if (claim) return { text: theProofComesFirst(claim), thing: null };
  const text = `FOR THIS TURN, ABOUT THEIR JOB. This turn, do not ask your next question about the work. Open with one short sentence that responds to what they just said (if they voiced a worry, acknowledge it) and leads into your question. Then ask ONE friendly question, in your own words, about ${next.what}. Do not explain why you are asking, do not add a sentence after the question, and do not say what check-in this is. It is the only question in this turn. Next turn, go back to the work.`;
  return { text, thing: next };
}

/** What the model is handed on a turn where the person has just said something that matters and the job question waits. */
export const theProofComesFirst = (claim: string): string =>
  `FOR THIS TURN, PROOF COMES BEFORE THE QUESTION ABOUT THEIR JOB. They just said: "${claim.replace(/"/g, "'").replace(/[.!?]+$/, '')}." This is a claim that matters. In this turn, ask kindly for the smallest thing that would show it, such as a document, a receipt, a screenshot or an email, and say what it is for. Do not ask about their job in this turn. Ask about their job on a later turn, after this.`;

/** Whether a reply asks about this thing, in the words used to ask it. */
export const asksAboutTheirJob = (thing: AThingToCover, reply: string): boolean => !!ASKED_AS[thing.id]?.test(reply ?? '');

/** The one line a reply is given again with, when a turn was meant to ask about the job and the reply did not. */
export const THE_REPLY_DID_NOT_ASK_ABOUT_THEIR_JOB = (what: string): string =>
  `YOUR REPLY DID NOT ASK ABOUT THEIR JOB, AND THIS TURN IS THE ONE FOR IT. Write the reply again: one short sentence that responds to what they just said (if they voiced a worry, acknowledge it), then ONE friendly question, in your own words, about ${what}. Do not explain why you are asking, do not add a sentence after the question, and do not say what check-in this is. It is the only question in the reply.`;

/** A reply that tells a person what kind of check-in this is, or that it is their first, is saying our instructions out loud. */
export const SAYS_WHICH_CHECK_IN_THIS_IS = /\b(?:this is|it is|it's)\s+(?:your|the|a)\s+first\s+(?:check-?in|session|time)\b|\bfirst\s+check-?in\s+for\s+this\b|\b(?:part of|as part of)\s+(?:your|a|the)\s+first\b/i;
export const NEVER_SAY_WHICH_CHECK_IN_THIS_IS =
  'YOUR REPLY TOLD THEM WHAT KIND OF CHECK-IN THIS IS. Never say that this is their first check-in or that you are learning about their job. Write the reply again without it, and keep the rest of what it said.';

/**
 * THE BLOCK THE CONVERSATION GETS, ONLY IN A PERSON'S FIRST CHECK-IN. The text that runs is the stored `first_check_in_role`
 * version, then what this session has already covered and what is left, in the product's words. Empty for the opener, for a
 * check-in that is not a person's first, and for a person we cannot keep it for.
 */
export async function theRoleBlock(
  deps: Deps,
  checkIn: { id: string; participantId: string },
  turns: { role: 'AI' | 'PERSON'; content: string }[],
  how: { forTheOpener?: boolean } = {},
): Promise<{ block: string; thisTurn: string; thing: AThingToCover | null; promptVersionId: string | null; first: boolean }> {
  if (how.forTheOpener) return { block: '', thisTurn: '', thing: null, promptVersionId: null, first: false };
  const first = await isTheirFirstCheckIn(deps, checkIn);
  if (!first) return { block: '', thisTurn: '', thing: null, promptVersionId: null, first: false };
  const known = await whatIsKnownOfTheirJob(deps, first.userId, first.organizationId);
  /* Where the job's name is not known, it is asked in the same breath as what they are responsible for. */
  const topics = ROLE_TOPICS.map((t) => (!known ? { ...t, what: 'what their job is, what they are responsible for in it, and what doing well looks like in it' } : t));
  const { notAsked, answered, left } = coverageOf(topics, turns);
  const version = await theVersionThatRuns(deps, FIRST_CHECK_IN_ROLE_KEY, FIRST_CHECK_IN_ROLE_PROMPT);
  const lines = [version.content];
  if (known) lines.push(`WE ALREADY KNOW THEIR JOB AS: "${known.roleName}". Do not ask what it is called.`);
  if (answered.length) lines.push(`ALREADY ANSWERED THIS SESSION. Build on these and never ask for them again:\n${answered.map((a) => `- ${a.what}: they said "${a.answer}"`).join('\n')}`);
  if (left.length) lines.push(`LEAVE THESE. They were declined or asked twice. Do not ask again in any wording:\n${left.map((t) => `- ${t.what}`).join('\n')}`);
  if (!notAsked.length) lines.push('Everything above is covered for this session. Do not ask about their job again.');
  else lines.push(`NOT ASKED YET:\n${notAsked.map((t) => `- ${t.what}`).join('\n')}`);
  const turn = theTurnToAskIt(notAsked, turns);
  return { block: lines.join('\n'), thisTurn: turn.text, thing: turn.thing, promptVersionId: version.id, first: true };
}

/**
 * AFTER THE CHECK-IN: THE READING THAT KEEPS WHAT THEY SAID ABOUT THEIR JOB. One small model call on the person's own turns.
 * Writes one private row, sets their title only if they have none, and leaves a request for them in Ask Groundwork asking
 * whether the role map may show what they own. Never throws into the close.
 */
export async function keepWhatTheySaidAboutTheirJob(
  deps: Deps,
  checkIn: { id: string; participantId: string },
  log: { log: (m: string) => void; warn: (m: string) => void } = { log() {}, warn() {} },
): Promise<{ kept: boolean; roleSet: boolean; versionId: string | null } | null> {
  const first = await isTheirFirstCheckIn(deps, checkIn);
  if (!first) return null;
  const all = await deps.prisma.conversationTurn.findMany({
    where: { checkInId: checkIn.id },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true },
  });
  const turnsInOrder = (all as { role: string; content: string | null }[]).map((t) => ({ role: t.role, text: (t.content ?? '').trim() })).filter((t) => t.text);
  const theirs = turnsInOrder.filter((t) => t.role === TurnRole.PERSON).map((t) => t.text);
  const pairs = turnsInOrder.map((t, i) => (t.role === TurnRole.PERSON ? `They were asked: ${(turnsInOrder[i - 1]?.role === TurnRole.AI ? turnsInOrder[i - 1].text : '(nothing)').slice(0, 300)}\nThey said: ${t.text}` : '')).filter(Boolean);
  if (theirs.join(' ').split(/\s+/).length < 12) return { kept: false, roleSet: false, versionId: null };

  const reading = await theVersionThatRuns(deps, ROLE_READING_KEY, ROLE_READING_PROMPT);
  let read: WhatTheySaidAboutTheirJob | null = null;
  try {
    read = await deps.anthropic.extract<WhatTheySaidAboutTheirJob>(
      reading.content,
      [{ role: 'user', content: pairs.join('\n\n') }],
      ROLE_READING_SCHEMA as any,
      { fast: true, temperature: 0 },
    );
  } catch (err) {
    log.warn(`Check-in ${checkIn.id}: the reading of what they said about their job failed: ${(err as Error)?.message}`);
    return null;
  }
  const mine = onlyWhatTheySaid(read, theirs);
  const dropped = (['roleName', 'owns', 'doingWell', 'dependsOn', 'inTheWay'] as const).filter((k) => (read as any)?.[k] && !mine[k]);
  if (dropped.length) log.log(`Check-in ${checkIn.id}: the reading offered ${dropped.join(', ')}, which did not run on unbroken in one of their answers, so it was not kept.`);
  const known = await whatIsKnownOfTheirJob(deps, first.userId, first.organizationId);
  const roleName = known?.roleName ?? mine.roleName ?? NOT_NAMED_YET;
  const anything = mine.owns || mine.doingWell || mine.dependsOn || mine.inTheWay || mine.roleName;
  if (!anything) return { kept: false, roleSet: false, versionId: reading.id };

  const person = await attempt(() => deps.prisma.person.findFirst({
    where: { organizationId: first.organizationId, linkedUserId: first.userId },
    select: { id: true, externalId: true, title: true },
  }), null);
  const key: string = person?.externalId ?? first.userId;
  let roleSet = false;
  /* A job title is set only when there is none. One that is there stays until the person says yes to a change. */
  if (!known && mine.roleName) {
    await deps.prisma.user.update({ where: { id: first.userId }, data: { jobTitle: mine.roleName } }).catch(() => undefined);
    if (person && !person.title?.trim()) await deps.prisma.person.update({ where: { id: person.id }, data: { title: mine.roleName } }).catch(() => undefined);
    roleSet = true;
  }
  const asked = await theVersionThatRuns(deps, FIRST_CHECK_IN_ROLE_KEY, FIRST_CHECK_IN_ROLE_PROMPT);
  const row = await deps.prisma.roleInterviewAnswer.create({
    data: {
      organizationId: first.organizationId,
      personExternalId: key,
      roleName,
      owns: mine.owns ?? null,
      doingWell: mine.doingWell ?? null,
      dependsOn: mine.dependsOn ?? null,
      inTheWay: mine.inTheWay ?? null,
      source: 'first_check_in',
      sharedAt: null,
      checkInId: checkIn.id,
      promptVersionId: reading.id,
      askedWithPromptVersionId: asked.id,
    },
  });
  /* Their words stay theirs. Whether the role map may show what they own is asked in Ask Groundwork, and only a yes shows it. */
  if (mine.owns && roleName !== NOT_NAMED_YET) {
    const say = theRoleMapQuestion(roleName, mine.owns);
    await deps.prisma.assistantProposal.create({
      data: { organizationId: first.organizationId, personExternalId: key, kind: SHARE_WITH_THE_ROLE_MAP_KIND, summary: say, payload: { rowId: row.id, roleName } as never },
    }).catch(() => undefined);
  }
  log.log(`Check-in ${checkIn.id}: kept what they said about their job (row ${row.id}, reading version ${reading.id ?? 'the code'}, asked with version ${asked.id ?? 'the code'}).`);
  return { kept: true, roleSet, versionId: reading.id };
}

/** The person's latest row about their job, with the person it belongs to. */
export async function theirJobAsKept(deps: Deps, userId: string, organizationId: string) {
  const person = await attempt(() => deps.prisma.person?.findFirst?.({ where: { organizationId, linkedUserId: userId }, select: { externalId: true } }), null);
  return attempt(() => deps.prisma.roleInterviewAnswer?.findFirst?.({
    where: { organizationId, personExternalId: { in: [person?.externalId, userId].filter(Boolean) } },
    orderBy: { createdAt: 'desc' },
  }), null);
}

/**
 * WHAT THEY TOLD US ABOUT THEIR JOB, FOR THEIR OWN LATER CHECK-INS. Their own words, in their own conversation, so the
 * questions are about their actual work. Not in a person's first check-in (that is the part above), and never in anybody
 * else's conversation: it is read by the person's own check-in only.
 */
export async function theirJobAsTheyToldUs(deps: Deps, checkIn: { id: string; participantId: string }): Promise<string> {
  const participant = await attempt(() => deps.prisma.groundParticipant?.findUnique?.({
    where: { id: checkIn.participantId },
    select: { userId: true, ground: { select: { organizationId: true } } },
  }), null);
  const userId = participant?.userId as string | undefined;
  const organizationId = participant?.ground?.organizationId as string | undefined;
  if (!userId || !organizationId) return '';
  const row = await theirJobAsKept(deps, userId, organizationId);
  if (!row) return '';
  const parts: [string, string | null | undefined][] = [
    ['what they are responsible for', row.owns], ['what they decide themselves', row.decides],
    ['what doing well looks like in their job', row.doingWell], ['who they depend on', row.dependsOn],
    ['who depends on them', row.dependedOnBy], ['what usually gets in their way', row.inTheWay],
  ];
  const told = parts.filter(([, v]) => (v ?? '').trim());
  if (!told.length) return '';
  return [
    `WHAT THEY HAVE TOLD US ABOUT THEIR JOB${row.roleName && row.roleName !== NOT_NAMED_YET ? ` (${row.roleName})` : ''}, IN THEIR OWN WORDS. This is private to them. Use it to ask about their actual work, and to notice when what they say now does not fit what they said about their job. Never read it back as a list, never quote it as a record, and never refer to where it came from. If what they say now shows it has changed, ask them whether their job has changed.`,
    ...told.map(([k, v]) => `- ${k}: "${String(v).replace(/\s+/g, ' ').trim().slice(0, 400)}"`),
  ].join('\n');
}
