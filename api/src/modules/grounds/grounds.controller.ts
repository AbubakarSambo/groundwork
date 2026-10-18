import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { IsBoolean, MinLength } from 'class-validator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsEnum, IsIn, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GroundsService } from './grounds.service';
import { APlanIsManyProposalsService } from './a-plan-is-many-proposals.service';
import { ConversationService } from '../conversation/conversation.service';
import { CreateGroundDto, AddParticipantDto, CreateGroundForLeadDto } from './dto';
import { CurrentUser, CurrentUserData, Roles, Role } from '../../common';
import { Cadence } from '@prisma/client';
import { IsString, MaxLength } from 'class-validator';

class ConfirmLeadDto {
  @ApiPropertyOptional({ description: "Edit the admin's brief before confirming (optional)" })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  brief?: string;

  @ApiPropertyOptional({ description: 'True if the lead is managing only and will not give their own account. Defaults to false (also checking in).' })
  @IsOptional()
  @IsBoolean()
  managingOnly?: boolean;

  @ApiPropertyOptional({
    description:
      'What the lead is responsible for, in their own words. Their last chance to set it if the admin did not - without a remit they get no contribution read and no role-tuned questions.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remit?: string;
}

class HoldDto {
  @ApiPropertyOptional({ description: 'Why the check-in is being paused or resumed. Logged, not shown to participants.' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

class UpdateTimelineDto {
  @ApiPropertyOptional({ description: 'Rename the ground' })
  @IsOptional()
  label?: string;

  /**
   * DAYS, BECAUSE DAYS IS THE VALUE THE PRODUCT ACTUALLY READS.
   *
   * `timelineDays` is not-nullable on the ground and is what the stall cron computes its deadline from
   * and what the engine divides by the cadence to plan sessions. `timelineWeeks` is a nullable second
   * column, and it was all this endpoint wrote - so changing a ground's timeline logged a change,
   * updated the screen, and moved neither its length nor its number of check-ins.
   *
   * Weeks stays accepted so nothing calling it breaks, and is converted on the way in. Every timeline
   * the product offers is expressible in days; not every one is expressible in whole weeks, which is
   * how a 45-day ground became a 42-day ground by being edited for an unrelated reason.
   */
  @ApiPropertyOptional({ example: 90, description: 'Timeline length in days' })
  @IsOptional()
  @IsInt()
  @Min(1)
  timelineDays?: number;

  /** @deprecated Send `timelineDays`. Converted on arrival, kept so existing callers keep working. */
  @ApiPropertyOptional({ example: 12, description: 'Deprecated: timeline length in weeks' })
  @IsOptional()
  @IsInt()
  @Min(1)
  timelineWeeks?: number;

  /** True sets the check-in to run until the lead ends it (request 37). A length sent later turns it off. */
  @ApiPropertyOptional({ description: 'Run until the lead ends it.' })
  @IsOptional()
  @IsBoolean()
  runsUntilEnded?: boolean;

  /**
   * WHEN THE FIRST CHECK-IN OPENS, which could be set at creation and never afterwards.
   *
   * "There is no start date on setup. Where does it exist." It exists on the check-in, it drives
   * two real things - a deferred invitation goes out on that day, and session 1 is gated behind it
   * - and there was no way to change it once the check-in existed. A new hire's start date moving
   * by a week is the most ordinary thing that can happen to a new-hire check-in.
   */
  /**
   * THE BRIEF, WHICH COULD BE WRITTEN AT CREATION AND NEVER CHANGED.
   *
   * Two things follow from that. A lead who wanted to tell their team what this is for after the
   * check-in existed had no way to; and a check-in carrying the WRONG brief - every one made
   * through the entry chat before today, where the brief was filled with the report's read of the
   * lead's own account - was stuck with it, published to everybody on it.
   *
   * Same permission and the same audit trail as renaming, because it is the same kind of act: the
   * words everybody reads before they answer.
   */
  @ApiPropertyOptional({ description: "What the check-in is for, in the lead's own words" })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  brief?: string;

  @ApiPropertyOptional({ example: '2026-09-15', description: 'When the first check-in opens' })
  @IsOptional()
  @IsString()
  startsAt?: string;

  @ApiPropertyOptional({ enum: Cadence, description: 'Check-in cadence' })
  @IsOptional()
  @IsEnum(Cadence)
  cadence?: Cadence;

  /**
   * WHICH DAYS THIS TEAM WORKS, which could be said at creation and never afterwards.
   *
   * "He cannot choose to set check-ins to happen outside of weekends." The days were already
   * stored, every cadence already honoured them and the entry flow already offered them - but this
   * is the only place the rhythm can be changed once a check-in exists, and it did not carry them.
   * So a lead watching their check-ins land on Sundays had nowhere to say so.
   *
   * 0 is Sunday, the same numbering as Date.getDay. An empty list means nobody said, which is not
   * the same as every day and is rendered as what it is - see which-days-this-team-works.
   */
  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5], description: 'Days a check-in may open on. 0 = Sunday. Empty means any day.' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workingDays?: number[];

  /**
   * THE DAY THE CHECK-INS LAND ON (request 194): a weekday for a weekly or fortnightly check-in (0 is Sunday), a day of the month for a monthly one.
   * Live let a lead say "every Monday" at setup and nowhere afterwards. `null` clears it, so the check-in lands wherever the rhythm puts it. It
   * applies from the next session that is made; a session already made keeps its date.
   */
  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 31, description: 'Weekly or fortnightly: 0 = Sunday to 6 = Saturday. Monthly: 1 to 31. Null clears it.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(31)
  cadenceAnchorDay?: number | null;

  /**
   * THE LAST DAY, AS THE LEAD CHOSE IT ("Give it more time", journey test 12 October 2026). The sessions up to it are counted the
   * way setup counts them (timelineDaysForAChosenEnd), and the end is stored, so People and setup, the invitation and the count agree.
   */
  @ApiPropertyOptional({ description: 'The last day, YYYY-MM-DD. Sets how long it runs, counted the way setup counts it.' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  endsOn?: string;

  @ApiPropertyOptional({ description: 'Append a context note to this ground' })
  @IsOptional()
  contextNote?: string;
}

class AddContextLineDto {
  @ApiPropertyOptional({ enum: ['STRATEGY', 'WAY_OF_WORKING', 'DECISION', 'UNSETTLED', 'NOTE'] })
  @IsIn(['STRATEGY', 'WAY_OF_WORKING', 'DECISION', 'UNSETTLED', 'NOTE'])
  kind!: string;

  @ApiPropertyOptional({ description: 'The line, in the lead\'s own words' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;

  @ApiPropertyOptional({ enum: ['LEAD_ONLY', 'EVERYONE'], description: 'Who reads it. Everyone by default.' })
  @IsOptional()
  @IsIn(['LEAD_ONLY', 'EVERYONE'])
  audience?: 'LEAD_ONLY' | 'EVERYONE';
}

class AddLeadContextDto {
  @ApiPropertyOptional({ description: 'The participant this context is about; omit for context about the whole ground' })
  @IsOptional()
  @IsString()
  participantId?: string;

  @ApiPropertyOptional({ description: 'Private context for the AI. Never shown to the person it is about; never quoted as a claim.' })
  @IsString()
  @MaxLength(4000)
  text!: string;

  /**
   * WHO READS IT - and nothing about what it may be used for.
   *
   * EVERYONE is the lead's framing of the situation, addressed to the whole check-in. It is still the
   * lead's words about a situation, so it is never quotable, never attributable and never a fact
   * about anybody. Only the audience differs from a private note.
   */
  @ApiPropertyOptional({ description: "Who reads this note. LEAD_ONLY (the default) or EVERYONE - the lead's framing, read by the whole check-in and still never quoted." })
  @IsOptional()
  @IsIn(['LEAD_ONLY', 'EVERYONE'])
  audience?: 'LEAD_ONLY' | 'EVERYONE';
}

/**
 * SOMEBODY LOOKED AT THE TICKET, and this is the whole of what they can say: what it says NOW.
 *
 * Short on purpose. A long one would be somebody re-typing the ticket body here, and then the page
 * and the tracker are two things that have to agree - the failure a reference exists to avoid.
 */
class LookedAtDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  lastSeenState!: string;
}

/**
 * WHAT THEY SAY THEY DELIVERED. Capped for the same reason a note is: this is a claim that reaches
 * the next session as a question, and somebody writing an essay here is writing their account
 * outside the session, where nothing tests it.
 */
class AddDeliveryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;

  @ApiPropertyOptional({ description: 'Where the evidence is, in your words. A link, a document, a date.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  evidence?: string;

  @ApiPropertyOptional({ description: 'Which of your own expectations this is offered against. Leave it out for work nobody asked for.' })
  @IsOptional()
  @IsString()
  objectiveId?: string;
}

class AddNoteDto {
  /**
   * Capped because this is a note, not a check-in. Somebody writing three
   * thousand words here is writing their account outside the session, which is
   * the thing a note must not become - it has never been questioned.
   */
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;
}

class DeclineGroundDto {
  /** Optional, and worth asking for: "no" with no reason is what stops people asking. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

class ContextChatTurnDto {
  @IsString()
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(4000)
  content!: string;
}

class ContextChatDto {
  /**
   * Stateless, like the check-in engine's own chat: the client holds the history and
   * sends it back. Nothing here is stored, which is the point - this conversation is
   * about the ground's setup and is not anybody's account of anything.
   */
  @IsOptional()
  history?: ContextChatTurnDto[];
}

@ApiTags('Grounds')
@ApiBearerAuth()
@Controller('grounds')
export class GroundsController {
  constructor(
    private readonly grounds: GroundsService,
    private readonly conversation: ConversationService,
    private readonly plans: APlanIsManyProposalsService,
  ) {}

  /**
   * A PLAN, READ INTO SEPARATE PROPOSALS, EACH KEPT AS WAITING, AND NOTHING ELSE WRITTEN. The lead only. See
   * a-plan-is-many-proposals: each proposal quotes the plan, and one that does not is dropped.
   */
  @Post(':id/plan/proposals')
  @ApiOperation({ summary: 'Lead only: read a pasted plan, or a document on this check-in, into separate goals, roles, commitments and rules, each kept as waiting for you to confirm. Nothing else is written.' })
  async planProposals(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: { text?: string; documentId?: string }) {
    return this.plans.read(id, userId, dto ?? {});
  }

  /** "Waiting for you to confirm": the lead's proposals still waiting. Lead only. */
  @Get(':id/plan/proposals')
  @ApiOperation({ summary: "Lead only: the proposals from a plan that are waiting for you to confirm" })
  async waitingPlanProposals(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.plans.waiting(id, userId);
  }

  /** ONE stored proposal, checked again against its own quote, written into the table it belongs in, once. */
  @Post(':id/plan/proposals/:pid/confirm')
  @ApiOperation({ summary: 'Lead only: confirm one proposal from a plan, which writes exactly one thing. For a goal with a number, send direction "AIM", "LIMIT", "RATE", "DEADLINE" or "ZERO" as the lead answered the card\'s whichWay question; without it, no kind is set.' })
  async confirmPlanProposal(@Param('id') id: string, @Param('pid') pid: string, @CurrentUser('id') userId: string, @Body() dto?: { email?: string; direction?: 'AIM' | 'LIMIT' | 'RATE' | 'DEADLINE' | 'ZERO' | null }) {
    return this.plans.confirm(id, userId, pid, { direction: dto?.direction, email: dto?.email });
  }

  @Post(':id/plan/proposals/:pid/not-now')
  @ApiOperation({ summary: 'Lead only: put one proposal from a plan off. Nothing is written.' })
  async planProposalNotNow(@Param('id') id: string, @Param('pid') pid: string, @CurrentUser('id') userId: string) {
    return this.plans.notNow(id, userId, pid);
  }

  @Patch(':id/plan/proposals/:pid')
  @ApiOperation({ summary: "Lead only: change one proposal's sentence or values. Checked again against the plan's own words; it stays waiting." })
  async editPlanProposal(@Param('id') id: string, @Param('pid') pid: string, @CurrentUser('id') userId: string, @Body() dto: { says?: string; fields?: any }) {
    return this.plans.edit(id, userId, pid, dto ?? {});
  }

  @Get()
  @ApiOperation({ summary: 'List grounds in the organization, including grounds as a participant' })
  async list(@CurrentUser() user: CurrentUserData) {
    return this.grounds.list(user.organizationId, user.id, user.email, user.role);
  }

  @Get('org-roster')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Org-wide list of every ground (team): lead, members, roles, and alignment status - for HR/admin/founder oversight' })
  async getOrgRoster(@CurrentUser() user: CurrentUserData) {
    return this.grounds.getOrgRoster(user.organizationId, user.id);
  }

  /**
   * DECLARED BEFORE `@Get(':id')`, AND THAT IS THE WHOLE FIX. W8-69.
   *
   * Nest matches routes in declaration order, so with `:id` first this path was read as a
   * ground whose id is the string "awaiting-approval", `get()` found no such ground, and
   * the endpoint answered 404 to every caller. It has never once returned a list.
   *
   * What that looked like: every org admin opening the grounds page got a red "Not found -
   * Ground not found" toast over the page, on every visit, because the rail asks for the
   * approval queue on mount. The approval requirement she asked for could not work, and
   * the failure looked like a bug in whatever page you happened to be on.
   *
   * `org-roster` above is a static path too and sits before `:id` already, which is why
   * that one works. This one was appended near its POST siblings, where reading the file
   * top to bottom makes it look correctly placed.
   */
  @Get('awaiting-approval')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Grounds a member has set up that are waiting for an admin to accept them' })
  async awaitingApproval(@CurrentUser() user: CurrentUserData) {
    return this.grounds.listAwaitingApproval(user.organizationId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ground (status, participants, check-ins)' })
  async get(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.grounds.get(id, user.organizationId, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Open a new alignment ground' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateGroundDto) {
    // The role decides whether this ground waits for an admin to accept it.
    return this.grounds.create(user.organizationId, user.id, dto, user.role);
  }

  @Post('for-lead')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin creates a ground and names someone else to lead it (e.g. HR onboarding a team, assigning the engineering lead to run it)' })
  async createForLead(@CurrentUser() user: CurrentUserData, @Body() dto: CreateGroundForLeadDto) {
    return this.grounds.createForLead(user.organizationId, user.id, dto);
  }

  @Post(':id/confirm-lead')
  @ApiOperation({ summary: 'The named lead reviews the admin-supplied context, optionally edits it, and confirms - only then does the ground actually begin' })
  async confirmLead(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: ConfirmLeadDto) {
    return this.grounds.confirmLead(id, userId, dto);
  }

  @Post(':id/participants')
  @ApiOperation({ summary: 'Add the other party (sends an invite - never silent)' })
  async addParticipant(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Body() dto: AddParticipantDto) {
    return this.grounds.addParticipant(id, user.organizationId, user.id, dto);
  }

  @Post(':id/lead-context')
  @ApiOperation({ summary: "Initiator-only: add a context note. LEAD_ONLY (default) is private to the lead and about a participant or the whole check-in; EVERYONE is the lead's framing, read by the whole check-in and about the whole check-in only. Neither is ever quoted as a claim." })
  async addLeadContext(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: AddLeadContextDto) {
    return this.grounds.addLeadContext(id, userId, dto);
  }

  /**
   * The other half of a private note: sharing it, one note at a time, by the lead. See
   * shareLeadContext - a note about one person is refused rather than published.
   */
  @Post(':id/lead-context/:noteId/share')
  @ApiOperation({ summary: "Share one of the lead's notes with everybody on the check-in" })
  async shareLeadContext(@Param('id') id: string, @Param('noteId') noteId: string, @CurrentUser('id') userId: string) {
    return this.grounds.shareLeadContext(id, userId, noteId);
  }

  /**
   * One line of what this check-in knows: reworded, shared, made private, or retired. See
   * changeContextLine - a line about a person can never be shared.
   */
  /**
   * A to-do's state, moved by the person it belongs to. See setMyCommitment - not even the lead can
   * move somebody else's.
   */
  @Patch(':id/commitments/:itemId')
  @ApiOperation({ summary: "Move your own to-do: done, not done, dropped, or back to nobody has said" })
  async setMyCommitment(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { status: string },
  ) {
    return this.grounds.setMyCommitment(id, userId, itemId, dto?.status);
  }

  /**
   * ONE LINE OF WHAT THIS CHECK-IN KNOWS, TYPED IN. See addContextLine: the chat is still the way
   * in, and this is the door for a check-in that has no chat.
   */
  @Post(':id/context')
  @ApiOperation({ summary: "Add one line of what this check-in knows (lead or org admin)" })
  async addContextLine(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddContextLineDto,
  ) {
    return this.grounds.addContextLine(id, userId, dto);
  }

  @Patch(':id/context/:itemId')
  @ApiOperation({ summary: 'Change one line of what this check-in knows' })
  async changeContextLine(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { text?: string; audience?: 'LEAD_ONLY' | 'EVERYONE'; closed?: boolean },
  ) {
    return this.grounds.changeContextLine(id, userId, itemId, dto ?? {});
  }

  /**
   * THE LEAD'S QUESTIONS FOR PEOPLE, ONE AT A TIME. Decision 34: the lead sees the exact question as
   * Groundwork will ask it, and confirms it, changes it, or leaves it out. Nothing is read into a
   * person's check-in until it is confirmed here. See a-question-asked-word-for-word.
   */
  @Get(':id/questions-for-people')
  @ApiOperation({ summary: "The lead's questions for people on this check-in, each with the exact sentence Groundwork will ask (lead or org admin)" })
  async questionsForPeople(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.questionsForPeople(id, userId);
  }

  @Post(':id/questions-for-people/:itemId/confirm')
  @ApiOperation({ summary: 'Lead only: confirm one question, as shown or in your own changed words, so it is asked word for word' })
  async confirmQuestionForPerson(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { exactQuestion?: string | null },
  ) {
    return this.grounds.confirmQuestionForPerson(id, userId, itemId, dto ?? {});
  }

  @Post(':id/questions-for-people/:itemId/decline')
  @ApiOperation({ summary: 'Lead only: leave one question out, so it is asked of nobody' })
  async declineQuestionForPerson(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.grounds.declineQuestionForPerson(id, userId, itemId);
  }

  @Patch(':id/chasing')
  @ApiOperation({ summary: 'Initiator-only: which days this check-in reminds people on, whether it reminds at all, and whether the lead hears who never started' })
  async setChasing(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { days?: number[]; stopped?: boolean; tellTheLead?: boolean },
  ) {
    return this.grounds.setChasing(id, userId, dto ?? {});
  }

  /** Decision 133: "Check in yourself". Opens (or reuses) the lead's own check-in, any time it is running. */
  @Post(':id/check-in-yourself')
  @ApiOperation({ summary: "Open the lead's own check-in on demand (the lead only)" })
  async checkInYourself(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.grounds.openTheLeadsCheckIn(id, organizationId, userId);
  }

  @Post(':id/closing-session')
  @ApiOperation({ summary: "Begin the closing session: flag every participant's next session as final (initiator only)" })
  async beginClosingSession(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.grounds.beginClosingSession(id, organizationId, userId);
  }

  @Post(':id/activate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activate the ground after the report is ready (starts billing)' })
  async activate(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    return this.grounds.activate(id, organizationId);
  }

  /**
   * A HOLD, AND THE WAY OUT OF IT. `pauseGround` was written for a surface that never arrived, so
   * PAUSED was a status nothing could reach and nothing could leave. Both doors are here now, side
   * by side, because a resume route without a pause route is a key to a door nobody can lock.
   */
  @Post(':id/pause')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Put the check-in on hold: nothing is added, nothing moves, until it is resumed (admin only)' })
  async pause(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: HoldDto) {
    await this.grounds.pauseGround(id, userId, dto.reason);
    return { groundId: id, status: 'PAUSED' };
  }

  @Post(':id/resume')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lift the hold and return the check-in to the status it was paused from (admin only)' })
  async resume(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: HoldDto) {
    await this.grounds.resumeGround(id, userId, dto.reason);
    return { groundId: id };
  }

  @Get(':id/participants/:participantId/invite-url')
  @ApiOperation({ summary: 'Get the current invite URL for a pending participant (initiator only)' })
  async getParticipantInviteUrl(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.grounds.getParticipantInviteUrl(id, participantId, userId);
  }

  /** The other half of invite-url: once they have accepted, that one refuses and this is the link. */
  @Get(':id/participants/:participantId/check-in-url')
  @ApiOperation({ summary: 'Get the link to a participant\'s open check-in (initiator only)' })
  async getParticipantCheckInUrl(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.grounds.getParticipantCheckInUrl(id, participantId, userId);
  }

  @Post(':id/participants/:participantId/resend-invite')
  @ApiOperation({ summary: 'Resend an expired participant invite (GW-24)' })
  async resendParticipantInvite(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.grounds.resendParticipantInvite(id, participantId, user.organizationId, user.id, user.role);
  }

  /** D1 and D2 (13 October 2026, evening): whoever runs the check-in adds somebody's WhatsApp number. */
  @Patch(':id/participants/:participantId/whatsapp-number')
  @ApiOperation({ summary: "Add a person's WhatsApp number, kept on the organisation's roster (whoever runs the check-in, or an admin)" })
  async addTheirWhatsAppNumber(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @Body() body: { phone: string },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.grounds.addTheirWhatsAppNumber({ groundId: id, participantId, organizationId: user.organizationId, userId: user.id, role: user.role, phone: body?.phone });
  }

  /** Each person on this check-in on WhatsApp: number and where they are (whoever runs it, or an admin). */
  @Get(':id/participants/whatsapp')
  @ApiOperation({ summary: "Each person's WhatsApp number and status on this check-in (whoever runs the check-in, or an admin)" })
  async whereEachPersonIsOnWhatsApp(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.grounds.whereEachPersonIsOnWhatsApp({ groundId: id, organizationId: user.organizationId, userId: user.id, role: user.role });
  }

  /** Each person on this check-in, from their invitation to coming back on their own (whoever runs it, or an admin). */
  @Get(':id/participants/getting-started')
  @ApiOperation({ summary: 'Each person on this check-in, from their invitation to checking in on their own (whoever runs the check-in, or an admin)' })
  async whereEachPersonIsGettingStarted(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.grounds.whereEachPersonIsGettingStarted({ groundId: id, organizationId: user.organizationId, userId: user.id, role: user.role });
  }

  @Get(':id/mediator-brief')
  @ApiOperation({ summary: 'Get a structural brief for use with a facilitator (initiator or a party on this ground - no separate org-admin access exists)' })
  async mediatorBrief(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.getMediatorBrief(id, userId);
  }

  @Get(':id/my-specificity')
  @ApiOperation({ summary: "Return the requesting user's own specificity history for this ground (private, owner only)" })
  async mySpecificity(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.getMySpecificity(id, userId);
  }

  @Get(':id/my-record')
  @ApiOperation({ summary: "Return the requesting contributor's full private longitudinal record (specificity, confidence, patterns - gated by billing)" })
  async myRecord(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.getMyRecord(id, userId);
  }

  @Get(':id/my-checkin-status')
  @ApiOperation({ summary: 'Return the requesting user\'s own check-in status for this ground' })
  async myCheckinStatus(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.getMyCheckinStatus(id, userId);
  }

  /**
   * A person's own marks against the setup questions. Their own only: this never returns anybody
   * else's, because it is a note about reading rather than a fact about the check-in.
   */
  @Get(':id/setup-sign-offs')
  @ApiOperation({ summary: 'Which setup questions you have signed off' })
  async setupSignOffs(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return { steps: await this.grounds.setupSignOffs(id, userId) };
  }

  @Post(':id/setup-sign-offs/:step')
  @ApiOperation({ summary: 'Sign off one setup question' })
  async signOffSetupStep(
    @Param('id') id: string,
    @Param('step', ParseIntPipe) step: number,
    @CurrentUser('id') userId: string,
  ) {
    return { steps: await this.grounds.signOffSetupStep(id, userId, step) };
  }

  @Delete(':id/setup-sign-offs/:step')
  @ApiOperation({ summary: 'Take back a sign-off' })
  async takeBackSetupSignOff(
    @Param('id') id: string,
    @Param('step', ParseIntPipe) step: number,
    @CurrentUser('id') userId: string,
  ) {
    return { steps: await this.grounds.takeBackSetupSignOff(id, userId, step) };
  }

  /**
   * Deleting a check-in that was only ever a test. Its lead alone, and only while nobody else has
   * given an account - see the service for why both halves are the rule rather than a permission.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a check-in you started, while it is still only yours' })
  async remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.deleteWhileItIsStillATest(id, userId);
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Accept a ground so its people can be invited' })
  async approve(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.grounds.approve(id, user.organizationId, user.id);
  }

  @Post(':id/decline')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Decline a ground. It closes, and nobody is ever invited to it.' })
  async decline(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Body() dto: DeclineGroundDto) {
    return this.grounds.declineGround(id, user.organizationId, user.id, dto.reason);
  }

  @Post(':id/context-chat')
  @ApiOperation({ summary: "The lead's setup conversation: what context is missing, and the material that would settle it" })
  async contextChat(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('organizationId') organizationId: string, @Body() dto: ContextChatDto) {
    await this.grounds.theOldContextChatMustBeOpen(organizationId);
    return this.grounds.contextChat(id, userId, dto.history ?? []);
  }

  /**
   * The confirmation half. `context-chat` proposes; nothing reaches the ground until this runs, and
   * this re-derives the change from the lead's own words rather than accepting a value from the
   * client - otherwise it is an edit endpoint with a confirmation-shaped name.
   */
  @Post(':id/context-chat/confirm')
  @ApiOperation({ summary: 'Apply what the setup conversation heard, after the lead confirms it' })
  async confirmContextProposal(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    /* `history` is how a pronoun resolves. The change is still derived on this side from the words
       themselves - there is no field here that names a person or carries a value. */
    @Body() dto: { said: string; history?: { role: 'user' | 'assistant'; content: string }[]; offerId?: string; leave?: boolean },
  ) {
    await this.grounds.theOldContextChatMustBeOpen(organizationId);
    return this.grounds.applyContextProposal(id, userId, dto);
  }

  /** A no to keeping something for the organisation. The offer is deleted and nothing is kept. */
  @Post(':id/context-chat/decline')
  @ApiOperation({ summary: 'Say no to keeping something for the organisation' })
  async declineContextProposal(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: { offerId?: string },
  ) {
    await this.grounds.theOldContextChatMustBeOpen(organizationId);
    return this.grounds.declineContextOffer(id, userId, dto?.offerId ?? '');
  }

  /**
   * WHAT DOING WELL LOOKS LIKE, AND WHAT HAS TO BE TRUE FOR IT.
   *
   * Stating it is the lead's; reading it is everybody's on the ground - the yardstick somebody is
   * being read against is the last thing that should be private from them.
   */
  @Post(':id/baseline')
  @ApiOperation({ summary: 'State (or restate, as a new version) what doing well looks like and what it rests on' })
  async stateBaseline(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { successLooksLike?: string; conditions?: string[]; changeReason?: string },
  ) {
    return this.grounds.stateBaseline(id, userId, dto);
  }

  @Get(':id/baseline')
  @ApiOperation({ summary: 'Every version of this ground\'s baseline, oldest first' })
  async baselineHistory(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.baselineHistory(id, userId);
  }

  /**
   * THE THREE WRITES THAT SET A TARGET BY FORM ARE GONE: propose, state-my-own, and accept.
   *
   * They were the old model - a lead proposes, the person accepts it or writes their own - and the
   * product does not work that way any more. An expectation is stated in the lead's own check-in,
   * published to Context where everyone reads it, and changed only through the chat, where a change
   * is probed and lands on the record with its reason.
   *
   * REMOVED RATHER THAN LEFT UNUSED. Her decision was that a party cannot rewrite or accept theirs;
   * an endpoint that still does it is that decision held by nothing but the absence of a button, and
   * this codebase has learned twice what happens to rules kept that way.
   *
   * `POST :id/my-expectation/shown` below is what survives, and it does the opposite job: it records
   * that somebody has SEEN theirs, which is what stops anybody being read against words they have
   * never laid eyes on.
   */
  @Post(':id/my-expectation/shown')
  @ApiOperation({
    summary:
      'Record that this person has now been shown their own expectation. GW-EXP-2. Called by the Context view when it renders it - shown, never agreed, and nothing may be read against an expectation until it is.',
  })
  async markMyExpectationShown(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.markMyExpectationShown(id, userId);
  }

  /**
   * WHERE THIS STOOD ON DAY ONE. Append-only: there is no update and no delete, because a corrected
   * baseline stops being a record of what people believed at the start.
   */
  @Get(':id/baseline-entries/candidates')
  @ApiOperation({ summary: "The lead's own session-one entries, to choose from" })
  async baselineEntryCandidates(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.baselineEntryCandidates(id, userId);
  }

  @Post(':id/baseline-entries')
  @ApiOperation({ summary: 'Record what the lead confirmed was true at the start' })
  async recordBaselineEntries(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: { texts: string[] }) {
    return this.grounds.recordBaselineEntries(id, userId, dto?.texts ?? []);
  }

  @Get(':id/baseline-entries')
  @ApiOperation({ summary: 'What the record says was true at the start, for anybody on the ground' })
  async baselineEntries(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.baselineEntries(id, userId);
  }

  @Get(':id/my-notes')
  @ApiOperation({ summary: "The requesting user's own between-session notes on this ground (private, owner only)" })
  async myNotes(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.getMyNotes(id, userId);
  }

  @Post(':id/my-notes')
  @ApiOperation({ summary: 'Write a private note between sessions. Never part of the record or any report.' })
  async addMyNote(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: AddNoteDto) {
    return this.grounds.addMyNote(id, userId, dto.text);
  }

  @Delete(':id/my-notes/:noteId')
  @ApiOperation({ summary: 'Delete one of your own notes' })
  async deleteMyNote(@Param('id') id: string, @Param('noteId') noteId: string, @CurrentUser('id') userId: string) {
    return this.grounds.deleteMyNote(id, userId, noteId);
  }

  @Patch(':id/expectations/:objectiveId/looked')
  @ApiOperation({ summary: 'Say what the ticket behind this expectation says now. Re-stamps when anybody last looked.' })
  async markExpectationLookedAt(
    @Param('id') id: string,
    @Param('objectiveId') objectiveId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: LookedAtDto,
  ) {
    return this.grounds.markExpectationLookedAt(id, userId, objectiveId, dto.lastSeenState);
  }

  @Get(':id/my-deliveries')
  @ApiOperation({ summary: 'What you have said you delivered on this check-in' })
  async myDeliveries(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.getMyDeliveries(id, userId);
  }

  @Post(':id/my-deliveries')
  @ApiOperation({ summary: 'Say what you delivered. It reaches your next session as something to be asked about, not as the record.' })
  async addDelivery(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: AddDeliveryDto) {
    return this.grounds.addDelivery(id, userId, dto);
  }

  @Delete(':id/my-deliveries/:deliveryId')
  @ApiOperation({ summary: 'Take one back, while no session has raised it yet' })
  async deleteMyDelivery(@Param('id') id: string, @Param('deliveryId') deliveryId: string, @CurrentUser('id') userId: string) {
    return this.grounds.deleteMyDelivery(id, userId, deliveryId);
  }

  @Get(':id/my-transcript')
  @ApiOperation({ summary: "Every turn the requesting user has said in this ground, sessions in order (owner only)" })
  async myTranscript(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.conversation.getMyGroundTranscript(id, userId);
  }

  /**
   * NOT THE TRANSCRIPTS. This returned every participant's raw turns to the lead - the one thing the
   * product is sold on never doing. It returns what each completed account SHOWS against what the
   * check-in asks: derived, screened at the read, never their words. See what-an-account-shows.ts.
   */
  @Get(':id/conversation')
  @ApiOperation({ summary: 'What each completed account shows against what this check-in asks (lead only). Never the words themselves.' })
  async whatTheAccountsShow(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.conversation.whatTheAccountsShow(id, userId);
  }

  @Get(':id/my-solo-report')
  @ApiOperation({ summary: "Return the requesting user's own individual session report (private)" })
  async getMySoloReport(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.getMySoloReport(id, userId);
  }

  @Patch(':id/my-solo-report/share')
  @ApiOperation({ summary: "Set whether the requesting user shares their individual report with other parties" })
  async setMySoloReportShared(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: { shared: boolean }) {
    return this.grounds.setMySoloReportShared(id, userId, dto.shared);
  }

  @Patch(':id/external-visibility')
  @ApiOperation({ summary: "Initiator-only: whether participants can see each other's contact details (email). Names/roster/presence stay visible either way." })
  async setExternalVisibility(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: { restrict: boolean }) {
    return this.grounds.setExternalVisibility(id, userId, dto.restrict);
  }

  @Patch(':id/peer-visibility')
  @ApiOperation({ summary: 'Whether parties can see who else is on this ground and how each is doing' })
  async setPeerVisibility(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { visible: boolean },
  ) {
    return this.grounds.setPeerVisibility(id, userId, !!body.visible);
  }

  @Patch(':id/people-work-together')
  @ApiOperation({ summary: "Whether the parties on this ground see each other's work - decides whether fairness reads have anything to stand on" })
  async setPeopleWorkTogether(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { together: boolean },
  ) {
    return this.grounds.setPeopleWorkTogether(id, userId, !!body.together);
  }

  @Patch(':id/kind-of-work')
  @ApiOperation({ summary: 'The lead sets the kind of work this check-in is about (one of eleven, or none), and its own stage names' })
  async setKindOfWork(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { kind?: string | null; stages?: string[] | null },
  ) {
    return this.grounds.setKindOfWork(id, userId, body ?? {});
  }

  @Patch(':id/who-sees-targets')
  @ApiOperation({ summary: "Whether people on this check-in see each other's numbers, or only their own" })
  async setWhoSeesTargets(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { everybody: boolean },
  ) {
    return this.grounds.setWhoSeesTargets(id, userId, !!body.everybody);
  }

  @Get(':id/simpler-words')
  @ApiOperation({ summary: 'Whether this check-in uses simpler words for everybody in it' })
  async getSimplerWords(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.getSimplerWords(id, userId);
  }

  @Patch(':id/simpler-words')
  @ApiOperation({ summary: 'Switch "Use simpler words" on or off for this check-in' })
  async setSimplerWords(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { on: boolean },
  ) {
    return this.grounds.setSimplerWords(id, userId, body?.on);
  }

  @Patch(':id/over-whatsapp')
  @ApiOperation({ summary: 'Whether people answer this check-in on WhatsApp, in the app, or whatever the organisation does' })
  async setOverWhatsApp(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { over: boolean | null },
  ) {
    /* Three states, not two: null is "follow the organisation", which is what every ground did
       before the question existed. `?? null` so an absent field is that rather than false. */
    return this.grounds.setOverWhatsApp(id, userId, body.over ?? null);
  }

  @Patch(':id/expect-them-to-unblock')
  @ApiOperation({ summary: 'Whether this check-in asks what somebody tried before recording a blocker' })
  async setExpectThemToUnblock(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { expect: boolean },
  ) {
    return this.grounds.setExpectThemToUnblock(id, userId, !!body.expect);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update timeline weeks and/or cadence; change is audit-logged on the ground' })
  async updateTimeline(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateTimelineDto) {
    return this.grounds.updateTimeline(id, userId, dto);
  }
}
