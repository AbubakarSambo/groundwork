/**
 * THE FIRST WORD OF A NAME, FOR WHERE A SCREEN ONLY WANTS A FIRST NAME.
 *
 * Signup asks for "Your name" in one field and stores whatever was typed as `firstName`
 * (AuthPage.tsx, auth.service.ts) - so a person who typed "Rukia Otieno" has that whole
 * string sitting in the field every screen calls `firstName`. Most places that is fine: the
 * sidebar, the "Who else answers" line and the rest read it as a name and print it whole.
 *
 * Two places on the check-in screens want only the FIRST name, the way the prototype itself
 * writes it ("Done. Thanks, Miriam.", never "Done. Thanks, Miriam Wanjiku."): the Done page's
 * greeting and "also answers a check-in". Both took the stored field and printed it whole,
 * so a real signup ("Rukia Otieno") read as "Done. Thanks, Rukia Otieno." - correct, and not
 * what the prototype's own screens say.
 *
 * This does not change what signup stores; it only takes the first word off it where a
 * screen wants a first name.
 */
export function firstWordOfAName(name: string | null | undefined): string | null {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return null
  return trimmed.split(/\s+/)[0]
}
