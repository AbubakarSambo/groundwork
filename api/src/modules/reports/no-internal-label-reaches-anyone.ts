import { labelsForParties, namesVisibleTo, plainWordsByPerson, readsWithNamesOf, theVerbAgreesWithYouIn, type LabelParty } from './party-labels';

/**
 * NO INTERNAL LABEL REACHES ANYONE.
 *
 * Reports are written and stored with labels, "the initiator" and "Participant A", and names are
 * put in only when a report is served. Every read was meant to go through the name swap, and some
 * fields never did: the session report's atStake, settledBy, restsOn, positions and findings, and
 * the rounds' shared picture (screens request 54, 28 September 2026). Each fix so far has been one
 * more field added to one more read, and the next field added would miss again.
 *
 * So this is the last thing every board and report read does before it is served: any label still
 * in any string becomes what this reader may call that person - their name where this reader may
 * see it (namesVisibleTo), otherwise the same plain words every other surface uses, "a colleague",
 * "another colleague" (plainWordsByPerson). It does not replace the name swap, which also turns a
 * reader's own label into "you" and mends the verb; it catches what the swap never reached.
 * Nothing else in a string is touched: people's own words stay exactly as they wrote them.
 */
const A_LABEL = /\b(?:[Tt]he initiator|[Tt]he person who set this up|[Pp]articipants? ([A-Z])(?:(?:, | and |, and )([A-Z]))*)\b/g;
const ONE_LETTER = /\b[Pp]articipants? ((?:[A-Z](?:, | and |, and )?)+)\b/;

export interface WhoIsReading {
  viewerParticipantId: string | null;
  viewerIsLead: boolean;
  peersAreNamed: boolean;
}

/** The words for each label, for this reader. */
export function whatEachLabelIsCalled(parties: LabelParty[], reader: WhoIsReading): Map<string, string> {
  const labels = labelsForParties(parties ?? []);
  const asWhom = readsWithNamesOf({ viewerIsLead: reader.viewerIsLead, viewerParticipantId: reader.viewerParticipantId, parties: parties ?? [] });
  const visible = namesVisibleTo(asWhom, parties ?? [], reader.peersAreNamed);
  const viewerLabel = asWhom ? labels.get(asWhom) ?? null : null;
  const plain = plainWordsByPerson(parties ?? [], visible, viewerLabel);
  const out = new Map<string, string>();
  for (const [id, label] of labels) out.set(label.toLowerCase(), visible.get(label) ?? plain.get(id) ?? 'a colleague');
  return out;
}

const startsASentence = (whole: string, at: number) => {
  const before = whole.slice(0, at);
  return !before.trim() || /(?:[.!?]["')\]]?\s|\n)\s*$/.test(before);
};
const withACapital = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const andList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** One string with every label in it said the way this reader may read it. */
export function withoutInternalLabels(text: string, called: Map<string, string>): string {
  if (!text || !A_LABEL.test(text)) { A_LABEL.lastIndex = 0; return text; }
  A_LABEL.lastIndex = 0;
  const lead = called.get('the initiator') ?? 'the person who runs this check-in';
  return text.replace(A_LABEL, (m, _l, _l2, offset: number, whole: string) => {
    let said: string;
    if (/^the (initiator|person who set this up)$/i.test(m)) said = lead;
    else {
      const letters = (m.match(ONE_LETTER)?.[1] ?? '').split(/, and |, | and /).map((x) => x.trim()).filter(Boolean);
      said = andList(letters.map((l) => called.get(`participant ${l.toLowerCase()}`) ?? 'a colleague'));
    }
    return startsASentence(whole, offset) ? withACapital(said) : said;
  });
}

/**
 * AND "YOU" TAKES THE VERB THAT GOES WITH IT. "You is aiming to sign three shops" and "until you
 * sends it" were read live on the session report (screens requests 54 and 65): the swap to the
 * reader's own "you" had run where the verb was never mended. Only outside quotation marks, so a
 * person's own words stay exactly as they wrote them.
 */
export function youTakesItsVerb(text: string): string {
  if (!text || !/\byou\b/i.test(text)) return text;
  return text.split(/("[^"\n]*"|“[^”\n]*”)/).map((part, i) => (i % 2 ? part : theVerbAgreesWithYouIn(part))).join('');
}

/** Through everything a reader is served. Dates and non-strings are left as they are. */
export function withoutInternalLabelsIn<T>(value: T, called: Map<string, string>): T {
  const walk = (v: any): any => {
    if (typeof v === 'string') return youTakesItsVerb(withoutInternalLabels(v, called));
    if (v instanceof Date || v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(walk);
    const out: Record<string, any> = {};
    for (const [k, x] of Object.entries(v)) out[k] = walk(x);
    return out;
  };
  return walk(value);
}
