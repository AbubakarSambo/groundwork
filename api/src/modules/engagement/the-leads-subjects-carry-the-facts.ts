import { aNumberInWords } from './a-number-in-words';

/**
 * THE OTHER SUBJECTS A LEAD READS, AS FACTS (decision 109 item 3; spec section 13).
 *
 * "The shared picture for Sales team is ready" and "Sales team ran out of time" say that something happened and nothing about what. These say it
 * with what is known from the record: how many people checked in, and, to the lead only, who had not. Facts, never comparisons and never a
 * judgement of a person: a name is used only for somebody who had not checked in, which is what the lead already reads on her board.
 *
 * Everybody else who gets the same mail gets the count and no name. Nothing anybody said is in a subject.
 */
export interface WhereItStood { ofHowMany: number; answered: number; notYet: string[] }

const people = (n: number) => `${aNumberInWords(n)} ${n === 1 ? 'person' : 'people'}`;

/** "five of six people checked in", "all six people checked in", "nobody had checked in". */
export function howManyCheckedIn(s: WhereItStood): string | null {
  if (s.ofHowMany <= 0) return null;
  if (s.answered <= 0) return 'nobody had checked in';
  if (s.answered >= s.ofHowMany) return s.ofHowMany === 1 ? 'the one person who can answer had checked in' : `all ${aNumberInWords(s.ofHowMany)} people had checked in`;
  return `${aNumberInWords(s.answered)} of ${aNumberInWords(s.ofHowMany)} people had checked in`;
}

const listed = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/** When a check-in ran out of time. The lead is told who had not checked in, up to three by name; everybody else is told the count. */
export function theRanOutOfTimeSubject(label: string, s: WhereItStood | null, forTheLead: boolean): string {
  const base = `"${label}" ran out of time`;
  if (!s || s.ofHowMany <= 0) return base;
  if (forTheLead && s.answered > 0 && s.notYet.length > 0 && s.notYet.length <= 3) {
    return `${base}, and ${listed(s.notYet)} had not checked in`;
  }
  const how = howManyCheckedIn(s);
  return how ? `${base}, and ${how.replace(' had checked in', ' checked in').replace('nobody had checked in', 'nobody checked in')}` : base;
}

/** When the shared picture is ready. The lead may be given the week's two facts first; everybody else, the count. */
export function theSharedPictureSubject(label: string, s: WhereItStood | null, facts: string | null, direct = false): string {
  /* With the direct morning on (email/a-direct-email.ts): the same facts, and "the report", never "the shared picture". */
  if (direct) {
    if (facts) return `${facts}, and the report for "${label}" is ready`;
    if (s && s.ofHowMany > 1 && s.answered >= s.ofHowMany) return `All ${aNumberInWords(s.ofHowMany)} people on "${label}" have checked in, and the report is ready`;
    return `Your report for "${label}" is ready`;
  }
  if (facts) return `${facts}, and the shared picture for "${label}" is ready`;
  if (s && s.ofHowMany > 1 && s.answered >= s.ofHowMany) return `All ${aNumberInWords(s.ofHowMany)} people on "${label}" have checked in, and the shared picture is ready`;
  return `The shared picture for "${label}" is ready`;
}
