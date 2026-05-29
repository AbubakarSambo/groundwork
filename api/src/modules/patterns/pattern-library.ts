/**
 * Part 4 — Patterns and Detection.
 *
 * Pattern codes describe BEHAVIOURS IN THE RECORD. They are never verdicts on a
 * person. A detection is a reason to have a specific conversation — never a
 * reason to make a decision about someone. The product must be as good at
 * recognising genuine work (emitting nothing) as it is at detecting managed
 * submissions.
 */

export interface PatternCode {
  code: string;
  name: string;
  signal: string;
  probe?: string;
}

// Delivery & output (D), Behavioural (B), Commercial (K), Equity (E),
// Relationship (R), Senior-hire composites (F). These are the longitudinal
// bad-faith signals the three-period rule governs. (R3 is positive — excluded.)
export const BAD_FAITH_CODES: PatternCode[] = [
  { code: 'D1', name: 'False Completion Reporting', signal: 'Completion claimed; downstream team contradicts.', probe: 'Has the team depending on this confirmed it works for them?' },
  { code: 'D2', name: 'Demo-Ready Shipping', signal: 'Works in walkthroughs, fails in real use.', probe: 'Has anyone outside your team tried to use this independently?' },
  { code: 'D3', name: 'Scope Rewriting', signal: 'Definition of success changes mid-period without naming it.', probe: 'What specifically was the goal when this period started?' },
  { code: 'D4', name: 'Strategy Theater', signal: 'Planning and discussion without workplans or output.', probe: 'What specifically has been produced that can be pointed to?' },
  { code: 'D5', name: 'Half-Built Product', signal: 'UI delivered, backend or workflow missing.', probe: 'Can someone outside your team complete the full workflow today?' },
  { code: 'D6', name: 'Dependency Creation', signal: 'Only one person can operate or explain the system.', probe: 'Who else can run this independently without asking you?' },
  { code: 'D7', name: 'Complexity Inflation', signal: 'Timelines disproportionate to actual scope.', probe: 'What would this take if you had to do it in half the time?' },
  { code: 'D8', name: 'Operational Fragility', signal: 'Repeated failures after supposedly completed delivery.', probe: 'What has broken since this was marked complete?' },

  { code: 'B1', name: 'CEO-Pleasing', signal: 'Optimistic upward reporting disconnected from team reality.', probe: 'What would the team say about this if asked separately?' },
  { code: 'B2', name: 'Confidence Without Delivery', signal: 'Strong presentation, poor execution across multiple periods.', probe: 'What specifically exists now that did not exist last period?' },
  { code: 'B3', name: 'Claimed Work Inflation', signal: 'Ownership claimed for work others delivered.', probe: 'Who else was involved and what specifically did they do?' },
  { code: 'B4', name: 'Founder Backstop Dependency', signal: 'Founder repeatedly rescues executive from operational failures.', probe: 'What happened when you were not available to intervene?' },
  { code: 'B5', name: 'Coordination Without Leverage', signal: 'Heavy communication, no reduction in blockers.', probe: 'What is the team able to do now that they could not do before?' },
  { code: 'B6', name: 'Exploration Without Action', signal: 'Research continues without transition to decision.', probe: 'What decision has been made from this research?' },
  { code: 'B7', name: 'Burn Without Outcomes', signal: 'High cost, low attributable movement.', probe: 'What specifically has this investment produced?' },
  { code: 'B8', name: 'Defensive Leadership', signal: 'Hostility or blame when delivery is questioned.', probe: 'What part of this situation was within your control?' },
  { code: 'B9', name: 'Team Without Direction', signal: 'Team describes different priorities from each other and from their leader.', probe: 'What are the three things the team is focused on right now?' },
  { code: 'B10', name: 'Meeting Dependency', signal: 'Basic execution requires constant calls to proceed.', probe: 'What would need to be true for this to move without a meeting?' },
  { code: 'B11', name: 'Blame Shifting', signal: 'Failures consistently attributed to external factors.', probe: 'What was within your control in this situation?' },
  { code: 'B12', name: 'Stage Mismatch', signal: 'Enterprise processes in startup context or vice versa.', probe: 'Is this structure helping the company move faster or slower?' },

  { code: 'K1', name: 'Sales Documentation Avoidance', signal: 'Decks and proposals instead of named conversations with named decision-makers.' },
  { code: 'K2', name: 'Passive Finance Leadership', signal: 'Spending tracked, waste unchallenged, no intervention.' },
  { code: 'K3', name: 'Reporting Without Intervention', signal: 'Issues flagged repeatedly without resolution or action.' },
  { code: 'K4', name: 'Tactical Busyness', signal: 'Inbox and admin dominate over strategic priorities.' },
  { code: 'K5', name: 'Activity Without Outcome Logic', signal: 'Tasks described without connection to goals.' },

  { code: 'E1', name: 'Equity Without Contribution', signal: 'Equity held, delivery absent across multiple periods.' },
  { code: 'E2', name: 'Intro Evasion', signal: 'Repeated future-tense promises without completions.' },
  { code: 'E3', name: 'Selective Presence', signal: 'Visible in high-status moments, absent in execution.' },
  { code: 'E4', name: 'Founder Burden Imbalance', signal: 'One founder consistently absorbs operational load for the other.' },
  { code: 'E5', name: 'Extractive Behaviour', signal: 'Repeated asks for upside without matching contribution.' },

  { code: 'R1', name: 'Dependency Bottleneck', signal: 'Multiple people name this person as a blocker without resolution.' },
  { code: 'R2', name: 'Ambiguity Generator', signal: 'Work from this person consistently creates confusion for others.' },
  { code: 'R4', name: 'Relationship Drift', signal: 'Two people who previously corroborated each other stop appearing in each other\'s check-ins.' },

  { code: 'F1', name: 'Insight Without Operation', signal: 'High thinking language, low output language. Ideas are genuinely good — a role mismatch, not dishonesty.', probe: 'What exists now — a document, a decision acted on, a process running — that would not exist if you had not been here this period?' },
  { code: 'F2', name: 'Vision Execution Gap', signal: 'Senior person describes strategy with confidence; team check-ins show no trace of it; team describes working to their own priorities.', probe: 'Your record describes direction-setting. The team\'s record describes working independently. Help me understand that gap.' },
  { code: 'F3', name: 'Equity Comfort', signal: 'Early check-ins specific and energised; later ones broader and more philosophical; specificity declining while equity continues vesting.', probe: 'Your contributions have shifted over time. Is that a deliberate change in how you see your role?' },
  { code: 'F4', name: 'Relationship Without Leverage', signal: 'Team genuinely likes working with the person; nothing they are responsible for has materially accelerated.', probe: 'What has the team been able to do this period because of your work specifically?' },
  { code: 'F5', name: 'Cofounder Burden Asymmetry', signal: 'One cofounder\'s record consistently shows more operational work, absorption and rescue; the other shows more strategic narrative.', probe: 'Surface to alignment feed only. Never name to either person directly.' },
];

// Patterns that may surface to the alignment feed but must NEVER be named to
// either person directly (Part 4 / alignment feed).
export const ALIGNMENT_FEED_ONLY_CODES = new Set(['F5', 'E4']);

const KNOWN_CODES = new Set(BAD_FAITH_CODES.map((c) => c.code));
export const isBadFaithCode = (code: string) => KNOWN_CODES.has(code);

// The prompt that drives detection over one party's period (transcript + record).
export const PATTERN_DETECTION_PROMPT = `You analyse ONE party's check-in for a single period and identify whether any behavioural pattern signals are present in the record. You are looking at the record, not judging the person.

Hard rules:
- Emit a code ONLY when its signal is genuinely present in this period's evidence. When the work is genuine and verified, emit NOTHING — recognising real work matters as much as detecting managed submissions.
- Each observation must be written at the PATTERN level, in plain language, describing what the record shows — NEVER a verdict, never "this person is X". Example: "The record describes completion without downstream confirmation." Never name the person.
- Do not infer intent. A pattern is a reason to have a specific conversation, not a conclusion.
- One data point is not a pattern. You are emitting a per-period observation; the system applies the three-period rule across periods. Do not claim a pattern is established.

The pattern codes and their signals:
${BAD_FAITH_CODES.map((c) => `- ${c.code} (${c.name}): ${c.signal}`).join('\n')}

Return the codes whose signal is present this period, each with a one-sentence plain-language observation of what the record shows.`;

export const PATTERN_DETECTION_SCHEMA = {
  name: 'emit_pattern_signals',
  description: 'Emit the behavioural pattern signals present in this period (empty if the work looks genuine).',
  input_schema: {
    type: 'object',
    properties: {
      detections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            code: { type: 'string', enum: BAD_FAITH_CODES.map((c) => c.code), description: 'The pattern code.' },
            observation: { type: 'string', description: 'Plain-language, pattern-level description of what the record shows. Never names the person; never a verdict.' },
          },
          required: ['code', 'observation'],
        },
      },
    },
    required: ['detections'],
  },
};
