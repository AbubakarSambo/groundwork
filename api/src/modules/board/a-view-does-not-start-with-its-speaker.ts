/**
 * A VIEW DOES NOT START WITH ITS OWN SPEAKER (screens request 151, S2).
 *
 * The screen prints "{who} said {view}". A stored view such as "amani Wekesa stated an aim of 12 shops" therefore
 * read "Amani Wekesa said amani Wekesa stated an aim of 12 shops". At the read, a leading copy of the speaker's name
 * (full, or first name alone), and the verb of speaking that follows it, are taken off the front. The stored text is
 * never changed. Where taking it off would leave nothing, the view is left as it is.
 */
const SPEAKING = '(?:said|says|stated|states|told|tells|reported|reports|described|describes|mentioned|mentions|explained|explains|noted|notes)';

const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function withoutItsOwnSpeaker(view: string, who: string | null | undefined): string {
  const text = (view ?? '').trim();
  const name = (who ?? '').trim();
  if (!text || !name || /^a colleague$/i.test(name)) return view;
  const names = [...new Set([name, name.split(/\s+/)[0]])].filter((n) => n.length > 1).sort((a, b) => b.length - a.length);
  for (const n of names) {
    const lead = new RegExp(`^${escape(n)}(?![’'\\p{L}\\p{N}])\\s*(?:${SPEAKING}\\b)?[\\s,:]*(?:that\\s+)?`, 'iu');
    const rest = text.replace(lead, '');
    if (rest !== text) return rest.trim().length >= 3 ? rest : view;
  }
  return view;
}
