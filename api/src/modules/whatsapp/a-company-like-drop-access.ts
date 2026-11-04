/**
 * A COMPANY LIKE DROP ACCESS, AS A SMALL DATABASE IN MEMORY (test data only; Drop Access, 21 October 2026).
 *
 * Written by hand: a sales team, its lead Grace Achieng and her four reps Kevin, Mercy, Joseph and Peter, one check-in ("Sales team,
 * Q4") with a session open for each of them, Release 1 and the direct morning switched on, WhatsApp on for the organisation, and no
 * WhatsApp Business number of its own. The organisation's day is Nairobi's.
 *
 * The stand-in answers the reads and writes the number paths make, the way Postgres would for these rows: a `where` with `in`,
 * `not`, `startsWith`, `equals` and `mode: 'insensitive'`, `OR`/`AND`/`NOT`, and a filter on a related row (`user: { ... }`,
 * `ground: { ... }`, `memberships: { some: ... }`); `select` and `include` bring related rows; and `users.phone_number` is unique,
 * deleted sign-ins included, as the real column is. Nothing leaves this machine and no model is called.
 */
export const DROP = 'org-drop-access';
export const SALES = 'g-sales-q4';
export const PEOPLE = {
  grace: { id: 'u-grace', firstName: 'Grace', lastName: 'Achieng', email: 'grace@dropaccess.test', role: 'ADMIN' },
  kevin: { id: 'u-kevin', firstName: 'Kevin', lastName: 'Omondi', email: 'kevin@dropaccess.test', role: 'MEMBER' },
  mercy: { id: 'u-mercy', firstName: 'Mercy', lastName: 'Wairimu', email: 'mercy@dropaccess.test', role: 'MEMBER' },
  joseph: { id: 'u-joseph', firstName: 'Joseph', lastName: 'Kariuki', email: 'joseph@dropaccess.test', role: 'MEMBER' },
  peter: { id: 'u-peter', firstName: 'Peter', lastName: 'Njoroge', email: 'peter@dropaccess.test', role: 'MEMBER' },
} as const;
export type Who = keyof typeof PEOPLE;
export const pid = (w: Who) => `p-${w}`;
export const sessionOf = (w: Who, n = 1) => `ci-${w}-${n}`;

type Row = Record<string, any>;

const RELATIONS: Record<string, Record<string, (db: Db, row: Row) => any>> = {
  organizationMembership: {
    user: (db, r) => db.rows.user.find((u) => u.id === r.userId) ?? null,
    organization: (db, r) => db.rows.organization.find((o) => o.id === r.organizationId) ?? null,
  },
  user: {
    memberships: (db, r) => db.rows.organizationMembership.filter((m) => m.userId === r.id),
    organization: (db, r) => db.rows.organization.find((o) => o.id === r.organizationId) ?? null,
  },
  person: { organization: (db, r) => db.rows.organization.find((o) => o.id === r.organizationId) ?? null },
  ground: {
    participants: (db, r) => db.rows.groundParticipant.filter((p) => p.groundId === r.id),
    organization: (db, r) => db.rows.organization.find((o) => o.id === r.organizationId) ?? null,
  },
  groundParticipant: {
    ground: (db, r) => db.rows.ground.find((g) => g.id === r.groundId) ?? null,
    user: (db, r) => (r.userId ? db.rows.user.find((u) => u.id === r.userId) ?? null : null),
    checkIns: (db, r) => db.rows.checkIn.filter((c) => c.participantId === r.id),
  },
  checkIn: {
    participant: (db, r) => db.rows.groundParticipant.find((p) => p.id === r.participantId) ?? null,
    ground: (db, r) => db.rows.ground.find((g) => g.id === r.groundId) ?? null,
  },
};

const lower = (v: any) => (typeof v === 'string' ? v.toLowerCase() : v);

function matchesField(v: any, w: any): boolean {
  if (w === null) return v === null || v === undefined;
  if (w instanceof Date) return v instanceof Date && v.getTime() === w.getTime();
  if (typeof w !== 'object') return v === w;
  const ci = w.mode === 'insensitive';
  const eq = (a: any, b: any) => (ci ? lower(a) === lower(b) : a === b);
  if ('equals' in w && !eq(v, w.equals)) return false;
  if ('in' in w && !(w.in as any[]).some((x) => eq(v, x))) return false;
  if ('notIn' in w && (w.notIn as any[]).some((x) => eq(v, x))) return false;
  if ('not' in w) {
    if (w.not === null ? v === null || v === undefined : (typeof w.not === 'object' && w.not ? matchesField(v, w.not) : eq(v, w.not))) return false;
  }
  if ('startsWith' in w && !(typeof v === 'string' && (ci ? lower(v).startsWith(lower(w.startsWith)) : v.startsWith(w.startsWith)))) return false;
  if ('contains' in w && !(typeof v === 'string' && (ci ? lower(v).includes(lower(w.contains)) : v.includes(w.contains)))) return false;
  const n = v instanceof Date ? v.getTime() : v;
  const x = (y: any) => (y instanceof Date ? y.getTime() : y);
  if ('gte' in w && !(v != null && n >= x(w.gte))) return false;
  if ('lte' in w && !(v != null && n <= x(w.lte))) return false;
  if ('gt' in w && !(v != null && n > x(w.gt))) return false;
  if ('lt' in w && !(v != null && n < x(w.lt))) return false;
  return true;
}

export class Db {
  rows: Record<string, Row[]> = {};
  private seq = 0;
  constructor(seed: Record<string, Row[]>) {
    for (const [k, v] of Object.entries(seed)) this.rows[k] = v.map((r) => ({ ...r }));
  }
  table(name: string): Row[] {
    return (this.rows[name] ??= []);
  }
  matches(name: string, row: Row, where: any): boolean {
    if (!where) return true;
    return Object.entries(where).every(([k, w]: [string, any]) => {
      if (w === undefined) return true;
      if (k === 'AND') return (Array.isArray(w) ? w : [w]).every((x) => this.matches(name, row, x));
      if (k === 'OR') return (w as any[]).some((x) => this.matches(name, row, x));
      if (k === 'NOT') return !(Array.isArray(w) ? w : [w]).some((x) => this.matches(name, row, x));
      const rel = RELATIONS[name]?.[k];
      if (rel) {
        const target = rel(this, row);
        const relName = this.relationTable(name, k);
        if (Array.isArray(target)) {
          if (w.some) return target.some((t) => this.matches(relName, t, w.some));
          if (w.every) return target.every((t) => this.matches(relName, t, w.every));
          if (w.none) return !target.some((t) => this.matches(relName, t, w.none));
          return true;
        }
        if (w === null) return target === null;
        if (w.is !== undefined) return w.is === null ? target === null : !!target && this.matches(relName, target, w.is);
        return !!target && this.matches(relName, target, w);
      }
      /* A compound unique key such as userId_organizationId. */
      if (k.includes('_') && typeof w === 'object' && w && !Array.isArray(w) && !(k in row)) return this.matches(name, row, w);
      return matchesField(row[k], w);
    });
  }
  private relationTable(name: string, key: string): string {
    const map: Record<string, string> = { user: 'user', organization: 'organization', memberships: 'organizationMembership', participants: 'groundParticipant', ground: 'ground', checkIns: 'checkIn', participant: 'groundParticipant' };
    return map[key] ?? key;
  }
  /** A row as read, with the related rows a select or include names. */
  shape(name: string, row: Row, sel?: any): Row {
    const out: Row = { ...row };
    const asked = sel?.select ?? sel?.include;
    if (asked) {
      for (const [k, v] of Object.entries(asked)) {
        const rel = RELATIONS[name]?.[k];
        if (!rel || !v) continue;
        const target = rel(this, row);
        const relName = this.relationTable(name, k);
        const nested = typeof v === 'object' ? (v as any) : undefined;
        if (Array.isArray(target)) {
          const filtered = nested?.where ? target.filter((t) => this.matches(relName, t, nested.where)) : target;
          out[k] = (nested?.take ? filtered.slice(0, nested.take) : filtered).map((t) => this.shape(relName, t, nested));
        } else out[k] = target ? this.shape(relName, target, nested) : null;
      }
    }
    return out;
  }
  private ordered(rows: Row[], orderBy: any): Row[] {
    const list = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
    const keys = list.flatMap((o) => Object.entries(o)).filter(([, d]) => typeof d === 'string' || (d && typeof d === 'object' && 'sort' in (d as any)));
    if (!keys.length) return rows;
    return [...rows].sort((a, b) => {
      for (const [k, d] of keys) {
        const dir = (typeof d === 'string' ? d : (d as any).sort) === 'desc' ? -1 : 1;
        const x = a[k] instanceof Date ? a[k].getTime() : a[k];
        const y = b[k] instanceof Date ? b[k].getTime() : b[k];
        if (x == null && y == null) continue;
        if (x == null) return 1;
        if (y == null) return -1;
        if (x < y) return -dir;
        if (x > y) return dir;
      }
      return 0;
    });
  }
  private unique(name: string, row: Row, except?: Row) {
    if (name === 'user' && row.phoneNumber) {
      const clash = this.table('user').find((u) => u !== except && u.phoneNumber === row.phoneNumber);
      if (clash) throw Object.assign(new Error('Unique constraint failed on the fields: (`phone_number`)'), { code: 'P2002' });
    }
  }
  model(name: string) {
    const db = this;
    const rows = () => db.table(name);
    const find = (args: any = {}) => db.ordered(rows().filter((r) => db.matches(name, r, args.where)), args.orderBy);
    return {
      findMany: jest.fn(async (args: any = {}) => {
        let list = find(args);
        if (args.skip) list = list.slice(args.skip);
        if (args.take) list = list.slice(0, args.take);
        return structuredClone(list.map((r) => db.shape(name, r, args)));
      }),
      findFirst: jest.fn(async (args: any = {}) => { const r = find(args)[0]; return r ? structuredClone(db.shape(name, r, args)) : null; }),
      findUnique: jest.fn(async (args: any = {}) => { const r = find(args)[0]; return r ? structuredClone(db.shape(name, r, args)) : null; }),
      findUniqueOrThrow: jest.fn(async (args: any = {}) => { const r = find(args)[0]; if (!r) throw new Error('not found'); return structuredClone(db.shape(name, r, args)); }),
      count: jest.fn(async (args: any = {}) => find(args).length),
      create: jest.fn(async (args: any) => {
        const row = { id: `${name}-${++db.seq}`, createdAt: new Date(), updatedAt: new Date(), ...args.data };
        db.unique(name, row);
        rows().push(row);
        return structuredClone(db.shape(name, row, args));
      }),
      update: jest.fn(async (args: any) => {
        const row = find(args)[0];
        if (!row) throw Object.assign(new Error(`No ${name} to update`), { code: 'P2025' });
        const next = { ...row, ...args.data, updatedAt: new Date() };
        db.unique(name, next, row);
        Object.assign(row, next);
        return structuredClone(db.shape(name, row, args));
      }),
      updateMany: jest.fn(async (args: any) => {
        const list = find(args);
        for (const row of list) { const next = { ...row, ...args.data, updatedAt: new Date() }; db.unique(name, next, row); Object.assign(row, next); }
        return { count: list.length };
      }),
      upsert: jest.fn(async (args: any) => {
        const row = find(args)[0];
        if (row) { Object.assign(row, args.update, { updatedAt: new Date() }); return structuredClone(row); }
        const made = { id: `${name}-${++db.seq}`, createdAt: new Date(), updatedAt: new Date(), ...args.create };
        rows().push(made);
        return structuredClone(made);
      }),
      delete: jest.fn(async (args: any) => { const row = find(args)[0]; if (!row) throw new Error('none'); db.rows[name] = rows().filter((r) => r !== row); return row; }),
      deleteMany: jest.fn(async (args: any = {}) => { const list = find(args); db.rows[name] = rows().filter((r) => !list.includes(r)); return { count: list.length }; }),
      aggregate: jest.fn(async () => ({ _count: 0, _max: {}, _min: {} })),
      groupBy: jest.fn(async () => []),
    };
  }
  /** The Prisma-shaped client: every model the code asks for, made on first use. */
  client(): any {
    const models = new Map<string, any>();
    const self = this;
    const client: any = new Proxy({}, {
      get(_t, key: string) {
        if (key === '$transaction') return async (fn: any) => (typeof fn === 'function' ? fn(client) : Promise.all(fn));
        if (key === 'withAdvisoryLock') return async (_l: any, fn: any) => fn();
        if (key === '$queryRaw' || key === '$executeRaw' || key === '$queryRawUnsafe' || key === '$executeRawUnsafe') return async () => [];
        if (typeof key !== 'string' || key.startsWith('$') || key === 'then') return undefined;
        if (!models.has(key)) models.set(key, self.model(key));
        return models.get(key);
      },
    });
    return client;
  }
}

/** Drop Access as it stood when Grace started adding the team's numbers: nobody has a number, and nothing has been sent. */
export function aCompanyLikeDropAccess(o: { now: Date; connection?: Row | null } = { now: new Date() }): Db {
  const opened = new Date(o.now.getTime() - 2 * 60 * 60 * 1000);
  const users = Object.values(PEOPLE).map((p) => ({ ...p, organizationId: DROP, phoneNumber: null, isActive: true, isEmailVerified: true, deletedAt: null, awaitingOrgApproval: false, createdAt: new Date('2026-10-01T07:00:00Z') }));
  return new Db({
    organization: [{
      id: DROP, name: 'Drop Access', timeZone: 'Africa/Nairobi', whatsappAddOnOn: true, whatsappFreeUntil: new Date('2026-11-30T00:00:00Z'),
      release1SalesBoardOn: true, directMorningOn: true, ownerUserId: PEOPLE.grace.id, billWord: null,
    }],
    user: users,
    organizationMembership: users.map((u) => ({ id: `m-${u.id}`, userId: u.id, organizationId: DROP, role: u.role, heldForASeat: false, createdAt: new Date('2026-10-01T07:00:00Z') })),
    person: [],
    ground: [{ id: SALES, organizationId: DROP, label: 'Sales team, Q4', kindOfWork: 'sales team', initiatorId: PEOPLE.grace.id, createdByUserId: PEOPLE.grace.id, status: 'ACTIVE', overWhatsApp: null, simplerWords: false, scenario: 'OKR_ALIGNMENT' }],
    groundParticipant: (Object.keys(PEOPLE) as Who[]).map((w) => ({
      id: pid(w), groundId: SALES, userId: PEOPLE[w].id, email: PEOPLE[w].email, nameGiven: null, partyType: w === 'grace' ? 'INITIATOR' : 'PARTICIPANT',
      leftAt: null, managingOnly: false, awaitingSeat: false, acceptedAt: new Date('2026-10-01T08:00:00Z'), createdAt: new Date('2026-10-01T08:00:00Z'),
    })),
    checkIn: (['kevin', 'mercy', 'joseph', 'peter'] as Who[]).map((w) => ({
      id: sessionOf(w), groundId: SALES, participantId: pid(w), sessionNumber: 1, status: 'NOT_STARTED', isSetup: false, optional: false,
      availableFrom: opened, createdAt: opened, sessionReadyNotifiedAt: null, openedAnnouncedAt: opened,
    })),
    whatsAppConnection: o.connection ? [{ organizationId: DROP, approvedTemplates: [], ...o.connection }] : [],
    platformSetting: [{ key: 'whatsapp_enabled', value: true }],
  });
}
