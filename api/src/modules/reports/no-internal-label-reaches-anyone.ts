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
const A_WHOLE_LABEL = /^(?:[Tt]he initiator|[Pp]articipants? [A-Z])$/;
const ONE_LETTER = /\b[Pp]articipants? ((?:[A-Z](?:, | and |, and )?)+)\b/;

export interface WhoIsReading {
  viewerParticipantId: string | null;
  viewerIsLead: boolean;
  peersAreNamed: boolean;
  /**
   * THE READER'S OWN LABEL IS "YOU" (request 101 d). Without it, the reader's own label became their
   * own name, so Rukia read about herself "Rukia Otieno makes a decision on the discount." on her own
   * session report. Only where the reader is that very person in the check-in: an admin who set it up
   * is never "you" for the lead. Asked for by the report reads; the other callers keep the name.
   */
  readerIsYou?: boolean;
}

/** The words for each label, for this reader. */
export function whatEachLabelIsCalled(parties: LabelParty[], reader: WhoIsReading): Map<string, string> {
  const labels = labelsForParties(parties ?? []);
  const asWhom = readsWithNamesOf({ viewerIsLead: reader.viewerIsLead, viewerParticipantId: reader.viewerParticipantId, parties: parties ?? [] });
  const visible = namesVisibleTo(asWhom, parties ?? [], reader.peersAreNamed);
  const viewerLabel = asWhom ? labels.get(asWhom) ?? null : null;
  const plain = plainWordsByPerson(parties ?? [], visible, viewerLabel);
  const out = new Map<string, string>();
  for (const [id, label] of labels) {
    const isTheReader = !!reader.readerIsYou && !!reader.viewerParticipantId && id === reader.viewerParticipantId;
    out.set(label.toLowerCase(), isTheReader ? 'you' : visible.get(label) ?? plain.get(id) ?? 'a colleague');
  }
  /* And each person's address, said the same way: never an address as a name (Hafsah, 28 Sep 2026). */
  for (const p of parties ?? []) {
    const label = labels.get(p.id);
    const said = (label && visible.get(label)) || plain.get(p.id) || 'a colleague';
    for (const addr of [p.email, p.user?.email]) {
      if (!addr || !addr.includes('@')) continue;
      out.set(`@${addr.trim().toLowerCase()}`, said);
      /* And the front of it, which a model writes when it is handed an address: "zawadi.u8". */
      const local = addr.trim().toLowerCase().split('@')[0];
      const unnamed = !(label && visible.get(label));
      const looksLikeAWord = /^[a-z]+$/.test(local);
      const worthCatching = looksLikeAWord ? unnamed && local.length >= 4 && !A_ROLE_ADDRESS.test(local) : true;
      /* An address whose front is a word of what the person is called here ("colleague@...", said
         "a colleague") is not caught: putting the words in for themselves read "A a colleague". */
      const aWordOfWhatTheyAreCalled = said.toLowerCase().split(/\s+/).includes(local);
      if (local.length >= 3 && worthCatching && !aWordOfWhatTheyAreCalled) out.set(`~${local}`, said);
    }
  }
  return out;
}

const startsASentence = (whole: string, at: number) => {
  const before = whole.slice(0, at);
  return !before.trim() || /(?:[.!?]["')\]]?\s|\n)\s*$/.test(before);
};
const withACapital = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const andList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** A mailbox that names a job, not a person; its front is an ordinary word and is left in a sentence. */
const A_ROLE_ADDRESS = /^(info|sales|team|admin|hello|support|office|contact|hr|finance|ops|accounts|jobs|careers|help|mail|people|staff|all|everyone)$/;
const AN_ADDRESS = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** A participant's address where a name belongs becomes what this reader may call them. Any other address is left. */
export function withoutAddressesAsNames(text: string, called: Map<string, string>): string {
  if (!text) return text;
  /* Each replacement is held as a marker first, so the repeats are decided in the order they are read. */
  const held: string[] = [];
  const hold = (said: string) => { held.push(said); return `\u0001${held.length - 1}\u0002`; };
  let out = text;
  if (text.includes('@')) {
    out = out.replace(AN_ADDRESS, (addr) => {
      const said = called.get(`@${addr.toLowerCase()}`);
      return said ? hold(said) : addr;
    });
  }
  /* The front of an address on its own, in any case: "zawadi.u8", "Zawadi.u8". */
  for (const [k, said] of called) {
    if (k[0] !== '~') continue;
    const local = k.slice(1).replace(/[.+*?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`(?<![\\w.@+-])${local}(?![\\w@])`, 'gi'), () => hold(said));
  }
  if (!held.length) return out;
  /* The same unnamed person twice in one text is "the same colleague" the second time, never "another"
     (which only ever means somebody else). A named person is simply named again. */
  const seen = new Set<string>();
  return out.replace(/\u0001(\d+)\u0002/g, (_m, i: string, offset: number, whole: string) => {
    let said = held[Number(i)];
    if (/colleague$/i.test(said)) {
      if (seen.has(said.toLowerCase())) {
        const m = said.match(/^(a|one|another|a (?:\w+)) colleague$/i);
        said = !m ? said : /^(a|one)$/i.test(m[1]) ? 'the same colleague' : /^another$/i.test(m[1]) ? 'that other colleague' : `that ${m[1].slice(2)} colleague`;
      }
      seen.add(held[Number(i)].toLowerCase());
    }
    return startsASentence(whole, offset) ? withACapital(said) : said;
  });
}

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
  }).replace(/\b([Yy])ou's\b/g, (_m, y: string) => `${y}our`);
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
    if (typeof v === 'string') return youTakesItsVerb(withoutAddressesAsNames(withoutInternalLabels(v, called), called));
    if (v instanceof Date || v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(walk);
    const out: Record<string, any> = {};
    /* A label as a key is a label on the wire too: engagement.sessionCounts, pictureConfidence and
       specificitySignal were keyed "Participant A" (read live on run-16, 28 Sep 2026). A key that is a
       label becomes the same words as the text. Nothing on the screens looks these up by label. */
    for (const [k, x] of Object.entries(v)) {
      const key = typeof k === 'string' && A_WHOLE_LABEL.test(k) ? withoutInternalLabels(k, called) : k;
      /* A field that is an address by design stays one, and an id is a handle, not a sentence. */
      out[key in out ? k : key] = /^(email|address|replyTo|to)$/i.test(k) || /^id$|Ids?$/.test(k) ? x : walk(x);
    }
    return out;
  };
  return walk(value);
}
