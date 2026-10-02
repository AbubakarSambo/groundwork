import { WhatsAppForAnOrganisationService } from '../public-api/whatsapp-for-an-organisation.service';

/**
 * ONE PERSON WRITING ON WHATSAPP, WITH EVERYTHING AROUND THEM MOCKED, so a spec can read what the
 * person is sent back word for word. Test-only; nothing in the product imports it.
 */
export interface AnOpenRow {
  id: string;
  status?: 'NOT_STARTED' | 'IN_PROGRESS';
  sessionNumber?: number;
  label: string;
  scenario?: string;
  overWhatsApp?: boolean | null;
}

export function anInboundHarness(opts: {
  open?: AnOpenRow[];
  thread?: { checkInId: string | null; pickPendingAt?: Date | null } | null;
  who?: { personId: string | null; userId: string | null; externalId?: string | null };
  completed?: { overWhatsApp?: boolean | null; scenario?: string; label?: string };
  personPhone?: string | null;
  /** Something waits for this person to approve or decline (decision 82, item 1). */
  decisionWaiting?: boolean;
} = {}) {
  const said: string[] = [];
  const sent: { org: string | null; via?: string; to: string; text: string; context?: any }[] = [];
  let thread = opts.thread === undefined ? null : opts.thread ? { organizationId: 'org-1', phone: '+2348012345678', pickPendingAt: null, ...opts.thread } : null;
  const prisma: any = {
    whatsAppInboundMessage: { create: jest.fn(async () => ({})), findFirst: jest.fn(async () => null) },
    whatsAppConnection: { update: jest.fn(async () => ({})), findUnique: jest.fn(async () => null) },
    person: { update: jest.fn(async () => ({})), findUnique: jest.fn(async () => ({ whatsappStoppedAt: null })), findFirst: jest.fn(async () => (opts.personPhone === null ? null : { phone: opts.personPhone ?? '+2348012345678', email: 'amina@example.com' })) },
    groundParticipant: { findFirst: jest.fn(async () => null), update: jest.fn(async () => ({})) },
    checkIn: {
      findMany: jest.fn(async () => (opts.open ?? []).map((r) => ({
        id: r.id, status: r.status ?? 'IN_PROGRESS', sessionNumber: r.sessionNumber ?? 1,
        ground: { label: r.label, scenario: r.scenario ?? 'PULSE_CHECK', overWhatsApp: r.overWhatsApp ?? null },
      }))),
      findUnique: jest.fn(async (q: any) => (opts.completed
        ? { id: q.where.id, sessionNumber: 2, status: 'COMPLETED', groundId: 'g-1', ground: { id: 'g-1', organizationId: 'org-1', label: opts.completed.label ?? 'Performance plan for Amina', scenario: opts.completed.scenario ?? 'PIP', overWhatsApp: opts.completed.overWhatsApp ?? null }, participant: { userId: 'u-1', email: 'amina@example.com', language: 'en' } }
        : { groundId: 'g-1', participantId: 'p-1', participant: { language: 'en' } })),
    },
    whatsAppThread: {
      findUnique: jest.fn(async () => thread),
      upsert: jest.fn(async (q: any) => { thread = { ...(thread ?? { organizationId: 'org-1', phone: '+2348012345678', checkInId: null, pickPendingAt: null }), ...(thread ? q.update : q.create) }; return thread; }),
      update: jest.fn(async (q: any) => { thread = { ...(thread as any), ...q.data }; return thread; }),
      deleteMany: jest.fn(async () => ({})),
    },
    whatsAppSend: { findFirst: jest.fn(async () => null) },
  };
  const record = (org: string | null, to: string, text: string, context?: any, via?: string) => { said.push(text); sent.push({ org, via, to, text, context }); return { sent: true }; };
  const whatsapp: any = {
    whoIsWritingTo: jest.fn(async () => opts.who ?? { personId: 'person-1', userId: 'u-1', externalId: 'ext-1' }),
    sendFor: jest.fn(async (org: string, to: string, text: string, context?: any) => record(org, to, text, context, 'theirs')),
    sendMessage: jest.fn(async (to: string, text: string, context?: any) => record(null, to, text, context, 'ours')),
    sendOn: jest.fn(async (via: string, org: string, to: string, text: string, context?: any) => record(org, to, text, context, via)),
    sendListFor: jest.fn(async (_org: string, _to: string, _body: string, _rows: any[], asText: string) => { said.push(asText); return true; }),
    sendListOn: jest.fn(async (_via: string, _org: string, _to: string, _body: string, _rows: any[], asText: string) => { said.push(asText); return true; }),
    fetchMediaFor: jest.fn(async () => null),
    fetchMediaOn: jest.fn(async () => null),
    lastWroteTo: jest.fn(async () => null),
    notNow: jest.fn(async () => undefined),
  };
  const conversation: any = {
    open: jest.fn(async () => ({ reply: 'What moved since last time?' })),
    sendMessage: jest.fn(async () => ({ reply: 'Thank you. What happens next?', sessionComplete: false })),
    complete: jest.fn(async () => ({})),
  };
  const assistant: any = {
    respond: jest.fn(async () => ({ blocks: [{ type: 'text', body: 'Ask Groundwork answered.' }] })),
    somethingWaitsForYouToDecide: jest.fn(async () => !!opts.decisionWaiting),
  };
  /* On WhatsApp the router asks through this door (decision 82, item 7); it is the same answer, so it is counted as `respond`. */
  assistant.respondOnWhatsApp = jest.fn((...args: any[]) => assistant.respond(...args));
  const reports: any = { sessionReport: jest.fn(async () => ({ whereThingsStand: { saying: 'Amina met two of the three goals.' } })) };
  const anthropic: any = { extract: jest.fn(async () => ({ language: 'en' })), respond: jest.fn(async (_s: string, m: any[]) => m[0].content) };
  const service = new WhatsAppForAnOrganisationService(prisma, whatsapp, conversation, assistant, {} as any, {} as any, reports, anthropic);
  (service as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const message = (text: string, from = '2348012345678', id?: string) => ({ entry: [{ changes: [{ value: { messages: [{ id: id ?? `wamid.${Math.random()}`, from, type: 'text', text: { body: text } }] } }] }] });
  return { service, prisma, whatsapp, conversation, assistant, reports, said, sent, message, thread: () => thread };
}
