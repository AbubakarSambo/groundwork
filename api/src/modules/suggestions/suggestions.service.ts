import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { labelsForParties, namesVisibleTo, viewerLabelOf, withNames, displayName } from '../reports/party-labels';
import { peersAreNamedOn } from '../reports/peers-are-named';
import {
  A_LABEL_ON_A_PERSON,
  APPEAL_OUTCOMES,
  VERDICTS,
  forAnAdmin,
  forTheLead,
  forThePerson,
  type ForAnAdmin,
  type ForTheLead,
  type ForThePerson,
  type SuggestionRow,
  type WhoIsWho,
} from './a-suggestion-told-like-a-signal';

/** The words the server says when it refuses, in plain full sentences. */
export const REFUSED = {
  notInIt: 'You are not part of this check-in.',
  notFound: 'That suggestion was not found.',
  onlyTheLead: 'Only the person who runs this check-in decides.',
  onlyThePerson: 'Only the person this is about can do this.',
  onlyAnAdmin: 'Only an admin of this organisation decides an appeal.',
  yourOwnDecision: 'You made this decision, so another admin decides the appeal.',
  sayWhatYouDecided: 'Say what you decided.',
  sayWhy: 'Say why, in a sentence or two. The person this is about reads your reasons.',
  appealed: 'This decision has been appealed, so an admin decides it now.',
  writeYourSide: 'Write your side first.',
  nothingToAppeal: 'There is no decision to appeal yet.',
  alreadyAppealed: 'You have already appealed this decision.',
  sayWhyYouDisagree: 'Say why you disagree.',
  noAppeal: 'There is no appeal to decide.',
  alreadyDecided: 'This appeal has already been decided.',
  keepOrChange: 'Choose whether the decision stays or is changed.',
  sayWhyToBoth: 'Say why. Both of them read your reasons.',
} as const;

export interface Reader { userId: string; organizationId: string }

/** What the engine hands over when it reaches a verdict (docs/requests-to-engine.md, request 15). */
export interface ASuggestionFromTheEngine {
  groundId: string;
  aboutParticipantId: string;
  verdict: string;
  headline: string;
  why: string;
  whatWouldChangeIt?: string | null;
  theirOwnAnswer?: string | null;
  ifYouAgree?: string | null;
  otherChoices?: string[] | null;
  forTheEnding?: string | null;
  factsForThem: string;
  whatWouldChangeItForThem?: string | null;
  promptVersionId?: string | null;
}

const PARTY_SELECT = {
  id: true, userId: true, partyType: true, roleAsDescribed: true, email: true, createdAt: true,
  user: { select: { firstName: true, lastName: true, email: true } },
} as const;

const firstName = (p: any): string | null =>
  p?.user?.firstName?.trim() || displayName(p ?? {}) || null;

/**
 * SUGGESTIONS FROM A VERDICT, AND APPEALS (C3, U.13). See a-suggestion-told-like-a-signal.ts for
 * what each reader is served. Every read and every change starts from who the reader is in this
 * check-in, decided here on the server:
 *
 *   the lead      runs the check-in (`Ground.initiatorId`). Reads and decides.
 *   the person    the participant the suggestion is about. Reads the facts and the decision, adds
 *                 their side, appeals.
 *   an admin      of the check-in's organisation. Reads a suggestion only once it is appealed, and
 *                 decides the appeal, unless they made the decision themselves.
 *   anybody else  reads nothing. A colleague in the same check-in gets an empty list; somebody not
 *                 in the check-in at all is refused.
 *
 * Nothing here sends an email. Nothing here changes a report, a board, a prompt or the engine.
 */
@Injectable()
export class SuggestionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * THE ENGINE'S DOOR IN. Not a route: only the engine's own code calls this, when it has a
   * suggestion to make. Text that puts a label on a person is refused for every field, and the
   * verdict must be one of the five.
   */
  async record(input: ASuggestionFromTheEngine) {
    if (!(VERDICTS as readonly string[]).includes(input.verdict)) {
      throw new BadRequestException(`"${input.verdict}" is not a verdict Groundwork keeps.`);
    }
    const texts = [
      input.headline, input.why, input.whatWouldChangeIt, input.theirOwnAnswer, input.ifYouAgree,
      ...(input.otherChoices ?? []), input.factsForThem, input.whatWouldChangeItForThem,
    ];
    if ([input.headline, input.why, input.factsForThem].some((t) => typeof t !== 'string' || !t.trim())) {
      throw new BadRequestException('A suggestion needs a headline, why, and the facts for the person it is about.');
    }
    if (texts.some((t) => t && A_LABEL_ON_A_PERSON.test(t))) {
      throw new BadRequestException('A suggestion never puts a label on a person. Say what happened instead.');
    }
    const ground = await this.prisma.ground.findUnique({ where: { id: input.groundId }, select: { id: true, organizationId: true } });
    if (!ground) throw new NotFoundException('Check-in not found');
    const about = await this.prisma.groundParticipant.findFirst({
      where: { id: input.aboutParticipantId, groundId: input.groundId },
      select: { id: true },
    });
    if (!about) throw new BadRequestException('The person a suggestion is about must be in that check-in.');

    return this.prisma.suggestion.create({
      data: {
        organizationId: ground.organizationId,
        groundId: input.groundId,
        aboutParticipantId: input.aboutParticipantId,
        verdict: input.verdict,
        headline: input.headline.trim(),
        why: input.why.trim(),
        whatWouldChangeIt: input.whatWouldChangeIt?.trim() || null,
        theirOwnAnswer: input.theirOwnAnswer?.trim() || null,
        ifYouAgree: input.ifYouAgree?.trim() || null,
        otherChoices: (input.otherChoices ?? []).map((c) => c.trim()).filter(Boolean),
        forTheEnding: input.forTheEnding ?? null,
        factsForThem: input.factsForThem.trim(),
        whatWouldChangeItForThem: input.whatWouldChangeItForThem?.trim() || null,
        promptVersionId: input.promptVersionId ?? null,
      },
      select: { id: true },
    });
  }

  /** Every suggestion on one check-in, each in the shape this reader may read. */
  async forGround(groundId: string, reader: Reader): Promise<{ suggestions: (ForTheLead | ForThePerson | ForAnAdmin)[] }> {
    const ground = await this.theGround(groundId);
    const role = await this.whoIsTheReader(ground, reader);
    if (role === 'outsider') throw new ForbiddenException(REFUSED.notInIt);
    if (role === 'colleague') {
      /* A colleague may still be the person some of these are about. */
      const rows = await this.rows({ groundId, about: { userId: reader.userId } });
      const names = await this.deciders(rows);
      return { suggestions: rows.map((r) => forThePerson(r, this.whoIsWho(ground, r, 'person', names))) };
    }
    const rows = await this.rows({ groundId });
    const names = await this.deciders(rows);
    if (role === 'lead') {
      return { suggestions: rows.map((r) => forTheLead(r, this.whoIsWho(ground, r, 'lead', names))) };
    }
    /* An admin who is not in it: only what has been appealed. */
    return {
      suggestions: rows
        .map((r) => forAnAdmin(r, this.whoIsWho(ground, r, 'admin', names), reader.userId))
        .filter((s): s is ForAnAdmin => !!s),
    };
  }

  /** For the You board: every suggestion about the reader, in this organisation, as they may read it. */
  async aboutYou(reader: Reader): Promise<ForThePerson[]> {
    const rows = (await this.prisma.suggestion.findMany({
      where: { organizationId: reader.organizationId, about: { userId: reader.userId } },
      orderBy: { createdAt: 'desc' },
    })) as unknown as SuggestionRow[];
    const names = await this.deciders(rows);
    const out: ForThePerson[] = [];
    for (const r of rows) {
      const ground = await this.theGround(r.groundId);
      out.push(forThePerson(r, this.whoIsWho(ground, r, 'person', names)));
    }
    return out;
  }

  /** For an admin's Today: every appeal in their organisation still to be decided. */
  async appealsToDecide(reader: Reader): Promise<{ appeals: ForAnAdmin[] }> {
    if (!(await this.isAdminOf(reader.userId, reader.organizationId))) throw new ForbiddenException(REFUSED.onlyAnAdmin);
    const rows = (await this.prisma.suggestion.findMany({
      where: { organizationId: reader.organizationId, appealedAt: { not: null }, appealOutcome: null },
      orderBy: { appealedAt: 'asc' },
    })) as unknown as SuggestionRow[];
    const names = await this.deciders(rows);
    const appeals: ForAnAdmin[] = [];
    for (const r of rows) {
      const ground = await this.theGround(r.groundId);
      const shaped = forAnAdmin(r, this.whoIsWho(ground, r, 'admin', names), reader.userId);
      if (shaped) appeals.push(shaped);
    }
    return { appeals };
  }

  /** The lead decides, giving a reason. They may change it until it is appealed. */
  async decide(id: string, reader: Reader, input: { decision?: string; reasons?: string }) {
    const { row, ground } = await this.theSuggestion(id);
    if (ground.initiatorId !== reader.userId) throw new ForbiddenException(REFUSED.onlyTheLead);
    const decision = (input.decision ?? '').trim();
    const reasons = (input.reasons ?? '').trim();
    if (!decision) throw new BadRequestException(REFUSED.sayWhatYouDecided);
    if (!reasons) throw new BadRequestException(REFUSED.sayWhy);
    if (row.appeal) throw new BadRequestException(REFUSED.appealed);
    await this.prisma.suggestion.update({
      where: { id },
      data: { decision, decisionReason: reasons, decidedById: reader.userId, decidedAt: new Date() },
    });
    return this.forGround(ground.id, reader);
  }

  /** The person adds their side, before or after the decision, and may change it. */
  async addSide(id: string, reader: Reader, input: { side?: string }) {
    const { row, ground } = await this.theSuggestion(id);
    if (row.about?.userId !== reader.userId) throw new ForbiddenException(REFUSED.onlyThePerson);
    const side = (input.side ?? '').trim();
    if (!side) throw new BadRequestException(REFUSED.writeYourSide);
    await this.prisma.suggestion.update({ where: { id }, data: { theirSide: side, theirSideAt: new Date() } });
    return this.theOne(id, ground);
  }

  /** The person appeals the decision, once, saying why. */
  async appeal(id: string, reader: Reader, input: { why?: string }) {
    const { row, ground } = await this.theSuggestion(id);
    if (row.about?.userId !== reader.userId) throw new ForbiddenException(REFUSED.onlyThePerson);
    if (!row.decision) throw new BadRequestException(REFUSED.nothingToAppeal);
    if (row.appeal) throw new BadRequestException(REFUSED.alreadyAppealed);
    const why = (input.why ?? '').trim();
    if (!why) throw new BadRequestException(REFUSED.sayWhyYouDisagree);
    await this.prisma.suggestion.update({ where: { id }, data: { appeal: why, appealedAt: new Date() } });
    return this.theOne(id, ground);
  }

  /** An admin decides the appeal, giving reasons that the person and the lead both read. */
  async decideAppeal(id: string, reader: Reader, input: { outcome?: string; reasons?: string }) {
    const { row, ground } = await this.theSuggestion(id);
    if (!(await this.isAdminOf(reader.userId, ground.organizationId))) throw new ForbiddenException(REFUSED.onlyAnAdmin);
    if (row.decidedById === reader.userId || ground.initiatorId === reader.userId) throw new ForbiddenException(REFUSED.yourOwnDecision);
    if (row.about?.userId === reader.userId) throw new ForbiddenException(REFUSED.onlyAnAdmin);
    if (!row.appeal) throw new BadRequestException(REFUSED.noAppeal);
    if (row.appealOutcome) throw new BadRequestException(REFUSED.alreadyDecided);
    if (!(APPEAL_OUTCOMES as readonly string[]).includes(input.outcome ?? '')) throw new BadRequestException(REFUSED.keepOrChange);
    const reasons = (input.reasons ?? '').trim();
    if (!reasons) throw new BadRequestException(REFUSED.sayWhyToBoth);
    await this.prisma.suggestion.update({
      where: { id },
      data: { appealOutcome: input.outcome, appealReason: reasons, appealDecidedById: reader.userId, appealDecidedAt: new Date() },
    });
    return this.appealsToDecide(reader);
  }

  // ---------------------------------------------------------------------------------------------

  private async theOne(id: string, ground: any) {
    const rows = await this.rows({ id });
    const names = await this.deciders(rows);
    return forThePerson(rows[0], this.whoIsWho(ground, rows[0], 'person', names));
  }

  private async rows(where: any): Promise<SuggestionRow[]> {
    return (await this.prisma.suggestion.findMany({ where, orderBy: { createdAt: 'desc' } })) as unknown as SuggestionRow[];
  }

  private async theGround(groundId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        id: true, label: true, organizationId: true, initiatorId: true, scenario: true, peersVisibleToEachOther: true,
        participants: { select: PARTY_SELECT },
      },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    return ground as any;
  }

  private async theSuggestion(id: string) {
    const row = (await this.prisma.suggestion.findUnique({
      where: { id },
      include: { about: { select: { userId: true } } },
    })) as (SuggestionRow & { about?: { userId: string | null } }) | null;
    if (!row) throw new NotFoundException(REFUSED.notFound);
    const ground = await this.theGround(row.groundId);
    return { row, ground };
  }

  private async isAdminOf(userId: string, organizationId: string): Promise<boolean> {
    const m = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      select: { role: true },
    });
    return m?.role === 'ADMIN';
  }

  private async whoIsTheReader(ground: any, reader: Reader): Promise<'lead' | 'colleague' | 'admin' | 'outsider'> {
    if (ground.initiatorId === reader.userId) return 'lead';
    if ((ground.participants ?? []).some((p: any) => p.userId === reader.userId)) return 'colleague';
    if (await this.isAdminOf(reader.userId, ground.organizationId)) return 'admin';
    return 'outsider';
  }

  /**
   * WHO IS WHO, BY THE NAMES THIS READER MAY READ. The engine's text is stored in labels, like a
   * report; the lead and an admin read it as the lead does (every name), and the person reads it
   * as themselves, so their own label becomes "you".
   */
  private whoIsWho(ground: any, row: SuggestionRow, as: 'lead' | 'person' | 'admin', deciders: Map<string, string>): WhoIsWho {
    const parties = (ground.participants ?? []) as any[];
    const lead = parties.find((p) => p.userId === ground.initiatorId) ?? parties.find((p) => p.partyType === 'INITIATOR');
    const about = parties.find((p) => p.id === row.aboutParticipantId);
    const viewer = as === 'person' ? about : lead;
    const visible = namesVisibleTo(viewer?.id ?? null, parties, peersAreNamedOn(ground));
    const allLabels = [...labelsForParties(parties).values()];
    const viewerLabel = as === 'person' ? viewerLabelOf(about?.id ?? null, parties) : null;
    return {
      checkIn: { id: ground.id, label: ground.label },
      aboutName: firstName(about) ?? 'This person',
      leadName: firstName(lead) ?? 'Your lead',
      appealDeciderName: row.appealDecidedById ? (deciders.get(row.appealDecidedById) ?? null) : null,
      name: (text: string) => withNames(text, visible, allLabels, { viewerLabel }),
    };
  }

  /** The first names of the admins who decided these appeals, so each reader is told who decided. */
  private async deciders(rows: SuggestionRow[]): Promise<Map<string, string>> {
    const ids = [...new Set(rows.map((r) => r.appealDecidedById).filter((x): x is string => !!x))];
    if (!ids.length) return new Map();
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true } });
    return new Map(users.filter((u) => u.firstName?.trim()).map((u) => [u.id, u.firstName.trim()]));
  }
}
