/**
 * RELEASE 7: A REVIEW BUILT FROM CHECK-INS (release plan, Release 7; the Check-in Reports file's "A review built from check-ins").
 * The review a manager decides, drawn from the person's record over the whole period, judged against the direction in force at each
 * point (Release 6). Three readings side by side (outcome, adaptation, alignment), what they committed to and what became of it,
 * "Blocked, or dropped it?", their own view, and who decides. It is a draft; nothing here decides. It reads only the lines this reader
 * may already read (mayReadTheLine), never hours or leave, and says a pattern as a signal, never a label on the person. Where the record
 * cannot say, it says so and names who to ask.
 */
import type { ARecordLine } from './the-record-read-for-a-review';
import { theVaguePromiseIn, whatItWasSaid } from '../conversation/a-vague-promise-says-what-it-is';

export interface AGoalVersionRead { name: string; target: number | null; outcome: string; newName: string | null; newTarget: number | null; decidedAt: string; decidedBy: string }
export interface ADirectionChange { setAt: string; stops: { what: string; whoParticipantId?: string | null }[] }
export interface ALiveGoalRead { name: string; count: number; target: number | null }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dayAndMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const n = (x: number) => x.toLocaleString('en-GB');
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3).map((w) => w.replace(/s$/, '')));
const touches = (a: string, b: string) => { const A = words(a), B = words(b); return [...A].some((w) => B.has(w)); };
const alike = (a: string, b: string) => { const A = words(a), B = words(b); return [...A].filter((w) => B.has(w)).length >= 2; };
const clean = (w: string) => w.replace(/^[“"]|[”"]$/g, '').replace(/[.]+$/, '');

export function theReviewAsPictured(input: {
  lines: ARecordLine[]
  /** "you" for the person, else the person's first name. */
  who: string
  personFirst: string
  isThePerson: boolean
  deciderFirst: string | null
  theirView: string | null
  goalVersions: AGoalVersionRead[]
  directionChanges: ADirectionChange[]
  personParticipantIds: string[]
  liveGoals: ALiveGoalRead[]
}) {
  const { lines, who, personFirst, isThePerson } = input;
  const Who = who.charAt(0).toUpperCase() + who.slice(1);
  const their = isThePerson ? 'your' : 'their';
  const goals = lines.filter((l): l is Extract<ARecordLine, { kind: 'goal' }> => l.kind === 'goal');
  const commitments = lines.filter((l): l is Extract<ARecordLine, { kind: 'commitment' }> => l.kind === 'commitment');
  const blockers = lines.filter((l): l is Extract<ARecordLine, { kind: 'blocker' }> => l.kind === 'blocker');

  /* OUTCOME: did the work produce what was intended? Each goal against its target, with the target it had before the direction changed it. */
  const outcomeLines = goals.map((g) => {
    const was = input.goalVersions.find((v) => (v.newName && alike(v.newName, g.name)) || alike(v.name, g.name));
    const against = g.target !== null
      ? was && was.target !== null && was.target !== g.target ? `against a first target of ${n(was.target)} and a later one of ${n(g.target)}` : `against a target of ${n(g.target)}`
      : 'with no number set for it';
    return `${n(g.count)} on “${clean(g.name)}”, ${against}.`;
  });
  const done = commitments.filter((c) => c.status === 'DONE').length;
  const outcome = outcomeLines.length ? outcomeLines.join(' ')
    : commitments.length ? `${Who} did ${n(done)} of the ${n(commitments.length)} things ${isThePerson ? 'you' : 'they'} said ${isThePerson ? 'you' : 'they'} would do.`
      : 'The record holds no goal and no commitment for this period, so the outcome cannot be read from it.';

  /* ADAPTATION: when the direction changed, did they notice and adjust? Read from what became of their goals, and how soon. */
  const change = input.directionChanges.slice().sort((a, b) => a.setAt.localeCompare(b.setAt)).pop() ?? null;
  let adaptation: string;
  if (!change) adaptation = 'The direction did not change in this period, so there was nothing new to adjust to.';
  else {
    const after = input.goalVersions.filter((v) => v.decidedAt >= change.setAt);
    const byThem = after.filter((v) => v.decidedBy === 'person' && v.outcome !== 'continued');
    if (byThem.length) {
      const days = Math.max(0, Math.round((Date.parse(byThem.map((v) => v.decidedAt).sort()[0]) - Date.parse(change.setAt)) / 86_400_000));
      adaptation = `When the direction changed on ${dayAndMonth(change.setAt.slice(0, 10))}, ${who} ${byThem.length === 1 ? `changed or stopped ${their} goal` : `changed or stopped ${byThem.length} of ${their} goals`} ${days === 0 ? 'the same day' : days === 1 ? 'the next day' : `within ${days} days`}.`;
    } else if (after.length) adaptation = `When the direction changed on ${dayAndMonth(change.setAt.slice(0, 10))}, ${who} kept ${their} goals as they were${after.some((v) => v.decidedBy === 'lead') ? ', and the lead changed some of them' : ''}.`;
    else adaptation = `The direction changed on ${dayAndMonth(change.setAt.slice(0, 10))}, and ${who} ${isThePerson ? 'have' : 'has'} not yet continued, changed or stopped ${their} goals.`;
  }

  /* ALIGNMENT: does the work now serve the current direction? A goal the brief stops, still on the board, says partly. */
  let alignment: string;
  if (!change) alignment = 'There is no company direction on record to check the work against.';
  else {
    const stillAgainst = input.liveGoals.filter((g) => change.stops.some((s) => alike(s.what, g.name) && (!s.whoParticipantId || input.personParticipantIds.includes(s.whoParticipantId))));
    alignment = stillAgainst.length
      ? `Partly. ${stillAgainst.map((g) => `“${clean(g.name)}”`).join(' and ')} ${stillAgainst.length === 1 ? 'is' : 'are'} still on the board, though the team's brief stops ${stillAgainst.length === 1 ? 'it' : 'them'}.`
      : 'Yes, as far as the record shows. Nothing the team’s brief stops is still among the goals.';
  }

  /* WHAT THEY COMMITTED TO, AND WHAT THEY DID: each commitment and what became of it, the clearest first. */
  const toneOf = { DONE: 'rec', NOT_DONE: 'con', DROPPED: 'att', OPEN: 'act' } as const;
  /* What "it" was, in their own words, where the check-in asked (a-vague-promise-says-what-it-is). Their promise is never reworded. */
  const itWas = (c: any) => { const w = whatItWasSaid(Who, theVaguePromiseIn(c.words)?.pronoun ?? 'it', c.whatItIs); return w ? `${w} ` : ''; };
  const committed = commitments.slice(0, 10).map((c) => ({
    title: clean(c.words).charAt(0).toUpperCase() + clean(c.words).slice(1),
    says: itWas(c) + (c.status === 'DONE' ? `Done${c.settledOn ? ` on ${dayAndMonth(c.settledOn)}` : ''}.` : c.status === 'NOT_DONE' ? `Not done${c.settledOn ? `, marked on ${dayAndMonth(c.settledOn)}` : ''}.` : c.status === 'DROPPED' ? 'Dropped later.' : 'Still open when the review started.'),
    tone: toneOf[c.status],
  }));

  /* BLOCKED, OR DROPPED IT? The situation where the record shows one (a wait on somebody else, or the direction changing the goal); otherwise not known, and who to ask. Never a judgement of character. */
  const blockedOrDropped = commitments.filter((c) => c.status === 'NOT_DONE' || c.status === 'DROPPED').slice(0, 6).map((c) => {
    const wait = blockers.find((b) => b.groundId === c.groundId && touches(b.what, c.words) && b.saidOn <= (c.settledOn ?? '9999') && (!b.clearedOn || b.clearedOn >= c.madeOn));
    const changedByDirection = change && input.goalVersions.some((v) => v.outcome !== 'continued' && alike(v.name, c.words));
    return {
      title: clean(c.words).charAt(0).toUpperCase() + clean(c.words).slice(1),
      says: wait ? `The situation, mostly. ${Who} ${isThePerson ? 'were' : 'was'} waiting on ${wait.onFirst ?? wait.onLabel ?? 'somebody else'} for ${clean(wait.what)}.`
        : changedByDirection ? 'The situation. The direction changed, and the goal it served was changed or stopped with it.'
          : isThePerson ? 'Not known from the record. Say what happened in your own view.' : `Not known from the record. Ask ${personFirst}.`,
      tone: wait || changedByDirection ? 'att' : 'act',
    };
  });

  /* THE EVIDENCE FOR EACH READING (Hafsah, 25 October: each shown separately, with its evidence, and no combined score). Lines from the record only. */
  const outcomeEvidence = [
    ...commitments.filter((c) => c.status === 'DONE').slice(0, 3).map((c) => `“${clean(c.words)}”, done${c.settledOn ? ` on ${dayAndMonth(c.settledOn)}` : ''}.`),
    ...commitments.filter((c) => c.status === 'NOT_DONE').slice(0, 2).map((c) => `“${clean(c.words)}”, not done.`),
  ];
  const adaptationEvidence = change
    ? input.goalVersions.filter((v) => v.decidedAt >= change.setAt).slice(0, 4).map((v) => `“${clean(v.name)}” was ${v.outcome === 'continued' ? 'kept' : v.outcome === 'changed' ? `changed${v.newName ? ` to “${clean(v.newName)}”` : ''}` : 'stopped'} on ${dayAndMonth(v.decidedAt.slice(0, 10))}, by ${v.decidedBy === 'person' ? (isThePerson ? 'you' : personFirst) : 'the lead'}.`)
    : [];
  const alignmentEvidence = change ? change.stops.slice(0, 3).map((x) => `The team’s brief stops “${clean(x.what)}”.`) : [];

  return {
    readings: [
      { label: 'Outcome', question: 'Did the work produce what was intended?', says: outcome, evidence: outcomeEvidence },
      { label: 'Adaptation', question: `Did ${who} notice new information and adjust well?`, says: adaptation, evidence: adaptationEvidence },
      { label: 'Alignment', question: `Does ${isThePerson ? 'your' : `${personFirst}’s`} work now serve the current direction?`, says: alignment, evidence: alignmentEvidence },
    ],
    committedHeading: isThePerson ? 'What you committed to, and what you did' : `What ${personFirst} committed to, and what ${personFirst} did`,
    committed,
    blockedOrDropped,
    ownViewHeading: isThePerson ? 'Your own view' : `${personFirst}’s own view`,
    ownView: input.theirView?.trim() ? `“${clean(input.theirView.trim())}.”` : isThePerson ? 'You have not added your view yet.' : `${personFirst} has not added their view yet.`,
    decidesHeading: `${input.deciderFirst ?? 'The person who writes it'} decides`,
    decides: `The review is a draft. ${input.deciderFirst ?? 'Whoever writes it'} decides and gives the reasons. ${isThePerson ? 'You see them, can add your side, and can appeal.' : `${personFirst} sees them, can add their side, and can appeal.`}`,
  };
}
