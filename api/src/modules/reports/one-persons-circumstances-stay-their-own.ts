/**
 * ONE PERSON'S CIRCUMSTANCES NEVER REACH ANOTHER, WHERE PEOPLE DO NOT SEE EACH OTHER (decision 75, item 14).
 *
 * Read on the loans run (run-23): Sunday, a borrower in a cohort where people do not see each other, was served
 * "A sixth colleague received a tricycle for a business. The tricycle was stolen, so the sixth colleague has no
 * income from it." in the shared picture, its lines and the board's "what the answers say". The name was gone,
 * the circumstance was not: in a cohort of eight borrowers from one programme, a stolen tricycle in Jos names
 * the man as surely as his name would.
 *
 * Hafsah, 2 October 2026: "In a check-in where people do not see each other, one person's circumstances never
 * reach another." So for a participant in such a check-in, the shared picture carries only counts and patterns
 * across people ("All nine people have answered.", "A common experience was a delay between receiving the asset
 * and generating income."), never a sentence about one colleague. The reader's own sentences stay ("Your goal
 * was ..."), and so do the lead's, who runs it and is named to everybody.
 *
 * Applied where every report read is served, after names are put in (ReportsService.asItWasShared), so the board,
 * which takes the report through the same door, follows. A sentence is about one colleague when it calls them
 * what the naming rule calls somebody the reader may not name ("a colleague", "a sixth colleague", "the same
 * colleague"), or names one of them outright. "Colleagues", plural, is people across the group, and stays.
 */

/** "a colleague", "the sixth colleague", "a colleague's": one person the reader may not name. Never "colleagues". */
const ONE_COLLEAGUE = /\bcolleague\b(?!s)/i;

/*
 * ONE OF THEM WITHOUT A NAME OR THE WORD "COLLEAGUE" (run-25, loans). Sunday read "One participant's tricycle was
 * stolen in the fourth month, halting that business." and "Another participant never received the grinding machine
 * they were promised", and his own guide told him to take seriously that "for another person, the problem was not
 * just a delay in income but that the business asset itself was never delivered". In a cohort of eight borrowers,
 * each is one person's circumstance, as plainly as a name. So "one participant", "another borrower", "a single
 * recipient", "the other member", "that participant" and their like are one of them too. Plural words stay: "five
 * participants", "other participants", "most borrowers" are people across the group.
 *
 * "Person" alone is too common a word in the product's own sentences ("backed by what another person said, a
 * document, or a record", "could come to depend on one person"), so it counts only where it is somebody's: "one
 * person's", "another person's", "for another person,", "another person never ...".
 */
const ONE_OF_THEM_UNNAMED = new RegExp(
  [
    String.raw`\b(?:one|another|a\s+single|the\s+other|a\s+fellow|that|this|a)\s+(?:other\s+)?(?:participant|borrower|recipient|respondent|team\s+member|teammate|trader|beneficiary|individual|business\s+owner)\b(?!s)`,
    String.raw`\bone\s+of\s+the\s+(?:other\s+)?(?:participants|borrowers|recipients|respondents|beneficiaries|team\s+members|members|people|businesses)\b`,
    String.raw`\b(?:one|another|the\s+other)\s+person['’]s\b`,
    String.raw`\bfor\s+(?:one|another)\s+person\b`,
    String.raw`\b(?:one|another)\s+person\s+(?:has|had|was|is|never|lost|did|does|cannot|could\s+not|received|got)\b`,
  ].join('|'),
  'i',
);

/* The reader's own sentence, even where it mentions somebody: "You are waiting on a colleague for the stock." But
   not one that puts them beside somebody: "You and a colleague both said ...". */
const THE_READERS_OWN = /^\s*(?:you|your)\b(?!\s+and\b)/i;

function sentencesKeepingSpace(text: string): string[] {
  const out: string[] = [];
  let at = 0;
  for (const m of text.matchAll(/[.!?]+["”’)\]]*(?:[ \t]+|(?=\n)|$)|\n+/g)) {
    const end = m.index! + m[0].length;
    if (end > at) out.push(text.slice(at, end));
    at = end;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

export interface TheOthers {
  /** Names of the other people in it, other than the reader and the lead, as they might appear in served text. */
  names: string[];
  /**
   * The lead's names (full, given), so the lead's own aim stays in the shared picture. When not given, they are read
   * off the served report's own list of who took part (`engagement.parties`): whoever is there who is neither the
   * reader ("You") nor one of the others.
   */
  lead?: string[];
}

/*
 * RUN-26, LOANS: THE WALL HELD BY WHAT IT CAUGHT, AND IT DID NOT HOLD. Every wording above was caught, and Sunday still
 * read, in his shared picture and its lines, "The pump was installed in the second month after a delay, and the
 * business has been operating since the third month." (Blessing's), "The supplier never delivered the machine."
 * (Musa's) and "The tricycle was stolen in the fourth month." (Yakubu's). The stored picture gives each borrower a
 * paragraph; the paragraph's first sentence has the name and the wall took it, and the second sentence has no name,
 * no "one participant", nothing to catch, and is still that one man's story.
 *
 * So in the shared picture and its lists the wall now holds by what it KEEPS. A sentence stays only when it is:
 *   1. about the reader: it says "you" or "your", or it carries on a paragraph that began with the reader's own
 *      sentence (in the reader's own guide, written in their voice, "I", "me" and "my" are theirs too);
 *   2. clearly about several people: a count of two or more people ("five of the eight recipients", "two cases"),
 *      or "most", "several", "all", "both", "many", "nobody", "the borrowers", "the cohort", "a common pattern",
 *      "they disagree";
 *   3. the lead's own aim, or the shared purpose: the programme, its model, its process, its policy, its terms or
 *      schedule, the plan, the goal. A sentence naming the lead stays only as their aim, never as their doubt or
 *      their view of the people in it ("Amaka wants to understand if there is an issue with the selection process
 *      for loan qualification" is her view of who should have had a loan, and is not served to a borrower).
 * Everything else goes, whatever its words. The catch above still runs first and is never weakened.
 */

/** "you", "your": the reader's own, after names are put in. */
const THE_READER = /\b(?:you|your|yours|yourself)\b/i;
/** In the reader's own guide, written in their own voice. */
const THE_READER_IN_THEIR_OWN_VOICE = /\b(?:I|me|my|mine|myself)\b/;

const PEOPLE_PLURAL = String.raw`(?:people|persons|participants|borrowers|recipients|respondents|members|colleagues|teammates|traders|workers|staff|employees|beneficiaries|owners|businesses|households|families|cases|applicants|hires|managers|engineers|agents|reps|teams|sites|shops|branches|of\s+them|of\s+us|of\s+you)`;
const A_COUNT = String.raw`(?:two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|hundred|\d+)`;
const SEVERAL_PEOPLE = new RegExp(
  [
    /* a count of two or more people: "two cases", "five of the eight recipients", "all nine people", "3 borrowers" */
    String.raw`\b${A_COUNT}\s+(?:of\s+(?:the\s+)?(?:${A_COUNT}\s+)?)?(?:[a-z-]+\s+){0,2}${PEOPLE_PLURAL}\b`,
    /* words for several, or for everybody */
    String.raw`\b(?:most|several|many|multiple|various|both|all|everyone|everybody|nobody|none|no\s+one|each|every|some\s+of|a\s+few|few|majority|half|those\s+who|others|anyone|we|us|our|they\s+all|all\s+of\s+them)\b`,
    /* the group, by what they are called */
    String.raw`\b(?:the|other|these|those)\s+(?:[a-z-]+\s+)?${PEOPLE_PLURAL}\b`,
    String.raw`\b(?:the\s+cohort|the\s+group|the\s+team|the\s+room)\b`,
    /* what only several people can do */
    String.raw`\b(?:disagree|disagreed|agree|agreed|agreement|differ|differed|common|shared|in\s+common|each\s+other|one\s+another|between\s+them)\b`,
  ].join('|'),
  'i',
);

/** The shared purpose: the programme and how it is run, never one person's part in it. */
const THE_SHARED_PURPOSE = /\b(?:programme|program|scheme|cohort|policy|policies|process|processes|model|terms|schedule|plan|purpose|aim|goal|goals|target|targets|objective|offering|package|loan|loans|rules?|design|organisation|organization|company|department)\b/i;

/** What a lead says when it is a doubt about, or a view of, the people in it, not an aim. */
const THE_LEADS_DOUBT_OR_VIEW = /\b(?:understand|understanding|whether|if|issue|issues|problem|problems|concern|concerned|worry|worried|worries|doubt|doubts|suspect|suspects|unsure|believe|believes|thinks?|feels?|blame|blames|fault|selection|qualif\w*|should\s+not\s+have)\b/i;

/** The lead's own aim: what they want, plan or set for the work. */
const AN_AIM = /\b(?:wants?|aims?|plans?|planned|expects?|expected|hopes?|intends?|intended|designed|set|sets|goal|purpose|model|focus(?:es)?|states?\s+that)\b/i;

function named(sentence: string, names: string[]): boolean {
  return names.some((n) => n && n.length > 1 && new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(sentence));
}

type TheKinds = { others: TheOthers; lead: string[]; ownVoice: boolean };

/*
 * SOMEBODY ELSE, NAMED BY THEIR ROLE OR NOT NAMED AT ALL (privacy sweep, second review, finding 1, still open on earlier sessions and the rounds).
 * The stored texts of earlier sessions describe people by what they do: "Outbound Hire: 'I made forty calls this week.'", "One hire
 * (inbound) is closing deals, has proactively shared a demo script", and a borrower's own words with no name on them ("I took a loan for
 * battery cages ..."). A name is never found in them, and a word such as "shared" or "loan" made the whole sentence look like a pattern
 * or the programme. So a sentence that is one person's, by role or in the first person, is not kept, whatever else it says; only the
 * reader's own sentences, the lead's aim and what is plainly about several people stay.
 */
const ONE_PERSON_BY_ROLE_WORD = /\b(?:one|another|that|this|a|an|the)\s+(?:[a-z-]+\s+){0,2}(?:hire|employee|worker|teammate|rep|salesperson|engineer|agent|apprentice|intern|recruit)\b(?!s)/i;
/* "Outbound Hire: ..." and "Partnerships Hire (3 sessions): ...": a quote with a role in front of it */
const ONE_PERSON_BY_ROLE_LABEL = /^[\s"'“‘]*(?!(?:[Ii]nitiator|[Ll]ead|[Oo]rganis(?:er)?|[Oo]rganiz(?:er)?)\b)[A-Z][\w-]*(?:\s[A-Z][\w-]*){0,2}(?:\s*\([^)]{1,30}\))?\s*:\s*["'“‘]/;
const ONE_PERSON_BY_ROLE = { test: (x: string) => ONE_PERSON_BY_ROLE_WORD.test(x) || ONE_PERSON_BY_ROLE_LABEL.test(x) };
const A_LEADS_LABEL = /^[\s"'“‘]*(?:initiator|the\s+lead|lead|organiser|organizer)\b/i;

/** Which of the three a sentence is, if any. */
function whatItIsAbout(sentence: string, k: TheKinds): 'reader' | 'several' | 'purpose' | null {
  const s = sentence.trim().replace(/^[;:,\s]+/, '');
  if (!s) return null;
  /* The lead's sentence stays only as their aim. */
  /* The lead is named to everybody, so what the lead says or does stays, as it always has, except their doubt about, or
     view of, the people in it, which a participant never reads (run-26: "Amaka wants to understand if there is an issue
     with the selection process for loan qualification"). */
  if (named(s, k.lead)) return THE_LEADS_DOUBT_OR_VIEW.test(s) ? null : 'purpose';
  if (THE_READER.test(s) || (k.ownVoice && THE_READER_IN_THEIR_OWN_VOICE.test(s))) return 'reader';
  if (ONE_PERSON_BY_ROLE.test(s) && !A_LEADS_LABEL.test(s)) return null;
  if (!k.ownVoice && THE_READER_IN_THEIR_OWN_VOICE.test(s) && !A_LEADS_LABEL.test(s)) return null;
  if (SEVERAL_PEOPLE.test(s)) return 'several';
  if (THE_SHARED_PURPOSE.test(s)) return 'purpose';
  return null;
}

/**
 * RUN-29, LOANS: A SENTENCE THAT IS THE READER'S IN ITS FIRST HALF AND OTHER BORROWERS' IN ITS SECOND. Sunday's guide read "Take
 * seriously that your own problem was about timing, but for others, the problem is that they do not have the asset at all,
 * either because it never arrived or because it was stolen." The word "your" kept the whole sentence, and the second half
 * describes what happened to the other borrowers. Where a reader's sentence turns to the others, only the reader's half is kept.
 */
const A_TURN_TO_THE_OTHERS = /\s*[,;]?\s*(?:(?:but|while|whereas|and|yet)\s+)?(?:for|with|among|in the case of|as for)\s+(?:all\s+)?(?:the\s+)?(?:others|everyone else|everybody else|the rest|other\s+(?:people|persons|borrowers|participants|recipients|members|colleagues|teammates))\b/i;

export function withoutTheTurnToTheOthers(sentence: string): string {
  const m = A_TURN_TO_THE_OTHERS.exec(sentence);
  if (!m || m.index === 0) return sentence;
  const before = sentence.slice(0, m.index).replace(/[\s,;]+$/, '');
  const trailing = /\s*$/.exec(sentence)![0];
  return before ? `${before}.${trailing}` : sentence;
}

/**
 * The sentences of a piece of the shared picture that are the reader's, several people's, or the lead's aim and the
 * shared purpose. A sentence with nothing of its own to say who it is about keeps the paragraph's reader: a paragraph
 * that began with the reader's own sentence carries on being theirs.
 */
function onlyWhatIsKept(text: string, k: TheKinds): string {
  const out: string[] = [];
  let paragraphIsTheReaders = false;
  let atParagraphStart = true;
  for (const s of sentencesKeepingSpace(text)) {
    if (!s.trim()) { out.push(s); atParagraphStart = true; continue; }
    if (/^\n+$/.test(s)) { out.push(s); atParagraphStart = true; continue; }
    if (aboutOneOfThem(s, k.others)) { if (atParagraphStart) paragraphIsTheReaders = false; atParagraphStart = /\n\s*$/.test(s); continue; }
    const about = whatItIsAbout(s, k);
    if (atParagraphStart) paragraphIsTheReaders = about === 'reader';
    const keep = about !== null || (paragraphIsTheReaders && !atParagraphStart);
    if (keep) out.push(about === 'reader' || (about === null && paragraphIsTheReaders) ? withoutTheTurnToTheOthers(s) : s);
    atParagraphStart = /\n\s*$/.test(s);
  }
  return out.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Whether every sentence of a piece of text is kept. */
function everySentenceKept(text: string, k: TheKinds): boolean {
  const norm = (x: string) => x.replace(/\s+/g, ' ').trim();
  return norm(onlyWhatIsKept(text, k)) === norm(text);
}

/**
 * The parts of a served report or board that are the shared picture and its lists. The rest (the reader's own rows,
 * the product's own notes about the record, coaching, the reader's own read) is never another person's circumstance
 * and is left to the catch above.
 */
const THE_PICTURE_AND_ITS_LISTS = new Set([
  'sharedPicture', 'theOpening', 'sharedPictureLines', 'agreements', 'centralQuestion', 'networkPicture', 'divergences',
  'postReportGuide', 'finalSynthesis',
  /* the session report's own copies of the picture and what it rests on, and the lists of what stands (second review, finding 1) */
  'writtenPicture', 'restsOn', 'settled',
  /* the board's own copies of them */
  'whatTheAnswersSay', 'divergence', 'latestSummary',
]);
/* Inside the picture: who said it, the marks, and the product's own words about a row, never a circumstance. */
const NOT_A_CIRCUMSTANCE = /^(?:who|participantLabel|label|whoSeesIt|markSays|knownSays|nextSays|figureIs|on|at|tone|value)$/;

const LIST = Symbol('a list the wall kept');

/**
 * THE LEAD'S NAMES, ALWAYS PASSED (run-26 review). The wall cannot keep the lead's aim without knowing who the lead
 * is, and it must never guess from how a sentence begins (two capitalised words were read as the lead's, so "Mr
 * Danjuma's machine never arrived." and "Kaduna Grinding Works never delivered the machine." were kept for Sunday).
 * Every caller that asks the report's door for text hands the lead's names in on the report, under this key, with
 * `askTheReportsDoor`; the wall reads them and takes the key out, so it is never served.
 */
export const THE_LEADS_NAMES = 'theLeadsNames';

/** The lead's full and given names, from the check-in's own people. */
export function theLeadsNamesOf(participants: any[] | null | undefined, leadUserId: string | null | undefined): string[] {
  const out = new Set<string>();
  for (const p of participants ?? []) {
    if (!p || !(p.partyType === 'INITIATOR' || (!!leadUserId && p.userId === leadUserId))) continue;
    const first = (p.user?.firstName ?? '').trim();
    const full = [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || (p.nameGiven ?? '').trim();
    if (full) out.add(full);
    if (first.length > 2) out.add(first);
  }
  return [...out];
}

/**
 * THE ONE WAY TO ASK THE REPORT'S DOOR FOR TEXT, from the grounds page, the board and the blocker trace: the lead's
 * names and the people go in with every ask, and the key that carries them is taken back out of what is served.
 */
export function askTheReportsDoor(
  reports: { theReportAsItWasShared: (ground: any, viewerParticipantId: string | null, viewerIsLead: boolean) => any },
  ground: { initiatorId?: string | null; participants?: any[] | null; report?: any } & Record<string, any>,
  viewerParticipantId: string | null,
  viewerIsLead: boolean,
): any {
  const leads = theLeadsNamesOf(ground.participants, ground.initiatorId);
  const shared = reports.theReportAsItWasShared(
    { ...ground, participants: ground.participants ?? [], report: ground.report ? { ...ground.report, [THE_LEADS_NAMES]: leads } : ground.report },
    viewerParticipantId,
    viewerIsLead,
  );
  if (shared && typeof shared === 'object' && THE_LEADS_NAMES in shared) { const { [THE_LEADS_NAMES]: _gone, ...rest } = shared; return rest; }
  return shared;
}

/** Peeled off the served report, when the caller did not say who the lead is. */
function theLeadFromTheServed(served: any, others: TheOthers): string[] {
  const find = (v: any, depth: number): any[] => {
    if (!v || typeof v !== 'object' || depth > 4) return [];
    if (Array.isArray(v?.engagement?.parties)) return v.engagement.parties;
    for (const x of Object.values(v)) { const f = find(x, depth + 1); if (f.length) return f; }
    return [];
  };
  const parties: any[] = find(served, 0);
  const out = new Set<string>();
  for (const p of parties) {
    const who = typeof p?.who === 'string' ? p.who.trim() : '';
    if (!who || p?.label === 'You' || named(who, others.names)) continue;
    out.add(who);
    const first = who.split(/\s+/)[0];
    if (first && first.length > 2) out.add(first);
  }
  return [...out];
}

/**
 * THE SHARED PICTURE, KEPT BY WHAT IT MAY HOLD. See the note above. Lists lose a whole item when any of its sentences
 * is not kept, so nothing is served half-emptied, and a list of marks beside it ("agreementMarks", "evidenceMarks")
 * loses the same places. A line of the picture is kept exactly when the picture keeps its sentence.
 */
export function onlyWhatTheReaderMayKnowOfTheOthers<T>(served: T, others: TheOthers): T {
  const passed = Array.isArray((served as any)?.[THE_LEADS_NAMES]) ? ((served as any)[THE_LEADS_NAMES] as any[]).filter((x) => typeof x === 'string' && x.trim()) : [];
  const lead = others.lead?.length ? others.lead : passed.length ? passed : theLeadFromTheServed(served, others);
  const base: TheKinds = { others, lead, ownVoice: false };
  const norm = (x: string) => x.replace(/^[;:,\s]+/, '').replace(/\s+/g, ' ').trim();
  const isAList = (r: any): r is { keptAt: number[]; list: any[] } => !!r && typeof r === 'object' && (r as any)[LIST] === true;

  const walk = (v: any, key: string | undefined, k: TheKinds): any => {
    if (typeof v === 'string') return key && (NOT_TEXT.test(key) || NOT_A_CIRCUMSTANCE.test(key)) ? v : onlyWhatIsKept(v, k);
    /* A row with a "said" (who said it, and how many) is decided by that count, which the catch above has already read:
       one other person alone is gone, the reader's, the lead's and several people's stay, as they were written. */
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && v.said && typeof v.said === 'object' && !Array.isArray(v.said)) return v;
    if (Array.isArray(v)) {
      const keptAt: number[] = [];
      v.forEach((item, i) => {
        if (item && typeof item === 'object' && !Array.isArray(item) && (item as any).said && typeof (item as any).said === 'object') { keptAt.push(i); return; }
        if (typeof item === 'string') { if (everySentenceKept(item, k)) keptAt.push(i); return; }
        if (!item || typeof item !== 'object' || Array.isArray(item)) { keptAt.push(i); return; }
        const strings = Object.entries(item).filter(([kk, x]) => typeof x === 'string' && !NOT_TEXT.test(kk) && !NOT_A_CIRCUMSTANCE.test(kk)) as [string, string][];
        if (strings.every(([, x]) => everySentenceKept(x, k))) keptAt.push(i);
      });
      return { [LIST]: true, keptAt, list: keptAt.map((i) => { const r = walk(v[i], key, k); return isAList(r) ? r.list : r; }) };
    }
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const out: any = {};
      const keptAtFor: Record<string, number[]> = {};
      for (const [kk, x] of Object.entries(v)) {
        const r = walk(x, kk, kk === 'postReportGuide' ? { ...k, ownVoice: true } : k);
        if (isAList(r)) { keptAtFor[kk] = r.keptAt; out[kk] = r.list; } else out[kk] = r;
      }
      /* "agreements" and "agreementMarks", "evidence" and "evidenceMarks": the marks follow their sentences. */
      for (const kk of Object.keys(keptAtFor)) {
        const marks = `${kk.replace(/s$/, '')}Marks`;
        if (marks !== kk && Array.isArray((v as any)[marks]) && (v as any)[marks].length === (v as any)[kk].length) out[marks] = keptAtFor[kk].map((i) => (v as any)[marks][i]);
      }
      return out;
    }
    return v;
  };

  const top = (v: any): any => {
    if (Array.isArray(v)) return v.map(top);
    if (!v || typeof v !== 'object' || v instanceof Date) return v;
    const out: any = {};
    for (const [kk, x] of Object.entries(v)) {
      if (kk === THE_LEADS_NAMES) continue;
      if (THE_PICTURE_AND_ITS_LISTS.has(kk)) {
        const r = walk(x, kk, kk === 'postReportGuide' ? { ...base, ownVoice: true } : base);
        out[kk] = isAList(r) ? r.list : r;
      } else out[kk] = top(x);
    }
    /* The picture's lines, kept exactly as the picture keeps their sentences. */
    if (typeof out.sharedPicture === 'string' && Array.isArray((v as any).sharedPictureLines)) {
      const kept = norm(out.sharedPicture);
      out.sharedPictureLines = ((v as any).sharedPictureLines as any[]).filter((l) => typeof l?.text === 'string' && norm(l.text) && kept.includes(norm(l.text)));
    }
    /* The marks beside the agreements follow them. */
    if (Array.isArray((v as any).agreements) && Array.isArray((v as any).agreementMarks) && (v as any).agreementMarks.length === (v as any).agreements.length) {
      const keptAt = ((v as any).agreements as any[]).map((a, i) => (typeof a !== 'string' || everySentenceKept(a, base) ? i : -1)).filter((i) => i >= 0);
      out.agreementMarks = keptAt.map((i) => (v as any).agreementMarks[i]);
    }
    return out;
  };
  return top(served);
}

/** How many of the picture's sentences a reader keeps, for the record of what the wall took. */
export function theShareOfThePictureKept(before: any, after: any): { kept: number; of: number } {
  const count = (v: any, inPicture: boolean, key?: string): number => {
    if (typeof v === 'string') return inPicture && !(key && (NOT_TEXT.test(key) || NOT_A_CIRCUMSTANCE.test(key))) ? sentencesKeepingSpace(v).filter((s) => s.trim()).length : 0;
    if (Array.isArray(v)) return v.reduce((n, x) => n + count(x, inPicture, key), 0);
    if (v && typeof v === 'object') return Object.entries(v).reduce((n, [kk, x]) => n + count(x, inPicture || THE_PICTURE_AND_ITS_LISTS.has(kk), kk), 0);
    return 0;
  };
  return { kept: count(after, false), of: count(before, false) };
}

export function aboutOneOfThem(sentence: string, others: TheOthers, namesOnly = false): boolean {
  if (!namesOnly && THE_READERS_OWN.test(sentence)) return false;
  if (!namesOnly && ONE_COLLEAGUE.test(sentence)) return true;
  if (!namesOnly && ONE_OF_THEM_UNNAMED.test(sentence)) return true;
  return others.names.some((n) => n.length > 1 && new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(sentence));
}

/**
 * A piece of text without any sentence about one of the others. Paragraph breaks are kept; empty paragraphs go.
 * `namesOnly`, for a turn in a conversation: only a sentence naming one of them, since "a colleague" there is the
 * product's own way of asking about somebody the person has not named.
 */
export function withoutSentencesAboutOneOfThem(text: string, others: TheOthers, opts: { namesOnly?: boolean } = {}): string {
  const kept = sentencesKeepingSpace(text).filter((s) => !(s.trim() && aboutOneOfThem(s, others, !!opts.namesOnly)));
  return kept.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* Fields that are never about the others and never sentences: identifiers, marks, dates and the like. */
const NOT_TEXT = /^(?:id|groundId|promptVersionId|mark|marks?Behind|markSays|figureIs|sharedAs|releasedAt|createdAt|updatedAt|participantId|ownerParticipantId|kind|type|status|key)$/;

/**
 * A ROW ONE OTHER PERSON ALONE SAID (run-25, loans). Sunday's board, under what the borrowers already have, read "A
 * tricycle business that has generated enough revenue to make all repayments on time." and "A borehole pump
 * business that earns roughly N25,000 a week". Each row carried `said: { who: [], howMany: 1 }`: one person, whose
 * name the names rule had taken out, and whose business and takings were still there. With eight borrowers and two
 * tricycles, that row is the man. A row one person said is theirs alone; a row said by several is a pattern and
 * stays. The reader's own row ("You") stays, and so does the lead's, who is named to everybody.
 */
function saidByOneOfThemAlone(item: Record<string, any>, others: TheOthers): boolean {
  const said = item?.said;
  if (!said || typeof said !== 'object' || Array.isArray(said)) return false;
  const who: string[] = Array.isArray(said.who) ? said.who.filter((w: any) => typeof w === 'string' && w.trim()) : [];
  const howMany = typeof said.howMany === 'number' ? said.howMany : who.length;
  if (howMany !== 1) return false;
  if (!who.length) return true;
  /* Their own, or somebody the reader may name (the lead): not one of the others. */
  return who.every((w) => aboutOneOfThem(w, others));
}

/**
 * THE SERVED REPORT, FOR A PARTICIPANT WHERE PEOPLE DO NOT SEE EACH OTHER. Every string loses its sentences about one
 * of the others; a list loses an item whose own sentence is about one of them, so a line, a "what went wrong" row
 * or a difference between two people is not served half-emptied.
 */
export function onlyCountsAndPatternsAboutTheOthers<T>(served: T, others: TheOthers): T {
  const walk = (v: any, key?: string): any => {
    if (typeof v === 'string') return key && NOT_TEXT.test(key) ? v : withoutSentencesAboutOneOfThem(v, others);
    if (Array.isArray(v)) {
      return v
        .filter((item) => {
          if (typeof item === 'string') return true;
          if (!item || typeof item !== 'object') return true;
          /* An item said by one other person alone is that person's circumstance, whatever its words (below). */
          if (saidByOneOfThemAlone(item, others)) return false;
          /* An item is dropped whole where any of its own sentences is about one of them. */
          return !Object.entries(item).some(([k, x]) => typeof x === 'string' && !NOT_TEXT.test(k) && sentencesKeepingSpace(x).some((s) => s.trim() && aboutOneOfThem(s, others)));
        })
        .map((item) => walk(item, key))
        .filter((item) => !(typeof item === 'string' && !item.trim()));
    }
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const out: any = {};
      /* A count or a read kept per person, keyed by what they are called ("A sixth colleague": 9), goes too. */
      for (const [k, x] of Object.entries(v)) if (!aboutOneOfThem(k, others)) out[k] = walk(x, k);
      return out;
    }
    return v;
  };
  /* And then the shared picture and its lists keep only what the reader may know of the others (run-26, below). */
  return onlyWhatTheReaderMayKnowOfTheOthers(walk(served), others);
}

/**
 * THE LEAD'S OWN LINE ON A RECORD ROW, FOR A PARTICIPANT WHERE PEOPLE DO NOT SEE EACH OTHER (run-26 review). Every record
 * is owned by the person who said it, so a line by Amaka about Yakubu's tricycle was owned by Amaka, kept for every
 * borrower as hers, and served word for word. It goes through the same wall as the shared picture: a sentence about one
 * other person is dropped; counts, shared aims and what the lead says of her own work stay. A line the lead says in her
 * own voice ("I want twelve shops signed by June.") stays unless it is a doubt about, or a view of, the people in it.
 * Returns what may be read, which is empty when none of it may; the caller then leaves the row out.
 */
export function theLeadsLineAsAParticipantMayRead(text: string, others: TheOthers & { lead: string[] }): { kept: string; whole: boolean } {
  const k: TheKinds = { others, lead: others.lead, ownVoice: false };
  const out: string[] = [];
  for (const sentence of sentencesKeepingSpace(text)) {
    if (!sentence.trim()) { out.push(sentence); continue; }
    if (aboutOneOfThem(sentence, others)) continue;
    const s = sentence.trim();
    const inHerOwnVoice = THE_READER_IN_THEIR_OWN_VOICE.test(s) && !THE_LEADS_DOUBT_OR_VIEW.test(s);
    if (whatItIsAbout(sentence, k) !== null || inHerOwnVoice) out.push(sentence);
  }
  const kept = out.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const norm = (x: string) => x.replace(/\s+/g, ' ').trim();
  return { kept, whole: norm(kept) === norm(text) };
}
