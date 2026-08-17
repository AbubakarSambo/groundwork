/**
 * THE PEOPLE IN THE SIMULATION, AND DELIBERATELY NOT ALL SHARP.
 *
 * A real org is a mix. If every actor answers in structured, specific prose the product never gets
 * stress-tested on the readers it will actually lose: the person who types "fine" and stops, the one
 * who does not know what "ground" means, the one who is defensive because the situation is about them.
 *
 * `level` drives how much usable content they give. `style` drives how they give it. `jargon` drives
 * whether the product's own vocabulary lands or bounces. The point is to watch whether the chat
 * adapts - plainer words for a basic reader, still extracting something usable from a terse one, and
 * never breaking or leaking when somebody goes off-script.
 */
export type Level = 'high' | 'medium' | 'basic';
export type Style = 'cooperative' | 'rushed' | 'distracted' | 'defensive' | 'chatty' | 'terse';

export interface Persona {
  key: string;
  name: string;
  email: string;
  level: Level;
  style: Style;
  /** How they react to the product's own words. */
  jargon: 'fluent' | 'unsure' | 'putOff';
}

const P = (key: string, name: string, level: Level, style: Style, jargon: Persona['jargon']): Persona => ({
  key, name, email: `${key}@meridianhealth.test`, level, style, jargon,
});

/**
 * Sahar is the only constant across all 18 grounds. Everyone else varies, and several recur so the
 * returning-participant behaviour has something to recognise.
 */
export const PEOPLE: Record<string, Persona> = {
  sahar:    P('sahar', 'Sahar Okonkwo', 'high', 'cooperative', 'fluent'),

  hafsah:   P('hafsah', 'Hafsah', 'high', 'cooperative', 'fluent'),
  kennedy:  P('kennedy', 'Kennedy', 'medium', 'rushed', 'unsure'),
  maureen:  P('maureen', 'Maureen', 'medium', 'chatty', 'unsure'),
  eric:     P('eric', 'Eric', 'high', 'terse', 'fluent'),
  rime:     P('rime', 'Rime', 'medium', 'cooperative', 'unsure'),

  abubakar: P('abubakar', 'Abubakar', 'medium', 'cooperative', 'unsure'),
  ejiro:    P('ejiro', 'Ejiro', 'basic', 'terse', 'putOff'),
  hafeezah: P('hafeezah', 'Hafeezah', 'basic', 'defensive', 'putOff'),
  nate:     P('nate', 'Nate', 'basic', 'distracted', 'putOff'),
  kavon:    P('kavon', 'Kavon', 'medium', 'defensive', 'unsure'),
  adam:     P('adam', 'Adam', 'high', 'chatty', 'fluent'),
};

/**
 * What this person types when asked something. Not a script of exact answers - the engine asks what it
 * wants to ask - so these are shaped by level and style and reused across turns, with the turn index
 * varying them so a six-turn conversation is not the same sentence six times.
 *
 * `evidenceBait` is the deliberate probe: a claim the chat SHOULD want backed ("the numbers are
 * strong"), used to try to trigger an evidence request and the in-chat upload.
 */
export function answerFor(p: Persona, turn: number, topic: string): string {
  const basicPool = [
    'fine',
    'yeah ok',
    'not sure what you mean',
    'its going alright i think',
    'same as before',
    'sorry what does ground mean',
  ];
  const tersePool = [
    'On track.',
    'Two things outstanding.',
    'Waiting on finance.',
    'No change.',
  ];
  const mediumPool = [
    `Mostly going well on ${topic}. A couple of things are still unclear to me.`,
    'I think we agreed I would own the reporting side, but it has not been confirmed.',
    'The handover was thin so I have been working it out as I go.',
    'I need a decision from someone above me before I can move.',
  ];
  const highPool = [
    `On ${topic}: two of the four deliverables are done, the third is blocked on a decision I do not own.`,
    'What success looks like to me is owning one account end to end by the end of the quarter.',
    'The specific gap is that nobody has said who signs off the budget line.',
    'I would rather name it now than discover it at the review.',
  ];
  const defensiveExtra = [
    'I do not think that is a fair way to put it.',
    'I have done what was asked of me.',
    'Nobody told me that was the expectation.',
  ];
  const distractedExtra = ['sorry got pulled into something, what was the question', 'one sec', 'ok back'];
  const chattyExtra = [
    'Long answer sorry. Broadly it is fine, but there is history here that matters, and I think the '
    + 'reason it keeps coming up is that we never actually settled it the first time round.',
  ];

  let pool = p.level === 'basic' ? basicPool : p.level === 'medium' ? mediumPool : highPool;
  if (p.style === 'terse') pool = tersePool;
  if (p.style === 'defensive' && turn % 3 === 1) pool = defensiveExtra;
  if (p.style === 'distracted' && turn % 4 === 1) pool = distractedExtra;
  if (p.style === 'chatty' && turn % 3 === 2) pool = chattyExtra;

  return pool[turn % pool.length];
}

/** The claim the chat ought to push back on. Used once per ground to hunt the evidence request. */
export const EVIDENCE_BAIT = 'Honestly the numbers are strong and we are ready, everyone is happy with it.';
