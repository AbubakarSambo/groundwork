/**
 * MANAGEMENT WORDS ARE NOT OURS TO BRING IN.
 *
 * Task 2.3 (week 3 of the weekly plan): "jargon in Groundwork's turns" must fall to a quarter of the
 * baseline. The rulebook in plain-words.ts bans these words in everything a person reads, and the
 * checker counts them, but the check-in's own guard (words-we-do-not-use) never looked for them. On
 * runs 12 and 13 about a third of them were Groundwork reaching for the word itself: "That plan is a
 * concrete deliverable", "How many times did you have to escalate a problem with them?".
 *
 * Their own word handed back is left alone, as the other guard does: a sales rep who says
 * "pipeline" and hears it back is being listened to. The product never introduces one.
 */
export interface AManagementWord {
  word: string;
  test: RegExp;
  /** A plain way to say it, for the instruction. */
  plainly: string;
}

export const MANAGEMENT_WORDS: AManagementWord[] = [
  { word: 'pipeline', test: /\bpipelines?\b/i, plainly: 'sales not yet closed' },
  { word: 'escalate', test: /\bescalat(?:e|es|ed|ing|ion|ions)\b/i, plainly: 'take it to someone more senior' },
  { word: 'bottleneck', test: /\bbottlenecks?\b/i, plainly: 'what they are waiting for' },
  { word: 'deliverable', test: /\bdeliverables?\b/i, plainly: 'the piece of work' },
  { word: 'stakeholder', test: /\bstakeholders?\b/i, plainly: 'the people involved, by name where you know them' },
  { word: 'alignment', test: /\balign(?:ment|ed)\b/i, plainly: 'agree' },
  { word: 'leverage', test: /\bleverag(?:e|es|ed|ing)\b/i, plainly: 'use' },
  { word: 'cadence', test: /\bcadence\b/i, plainly: 'how often' },
  { word: 'bandwidth', test: /\bbandwidth\b/i, plainly: 'time' },
  { word: 'actionable', test: /\bactionable\b/i, plainly: 'something they can act on' },
  { word: 'synergy', test: /\bsynerg(?:y|ies)\b/i, plainly: 'working together' },
];

/** The management words this reply brings in that the person has not used themselves. */
export function managementWordsIn(reply: string, whatTheySaidSoFar: string[] = []): string[] {
  const text = reply ?? '';
  if (!text.trim()) return [];
  const theirs = (whatTheySaidSoFar ?? []).join(' ');
  return MANAGEMENT_WORDS.filter((m) => m.test.test(text) && !m.test.test(theirs)).map((m) => m.word);
}

/** What the model is told when it reached for one. The sentence is quoted, and a plain way offered. */
export function sayItInPlainWords(found: string[], reply = ''): string {
  const words = MANAGEMENT_WORDS.filter((m) => found.includes(m.word));
  const sentence = (reply || '')
    .split(/(?<=[.?!])\s+/)
    .find((s) => words.some((m) => m.test.test(s)))
    ?.trim();
  const one = words.length === 1;
  return `Your last reply used ${words.map((m) => `"${m.word}"`).join(', ')}. ${one ? 'That is' : 'Those are'} work jargon, and this person did not use ${one ? 'it' : 'them'}. People with basic English should understand every sentence you write.
${sentence ? `\nThis is the sentence:\n"${sentence}"\n` : ''}
Write the reply again, the same reply, in plain everyday words. For example:
${words.map((m) => `- instead of "${m.word}", say ${m.plainly}`).join('\n')}

Keep everything else as it was: the same point, the same one question.`;
}
