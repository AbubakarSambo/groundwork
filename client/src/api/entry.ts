import { apiClient } from './client';

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
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  ): Promise<{ reply: string; sessionComplete?: boolean }> =>
    typeof modeOrMessages === 'string'
      ? apiClient.post<{ reply: string; sessionComplete: boolean }>(
          '/entry/chat',
          { mode: modeOrMessages, messages: messagesOrScenario },
        ).then(r => r.data)
      : apiClient.post<{ reply: string }>(
          '/entry/chat',
          { messages: modeOrMessages, scenario: messagesOrScenario as string | undefined, groundLabel },
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
  ): Promise<OnboardResult> =>
    readEntryStream('/entry/onboard/stream', { messages, scenario, moment }, onDelta),

  /** chat (old form), streamed. */
  chatStream: (
    messages: ChatTurn[],
    scenario: string | undefined,
    groundLabel: string | undefined,
    onDelta: (text: string) => void,
  ): Promise<{ reply: string; sessionComplete?: boolean }> =>
    /* No joinToken: the branch it reached served the organiser's brief to whoever supplied one (fix plan D10). */
    readEntryStream('/entry/chat/stream', { messages, scenario, groundLabel }, onDelta),

  classifyIntent: (description: string, mode?: string) =>
    /* Null below the confidence bar: the flow keeps the card the person chose rather than a guess. */
    apiClient.post<{ scenario: string | null; confidence: 'high' | 'low' }>('/entry/classify-intent', { description, mode }).then(r => r.data),

  faq: (question: string) =>
    apiClient.post<{ reply: string }>('/entry/faq', { question }).then(r => r.data),

  report: (messages: ChatTurn[], scenario?: string, groundLabel?: string) =>
    apiClient.post<{ report: EntryReport | null }>('/entry/report', { messages, scenario, groundLabel }).then(r => r.data),

  commit: (payload: {
    groundLabel: string
    orgName?: string
    scenario?: string
    history: ChatTurn[]
    report?: EntryReport | null
    contributors: { email: string; context?: string; inviteToken?: string; note?: string }[]
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
      contributors?: { email: string; waiting?: boolean }[]
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

// ── Join API (QR / broadcast link) ───────────────────────────────────────────

export const joinApi = {
  preview: (token: string) =>
    apiClient.get<{ groundId: string; groundLabel: string; scenario: string; initiatorName: string }>(
      '/entry/join-preview',
      { params: { t: token } },
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
