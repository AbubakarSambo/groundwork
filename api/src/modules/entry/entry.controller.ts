import { Controller, Post, Get, Patch, Body, Query, UnauthorizedException, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public, CurrentUser, CurrentUserData } from '../../common';
import { ATurnDto, A_HISTORY_MAX_TURNS, A_MESSAGE_MAX } from '../../common/dto';
import { EntryService } from './entry.service';
import { IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested, ArrayMaxSize, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * THE HISTORY IS CLIENT-SUPPLIED AND REPLAYED TO THE MODEL, so `role` is load-bearing: a bare string
 * let an anonymous caller forge assistant turns. The shared turn class refuses anything but user or
 * assistant, caps a user turn like a message, and caps an assistant turn at the model's own limit.
 */
class TurnDto extends ATurnDto {}

export class EntryChatDto {
  @IsArray()
  @ArrayMaxSize(A_HISTORY_MAX_TURNS)
  @ValidateNested({ each: true })
  @Type(() => TurnDto)
  messages: TurnDto[];

  @IsOptional()
  @IsString()
  scenario?: string;

  @IsOptional()
  @IsString()
  groundLabel?: string;
}

class EntryOnboardDto {
  @IsArray()
  @ArrayMaxSize(A_HISTORY_MAX_TURNS)
  @ValidateNested({ each: true })
  @Type(() => TurnDto)
  messages: TurnDto[];

  /**
   * THE SITUATION THEY PICKED, WHICH THIS ROUTE USED NOT TO BE TOLD.
   *
   * It took the messages and nothing else, so one prompt served all twenty-two cards and every
   * situation opened with the same generic question - the complaint that started this. The card is
   * known at the moment it is clicked, at both doors, and it was simply never sent.
   *
   * Optional because it honestly is: somebody describing their own situation has not got one yet,
   * and the classifier runs on their first answer. An unknown value is ignored rather than refused,
   * for the same reason - a stale client must not be unable to set anything up.
   */
  @IsOptional()
  @IsString()
  scenario?: string;

  /** Where in the arc this sits. Only the cohort card reads it, and it reads it to ask a different
   *  first question for onboarding a group than for an ongoing read of one. */
  @IsOptional()
  @IsString()
  moment?: string;
}

class EntryOpenerDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  scenario?: string;
}

/** classify-intent took an inline type, which the validation pipe cannot see, so `description` was unbounded. */
class EntryClassifyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(A_MESSAGE_MAX)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mode?: string;
}

/**
 * THE LAST THREE PUBLIC HANDLERS ON INLINE TYPES. An inline body type is invisible to the validation
 * pipe, so these took anything. The service checks that stay behind them are kept: a DTO is the
 * door's posture, the service's checks are its own (a-check-that-can-never-be-true allows the one
 * on joinToken for exactly this reason).
 */
class EntryDraftPatchDto {
  @IsString() @IsNotEmpty() @MaxLength(200) draftToken: string;
  @IsObject() payload: Record<string, any>;
}

class EntryJoinAcceptDto {
  @IsString() @IsNotEmpty() @MaxLength(200) joinToken: string;
  @IsEmail() @MaxLength(254) email: string;
  @IsOptional() @IsString() @MaxLength(120) firstName?: string;
  @IsOptional() @IsString() @MaxLength(120) lastName?: string;
  @IsOptional() @IsString() @MaxLength(500) roleAsDescribed?: string;
  /** Optional, never inferred; blank means blank. */
  @IsOptional() @IsString() @MaxLength(120) department?: string;
  /** The honeypot on the join form. Filled means a bot; answered as success, mails nobody. */
  @IsOptional() @IsBoolean() trapFilled?: boolean;
}

class EntryJoinConfirmDto {
  @IsString() @IsNotEmpty() @MaxLength(200) token: string;
}

class EntryFaqDto {
  @IsString()
  @MaxLength(1000)
  question: string;
}

class EntryReportDto {
  @IsArray()
  @ArrayMaxSize(A_HISTORY_MAX_TURNS)
  @ValidateNested({ each: true })
  @Type(() => TurnDto)
  messages: TurnDto[];

  @IsOptional()
  @IsString()
  scenario?: string;

  @IsOptional()
  @IsString()
  groundLabel?: string;
}

class ContributorDto {
  @IsString() email: string;
  @IsOptional() @IsString() context?: string;
  @IsOptional() @IsString() inviteToken?: string;
  @IsOptional() @IsString() note?: string;
}

// Coordinator path: the committer is setting the ground up for someone ELSE to
// run. The lead is invited to confirm and becomes the initiator; the committer
// is recorded as createdByUserId only (no participant row, no phantom check-in).
class EntryLeadDto {
  @IsEmail() email: string;
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) contextNote?: string;
}

// The committer's own private session report, sent as a narrowed summary (not
// the full EntryReport) - entry.service.ts's commit() reads whatGroundworkSaw
// off this to populate the ground's brief when no explicit `brief` was given.
// This DTO was missing entirely from 2026-06-24 (e078b0d) until now: the
// client has sent `reportSummary` (not `report`) since that commit, but this
// class never grew a matching field, so the global ValidationPipe's
// forbidNonWhitelisted rejected every commit carrying one with 400 "property
// reportSummary should not exist" - i.e. every commit where the committer had
// completed their own check-in session before saving. The client and service
// were already correct; only this DTO was stale.
/*
 * THE WHOLE REPORT, NOT TWO FIELDS OF IT. The person read nine fields at the end of their entry
 * chat; this DTO carried two, the merge rebuilt a one-key object from them, and that one key is what
 * was written to CheckIn.sessionReport. Seven of nine fields were shown and then dropped at the
 * moment they made an account - "the report looks nothing like what I got at the end", four times.
 * Every key the client's EntryReport has is declared here, because forbidNonWhitelisted turns an
 * undeclared key into a 400 (which is how this DTO came to exist in the first place).
 */
class EntryReportSummaryDto {
  @IsIn(['Unresolved', 'Mixed', 'Emerging', 'Clear', 'Aligned'])
  alignmentStatus: 'Unresolved' | 'Mixed' | 'Emerging' | 'Clear' | 'Aligned';

  @IsString() @MaxLength(6000)
  whatGroundworkSaw: string;

  @IsOptional() @IsString() @MaxLength(500)
  yourRole?: string | null;

  @IsOptional() @IsString() @MaxLength(4000)
  alignmentBasis?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(50)
  areasRequiringAlignment?: { title: string; observation: string; whyItMatters: string; recommendedMove: string }[];

  @IsOptional() @IsArray() @ArrayMaxSize(50)
  alignmentReached?: { title: string; note: string }[];

  @IsOptional() @IsObject()
  honestClose?: { aligned: string; open: string; revisit: string; risk: string };

  @IsOptional() @IsArray() @ArrayMaxSize(100)
  mentionedPeople?: { name: string; context: string }[];

  @IsOptional() @IsArray() @ArrayMaxSize(100)
  alsoCameUp?: { name: string; context: string }[];

  @IsOptional() @IsString() @MaxLength(2000)
  alsoCameUpNote?: string | null;

  @IsOptional() @IsArray() @ArrayMaxSize(50)
  suggestedParties?: { role: string; reason: string }[];
}

export class EntryDocumentDto {
  @IsString() @MaxLength(300) fileName: string;
  /** Plain text only. The entry chat extracts text client-side before upload. */
  @IsString() @MaxLength(500_000) content: string;
  @IsOptional() @IsString() @MaxLength(120) mimeType?: string;
}

export class EntryCommitDto {
  @IsString() groundLabel: string;
  @IsOptional() @IsString() orgName?: string;
  @IsOptional() @IsString() scenario?: string;
  @IsOptional() @IsString() cadence?: string;
  /**
   * WHETHER THE CADENCE WAS CHOSEN OR IS THE PAGE'S DEFAULT. The client's `cadence` state starts at
   * FORTNIGHTLY and is sent whether or not anybody picked it, so the ground recorded a choice nobody
   * made. This says which, and the ground's `cadenceStated` follows it (fix plan B15).
   */
  @IsOptional() @IsBoolean() cadenceChosen?: boolean;
  @IsOptional() @IsInt() cadenceAnchorDay?: number;
  @IsOptional() @IsString() checkInBy?: string;
  @IsOptional() @IsString() lastCheckInBy?: string;

  // Coordinator/lead path only: the onboarding context, used as the ground's
  // brief since the coordinator has no session transcript to derive one from.
  @IsOptional() @IsString() @MaxLength(4000) brief?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EntryReportSummaryDto)
  reportSummary?: EntryReportSummaryDto;

  /**
   * TRUE WHEN THEY SAID THE OTHER PEOPLE CHECK IN AND THEY READ WHAT COMES BACK.
   *
   * Asked at the end of the setup conversation, where the wizard used to ask it on a form step. It
   * decides whether this person is given a session of their own to answer - so dropping it, which
   * is what happened while it had no field here, records somebody as a party who owes an account
   * when they have just said they are not one.
   */
  @IsOptional()
  @IsBoolean()
  managingOnly?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => EntryLeadDto)
  lead?: EntryLeadDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TurnDto)
  history: TurnDto[];

  @IsOptional()
  report?: any;

  /** The setter's own part in this, one line. Setup asks it; this is where the answer lands. */
  @IsOptional() @IsString() @MaxLength(300) roleAsDescribed?: string;

  /**
   * DOCUMENTS ATTACHED DURING THE ENTRY CHAT.
   *
   * Without this the entry flow's "+ Doc" control produced nothing durable. It
   * built a chat message - `[Document: "name"] <text> Context from me: ...` - which
   * landed in the transcript and created no GroundDocument. So somebody attaching a
   * contract at the exact moment the product asks for evidence had attached nothing
   * the product keeps: no entry in Documents, no visibility setting, no assessment,
   * and it never counted toward the document-backed share of the record, which the
   * report measures and shows to both parties.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntryDocumentDto)
  documents?: EntryDocumentDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContributorDto)
  contributors: ContributorDto[];
}

@Controller('entry')
export class EntryController {
  constructor(private service: EntryService) {}

  /** Pre-auth update of the server-side entry draft, authorized by the bearer
   * draftToken issued at entry-save. Carries post-email edits (org name,
   * ground name, cadence, contributors) that previously lived only in
   * localStorage and were lost when the magic link opened elsewhere. */
  @Public()
  /* `global`, not `default`: the throttler is registered under the name `global`
     in app.module.ts, and a limit named for a throttler that does not exist is a
     silent no-op — this route was falling back to the plain 60/min. */
  @Throttle({ global: { limit: 30, ttl: 60_000 } })
  @Patch('draft')
  async patchDraft(@Body() body: EntryDraftPatchDto) {
    return this.service.patchDraft(body.draftToken, body.payload);
  }

  @Public()
  @Post('onboard')
  @Throttle({ global: { limit: 30, ttl: 60000 } })
  async onboard(@Body() dto: EntryOnboardDto) {
    return this.service.onboard(dto.messages, dto.scenario, dto.moment);
  }

  /*
   * THE SAME TWO CALLS, STREAMED. Setup sat on "Thinking" for the whole of a model turn; the
   * check-in page has streamed for months. Same guard, same reply at the end: the `done` event
   * carries exactly what the plain route would have returned.
   */
  @Public()
  @Post('onboard/stream')
  @Throttle({ global: { limit: 30, ttl: 60000 } })
  async onboardStream(@Body() dto: EntryOnboardDto, @Res() res: Response) {
    this.openStream(res);
    const write = (data: unknown) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    try {
      const out = await this.service.onboard(dto.messages, dto.scenario, dto.moment, (text) => write({ type: 'delta', text }));
      write({ type: 'done', ...out });
    } catch (err: any) {
      write({ type: 'error', message: err?.message ?? 'stream failed' });
    } finally {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }

  @Public()
  @Post('chat/stream')
  @Throttle({ global: { limit: 30, ttl: 60000 } })
  async chatStream(@Body() dto: EntryChatDto, @Res() res: Response) {
    this.openStream(res);
    const write = (data: unknown) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    try {
      const { reply, closed } = await this.service.chat(dto.messages, dto.scenario, dto.groundLabel, (text) => write({ type: 'delta', text }));
      write({ type: 'done', reply, sessionComplete: this.sessionCompleteFrom(reply, closed) });
    } catch (err: any) {
      write({ type: 'error', message: err?.message ?? 'stream failed' });
    } finally {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }


  /* `closed` travels with the reply it belongs to (entry.service#chat) - never read off the service. */
  private sessionCompleteFrom(reply: string, markerClosed: boolean): boolean {
    const r = reply.toLowerCase();
    const sessionComplete =
      markerClosed ||
      r.includes('[session complete]') ||
      r.includes('your account is now on record') ||
      r.includes('your record is here') ||
      r.includes('your record is saved as is') ||
      r.includes('cannot be verified from this account') ||
      r.includes('your contribution is saved');
        return sessionComplete;
  }

  private chatResponse(reply: string, closed: boolean) {
    const sessionComplete = this.sessionCompleteFrom(reply, closed);
    return { reply, sessionComplete };
  }

  private openStream(res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
  }

  @Public()
  @Post('opener')
  @Throttle({ global: { limit: 30, ttl: 60000 } })
  opener(@Body() dto: EntryOpenerDto) {
    return { reply: this.service.opener(dto.scenario) };
  }

  @Public()
  @Post('chat')
  @Throttle({ global: { limit: 30, ttl: 60000 } })
  async chat(@Body() dto: EntryChatDto) {
    const { reply, closed } = await this.service.chat(dto.messages, dto.scenario, dto.groundLabel);
    /**
     * THE MARKER FIRST, THE PHRASES ONLY AS A BACKSTOP.
     *
     * This used to be phrases alone, and none of them matched the marker the model is told to emit:
     * it tests for "[session complete]" and the marker is "[[SESSION_COMPLETE]]". So the reliable
     * signal was never consulted, and whether a session closed depended on the assistant happening
     * to use one of six wordings.
     */
    return this.chatResponse(reply, closed);
  }

  @Public()
  @Post('classify-intent')
  @Throttle({ global: { limit: 30, ttl: 60000 } })
  async classifyIntent(@Body() dto: EntryClassifyDto) {
    return this.service.classifyIntent(dto.description, dto.mode);
  }

  @Public()
  @Post('faq')
  @Throttle({ global: { limit: 30, ttl: 60000 } })
  async faq(@Body() dto: EntryFaqDto) {
    const reply = await this.service.faq(dto.question);
    return { reply };
  }

  @Public()
  @Post('report')
  @Throttle({ global: { limit: 20, ttl: 60000 } })
  async report(@Body() dto: EntryReportDto) {
    const report = await this.service.report(dto.messages, dto.scenario, dto.groundLabel);
    return { report };
  }
}

@Controller('entry')
export class EntryCommitController {
  constructor(private service: EntryService) {}

  @Post('commit')
  async commit(@CurrentUser() user: CurrentUserData, @Body() dto: EntryCommitDto) {
    if (!user?.organizationId) throw new UnauthorizedException('Account not linked to an organisation');
    return this.service.commit(user.organizationId, user.id, dto);
  }

  @Public()
  @Get('join-preview')
  async joinPreview(@Query('t') token: string) {
    return this.service.joinPreview(token);
  }

  /**
   * ASKING TO JOIN. This does not sign anybody in — see
   * `a-join-link-is-not-a-password.ts`. Throttled because it sends mail to an
   * address the caller chose.
   */
  @Public()
  @Throttle({ global: { limit: 5, ttl: 60000 } })
  @Post('join-accept')
  async joinAccept(@Body() dto: EntryJoinAcceptDto) {
    return this.service.askToJoin(dto);
  }

  /** The address answered. This is the one that creates anything. */
  @Public()
  @Throttle({ global: { limit: 10, ttl: 60000 } })
  @Post('join-confirm')
  async joinConfirm(@Body() dto: EntryJoinConfirmDto) {
    return this.service.joinConfirm(dto.token);
  }
}
