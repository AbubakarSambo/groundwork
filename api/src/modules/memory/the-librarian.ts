import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { catalogueLine, renderFor, renderForTheAssistant, roughTokens, type AMemoryFile } from './the-memory-format';
import { theReaderOf, theSectionsFor, theSectionsTheAssistantMayUse, type TheReader } from './who-reads-memory';
import { AnthropicService } from '../conversation/anthropic.service';
import { PromptsService } from '../prompts/prompts.service';
import { pickWithTheModel, type TheEngineModuleEngine, type TheModelPrompts } from './pick-the-books';

/**
 * THE LIBRARIAN (docs/groundwork-memory-system.md, section 5; step 3). It finds and pulls the right books for a conversation, a page or the
 * assistant, and writes nothing.
 *
 *  1. THE CATALOGUE FIRST. One line per book: where it is, what it is about, how fresh. Never the contents.
 *  2. SCOPE BY WHERE YOU ARE. Asked from a check-in, the organisation's book and that team's books; asked with no check-in, everything the
 *     reader may read in the organisation. The reader's own check-ins come first.
 *  3. FILTER BEFORE ANYTHING IS READ. A reader is given only the sections they may read (who-reads-memory.ts). A book with nothing a reader
 *     may read is not in their catalogue, so a model that is handed the catalogue cannot even learn that it exists.
 *  4. CHOOSE, THEN OPEN. The model chooses the few books a question needs from the catalogue lines (understand, not match), and only those
 *     are opened. With few books, or no model, the books in scope are all opened up to a small limit.
 *  5. SAY WHAT WAS LEFT OUT, so a short answer is never mistaken for a whole one.
 *
 * Every call measures what it handed over against what the whole shelf would have cost, in rough tokens, and how long it took.
 */

export const MOST_BOOKS_OPENED = 4;
/** With this few books in scope there is nothing to choose between. */
const NOTHING_TO_CHOOSE = 4;

export interface TheCatalogueEntry { path: string; kind: AMemoryFile['kind']; label: string; version: number; updatedAt: string; reviewBy: string; sections: number; line: string }
export interface WhereYouAre { groundId?: string }
export interface WhatWasPulled {
  books: { path: string; label: string; markdown: string }[];
  /** Books in scope that were not opened, in plain words, so the answer can say there is more. */
  leftOut: string[];
  measure: { booksInScope: number; booksOpened: number; catalogueTokens: number; openedTokens: number; wholeShelfTokens: number; ms: number; modelCalls: number };
}

@Injectable()
export class Librarian {
  constructor(
    @Optional() private readonly prisma: PrismaService,
    @Optional() private readonly engine?: AnthropicService | TheEngineModuleEngine | null,
    @Optional() private readonly prompts?: PromptsService | TheModelPrompts | null,
  ) {}

  /** The newest version of every book in the organisation, as stored. */
  private async theShelf(organizationId: string): Promise<AMemoryFile[]> {
    const rows: any[] = await (this.prisma as any).memoryFile.findMany({ where: { organizationId }, orderBy: [{ path: 'asc' }, { version: 'desc' }], distinct: ['path'], select: { path: true, kind: true, header: true, sections: true } });
    return rows.map((r) => ({ path: r.path, kind: r.kind, header: r.header, sections: r.sections }));
  }

  private inScope(files: AMemoryFile[], where: WhereYouAre, reader: TheReader): AMemoryFile[] {
    const own = new Set(reader.takesPartIn.values());
    return files
      .filter((f) => f.kind === 'org' || f.kind === 'project' || !where.groundId || f.header.scope.groundId === where.groundId)
      /* What the reader owns comes first, then the organisation, then the rest. */
      .sort((a, b) => rank(a, own) - rank(b, own));
  }

  async catalogueFor(reader: TheReader, where: WhereYouAre = {}): Promise<TheCatalogueEntry[]> {
    return this.catalogueOf(reader, where, await this.theShelf(reader.organizationId));
  }

  private catalogueOf(reader: TheReader, where: WhereYouAre, shelf: AMemoryFile[], forTheAssistant = false): TheCatalogueEntry[] {
    const out: TheCatalogueEntry[] = [];
    for (const f of this.inScope(shelf, where, reader)) {
      const n = (forTheAssistant ? theSectionsTheAssistantMayUse(reader, f) : theSectionsFor(reader, f)).length;
      if (!n) continue;
      out.push({ path: f.path, kind: f.kind, label: f.header.subject.label, version: f.header.version, updatedAt: f.header.updatedAt, reviewBy: f.header.reviewBy, sections: n, line: catalogueLine(f, n) });
    }
    return out;
  }

  /** The books at these paths, each with only the sections this reader may read. A path the reader may not read is simply not there. */
  async open(reader: TheReader, paths: string[]): Promise<{ path: string; label: string; markdown: string }[]> {
    const shelf = await this.theShelf(reader.organizationId);
    return this.opened(reader, paths, shelf);
  }

  private opened(reader: TheReader, paths: string[], shelf: AMemoryFile[], forTheAssistant = false) {
    const out: { path: string; label: string; markdown: string }[] = [];
    for (const path of paths) {
      const f = shelf.find((x) => x.path === path);
      if (!f) continue;
      const sections = forTheAssistant ? theSectionsTheAssistantMayUse(reader, f) : theSectionsFor(reader, f);
      if (!sections.length) continue;
      out.push({ path: f.path, label: f.header.subject.label, markdown: forTheAssistant ? renderForTheAssistant(f, sections) : renderFor(f, sections) });
    }
    return out;
  }

  async pull(userId: string, organizationId: string, question: string, where: WhereYouAre = {}): Promise<WhatWasPulled> {
    return this.pullFor(await theReaderOf(this.prisma, userId, organizationId), question, where);
  }

  /** What the assistant is handed for a question: books from the librarian's choice, with no person's book and no lead-only section (theSectionsTheAssistantMayUse). */
  async pullForTheAssistant(userId: string, organizationId: string, question: string, where: WhereYouAre = {}): Promise<WhatWasPulled> {
    return this.pullFor(await theReaderOf(this.prisma, userId, organizationId), question, where, true);
  }

  async pullFor(reader: TheReader, question: string, where: WhereYouAre = {}, forTheAssistant = false): Promise<WhatWasPulled> {
    const t0 = Date.now();
    const shelf = await this.theShelf(reader.organizationId);
    const catalogue = this.catalogueOf(reader, where, shelf, forTheAssistant);
    let modelCalls = 0;
    let chosen = catalogue.map((c) => c.path);
    if (catalogue.length > NOTHING_TO_CHOOSE && this.engine) {
      modelCalls = 1;
      const picked = await pickWithTheModel(this.engine as TheEngineModuleEngine, this.prompts as TheModelPrompts | null, catalogue.map((c) => c.line), question).catch(() => null);
      /* Only a path that is in the reader's own catalogue can be opened, whatever the model says. */
      const allowed = new Set(catalogue.map((c) => c.path));
      if (picked && picked.length) chosen = picked.filter((p) => allowed.has(p));
    }
    const opened = chosen.slice(0, MOST_BOOKS_OPENED);
    const books = this.opened(reader, opened, shelf, forTheAssistant);
    const leftOut = catalogue.filter((c) => !books.some((b) => b.path === c.path)).map((c) => `${c.label} (${c.path})`);
    const whole = this.opened(reader, catalogue.map((c) => c.path), shelf, forTheAssistant);
    return {
      books, leftOut,
      measure: {
        booksInScope: catalogue.length, booksOpened: books.length,
        catalogueTokens: roughTokens(catalogue.map((c) => c.line).join('\n')),
        openedTokens: roughTokens(books.map((b) => b.markdown).join('\n')),
        wholeShelfTokens: roughTokens(whole.map((b) => b.markdown).join('\n')),
        ms: Date.now() - t0, modelCalls,
      },
    };
  }
}

/** The reader's own book first, the organisation's next, then the rest. */
function rank(f: AMemoryFile, own: Set<string>): number {
  if (f.header.scope.participantId && own.has(f.header.scope.participantId)) return 0;
  if (f.kind === 'org') return 1;
  if (f.kind === 'team') return 2;
  return 3;
}
