import { isAWholeSentence } from './what-people-said-differently-about';

/**
 * PEOPLE DISAGREE, IN A SENTENCE, NOT A COUNT AND A COLON (item 18, the onboarding board, 2 October 2026).
 *
 * The opening of a report is written by the model from a brief that shows it "People disagree on 1: <topic>.", and the
 * model sometimes keeps that line as it is. On "Engagement Director, first 90 days" Amina and Tobi read "Both people
 * have answered. People disagree on 1: The definition of 'ownership' and the trigger for Tobi Adewale to lead client
 * meetings." Where it is served, that line becomes a sentence: "People disagree about the definition of 'ownership'
 * and the trigger for Tobi Adewale to lead client meetings." Several topics are said as a list, and a topic that is a
 * whole sentence is said as its own sentence.
 */
const THE_LINE = /People disagree on (\d+): ([^\n]+?)\.(?=\s|$)/g;

const lowerFirst = (t: string) => (/^(The|A|An|Whether|What|How|Who|When|Where|Which|Why|If|This|That)\b/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t);
const upperFirst = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const andList = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export function peopleDisagreeInASentence(text: string): string {
  if (!text || !/People disagree on \d+:/.test(text)) return text;
  return text.replace(THE_LINE, (_m, _n: string, list: string) => {
    const topics = list.split(/;\s*/).map((t) => t.trim().replace(/[.]+$/, '')).filter(Boolean);
    const phrases = topics.filter((t) => !isAWholeSentence(t)).map(lowerFirst);
    const sentences = topics.filter((t) => isAWholeSentence(t)).map((t) => `${upperFirst(t)}.`);
    const first = phrases.length ? `People disagree about ${andList(phrases)}.` : 'People disagree.';
    return [first, ...sentences].join(' ');
  });
}
