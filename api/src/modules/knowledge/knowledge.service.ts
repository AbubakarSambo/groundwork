import { chunk, chunkKey, chunkTitle } from './a-document-is-not-a-card';
import { Injectable, Logger, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeKind, Prisma } from '@prisma/client';
import { AnthropicService } from '../conversation/anthropic.service';
import { forHumans } from '../presentation/outbound';
import { WHAT_IS_IN_IT_PROMPT, MOST_CHARS_SUMMARISED, aHashOf, aSummaryAsKept } from './the-desk';

export interface DocumentInput {
  /** The document's stable id in the customer's system. Chunk keys are derived from it. */
  key: string;
  title: string;
  /** Plain text. Turning a file into text is the caller's job - see a-document-is-not-a-card.ts. */
  text: string;
  kind?: string;
  sourceRef?: string | null;
  sourceSystem?: string | null;
  /** The summary already said back to the person who added it (Ask's say-back), kept as it was said. Written by the model when absent. */
  summary?: string | null;
  /** Who added it, for the Desk's "Added by Grace". Null for a customer's system. */
  addedByUserId?: string | null;
}

export interface CardInput {
  kind: string;
  key: string;
  title: string;
  body: string;
  sourceRef?: string | null;
  externalId?: string | null;
  sourceSystem?: string | null;
}

/**
 * Words that carry no meaning in a question and wreck a similarity score by being everywhere. Kept
 * deliberately short: a long stop-list starts removing words that matter in somebody's handbook.
 */
export const STOPWORDS = new Set(['the', 'and', 'for', 'our', 'you', 'your', 'how', 'what', 'does', 'with', 'this', 'that', 'are', 'can']);

/** A card cap and a token budget, because a prompt that grows with a customer's handbook is a bill. */
export const MAX_CARDS = 5;
export const MAX_CHARS = 6_000;

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    /* The engine that writes a document's summary. Global (the-engine.module.ts); optional so a spec can leave it out. */
    @Optional() private readonly engine?: AnthropicService,
  ) {}

  private kindOf(raw: string): KnowledgeKind {
    const k = (raw ?? '').toUpperCase().replace(/[- ]/g, '_') as KnowledgeKind;
    if (!Object.values(KnowledgeKind).includes(k)) {
      throw new BadRequestException(`Unknown card kind "${raw}". One of: ${Object.values(KnowledgeKind).join(', ').toLowerCase()}`);
    }
    return k;
  }

  /**
   * PUT A CARD, WHICH MEANS SUPERSEDING WHATEVER IS CURRENT UNDER THAT KEY.
   *
   * Never an update in place. A finding from March has to be explainable by the handbook as it stood
   * in March, and editing the card underneath it changes the evidence without changing the
   * conclusion - which is worse than either being wrong, because nobody can tell.
   *
   * Two writes in one transaction. Without it a crash between them leaves a key with two live cards
   * or none, and the database's own partial index would reject the second write anyway - so the
   * transaction is what turns a constraint violation into an atomic swap.
   */
  async put(organizationId: string, input: CardInput) {
    const kind = this.kindOf(input.kind);
    if (!input.key?.trim()) throw new BadRequestException('key is required - it is what makes this a new version of something rather than a new thing.');
    if (!input.title?.trim() || !input.body?.trim()) throw new BadRequestException('title and body are required.');

    const key = input.key.trim();
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.knowledgeCard.findFirst({
        where: { organizationId, key, effectiveTo: null },
      });

      /*
       * IDENTICAL CONTENT IS NOT A NEW VERSION. A customer re-syncing their handbook nightly would
       * otherwise accumulate a version a day, and the history would stop meaning anything - the
       * point of it is to show when something CHANGED.
       */
      if (current && current.title === input.title.trim() && current.body === input.body.trim() && current.kind === kind) {
        return tx.knowledgeCard.update({
          where: { id: current.id },
          data: { syncedAt: now, sourceRef: input.sourceRef ?? current.sourceRef },
        });
      }

      /*
       * THE OLD ONE IS CLOSED FIRST, AND THE ORDER IS NOT A PREFERENCE.
       *
       * The database allows exactly one live version per key - a partial unique index on
       * `effective_to IS NULL` - so creating the new card while the old one is still open is
       * rejected outright. The first version did it that way and every supersession failed with a
       * unique constraint violation, which is the constraint doing precisely its job: it turned a
       * silent second-current-card into a loud error on the first attempt.
       *
       * Inside the transaction, so the instant with nothing live is not visible to anybody.
       */
      if (current) {
        await tx.knowledgeCard.update({
          where: { id: current.id },
          data: { effectiveTo: now },
        });
      }

      const created = await tx.knowledgeCard.create({
        data: {
          organizationId, kind, key,
          title: input.title.trim(),
          body: input.body.trim(),
          sourceRef: input.sourceRef ?? null,
          externalId: input.externalId ?? null,
          sourceSystem: input.sourceSystem ?? null,
          syncedAt: input.sourceSystem ? now : null,
          version: (current?.version ?? 0) + 1,
          effectiveFrom: now,
        },
      });

      if (current) {
        /* The forward pointer, once there is something to point at. Closed and superseded are two
           facts and only the second needs the new card to exist. */
        await tx.knowledgeCard.update({
          where: { id: current.id },
          data: { supersededById: created.id },
        });
      }
      return created;
    });
  }

  /**
   * A CORRECTION IN PLACE, for a typo and nothing else.
   *
   * Fixing "recieve" does not create a new version of the truth, and forcing one would fracture the
   * effective-date history for no gain. Deliberately cannot change the body - that is what `put` is
   * for, and the distinction is the whole reason both exist.
   */
  async correct(organizationId: string, key: string, patch: { title?: string; sourceRef?: string | null }) {
    const current = await this.prisma.knowledgeCard.findFirst({
      where: { organizationId, key, effectiveTo: null },
    });
    if (!current) throw new NotFoundException('No current card under that key.');
    return this.prisma.knowledgeCard.update({
      where: { id: current.id },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.sourceRef !== undefined ? { sourceRef: patch.sourceRef } : {}),
      },
    });
  }

  /** Supersedes rather than deletes: the history stays readable, the card stops being current. */
  async retire(organizationId: string, key: string) {
    const current = await this.prisma.knowledgeCard.findFirst({
      where: { organizationId, key, effectiveTo: null },
    });
    if (!current) throw new NotFoundException('No current card under that key.');
    await this.prisma.knowledgeCard.update({ where: { id: current.id }, data: { effectiveTo: new Date() } });
    return { retired: true };
  }

  async list(organizationId: string, opts: { kind?: string; key?: string; includeHistory?: boolean } = {}) {
    return this.prisma.knowledgeCard.findMany({
      where: {
        organizationId,
        ...(opts.kind ? { kind: this.kindOf(opts.kind) } : {}),
        ...(opts.key ? { key: opts.key } : {}),
        ...(opts.includeHistory ? {} : { effectiveTo: null }),
      },
      orderBy: [{ key: 'asc' }, { version: 'desc' }],
    });
  }

  /**
   * WHAT WAS TRUE ON A GIVEN DAY.
   *
   * The reason supersession exists. A finding written in March cites the handbook, and the question
   * six months later is what that handbook said in March - not what it says now.
   */
  async asOf(organizationId: string, key: string, when: Date) {
    return this.prisma.knowledgeCard.findFirst({
      where: {
        organizationId, key,
        effectiveFrom: { lte: when },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: when } }],
      },
    });
  }

  /**
   * A WHOLE DOCUMENT, SPLIT INTO CARDS THE REST OF THIS SERVICE ALREADY UNDERSTANDS.
   *
   * Every chunk goes through `put`, which is the point. Supersession, the version number, the
   * effective-from history, the no-op path when nothing changed - none of it is reimplemented here,
   * so a document behaves exactly like a hand-written card because it IS one.
   *
   * THE ORPHANS ARE THE PART THAT WOULD HAVE BEEN MISSED. A handbook re-uploaded after a section is
   * deleted produces fewer chunks than last time, and the chunks beyond the new count are never
   * written again - so they stay current, stay retrievable, and answer questions from a section the
   * customer removed. `put` cannot see this: it is given one card and knows nothing about how many
   * there should be. Retiring what the new version no longer has is the only place that can.
   *
   * ONE TRANSACTION PER CHUNK RATHER THAN ONE FOR THE DOCUMENT, because `put` owns its own. A
   * document that fails half way leaves the first chunks updated and the rest on their old version,
   * which is visible and fixable by uploading again - a single long transaction over a forty-page
   * handbook would hold locks on the whole table while the model-facing read path queries it.
   */
  async ingestDocument(organizationId: string, input: DocumentInput) {
    const key = (input.key ?? '').trim();
    const title = (input.title ?? '').trim();
    if (!key) throw new BadRequestException('key is required - it is what makes this a new version of a document rather than a new document.');
    if (!title) throw new BadRequestException('Add a title and try again.');
    if (!(input.text ?? '').trim()) throw new BadRequestException('text is required. This takes text, not a file.');

    const pieces = chunk(title, input.text);
    if (!pieces.length) throw new BadRequestException('That document has no text in it.');

    const written: string[] = [];
    for (const c of pieces) {
      await this.put(organizationId, {
        kind: input.kind ?? 'handbook',
        key: chunkKey(key, c.index),
        title: chunkTitle(title, c),
        body: c.body,
        sourceRef: input.sourceRef ?? null,
        sourceSystem: input.sourceSystem ?? null,
      });
      written.push(chunkKey(key, c.index));
    }

    /* Anything still current under this document's key that this version did not write. */
    const stale = await this.prisma.knowledgeCard.findMany({
      where: {
        organizationId,
        effectiveTo: null,
        key: { startsWith: `${key}#` },
        NOT: { key: { in: written } },
      },
      select: { key: true },
    });
    for (const s of stale) await this.retire(organizationId, s.key);

    const summary = await this.keepItOnTheDesk(organizationId, key, title, input);
    return { key, chunks: written.length, retired: stale.length, summary };
  }

  /**
   * THE DESK'S ROW FOR A DOCUMENT (S7): its title, who added it, and a summary of two or three sentences, KEPT, so the
   * Desk, Ask and the check-ins read the same summary and nobody waits for the model when they open the Desk. Written
   * here because every document comes in through `ingestDocument` (the Desk, Ask, the policy board and a customer's
   * system), so there is one way a document is read and summarised. The same words sent again keep their summary.
   * A model that does not answer leaves the summary empty rather than holding the document back.
   */
  private async keepItOnTheDesk(organizationId: string, key: string, title: string, input: DocumentInput): Promise<string | null> {
    const db = this.prisma as any;
    if (!db.deskDocument) return null;
    const textHash = aHashOf(input.text);
    const before = await db.deskDocument.findUnique({ where: { organizationId_key: { organizationId, key } } }).catch(() => null);
    const given = aSummaryAsKept(input.summary);
    const summary = given
      ?? (before?.textHash === textHash && before?.summary ? before.summary : null)
      ?? aSummaryAsKept(await this.engine?.respond(WHAT_IS_IN_IT_PROMPT, [{ role: 'user', content: input.text.trim().slice(0, MOST_CHARS_SUMMARISED) }]).then((r) => forHumans(r)).catch(() => null));
    const row = { title, summary, textHash, sourceRef: input.sourceRef ?? null };
    await db.deskDocument.upsert({
      where: { organizationId_key: { organizationId, key } },
      create: { organizationId, key, ...row, addedByUserId: input.addedByUserId ?? null },
      update: { ...row, ...(input.addedByUserId ? { addedByUserId: input.addedByUserId } : {}) },
    }).catch((err: any) => this.logger.warn(`The Desk could not keep ${key} for ${organizationId}: ${err?.message ?? err}`));
    return summary;
  }

  /**
   * HYBRID RETRIEVAL: trigram similarity and a keyword pass, ranked together.
   *
   * NOT EMBEDDINGS, AND THIS IS WHERE THAT IS SAID. The spec asks for embedding similarity plus a
   * keyword pass; this deployment's Postgres has no vector extension, so what is here is trigram
   * similarity, which genuinely matches "the vendor problem" to "vendor comparison" and does not
   * pretend to be anything else. The seam is one query; when there is a vector column it slots in
   * beside these two and the ranking absorbs it. Building half an embedding pipeline that could not
   * be run would have been worse than this.
   *
   * Scoped to the organisation, capped by count AND by characters, and logged.
   */
  /**
   * WHAT THE COMPANY HAS WRITTEN THAT TOUCHES WHAT SOMEBODY JUST SAID.
   *
   * `retrieve` below is for a QUESTION - "how does contracting work?" - and it scores by what
   * fraction of the query a card covers. That is right for the assistant and exactly wrong here:
   * a conversational turn is twenty words long, two of them matter, and the fraction collapses.
   * Measured, not guessed - "the client said yes to the eighty thousand piece of work, so I was
   * going to send them the contract myself" scored zero against a card titled "How contracting
   * works", and the single word "contract" found it immediately.
   *
   * So this asks the question the other way round: how much of the CARD does what they said touch?
   * A card called "How contracting works" is relevant to a sentence mentioning contracts however
   * much else that sentence contains.
   *
   * IN MEMORY, AND THAT IS FINE. An organisation has tens of these, not thousands - they are
   * written by people, one per process - and the cap below is a backstop rather than a page size.
   * A scoring rule anybody can read beats a second piece of raw SQL nobody will.
   */
  async covering(organizationId: string, said: string, limit = 3) {
    const text = (said ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    if (!text.trim()) return [];

    /*
     * THE SAME RETRIEVAL THE ASSISTANT USES, FIRST. Title-word matching below found a card only when
     * its title happened to be in the sentence: four cards, matched on four titles. The trigram query
     * reads bodies too and ranks, so a card about contracting surfaces for a sentence about a
     * client's terms. The title match stays as the fallback for a database without pg_trgm.
     */
    const ranked = await this.scored(organizationId, said).catch(() => [] as { key: string; title: string; body: string; score: number }[]);
    if (ranked.length) return ranked.slice(0, limit).map((r) => ({ key: r.key, title: r.title, body: r.body }));

    const cards = await this.prisma.knowledgeCard.findMany({
      where: { organizationId, effectiveTo: null },
      select: { key: true, title: true, body: true },
      take: 200,
    });
    if (!cards.length) return [];

    const scored = cards.map((c) => {
      /* The card's own words - its title first, because that is what it is about. */
      const words = c.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
      if (!words.length) return { c, score: 0 };

      /*
       * Stems, loosely. "Contracting" in a title and "contract" in a sentence are the same subject,
       * and a check that missed that would fail on the commonest case there is.
       */
      const hit = words.filter((w) => text.includes(w) || text.includes(w.slice(0, Math.max(4, w.length - 3))));
      return { c, score: hit.length / words.length };
    });

    return scored
      .filter((s2) => s2.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s2) => ({ key: s2.c.key, title: s2.c.title, body: s2.c.body }));
  }

  /** The ranking, on its own, so the conversation's lookup and the assistant's retrieval score the same way. */
  private async scored(organizationId: string, query: string) {
    const q = (query ?? '').trim();
    if (q.length < 3) return [];
    const words = q.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
    const normalisedWords = words.length ? words : [q.toLowerCase().replace(/[^a-z0-9]/g, '')];

    return this.prisma.$queryRaw<{ id: string; title: string; body: string; kind: string; key: string; score: number }[]>(
      Prisma.sql`
        WITH scored AS (
          SELECT id, title, body, kind::text AS kind, key,
                 GREATEST(
                   similarity(title, ${q}),
                   similarity(body, ${q}) * 0.8,
                   CASE WHEN body ILIKE ${'%' + q + '%'} OR title ILIKE ${'%' + q + '%'} THEN 0.95 ELSE 0 END,
                   (
                     SELECT COALESCE(COUNT(*)::float / ${normalisedWords.length}, 0) * 0.85
                     FROM unnest(${normalisedWords}::text[]) AS w
                     WHERE regexp_replace(lower(title || ' ' || body), '[^a-z0-9]', '', 'g') LIKE '%' || w || '%'
                   )
                 ) AS score
          FROM knowledge_cards
          WHERE organization_id = ${organizationId} AND effective_to IS NULL
        )
        SELECT * FROM scored WHERE score >= 0.35 ORDER BY score DESC LIMIT ${MAX_CARDS}
      `,
    );

    /* The character cap is applied after ranking, so the best card is never the one dropped. */
  }

  async retrieve(organizationId: string, personExternalId: string, query: string) {
    const q = (query ?? '').trim();
    if (q.length < 3) return { cards: [], truncated: false };
    const rows = await this.scored(organizationId, q);
    const kept: typeof rows = [];
    let chars = 0;
    let truncated = false;
    for (const r of rows) {
      const size = r.title.length + r.body.length;
      if (chars + size > MAX_CHARS) { truncated = true; break; }
      kept.push(r);
      chars += size;
    }

    if (kept.length) {
      await this.prisma.knowledgeRetrieval.create({
        data: {
          organizationId, personExternalId, query: q,
          cards: kept.map((c) => ({ id: c.id, key: c.key, kind: c.kind, score: Number(c.score.toFixed(3)) })) as any,
        },
      }).catch(() => undefined);
    }
    return { cards: kept, truncated };
  }
}
