import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeKind, Prisma } from '@prisma/client';

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
const STOPWORDS = new Set(['the', 'and', 'for', 'our', 'you', 'your', 'how', 'what', 'does', 'with', 'this', 'that', 'are', 'can']);

/** A card cap and a token budget, because a prompt that grows with a customer's handbook is a bill. */
export const MAX_CARDS = 5;
export const MAX_CHARS = 6_000;

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(private readonly prisma: PrismaService) {}

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
  async retrieve(organizationId: string, personExternalId: string, query: string) {
    const q = (query ?? '').trim();
    if (q.length < 3) return { cards: [], truncated: false };

    /*
     * `similarity` over title and body, plus a plain ILIKE pass so an exact phrase always wins even
     * when it is long enough to dilute a trigram score. Only current cards: an answer should come
     * from what is true now, and the history exists to explain old findings rather than new ones.
     */
    /*
     * A WORD PASS AS WELL AS A PHRASE PASS, AND THE WORDS ARE NORMALISED.
     *
     * Trigram similarity alone missed "swap oncall" against a card titled "The on-call rota": the
     * hyphen breaks the trigrams and a long body dilutes the score below any useful threshold.
     * Found by asking it, not by reading it.
     *
     * So punctuation is stripped from both sides before the word comparison - "on-call", "on call"
     * and "oncall" are the same word to somebody typing a question, and a retrieval that insists
     * otherwise is one that fails on the day it matters.
     */
    const words = q.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
    const normalisedWords = words.length ? words : [q.toLowerCase().replace(/[^a-z0-9]/g, '')];

    const rows = await this.prisma.$queryRaw<{ id: string; title: string; body: string; kind: string; key: string; score: number }[]>(
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
