import { GroundsService } from './grounds.service';
import type { WhatAPasteGives } from './a-dump-is-many-things';

export const aPaste = (over: Partial<WhatAPasteGives> = {}): WhatAPasteGives => ({
  success: null, teamTargets: [], forPeople: [], dates: [], unmatched: [], waysOfWorking: [], openDecisions: [],
  notSettled: [], aboutPeople: [], commitments: [], betweenPeople: [], strategy: [], notes: [], questionsForPeople: [],
  ...over,
}) as WhatAPasteGives;

/**
 * A real `GroundsService` over a prisma that answers "nothing" to everything it was not given, for
 * the tests of request 92. `writes` lists every create, update, upsert and delete that was attempted.
 */
export function aSetupConversation(opts: {
  ground?: any;
  reply?: string;
  paste?: Partial<WhatAPasteGives> | null;
  extract?: (system: string, history: any[], tool: any) => any;
  seed?: Record<string, any>;
  userRole?: string;
} = {}) {
  const ground: any = {
    id: 'g1', label: 'Sales team, Q3', organizationId: 'org1', initiatorId: 'userLead', scenario: 'OKR_ALIGNMENT',
    timelineDays: 90, timelineStated: false, cadence: 'WEEKLY', cadenceStated: false, brief: null,
    participants: [{ id: 'pN', managingOnly: false }], objectives: [],
    ...(opts.ground ?? {}),
  };
  const seed: any = {
    ground: { findUnique: async () => ground },
    user: { findUnique: async () => ({ role: opts.userRole ?? 'MEMBER', organizationId: 'org1' }) },
    ...(opts.seed ?? {}),
  };
  const writes: string[] = [];
  const prisma: any = new Proxy(seed, {
    get: (t: any, model: string) => new Proxy(t[model] ?? {}, {
      get: (m: any, method: string) => m[method] ?? (async () => {
        if (/^(create|update|upsert|delete)/.test(String(method))) writes.push(`${model}.${String(method)}`);
        return String(method).endsWith('Many') ? [] : String(method) === 'count' ? 0 : null;
      }),
    }),
  });
  const anthropic: any = {
    respond: jest.fn(async () => opts.reply ?? 'Here is what I read.'),
    extract: jest.fn(async (system: string, history: any[], tool: any) => (opts.extract ? opts.extract(system, history, tool) : null)),
  };
  const service = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, anthropic, { get: () => undefined } as any);
  if (opts.paste !== undefined) {
    jest.spyOn(service as any, 'whatAPasteGives').mockResolvedValue(opts.paste ? aPaste(opts.paste) : null);
  }
  return { service, prisma, anthropic, writes };
}
