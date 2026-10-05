import { GroundScenario } from '@prisma/client';
import { endStatesForGround, theEndingSaid, theOutcomeIsThat, TheEndingIsAbout } from '../resolution/end-states';
import { THE_SCENARIO_TABLE } from '../conversation/the-scenario-table';
import { theDayInWords } from './the-headline-and-where-each-target-stands';

/**
 * WHERE THIS IS HEADING, AND RECORD THE DECISION (request 108 d; the close of every example board in
 * docs/prototype/screens/G1-example-check-ins/*.txt and B5-the-board/board-as-lead.txt):
 *
 *   "Where this is heading. Set goals and keep the team on track. The possible outcomes ... The signals
 *    behind them ... What would settle it ... Wairimu decides. Groundwork lays out the outcomes and the
 *    proof. It doesn't choose. Record the decision"
 *
 * WHAT THE PRODUCT ALREADY HAD. A check-in is closed by its lead recording one of the endings its own
 * situation offers (`END_STATES`, POST /grounds/:id/resolution), with a reason (decision 6). The lead
 * also writes down what is still to decide, and the board serves it in `decisions`. So:
 *
 *  - THE POSSIBLE OUTCOMES are exactly the endings "Record the decision" offers for this check-in. Nothing
 *    else: no outcome is written here, and none is ranked or chosen.
 *  - THE SIGNALS BEHIND THEM are sentences this reader is already served on this board: the forecast of a
 *    team number, the blockers, and where people said different things. Each says where it comes from.
 *    They are not tied to one outcome, because nothing on record ties them, and Groundwork does not choose.
 *  - WHAT WOULD SETTLE IT is what the lead wrote down as still to decide. Where they wrote nothing, it says
 *    so.
 *  - WHO DECIDES is the lead, as every check-in is closed by its lead (end-states.ts, LEAD_DECIDES_EVERYWHERE).
 *  - RECORD THE DECISION is offered to the lead only, the one person the resolution route lets record it.
 *
 * Only whoever runs the check-in reads it, and never on an evaluation check-in: there the suggestion, its
 * reasons and the decision already have their own way (decision 6), and the possible outcomes are about a
 * person. The caller enforces both.
 */

export const GROUNDWORK_DOES_NOT_CHOOSE = 'Groundwork lays out the outcomes and the proof. It doesn’t choose.';
export const NO_OUTCOMES_ON_RECORD = 'Nothing on record names the possible outcomes for this check-in yet.';
export const NO_SIGNALS_YET = 'Nothing on record points towards one outcome or another yet.';
export const NOTHING_SAYS_WHAT_WOULD_SETTLE_IT = 'Nothing on record says yet what would settle it.';

export interface ASignal {
  says: string;
  /** Where it comes from, as a full sentence. */
  from: string;
}

export interface WhereThisIsHeading {
  heading: 'Where this is heading';
  /** What this check-in is for, in the situation's own name. */
  about: string | null;
  outcomes: { value: string; says: string; more: string | null }[];
  /** Said only where there are no outcomes. */
  outcomesSays: string | null;
  signals: ASignal[];
  signalsSays: string | null;
  whatWouldSettleIt: string[];
  whatWouldSettleItSays: string;
  whoDecides: string;
  groundworkDoesNotChoose: string;
  /** "Record the decision", to the lead only, while it is not recorded. Recorded through POST /grounds/:id/resolution. */
  recordTheDecision: string | null;
  /** Once it is recorded: which ending, and when. */
  decided: string | null;
}

/** An ending as a reader reads it. Each is already one plain sentence (end-states.ts, decision 75 item 48), the same as on the resolution panel. */
function inPlainWords(label: string): string {
  const t = label.trim();
  return t.endsWith('.') ? t : `${t}.`;
}

/* A finite verb means the text stands as a sentence already. Same list as the-judgement-reads-right. */
const HAS_A_VERB_OF_ITS_OWN = /\b(?:is|are|was|were|has|have|had|does|do|did|can|cannot|could|will|would|should|must|may|might|differ|differs|disagree|disagrees)\b/i;

export function whereThisIsHeading(a: {
  scenario: GroundScenario;
  hadAnObjective: boolean;
  readerIsTheLead: boolean;
  leadName: string | null;
  board: Record<string, any>;
  decided: { endState: string | null; on: Date | string | null } | null;
  now?: Date;
  /** Who an ending about one person leaving is about, as this reader may name them (request 123 item 8). */
  who?: TheEndingIsAbout | null;
}): WhereThisIsHeading {
  const endings = endStatesForGround(a.scenario, { hadAnObjective: a.hadAnObjective, who: a.who });
  const outcomes = endings.map((e) => ({ value: e.value, says: inPlainWords(e.label), more: e.description?.trim() || null }));

  const b = a.board;
  const signals: ASignal[] = [];
  for (const f of (Array.isArray(b.forecast) ? b.forecast : []).slice(0, 2)) {
    if (f?.about && f?.says) signals.push({ says: `${String(f.about).trim()} ${String(f.says).trim()}`, from: String(f.restsOn ?? '').trim() || 'This comes from the counts stored when each session closed.' });
  }
  for (const x of (Array.isArray(b.blockers) ? b.blockers : []).slice(0, 2)) {
    if (x?.says) signals.push({ says: String(x.says).trim(), from: String(x.raised?.says ?? '').trim() || 'This comes from what people said in their check-ins.' });
  }
  const differ = Array.isArray(b.divergence?.items) ? b.divergence.items.length : 0;
  if (differ) {
    signals.push({
      /* One thing is named (request 129 item 7): "about 1 thing" is a count where the thing belongs. */
      says: differ === 1
        ? (() => {
          const topic = String((b.divergence.items[0] as any)?.topic ?? '').trim().replace(/[.!?]+$/, '');
          /*
           * A TOPIC THAT IS ALREADY A SENTENCE IS SAID AS ONE (release round, 5 October 2026).
           *
           * This read the topic as a thing and put it after "about", and the three guards below -
           * short enough, no full stop, opens with a determiner - all pass for a topic that is a
           * whole sentence. Six scenarios on run 32 produced: "People in this check-in said
           * different things about the reason for Meridian's departure is understood differently
           * by the three people involved." A sentence used as the object of a preposition.
           *
           * So a topic with a verb of its own is said on its own, which is the same answer
           * "what changed since last time" reached for the same fault (request 151, E1). It
           * already says people differ, so nothing is added after it.
           */
          const isAlreadyASentence = HAS_A_VERB_OF_ITS_OWN.test(topic);
          if (topic && isAlreadyASentence && topic.split(/\s+/).length <= 20) {
            return `${topic.charAt(0).toUpperCase()}${topic.slice(1)}.`;
          }
          /* Only a thing, said as a thing: it starts with a determiner or a question word. A clause ("There is no owner") is not named after "about". */
          const asked = topic && topic.split(/\s+/).length <= 14 && !/[.!?]/.test(topic) && /^(?:The|A|An|Whether|What|How|Who|When|Where|Which|Why|If|This|That|Our|Their|His|Her|Its)\b/i.test(topic) ? `People in this check-in said different things about ${topic.charAt(0).toLowerCase() + topic.slice(1)}.` : null;
          return asked ?? 'People in this check-in said different things about one thing.';
        })()
        : `People in this check-in said different things about ${differ} things.`,
      from: 'This comes from what people said in their check-ins.',
    });
  }

  const stillToDecide = (Array.isArray(b.decisions) ? b.decisions : [])
    .filter((d: any) => d?.source === 'lead' && typeof d.question === 'string' && d.question.trim())
    .map((d: any) => d.question.trim());

  const lead = a.readerIsTheLead ? 'You' : a.leadName || 'The person running this check-in';
  const ending = theEndingSaid(a.scenario, a.decided?.endState, a.who);
  const decided = a.decided
    ? `${lead === 'You' ? 'You' : lead} recorded the decision${a.decided.on ? ` on ${theDayInWords(new Date(a.decided.on), a.now)}` : ''}.${ending ? ` ${theOutcomeIsThat(ending)}` : ''}`
    : null;

  return {
    heading: 'Where this is heading',
    about: THE_SCENARIO_TABLE[a.scenario]?.name ?? null,
    outcomes,
    outcomesSays: outcomes.length ? null : NO_OUTCOMES_ON_RECORD,
    signals,
    signalsSays: signals.length ? null : NO_SIGNALS_YET,
    whatWouldSettleIt: stillToDecide,
    whatWouldSettleItSays: stillToDecide.length
      ? `${lead} wrote ${stillToDecide.length === 1 ? 'this' : 'these'} down as still to decide.`
      : NOTHING_SAYS_WHAT_WOULD_SETTLE_IT,
    whoDecides: `${lead} decide${lead === 'You' ? '' : 's'}.`,
    groundworkDoesNotChoose: GROUNDWORK_DOES_NOT_CHOOSE,
    recordTheDecision: a.readerIsTheLead && !a.decided ? 'Record the decision' : null,
    decided,
  };
}
