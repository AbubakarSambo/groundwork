import { apiClient } from './client';
import type { TheLeadsReveal, ThePeopleStepRules } from './anchorShapes';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : '/api/v1'

export interface ChatTurn { role: 'user' | 'assistant'; content: string }

export type EntryMessage = ChatTurn
export type EntryMode = 'something_new' | 'look_back' | 'look_forward' | 'both'

export interface ParticipantSession {
  inviteToken: string
  groundLabel: string
  initiatorName: string
  messages: EntryMessage[]
  completed: boolean
}

export interface EntryReport {
  whatGroundworkSaw: string
  yourRole?: string | null
  alignmentStatus: 'Unresolved' | 'Mixed' | 'Emerging' | 'Clear' | 'Aligned'
  alignmentBasis: string
  areasRequiringAlignment: { title: string; observation: string; whyItMatters: string; recommendedMove: string }[]
  alignmentReached: { title: string; note: string }[]
  honestClose: { aligned: string; open: string; revisit: string; risk: string }
  mentionedPeople: { name: string; context: string }[]
  /** W3. Named, described, and not invitable. See a-client-is-not-a-colleague.ts. */
  alsoCameUp?: { name: string; context: string }[]
  alsoCameUpNote?: string | null
  suggestedParties: { role: string; reason: string }[]
  /**
   * PIECE 8/9: THE LEAD'S REVEAL, "Help my team understand" (plan section 5, row 3;
   * docs/answers-from-engine.md, "Request 149 (1 of 6)", `TheLeadsReveal`). Served now, only on an
   * anchor draft's own report (`scenario === 'HELP_TEAM_UNDERSTAND'`) and only while
   * `release.anchorScenario` is on - the key is absent otherwise, never `undefined` with the switch
   * on. Present only for the lead: there is no other reader of a setup report, since it is read
   * before anybody else has joined. `carrying`, `whatTheTeamNeedsToUnderstand` and `seeingToday`
   * still read their "not written down yet" sentence until the seven fields are pulled from the
   * lead's words (a model step, request 149 missing (2)).
   */
  leadsReveal?: TheLeadsReveal | null
}

// ── Entry session storage ─────────────────────────────────────────────────────

const ENTRY_KEY = 'gw-entry-session'

type EntrySession = {
  mode: EntryMode
  messages: EntryMessage[]
  completed?: boolean
  firstMessage?: string
  inviteToken?: string
  inviteNote?: string
  participantEmail?: string
}

export const entryStorage = {
  save: (data: EntrySession) => {
    try { localStorage.setItem(ENTRY_KEY, JSON.stringify(data)) } catch {}
  },
  load: (): EntrySession | null => {
    try { const r = localStorage.getItem(ENTRY_KEY); return r ? JSON.parse(r) : null } catch { return null }
  },
  clear: () => localStorage.removeItem(ENTRY_KEY),
}

// ── Participant session storage ────────────────────────────────────────────────

const PARTICIPANT_KEY = 'gw-participant-session'

export const participantStorage = {
  save: (data: ParticipantSession) => {
    try { localStorage.setItem(PARTICIPANT_KEY, JSON.stringify(data)) } catch {}
  },
  load: (): ParticipantSession | null => {
    try { const r = localStorage.getItem(PARTICIPANT_KEY); return r ? JSON.parse(r) : null } catch { return null }
  },
  clear: () => localStorage.removeItem(PARTICIPANT_KEY),
}

// ── Streaming ─────────────────────────────────────────────────────────────────

/**
 * THE SAME SSE SHAPE THE CHECK-IN PAGE READS. `data:` blocks carry `{type:'delta',text}` while the
 * model is talking, then one `{type:'done', ...}` with exactly what the plain route would have
 * returned, then `[DONE]`. Setup is public, so no token travels.
 */
async function readEntryStream<T>(
  path: string,
  body: unknown,
  onDelta: (text: string) => void,
): Promise<T> {
  /*
   * THE TOKEN, WHEN THERE IS ONE, AND THESE ROUTES STAY OPEN WITHOUT IT.
   *
   * These are the only calls in the client that use `fetch` rather than `apiClient`, because they
   * read a stream - so they also missed the interceptor that attaches the session. That was
   * invisible until setup started reading who is signed in: the API asked for a user, the browser
   * never sent one, and a lead with four check-ins already running still met a stranger's setup.
   * The routes are @Public: no token is a fine answer, and the header is simply left off.
   */
  const token = (() => { try { return localStorage.getItem('token') } catch { return null } })()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  if (!res.ok || !res.body) throw new Error(`stream failed: ${res.status}`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let done: T | null = null
  let failure: string | null = null
  for (;;) {
    const { done: ended, value } = await reader.read()
    if (ended) break
    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''
    for (const block of blocks) {
      const line = block.split('\n').find(l => l.startsWith('data: '))
      if (!line) continue
      const data = line.slice(6)
      if (data === '[DONE]') continue
      try {
        const evt = JSON.parse(data)
        if (evt.type === 'delta') onDelta(evt.text)
        else if (evt.type === 'done') done = evt as T
        else if (evt.type === 'error') failure = evt.message
      } catch { /* ignore malformed keepalive lines */ }
    }
  }
  if (done) return done
  throw new Error(failure ?? 'stream ended without a reply')
}

export interface OnboardResult {
    reply: string;
    extracted: {
      mode?: string; initial?: string; whoInvolved?: string; decision?: string;
      /**
       * WHAT THEY ALREADY SAID ABOUT THEIR OWN ROLE. The model asks this FIRST, before anything about
       * the situation, and extracts it into a typed field. It was returned by the endpoint and absent
       * from this type, so the client could not see it and asked the same question a second time with
       * buttons - which reads, correctly, as not having been heard.
       */
      yourRole?: 'a_party' | 'setting_up_for_others';
      /**
       * ONE ENTRY PER INDIVIDUAL. `whoInvolved` is a free string and any string satisfies it, so
       * "My team" passed as an answer to who is involved and the per-person questions had no roster.
       * This is the countable version, and it is what decides whether the lead is warned.
       */
      peopleNamed?: string[];
      goals?: string[]; brief?: string;
      // What they actually said about rhythm and length. Absent when they did
      // not say - never guessed. GW-017.
      cadence?: 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ONE_TIME';
      timelineDays?: number;
    };
    ready: boolean;
    /**
     * Party path only. Setup can finish without a roster - blocking would just produce another
     * invented answer - but they are told, and they add the people afterwards.
     */
    needsPeople: boolean;
}

// ── Entry API ─────────────────────────────────────────────────────────────────

export const entryApi = {
  opener: (scenario?: string) =>
    apiClient.post<{ reply: string }>('/entry/opener', { scenario }).then(r => r.data),

  // Supports two call forms:
  //   new: entryApi.chat(mode, messages)       → posts { mode, messages }
  //   old: entryApi.chat(messages, scenario?)  → posts { messages, scenario, groundLabel }
  chat: (
    modeOrMessages: EntryMode | ChatTurn[],
    messagesOrScenario?: ChatTurn[] | string,
    groundLabel?: string,
    /* Who setup already named. Without these the check-in asks who is involved after being told. */
    peopleNamed?: string[],
  ): Promise<{ reply: string; sessionComplete?: boolean }> =>
    typeof modeOrMessages === 'string'
      ? apiClient.post<{ reply: string; sessionComplete: boolean }>(
          '/entry/chat',
          { mode: modeOrMessages, messages: messagesOrScenario },
        ).then(r => r.data)
      : apiClient.post<{ reply: string }>(
          '/entry/chat',
          { messages: modeOrMessages, scenario: messagesOrScenario as string | undefined, groundLabel, peopleNamed },
        ).then(r => r.data),

  onboard: (messages: ChatTurn[], scenario?: string, moment?: string): Promise<OnboardResult> =>
    /* The situation travels with the messages. Without it the endpoint served one prompt to all
       twenty-two cards, so every situation opened with the same question about the situation - which
       is the one question the person answered by clicking. */
    apiClient.post('/entry/onboard', { messages, scenario, moment }).then(r => r.data),

  /** onboard, streamed: deltas arrive as the model speaks, the resolved value is what onboard returns. */
  onboardStream: (
    messages: ChatTurn[],
    scenario: string | undefined,
    moment: string | undefined,
    onDelta: (text: string) => void,
    /* What the last turn already worked out, handed back so setup does not re-read the whole
       situation off the transcript every time somebody speaks. See
       what-setup-already-knows-travels-with-it on the API side. */
    soFar?: Record<string, unknown>,
  ): Promise<OnboardResult> =>
    readEntryStream('/entry/onboard/stream', { messages, scenario, moment, soFar }, onDelta),

  /** chat (old form), streamed. */
  chatStream: (
    messages: ChatTurn[],
    scenario: string | undefined,
    groundLabel: string | undefined,
    onDelta: (text: string) => void,
    /* Who setup already named. This is the live path the check-in actually uses, so without it here
       the block that stops "who else is involved" never reaches the conversation people have. */
    peopleNamed?: string[],
    /* And what they typed in setup. Without it their own place names and deadlines read as invented
       the moment the check-in starts, and the sentences carrying them are deleted. */
    alreadySaid?: string[],
  ): Promise<{ reply: string; sessionComplete?: boolean }> =>
    /* No joinToken: the branch it reached served the organiser's brief to whoever supplied one (fix plan D10). */
    readEntryStream('/entry/chat/stream', { messages, scenario, groundLabel, peopleNamed, alreadySaid }, onDelta),

  classifyIntent: (description: string, mode?: string) =>
    /* Null below the confidence bar: the flow keeps the card the person chose rather than a guess. */
    apiClient.post<{ scenario: string | null; confidence: 'high' | 'low' }>('/entry/classify-intent', { description, mode }).then(r => r.data),

  faq: (question: string) =>
    apiClient.post<{ reply: string }>('/entry/faq', { question }).then(r => r.data),

  /*
   * WHO WAS NAMED IN SETUP GOES TO THE REPORT TOO, and did not.
   *
   * The chat has been given `peopleNamed` for a while, so the conversation knows who setup named.
   * The report was never given them, and it reads only the check-in's own turns. So a lead who
   * listed her team in setup got a report saying "team members not named here", and a whole
   * "what's still open" item telling her to go and name them.
   */
  report: (messages: ChatTurn[], scenario?: string, groundLabel?: string, peopleNamed?: string[]) =>
    apiClient.post<{ report: EntryReport | null }>('/entry/report', { messages, scenario, groundLabel, peopleNamed }).then(r => r.data),

  commit: (payload: {
    groundLabel: string
    setupKey?: string
    orgName?: string
    scenario?: string
    /* The four-field card sends these directly rather than through an interview - see
       ask-your-team-one-thing. Every other caller still lets the conversation settle them. */
    cadence?: 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ONE_TIME' | 'SEQUENTIAL'
    checkInBy?: string
    inviteNote?: string
    cadenceChosen?: boolean
    history: ChatTurn[]
    report?: EntryReport | null
    /** A colleague picked from the list is sent by `colleagueId`, never by address (U.4). */
    contributors: { email?: string; colleagueId?: string; context?: string; inviteToken?: string; note?: string }[]
    // Coordinator/lead path: the committer sets the ground up for someone else
    // to run. The lead is invited to confirm and becomes the initiator; the
    // onboarding context travels as `brief` (the coordinator has no transcript).
    lead?: { email: string; name?: string; contextNote?: string }
    /** True when they said the other people check in and they read what comes back. Without it
     *  somebody who has just said they are not a party is still given a session to answer. */
    managingOnly?: boolean
    brief?: string
  }) =>
    apiClient.post<{
      groundId: string
      joinToken?: string | null
      // who the commit successfully invited - drives the positive "Invited"
      // confirmation on the completion screen
      /* `waiting` is true where the invitation has NOT gone: the check-in starts in the future and
         the row is written uninvited, for the cron to send on the day. The screen has to say so, or
         "all participants i added didnt get an email" is what it produces. */
      contributors?: { email: string; waiting?: boolean; waitingBecause?: 'starts_later' | 'no_seat' | 'mail_failed'; saying?: string }[]
      failedInvites?: string[]
      /* Why each one failed, in the API's own words. See entry.service.ts. */
      whyInvitesFailed?: { email: string; because: string }[]
    }>('/entry/commit', payload).then(r => r.data),

  // Pre-auth update of the server-side draft, authorized by the draftToken
  // issued at entry-save. Best-effort: callers swallow failures (localStorage
  // still mirrors the same data for the same-browser case).
  patchDraft: (draftToken: string, payload: Record<string, unknown>) =>
    apiClient.patch<{ ok: true }>('/entry/draft', { draftToken, payload }).then(r => r.data),
}

/**
 * THE ANCHOR SCENARIO'S FRONT DOOR CALLS (plan pieces 1 and 2; docs/answers-from-engine.md,
 * "Request 144 (1)" and "Request 144 (2) and (3)"). Both are open to a visitor who is not signed in.
 */
export const entryAnchorApi = {
  /**
   * `GET /entry/anchor-available`: the one public signal of whether `release.anchorScenario` is on.
   * Answers only `{ available }`, cached by the server for 30 seconds. This is the call the landing
   * page asks before it decides whether to show itself at all, replacing the old stub that could
   * only ever answer false (`anchor-scenario-is-on.ts`).
   */
  available: (): Promise<{ available: boolean }> =>
    apiClient.get('/entry/anchor-available').then(r => r.data),

  /**
   * `GET /entry/anchor-start?source=<mark>`: called once on arrival at `/start/team`. With the
   * switch on it answers the situation key (`HELP_TEAM_UNDERSTAND`), a label for the ground, the
   * source mark read back exactly as sent (or `null`), and `thePeopleStep`
   * (docs/answers-from-engine.md, "Request 149 (2 of 6)") - the people step's own heading, intro,
   * context label, button and limit sentence, carried from here through to the entry chat's people
   * step rather than read off the fixed `ANCHOR_PEOPLE_STEP_RULES`. With the switch off it answers
   * 404 - the caller is expected to show the engine's own sentence rather than invent one.
   */
  start: (source?: string | null): Promise<{
    available: true
    scenario: 'HELP_TEAM_UNDERSTAND'
    startedFrom: 'anchor'
    groundLabel: string
    source: string | null
    thePeopleStep?: ThePeopleStepRules
  }> =>
    apiClient.get('/entry/anchor-start', {
      params: source ? { source } : undefined,
      skipNotFoundToast: true,
    } as any).then(r => r.data),
}

// ── Join API (QR / broadcast link) ───────────────────────────────────────────

/**
 * THE OPEN LINK: ANSWER FIRST, SAY WHO YOU ARE AT THE END. The QR code a lead shares. Nobody is
 * signed in on any of these, which is the point - see the API's the-open-link.service.
 */
export const openLinkApi = {
  whatThisIs: (token: string) =>
    apiClient.get<{ groundLabel: string; theQuestion: string | null; askedBy: string | null; scenario: string; schedule?: string | null; endsAt?: string | null }>(
      '/entry/open', { params: { t: token } },
    ).then(r => r.data),

  start: (joinToken: string) =>
    apiClient.post<{ key: string; checkInId: string; reply: string | null }>('/entry/open-start', { joinToken }).then(r => r.data),

  say: (key: string, message: string) =>
    apiClient.post<{ reply: string; sessionComplete?: boolean }>('/entry/open-say', { key, message }).then(r => r.data),

  finish: (key: string, email?: string, firstName?: string, wantsTheReport?: boolean, organisation?: string) =>
    apiClient.post<{ willGetTheReport: boolean; at: string | null }>('/entry/open-finish', { key, email, firstName, wantsTheReport, organisation }).then(r => r.data),
}

export const joinApi = {
  /* `skipNotFoundToast`: the /join page already says this itself in its own sentence (the same
     reasoning as participantsApi.preview). Without it, a bad link raised a second, differently
     worded toast on top of the page's own message - group 3's review, request batch A, fault 3. */
  preview: (token: string) =>
    apiClient.get<{ groundId: string; groundLabel: string; scenario: string; initiatorName: string }>(
      '/entry/join-preview',
      { params: { t: token }, skipNotFoundToast: true } as any,
    ).then(r => r.data),

  /**
   * ASKING TO JOIN. This does not sign anybody in and never did anything else
   * safely: it used to hand back a session as whoever the typed address belonged
   * to. It now sends a link and says so.
   */
  accept: (payload: {
    joinToken: string
    email: string
    firstName?: string
    lastName?: string
    roleAsDescribed?: string
    /** Optional, never inferred; blank means blank. */
    department?: string
    /** The honeypot: a filled trap is answered as success and mails nobody. */
    trapFilled?: boolean
  }) =>
    apiClient.post<{ sent: true; to: string; says: string }>(
      '/entry/join-accept',
      payload,
    ).then(r => r.data),

  /** The address answered. This is the call that creates anything. */
  confirm: (token: string) =>
    apiClient.post<{
      groundId: string; checkInId: string; accessToken: string; userId: string; existingAccount: boolean
      /* An admin has to let them in first; `saying` is the server's sentence for that. */
      queuedForApproval: boolean; saying?: string
    }>(
      '/entry/join-confirm',
      { token },
    ).then(r => r.data),
}
