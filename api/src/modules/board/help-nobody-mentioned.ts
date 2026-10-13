/**
 * HELP NOBODY MENTIONED (request 115 c; the prototype's B5 board-as-lead.txt: "Help nobody mentioned. You
 * see the help, not who said it. Aisha helped two team members with their quotes this week. She didn't
 * mention it herself.").
 *
 * ONLY FROM WHAT THE RECORD HOLDS. A colleague naming a person as the reason something moved is kept as a
 * CREDIT mention (WorkMention). It counts here only where that person's own lines say nothing about the
 * same work. What the colleague said is never served (the mention's own words are "never shown to the
 * person it is about", and they would say who told us), so each line is in the product's words: who
 * helped, how many colleagues said so, and that the person did not mention it.
 *
 * WHO READS IT: whoever runs the check-in (the lead, the admin who set it up). It is one person's work,
 * read across other people's check-ins, so no colleague reads it, and nor does an admin who only reads,
 * the same rule as what keeps coming up.
 */
export const YOU_SEE_THE_HELP = 'You see the help, not who said it.';

const LITTLE = new Set('the and for but not has had have was were are been will with from that this than then there what when who how all any one two out also just very more some such own same each both into onto over about they them their his her its our you your she him helped help helping me my we us it is be to of in on at by an as or if so do no up i'.split(' '));
const wordsOf = (t: string) => ((t ?? '').toLowerCase().replace(/[‘’']/g, '').match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length > 2 && !LITTLE.has(w));

/** Whether a line of theirs is about the same work: at least two of the mention's own words, and half of them. */
function saidItThemselves(mention: string, theirLines: string[], names: string[]): boolean {
  const skip = new Set(names.flatMap((n) => wordsOf(n)));
  const words = [...new Set(wordsOf(mention).filter((w) => !skip.has(w)))];
  if (!words.length) return false;
  return theirLines.some((line) => {
    const said = new Set(wordsOf(line));
    const shared = words.filter((w) => said.has(w)).length;
    return shared >= Math.min(2, words.length) && shared * 2 >= words.length;
  });
}

const A_HELP_WORD = /\b(?:help|helped|helping|helps|thanks|thank|supported|support|covered|showed|stepped\s+in|sorted|backed)\b/i;
/** Whether a colleague's own words name the person and say they helped. */
export function aTranscriptHoldsTheCredit(name: string, theirWords: readonly string[]): boolean {
  const first = (name ?? '').trim().split(/\s+/)[0] ?? '';
  if (!first) return false;
  const named = new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return theirWords.some((t) => named.test(t) && A_HELP_WORD.test(t));
}

export function helpNobodyMentioned(
  mentions: { sourceParticipantId: string; aboutParticipantId: string; kind: string; text: string }[],
  lines: { participantId: string; text: string }[],
  people: { id: string; managingOnly?: boolean }[],
  nameOf: (participantId: string) => string | null,
  /* Who is reading: their own line says "you" (item 21: Ada read "Ada Nwosu did not mention it in their own check-ins."). */
  readerParticipantId: string | null = null,
  /*
   * WHAT EACH COLLEAGUE SAID, IN THEIR OWN CHECK-INS (the final check, Hafsah, 12 October). "2 colleagues said you helped them." went to
   * the lead in both quality runs with nothing behind it in any transcript: the credit was the model's reading, not anybody's words. Given,
   * a credit counts only where the colleague's own words name the person and say they helped. Not given, nothing is checked.
   */
  theirOwnWordsBy?: ReadonlyMap<string, readonly string[]>,
): { lines: string[]; why: string } | null {
  const out: string[] = [];
  for (const p of people) {
    if (p.managingOnly) continue;
    const name = nameOf(p.id);
    if (!name) continue;
    const theirs = lines.filter((l) => l.participantId === p.id).map((l) => l.text);
    const credits = mentions.filter((m) => m.kind === 'CREDIT' && m.aboutParticipantId === p.id && m.sourceParticipantId !== p.id
      && !saidItThemselves(m.text, theirs, [name])
      && (!theirOwnWordsBy || aTranscriptHoldsTheCredit(name, theirOwnWordsBy.get(m.sourceParticipantId) ?? [])));
    const colleagues = new Set(credits.map((m) => m.sourceParticipantId)).size;
    if (!colleagues) continue;
    const who = colleagues === 1 ? 'A colleague' : `${colleagues} colleagues`;
    out.push(readerParticipantId && p.id === readerParticipantId
      ? `${who} said you helped them. You did not mention it in your own check-ins.`
      : `${who} said ${name} helped them. ${name} did not mention it in their own check-ins.`);
  }
  return out.length ? { lines: out, why: YOU_SEE_THE_HELP } : null;
}
