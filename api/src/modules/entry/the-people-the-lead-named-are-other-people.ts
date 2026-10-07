/**
 * THE PEOPLE THE LEAD NAMED ARE OTHER PEOPLE, AND THE ADDRESS THEY GAVE GOES WITH THE NAME (user journeys, F-6).
 *
 * "Chidi Okafor, chidi.okafor@kito.test, a customer support agent. Wairimu Njoroge leads it." came back as two people mentioned, Chidi and
 * Wairimu, so the lead was offered "Add them" beside her own name, and the address she had typed for Chidi was thrown away and asked for again.
 *
 *  - The person who is setting this up is never one of the people named: they are not invited to their own check-in.
 *  - An address the lead typed beside a name is kept with that name, so adding that person asks for nothing the lead already said.
 *    Beside means in the same sentence, with the address within a short way after the name, or the address itself carries the whole name.
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

const AN_ADDRESS = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function theAddressesTheyGave(people: readonly string[] | undefined, theirMessages: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const text = theirMessages.join('\n');
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])|\n+/);
  for (const person of people ?? []) {
    const name = person.trim();
    if (!name) continue;
    const nameLower = name.toLowerCase();
    const firstLower = nameLower.split(/\s+/)[0];
    for (const s of sentences) {
      const lower = s.toLowerCase();
      for (const m of s.matchAll(AN_ADDRESS)) {
        const at = m.index ?? 0;
        const local = m[0].split('@')[0].toLowerCase().replace(/[^a-z]+/g, '');
        const nameFlat = nameLower.replace(/[^a-z]+/g, '');
        const nameAt = lower.indexOf(nameLower);
        const justAfter = nameAt >= 0 && at >= nameAt && at - (nameAt + nameLower.length) <= 40;
        const addressIsTheirs = nameFlat.length >= 4 && (local === nameFlat || local === nameFlat.split('').reverse().join('') || (local.includes(firstLower) && nameFlat.endsWith(local.replace(firstLower, ''))));
        if (justAfter || addressIsTheirs) { out[name] = m[0].toLowerCase(); break; }
      }
      if (out[name]) break;
    }
  }
  return out;
}
