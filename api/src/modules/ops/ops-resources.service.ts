import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OpsResourceCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OpsProductStatementService } from './ops-product-statement.service';
import { WhatAReadingOfItSaysService } from './what-a-reading-of-it-says';
import {
  OneCheck,
  howItStands,
  whatTheWordsAlreadyShow,
  whyThisResourceIsNotReady,
  whyThisSignOffIsStale,
} from './what-a-resource-must-not-claim';

/**
 * The register of what we put in front of people.
 *
 * Every read of it recomputes how a resource stands against the CURRENT
 * statement — the stored checks say what was found and when, and the staleness
 * is worked out on read, so changing what we say we are cannot leave a page of
 * green sign-offs that are no longer true.
 */
@Injectable()
export class OpsResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statement: OpsProductStatementService,
    private readonly reading: WhatAReadingOfItSaysService,
  ) {}

  async register(input: {
    title: string;
    category: OpsResourceCategory;
    categoryDetail?: string;
    url?: string;
    content: string;
    risks: string[];
    addedById: string;
  }) {
    const notReady = whyThisResourceIsNotReady(input);
    if (notReady) throw new BadRequestException(notReady);

    const resource = await this.prisma.opsResource.create({
      data: {
        title: input.title.trim(),
        category: input.category,
        categoryDetail: input.categoryDetail?.trim() || null,
        url: input.url?.trim() || null,
        content: input.content,
        risks: input.risks.map((r) => r.trim()).filter(Boolean),
        addedById: input.addedById,
      },
    });

    /* Checked as it is entered rather than on a later button. A register whose
       checking is a separate act ends up as a register of unchecked things. */
    return this.check(resource.id);
  }

  /**
   * Run both passes and store what they found.
   *
   * The words pass always runs. The reading is merged over it where it has
   * something to say about the same claim, because a model that read the piece
   * and said CLEAR is better evidence than a word not appearing — but a claim
   * the words pass FLAGGED stays flagged: the model talking somebody out of a
   * word we decided not to use is exactly the argument we do not want to have
   * at eleven at night before a deck goes out.
   */
  async check(id: string) {
    const resource = await this.prisma.opsResource.findUnique({ where: { id } });
    if (!resource) throw new NotFoundException('No resource with that id.');

    const statement = await this.statement.current();
    const words = whatTheWordsAlreadyShow(resource, statement);
    const read = await this.reading.read(resource, statement);

    const byClaim = new Map<string, OneCheck>(words.map((c) => [c.claim, c]));
    for (const c of read?.checks ?? []) {
      const existing = byClaim.get(c.claim);
      if (existing?.verdict === 'SAYS_WHAT_WE_ARE_NOT') continue;
      byClaim.set(c.claim, c);
    }

    const checks = [...byClaim.values()];

    await this.prisma.opsResource.update({
      where: { id },
      data: {
        checks: checks as unknown as object[],
        checkedAgainstVersion: statement.version,
        checkedAt: new Date(),
        checkSays:
          read?.says ??
          'Checked against the words only — nothing read it. A claim made without our words would not be caught by this.',
      },
    });

    return this.one(id);
  }

  /** One resource, with how it stands against the statement as it is now. */
  async one(id: string) {
    const resource = await this.prisma.opsResource.findUnique({ where: { id } });
    if (!resource) throw new NotFoundException('No resource with that id.');

    const statement = await this.statement.current();
    return this.asItStands(resource, statement.version);
  }

  /** The register. Newest first; nothing is ranked by how well it did. */
  async all() {
    const [resources, statement] = await Promise.all([
      this.prisma.opsResource.findMany({ orderBy: { addedAt: 'desc' } }),
      this.statement.current(),
    ]);

    return {
      checkedAgainst: { version: statement.version, headline: statement.headline },
      resources: resources.map((r) => this.asItStands(r, statement.version)),
    };
  }

  private asItStands(
    resource: {
      id: string;
      title: string;
      category: OpsResourceCategory;
      categoryDetail: string | null;
      url: string | null;
      risks: string[];
      checks: unknown;
      checkedAgainstVersion: number | null;
      checkedAt: Date | null;
      checkSays: string | null;
      addedAt: Date;
    },
    currentVersion: number,
  ) {
    const checks = (resource.checks ?? null) as OneCheck[] | null;

    return {
      id: resource.id,
      title: resource.title,
      category: resource.category,
      categoryDetail: resource.categoryDetail,
      url: resource.url,
      risks: resource.risks,
      addedAt: resource.addedAt,
      checks,
      checkSays: resource.checkSays,
      checkedAt: resource.checkedAt,
      standing: howItStands(checks),
      stale: whyThisSignOffIsStale({
        checkedAgainstVersion: resource.checkedAgainstVersion,
        currentVersion,
      }),
    };
  }
}
