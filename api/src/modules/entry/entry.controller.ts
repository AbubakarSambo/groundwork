import { Controller, Post, Get, Patch, Body, Query, UnauthorizedException, BadRequestException, Res, Req, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public, OptionalAuth, CurrentUser, CurrentUserData } from '../../common';
import { ATurnDto, A_HISTORY_MAX_TURNS, A_MESSAGE_MAX } from '../../common/dto';
import { A_STREAM_FAILED } from '../../common/published-surfaces';
import { EntryService } from './entry.service';
import { TheOpenLinkService } from './the-open-link.service';
import { A_ROOM_MAY_START_PER_MINUTE, A_PERSON_MAY_SAY_PER_MINUTE } from '../../common/guards/a-room-of-people-is-not-one-person';
import { HOW_MANY_PEOPLE_ONE_CHECK_IN_HOLDS } from './how-many-people-one-check-in-holds';
import { IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested, ArrayMaxSize, IsObject, Min, Max, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * THE POSTURE OF THIS CONTROLLER, STATED ONCE. Every handler here is anonymous. Each one therefore
 * has all three of: a DTO class (the pipe cannot see an inline type), a @Throttle naming the one
 * registered throttler, and - where it reaches the model - a usage event, so anonymous spend is
 * visible. Five handlers had five different answers to those three questions before this was
 * written down (fix plan B14, F13); a guard in common/dto enumerates the handlers rather than
 * listing them, so the next one added inherits the answer.
 */

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

  /**
   * WHO SETUP ALREADY NAMED, so the check-in does not ask for them again.
   *
   * Watched in a browser: a lead named all three people, named them again two turns later, and was
   * asked "who else is involved in this project?". The block that stops that on the signed-in side
   * needs the names, and this endpoint never carried them.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(40)
  peopleNamed?: string[];

  /**
   * WHAT THEY SAID IN SETUP, WHICH THE CHECK-IN TREATED AS SOMEBODY ELSE'S WORDS.
   *
   * The invention gate reads the user turns of the CURRENT phase, and the check-in starts a new
   * one. So everything typed during setup - the place, the deadline, the people - became a name
   * nobody said the moment the check-in began, and sentences carrying it were deleted mid-reply:
   *
   *   dropped a sentence: a name nobody said (Kano) in "Twice a month for the Kano distributor."
   *   dropped a sentence: a name nobody said (Amina) in "And what about Amina's part in this?"
   *
   * Both were in her first message. This carries those words across the phase boundary so her own
   * vocabulary is recognised as hers.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(40)
  alreadySaid?: string[];
}

/**
 * WHO IS ASKING, IF ANYBODY. `@OptionalAuth()` fills `req.user` when a session exists and leaves it
 * undefined when it does not, so this reads as "a stranger" without a branch at every call site.
 */
function whoIsAsking(req: any): { userId: string; organizationId: string } | null {
  const u = req?.user;
  return u?.id && u?.organizationId ? { userId: u.id, organizationId: u.organizationId } : null;
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

  /**
   * WHAT THE LAST TURN ALREADY WORKED OUT, HANDED BACK.
   *
   * The screen holds it - it is what the summary card renders - and setup was throwing it away
   * every turn and re-reading the whole situation off the transcript. See
   * what-setup-already-knows-travels-with-it for what that cost live.
   *
   * Not validated field by field, deliberately: it is this route's OWN previous answer coming
   * back, every field is optional, and a shape that does not match is rendered as text in a prompt
   * and nothing else. What it must not be is large, so it is capped.
   */
  @IsOptional()
  @IsObject()
  soFar?: Record<string, unknown>;
}

class EntryOpenerDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  scenario?: string;

  /** Where the link that brought the visitor was shared (the `?source=` on it). A short word; anything else is dropped. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;
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

  /**
   * The situation the lead chose from the list, as its key (for example "PIP"). When it is one, the
   * classifier keeps it: only the lead switches a situation she chose, with "It's something else"
   * (request 35).
   */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  picked?: string;
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

  /* Who setup already named. The chat has had these for a while; the report had not, so a lead who
     listed her team in setup got a report telling her the team was not named. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  peopleNamed?: string[];

  /* The anchor conversation only: what the lead's first conversation heard, under the seven keys it served, so the reveal says what she said. */
  @IsOptional()
  @IsObject()
  anchorItems?: Record<string, unknown>;
}

class ContributorDto {
  /* Blank when a colleague was picked by id (U.4); the server looks the address up before anything else. */
  @ValidateIf((o: ContributorDto) => !o.colleagueId) @IsString() email: string;
  @IsOptional() @IsString() @MaxLength(64) colleagueId?: string;
  @IsOptional() @IsString() context?: string;
  /* "Name + email" (anchor section 13): what the lead calls this person, kept beside the address. */
  @IsOptional() @IsString() @MaxLength(120) displayName?: string;
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
/**
 * THE ITEMS INSIDE THE REPORT'S ARRAYS, DECLARED - AND THIS WAS THE BUG.
 *
 * The arrays below were `@IsOptional() @IsArray()` with no item type. The global pipe runs with
 * `whitelist: true`, which strips every property it was not told about - and with no `@Type()` on
 * the item, it was told about none of them. So each `{title, observation, whyItMatters,
 * recommendedMove}` arrived, passed validation, and was written to the database with nothing left
 * in it.
 *
 * WHAT THAT LOOKED LIKE. The report the person read at the end of their session was complete: it
 * comes straight back from `POST /entry/report` and never passes through this pipe. The copy stored
 * on their check-in went through here, so when they opened the same report a minute later from
 * Report, it was three cards headed "What we noticed", "Why it matters" and "What to do next" with
 * no words under any of them. Reported four times as "the report looks nothing like what I got at
 * the end". It looked nothing like it because half of it had been stripped off in the doorway.
 *
 * Every array on this DTO gets its item type for the same reason. An `@IsArray()` with no `@Type()`
 * under a whitelisting pipe is not a loose check - it is a silent delete.
 */
class AreaRequiringAlignmentDto {
  @IsOptional() @IsString() @MaxLength(300) title?: string;
  @IsString() @MaxLength(4000) observation: string;
  @IsString() @MaxLength(4000) whyItMatters: string;
  @IsString() @MaxLength(4000) recommendedMove: string;
}

class AlignmentReachedDto {
  @IsOptional() @IsString() @MaxLength(300) title?: string;
  @IsString() @MaxLength(4000) note: string;
}

class PersonMentionedDto {
  @IsString() @MaxLength(300) name: string;
  @IsOptional() @IsString() @MaxLength(2000) context?: string;
}

class SuggestedPartyDto {
  @IsString() @MaxLength(300) role: string;
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}

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
  @ValidateNested({ each: true }) @Type(() => AreaRequiringAlignmentDto)
  areasRequiringAlignment?: AreaRequiringAlignmentDto[];

  @IsOptional() @IsArray() @ArrayMaxSize(50)
  @ValidateNested({ each: true }) @Type(() => AlignmentReachedDto)
  alignmentReached?: AlignmentReachedDto[];

  @IsOptional() @IsObject()
  honestClose?: { aligned: string; open: string; revisit: string; risk: string };

  @IsOptional() @IsArray() @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => PersonMentionedDto)
  mentionedPeople?: PersonMentionedDto[];

  @IsOptional() @IsArray() @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => PersonMentionedDto)
  alsoCameUp?: PersonMentionedDto[];

  @IsOptional() @IsString() @MaxLength(2000)
  alsoCameUpNote?: string | null;

  /* The anchor scenario's reveal, as the screen read it at the end of the conversation (request 149). Kept with the report the lead read; it is built from her own turns. */
  @IsOptional() @IsObject()
  leadsReveal?: Record<string, any> | null;

  @IsOptional() @IsArray() @ArrayMaxSize(50)
  @ValidateNested({ each: true }) @Type(() => SuggestedPartyDto)
  suggestedParties?: SuggestedPartyDto[];
}

export class EntryDocumentDto {
  @IsString() @MaxLength(300) fileName: string;
  /** Plain text only. The entry chat extracts text client-side before upload. */
  @IsString() @MaxLength(500_000) content: string;
  @IsOptional() @IsString() @MaxLength(120) mimeType?: string;
}

export class EntryCommitDto {
  @IsString() groundLabel: string;
  /**
   * WHICH SETUP THIS IS (U.6 review). A fresh key for every new setup, the same one when the same save
   * is retried. A replay is recognised by this, never by the check-in's name: topic names ("Help
   * someone get back on track") are the same for many check-ins. See a-second-setup-is-a-second-check-in.
   */
  @IsOptional() @IsString() @MaxLength(100) setupKey?: string;
  @IsOptional() @IsString() orgName?: string;
  @IsOptional() @IsString() scenario?: string;
  @IsOptional() @IsString() cadence?: string;
  /**
   * WHETHER THE CADENCE WAS CHOSEN OR IS THE PAGE'S DEFAULT. The client's `cadence` state starts at
   * FORTNIGHTLY and is sent whether or not anybody picked it, so the ground recorded a choice nobody
   * made. This says which, and the ground's `cadenceStated` follows it (fix plan B15).
   */
  @IsOptional() @IsBoolean() cadenceChosen?: boolean;
  /** "When I end it": no planned length and no planned last session (request 37). Send true instead of a length. */
  @IsOptional() @IsBoolean() runsUntilEnded?: boolean;
  @IsOptional() @IsInt() cadenceAnchorDay?: number;
  /** Which days this team works, 0=Sun..6=Sat. Absent means nobody said; never defaulted. */
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true })
  workingDays?: number[];
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

  /**
   * WHAT THEY TYPED IN SETUP, THEIR OWN MESSAGES ONLY (U.7 re-check). The brief is put together
   * from the answers setup drew out, so it is not what they wrote. These are kept so the Context
   * page can show the lead her own words, and nobody else (LeadSetupWords).
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(A_HISTORY_MAX_TURNS)
  @IsString({ each: true })
  @MaxLength(A_MESSAGE_MAX, { each: true })
  leadsOwnWords?: string[];

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

  /* The same number the service enforces, so the body and the gate cannot disagree about it. */
  @IsArray()
  @ArrayMaxSize(HOW_MANY_PEOPLE_ONE_CHECK_IN_HOLDS)
  @ValidateNested({ each: true })
  @Type(() => ContributorDto)
  contributors: ContributorDto[];
}

@Controller('entry')
export class EntryController {
  private readonly logger = new Logger(EntryController.name);
  constructor(private service: EntryService) {}

  /**
   * WHETHER THE ANCHOR SCENARIO'S FRONT DOOR IS OPEN, for a visitor who is not signed in (request 144).
   * It answers `{ available }` and nothing else, and is kept for a short time so a busy landing page
   * does not read the setting for every visitor.
   */
  @Public()
  @Throttle({ global: { limit: 60, ttl: 60_000 } })
  @Get('anchor-available')
  async anchorAvailable() {
    return this.service.anchorAvailable();
  }

  /**
   * THE ANCHOR ENTRY ROUTE (request 144). Tells the screen how to start a draft for the lead who arrived
   * from the shared link (for example /start/team?source=founders-whatsapp). Creates nothing. With the
   * anchor switch off it answers 404 and the screen sends the visitor to the ordinary door.
   */
  @Public()
  @Throttle({ global: { limit: 30, ttl: 60_000 } })
  @Get('anchor-start')
  async anchorStart(@Query('source') source?: string) {
    return this.service.anchorStart(source);
  }

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

  /*
   * PUBLIC, AND STILL READS A SESSION IF THERE IS ONE. A lead with four check-ins already running
   * met a setup conversation that knew nothing about them, every time, because this route took no
   * user. See setup-is-not-a-stranger-to-somebody-who-is-signed-in. It stays open to strangers.
   */
  @Public()
  @OptionalAuth()
  @Post('onboard')
  @Throttle({ global: { limit: 30, ttl: 60000 } })
  async onboard(@Body() dto: EntryOnboardDto, @Req() req: any) {
    return this.service.onboard(dto.messages, dto.scenario, dto.moment, undefined, dto.soFar as any, whoIsAsking(req));
  }

  /*
   * THE SAME TWO CALLS, STREAMED. Setup sat on "Thinking" for the whole of a model turn; the
   * check-in page has streamed for months. Same guard, same reply at the end: the `done` event
   * carries exactly what the plain route would have returned.
   */
  @Public()
  @OptionalAuth()
  @Post('onboard/stream')
  @Throttle({ global: { limit: 30, ttl: 60000 } })
  async onboardStream(@Body() dto: EntryOnboardDto, @Res() res: Response, @Req() req: any) {
    this.openStream(res);
    const write = (data: unknown) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    try {
      const out = await this.service.onboard(dto.messages, dto.scenario, dto.moment, (text) => write({ type: 'delta', text }), dto.soFar as any, whoIsAsking(req));
      write({ type: 'done', ...out });
    } catch (err: any) {
      this.logger.warn(`Entry stream failed: ${err?.message}`);
      write({ type: 'error', code: 'stream_failed', message: A_STREAM_FAILED });
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
      const { reply, closed, promptVersionId } = await this.service.chat(dto.messages, dto.scenario, dto.groundLabel, (text) => write({ type: 'delta', text }), dto.peopleNamed, dto.alreadySaid);
      /* promptVersionId is there only for the anchor conversation: which stored version of its words ran. */
      write({ type: 'done', reply, sessionComplete: this.sessionCompleteFrom(reply, closed), ...(promptVersionId !== undefined ? { promptVersionId } : {}) });
    } catch (err: any) {
      this.logger.warn(`Entry stream failed: ${err?.message}`);
      write({ type: 'error', code: 'stream_failed', message: A_STREAM_FAILED });
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
      r.includes('the record is here') ||
      r.includes('your record is saved as is') ||
      r.includes('the record is saved as is') ||
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
  async opener(@Body() dto: EntryOpenerDto) {
    return this.service.openerWithItsRules(dto.scenario, dto.source);
  }

  @Public()
  @Post('chat')
  @Throttle({ global: { limit: 30, ttl: 60000 } })
  async chat(@Body() dto: EntryChatDto) {
    const { reply, closed, promptVersionId } = await this.service.chat(dto.messages, dto.scenario, dto.groundLabel, undefined, dto.peopleNamed, dto.alreadySaid);
    /**
     * THE MARKER FIRST, THE PHRASES ONLY AS A BACKSTOP.
     *
     * This used to be phrases alone, and none of them matched the marker the model is told to emit:
     * it tests for "[session complete]" and the marker is "[[SESSION_COMPLETE]]". So the reliable
     * signal was never consulted, and whether a session closed depended on the assistant happening
     * to use one of six wordings.
     */
    return { ...this.chatResponse(reply, closed), ...(promptVersionId !== undefined ? { promptVersionId } : {}) };
  }

  @Public()
  @Post('classify-intent')
  @Throttle({ global: { limit: 30, ttl: 60000 } })
  async classifyIntent(@Body() dto: EntryClassifyDto) {
    return this.service.classifyIntent(dto.description, dto.mode, dto.picked);
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
    const report = await this.service.report(dto.messages, dto.scenario, dto.groundLabel, dto.anchorItems, dto.peopleNamed);
    return { report };
  }
}

/**
 * THE OPEN LINK'S THREE STEPS. Every one is public, so every one is a DTO: the pipe cannot see an
 * inline type, and `forbidNonWhitelisted` is what keeps an anonymous body to exactly these fields.
 */
class OpenStartDto {
  @IsString() @IsNotEmpty() @MaxLength(200) joinToken: string;
}

class OpenSayDto {
  @IsString() @IsNotEmpty() @MaxLength(200) key: string;
  @IsString() @IsNotEmpty() @MaxLength(A_MESSAGE_MAX) message: string;
}

class OpenFinishDto {
  @IsString() @IsNotEmpty() @MaxLength(200) key: string;
  @IsOptional() @IsEmail() email?: string;
  /** Their name, as they typed it. The whole name in one box; nobody is asked to split it. */
  @IsOptional() @IsString() @MaxLength(120) firstName?: string;
  /** Whether they want the report. Absent where the older page did not ask. */
  @IsOptional() @IsBoolean() wantsTheReport?: boolean;

  /* Who they answered for. See the column's own note: on a network-wide check-in this is the unit
     the report is about, and the link never asked for it. */
  @IsOptional() @IsString() @MaxLength(160) organisation?: string;
}

class ASetUpPersonDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string | null;
  @IsEmail() @MaxLength(254) email: string;
}
class ASetUpDto {
  @IsString() @MaxLength(60) kind: string;
  @IsString() @IsNotEmpty() @MaxLength(2000) about: string;
  @IsOptional() @IsString() @MaxLength(500) aim?: string | null;
  @IsArray() @ArrayMaxSize(19) @ValidateNested({ each: true }) @Type(() => ASetUpPersonDto) people: ASetUpPersonDto[];
}
class EntryDraftFromSetUpDto {
  @ValidateNested() @Type(() => ASetUpDto) setUp: ASetUpDto;
}

@Controller('entry')
export class EntryCommitController {
  constructor(
    private service: EntryService,
    private readonly openLink: TheOpenLinkService,
  ) {}

  /**
   * `?ifThereIsOne=1` is sent by the sign-in link's page for somebody with nothing saved in this
   * browser (a new admin from the sign-up form, an invited person). It still saves a draft the server
   * holds from another browser; with nothing to save anywhere it answers `{ nothing: true }` instead of
   * a 400, so a new admin's first page logs no error (journey of 12 October). Without it, as before.
   */
  @Post('commit')
  async commit(@CurrentUser() user: CurrentUserData, @Body() dto: EntryCommitDto, @Query('ifThereIsOne') ifThereIsOne?: string) {
    if (!user?.organizationId) throw new UnauthorizedException('Your sign-in is not connected to an organisation yet, so ask the person who invited you to add you.');
    try {
      return await this.service.commit(user.organizationId, user.id, dto);
    } catch (err) {
      if (ifThereIsOne && err instanceof BadRequestException && (err.getResponse() as { code?: string })?.code === 'NO_ENTRY_SESSION') return { nothing: true as const };
      throw err;
    }
  }

  /**
   * A NEW CHECK-IN STARTED FROM A RECOMMENDATION (request 148). The lead said yes to "Groundwork
   * recommends" and the screen hands back the `setUp` it was given. Answers the draft the set-up screen
   * opens with, its people checked against the lead's own organisation. Creates nothing, invites nobody.
   */
  @Post('draft-from-set-up')
  @Throttle({ global: { limit: 20, ttl: 60_000 } })
  async draftFromSetUp(@CurrentUser() user: CurrentUserData, @Body() dto: EntryDraftFromSetUpDto) {
    if (!user?.organizationId) throw new UnauthorizedException('Your sign-in is not connected to an organisation yet, so ask the person who invited you to add you.');
    return this.service.draftFromSetUp(user.organizationId, user.id, dto.setUp as any);
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

  /**
   * THE OPEN LINK: ANSWER FIRST, SAY WHO YOU ARE AT THE END.
   *
   * The QR code a lead shares. Public by necessity - the person scanning it has no account, which
   * is the point - and throttled at every step, because every step is reachable by anybody with the
   * link. See the-open-link.service for what the link does and does not open.
   */
  @Public()
  @Throttle({ global: { limit: 30, ttl: 60000 } })
  @Get('open')
  async openPreview(@Query('t') token: string) {
    return this.openLink.whatThisIs(token ?? '');
  }

  /* A hundred people scanning one QR code in one minute is the case this exists for, and ten a
     minute per address turned the eleventh of them away. See a-room-of-people-is-not-one-person. */
  @Public()
  @Throttle({ global: { limit: A_ROOM_MAY_START_PER_MINUTE, ttl: 60000 } })
  @Post('open-start')
  async openStart(@Body() dto: OpenStartDto) {
    return this.openLink.start(dto.joinToken);
  }

  /* Counted per respondent, not per address - the key in the body says whose answer this is. */
  @Public()
  @Throttle({ global: { limit: A_PERSON_MAY_SAY_PER_MINUTE, ttl: 60000 } })
  @Post('open-say')
  async openSay(@Body() dto: OpenSayDto) {
    return this.openLink.say(dto.key, dto.message);
  }

  @Public()
  @Throttle({ global: { limit: 10, ttl: 60000 } })
  @Post('open-finish')  /* Per respondent too, by the same key. Finishing twice is not a thing. */
  async openFinish(@Body() dto: OpenFinishDto) {
    return this.openLink.finish(dto.key, dto.email, dto.firstName, dto.wantsTheReport, dto.organisation);
  }
}
