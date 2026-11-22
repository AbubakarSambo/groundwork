/**
 * THE PEOPLE THE LEAD NAMED ARE OTHER PEOPLE, AND THE ADDRESS THEY GAVE GOES WITH THE NAME (user journeys, F-6).
 *
 * "Chidi Okafor, chidi.okafor@kito.test, a customer support agent. Wairimu Njoroge leads it." came back as two people mentioned, Chidi and
 * Wairimu, so the lead was offered "Add them" beside her own name, and the address she had typed for Chidi was thrown away and asked for again.
 *
 *  - The person who is setting this up is never one of the people named: they are not invited to their own check-in.
 *  - Whose address is whose is read by the model with the rest of the conversation (entry.service.ts, peopleEmails), not guessed here
 *    from where an address sits: "Amina, Brian and Esther esther@x" gave all three Esther's address (setup flow, 22 November 2026).
 */
const sameWords = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function withoutThePersonSettingItUp(people: readonly string[] | undefined, me: { firstName?: string | null; lastName?: string | null } | null): string[] {
  const list = (people ?? []).filter((p) => typeof p === 'string' && p.trim());
  if (!me) return [...list];
  const first = sameWords(me.firstName ?? '');
  const full = sameWords([me.firstName, me.lastName].filter(Boolean).join(' '));
  return list.filter((p) => {
    const w = sameWords(p);
    return !(w && (w === full || (first && w === first)));
  });
}
