/**
 * The five things the defensible advantage is made of.
 *
 * Hafsah's words, kept verbatim. This is a strategy document that happens to be
 * typed as data, and paraphrasing it to fit a field would lose the thing that
 * makes it useful — every clause here names an asset somebody can deliberately
 * build, which is exactly why it was written this way.
 *
 * It is here rather than in a slide because "solidify the moat" was the one
 * roadmap item nothing could report on. Everything else the company is doing is
 * countable, and an objective that cannot be counted is the one that quietly
 * stops being worked on while the measurable ones get attention. Now each
 * component has entries, and an entry is a claim carrying evidence.
 */

export interface MoatComponent {
  key: string;
  ordinal: number;
  name: string;
  statement: string;
}

/** The sentence the whole thing is in service of. */
export const WHAT_GROUNDWORK_IS_BUILDING =
  'Groundwork is building a proprietary system for understanding how people work together - how to get to the truth, understand what is happening, recognize patterns, and learn what actually improves outcomes.';

export const MOAT_COMPONENTS: MoatComponent[] = [
  {
    key: 'elicitation',
    ordinal: 1,
    name: 'Proprietary Elicitation System',
    statement:
      'Groundwork is codifying how to get the right information from people. Not simply a question bank, but how conversations are structured: what to ask, in what order, when to probe, when to request evidence, how to prevent people speaking for others, and how to surface differences between perspectives. Every situation helps us learn which approaches produce the clearest and most useful signal.',
  },
  {
    key: 'dataset',
    ordinal: 2,
    name: 'Human Dynamics Dataset',
    statement:
      'Every Groundwork situation can create structured, longitudinal data connecting what people understood and expected, what they committed to, what they did, where accounts diverged, what changed, and what eventually happened. Where appropriate and permissioned, this can include semantic and behavioural signals - not merely metadata. Over time, this becomes a unique dataset of how real work relationships and situations develop.',
  },
  {
    key: 'memory',
    ordinal: 3,
    name: 'Organizational Memory & Situation Intelligence',
    statement:
      "Groundwork builds an understanding of the history and context behind a situation: roles, relationships, previous decisions, commitments, evidence, recurring issues and outcomes. This allows Groundwork to understand today's problem in the context of what came before. Access to that information is tightly controlled; Groundwork's ability to learn does not mean every participant or employer can see everything Groundwork knows.",
  },
  {
    key: 'model',
    ordinal: 4,
    name: 'Human Dynamics Model',
    statement:
      "Groundwork uses this accumulated experience to build proprietary intelligence around how people align, disagree, avoid, commit, deliver, fail and recover. Over time, the system learns to recognize patterns, identify missing information, detect emerging problems and predict what is likely to happen next. The defensible asset is not simply the underlying AI model; it is the model combined with Groundwork's proprietary data, structure and learning.",
  },
  {
    key: 'intervention-learning',
    ordinal: 5,
    name: 'Intervention Learning',
    statement:
      'Groundwork closes the loop by learning what actually works. Which question uncovered the problem? Which evidence changed the understanding? Which intervention resolved the divergence? Did the commitment subsequently get delivered? This outcome data feeds back into the elicitation system and Human Dynamics Model, so Groundwork gets better at handling the next situation.',
  },
];

/** What the five are supposed to add up to. */
export const THE_COMPOUNDING_LOOP =
  'More situations -> better elicitation -> richer human-dynamics data -> stronger pattern recognition -> better predictions -> better interventions -> better outcomes -> greater customer value and retention.';

/**
 * Privacy is part of the architecture, not a limit on the ambition.
 *
 * Kept next to the loop rather than in a footnote, because the loop is the
 * thing that would justify collecting anything at all, and this is the line
 * that decides how.
 */
export const MAXIMUM_LEARNING_MINIMUM_EXPOSURE = 'Maximum learning. Minimum necessary exposure.';

/** What somebody would be buying. */
export const WHAT_AN_ACQUIRER_IS_BUYING =
  'Not a check-in tool. A proprietary system for eliciting, understanding and learning from human dynamics at work - with a dataset and intelligence layer that compounds with every situation Groundwork handles.';
