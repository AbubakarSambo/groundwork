/**
 * A PROMISE, SAID INSIDE A SENTENCE THAT ALREADY HAS ITS OWN SUBJECT AND VERB.
 *
 * "You mentioned You will give Juma your number" was read in a reply: the stored words of a promise ("You will give Juma your number") were put after
 * "You mentioned", capital and all, and the promise's own "You will" was said again. Wherever code joins a person's words into the middle of a sentence
 * ("You mentioned you would ...", "Last time you said you would ..."), the words go through here: a leading "I will", "You will", "We'll", "You are going to"
 * is taken off, because the sentence has its own, and the first letter goes to lower case unless it is the word "I", an acronym, or has a capital or a figure
 * inside it (a name of a product or a person reads the same anywhere).
 */
const ITS_OWN_SUBJECT = /^(?:i|you|we)(?:['’](?:ll|d)|\s+(?:will|would|shall|should|am going to|are going to|'m going to|'re going to|plan to|want to|need to|have to|must))\s+/i;
const ITS_OWN_SUBJECT_ALONE = /^(?:i['’]m|you['’]re|we['’]re)\s+going to\s+/i;

export function aPromiseInsideASentence(raw: string | null | undefined): string {
  let t = String(raw ?? '').trim().replace(/^["“‘']+|["”’']+$/g, '').trim();
  if (!t) return '';
  t = t.replace(ITS_OWN_SUBJECT_ALONE, '').replace(ITS_OWN_SUBJECT, '').trim();
  const first = t.split(/\s+/)[0] ?? '';
  const keepsItsCapital = /^I(?:['’].*)?$/.test(first) || /^[A-Z]{2,}\b/.test(first) || /^[A-Z][a-z]*[A-Z0-9]/.test(first) || /\d/.test(first);
  return keepsItsCapital || !/^[A-Z]/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1);
}
