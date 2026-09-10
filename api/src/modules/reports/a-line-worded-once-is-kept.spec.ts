import { rememberedCompose } from './a-line-worded-once-is-kept';

function fakePrisma() {
  const rows = new Map<string, string>();
  return {
    rows,
    wordedLine: {
      findUnique: async ({ where }: any) => (rows.has(where.key) ? { text: rows.get(where.key) } : null),
      upsert: async ({ where, create }: any) => { rows.set(where.key, create.text); return create; },
    },
  } as any;
}

describe('a line worded once is kept', () => {
  it('calls the model once for the same instruction and draft, and never for an empty answer', async () => {
    const prisma = fakePrisma();
    let calls = 0;
    const compose = rememberedCompose(prisma, async () => { calls++; return calls === 1 ? '' : 'Two are drafted and with Ada.'; });
    expect(await compose('STYLE', 'two drafted, with Ada')).toBe('');
    expect(await compose('STYLE', 'two drafted, with Ada')).toBe('Two are drafted and with Ada.');
    expect(await compose('STYLE', 'two drafted, with Ada')).toBe('Two are drafted and with Ada.');
    expect(calls).toBe(2);
    expect(prisma.rows.size).toBe(1);
  });

  it('a different draft or a different instruction is a different key', async () => {
    const prisma = fakePrisma();
    let calls = 0;
    const compose = rememberedCompose(prisma, async (_s, d) => { calls++; return `said: ${d}`; });
    await compose('A', 'x'); await compose('A', 'y'); await compose('B', 'x');
    expect(calls).toBe(3);
  });

  it('a cache that throws is a cache that is not there', async () => {
    const prisma = { wordedLine: { findUnique: async () => { throw new Error('db down'); }, upsert: async () => { throw new Error('db down'); } } } as any;
    const compose = rememberedCompose(prisma, async () => 'fresh');
    expect(await compose('A', 'x')).toBe('fresh');
  });
});
