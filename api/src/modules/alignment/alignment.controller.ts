import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AlignmentService } from './alignment.service';
import { CandidateKey } from './an-explanation-is-a-candidate';
import { AgreementsService } from './agreements.service';
import { AssertionsService } from './assertions.service';
import { PartiesService } from './parties.service';
import { ObligationsService } from './obligations.service';
import { OnlySomebodyInTheCheckInReadsIt } from './only-somebody-in-the-check-in-reads-it.guard';
import { Side } from './a-party-is-an-organisation';
import { WhatFor } from './a-term-is-not-true-because-a-model-read-it';

/**
 * Session-authenticated, and scoped to a check-in. Every route names the ground,
 * and every read is organisation-scoped in the service — a figure from somebody
 * else's relationship is not a thing anybody here may compare against.
 */
@ApiTags('Alignment')
@Controller('grounds/:groundId/alignment')
/* Every route, reads and writes alike, asks who is asking before it does anything (B-149; the writes were found by the privacy review). */
@UseGuards(JwtAuthGuard, OnlySomebodyInTheCheckInReadsIt)
export class AlignmentController {
  constructor(
    private readonly alignment: AlignmentService,
    private readonly agreements: AgreementsService,
    private readonly assertions: AssertionsService,
    private readonly parties: PartiesService,
    private readonly obligations: ObligationsService,
  ) {}

  @Get('figures')
  @ApiOperation({ summary: 'The figures on this check-in, each with where it came from and whether a person has checked it' })
  figures(@CurrentUser('organizationId') organizationId: string, @Param('groundId') groundId: string) {
    return this.alignment.figures(organizationId, groundId);
  }

  @Post('figures')
  @ApiOperation({ summary: 'Record a figure. One read out of a document is unconfirmed until somebody who would know says it is right.' })
  record(
    @CurrentUser('organizationId') organizationId: string,
    @Param('groundId') groundId: string,
    @Body() dto: any,
  ) {
    return this.alignment.recordFigure(organizationId, groundId, {
      ...dto,
      periodFrom: new Date(dto?.periodFrom),
      periodTo: new Date(dto?.periodTo),
    });
  }

  @Post('figures/:figureId/confirm')
  @ApiOperation({ summary: 'A person who would know says a reading is right' })
  confirm(
    @CurrentUser('organizationId') organizationId: string,
    @Param('groundId') groundId: string,
    @CurrentUser('id') userId: string,
    @Param('figureId') figureId: string,
  ) {
    return this.alignment.confirmFigure(organizationId, groundId, figureId, userId);
  }

  @Post('compare')
  @ApiOperation({ summary: 'Compare a stated figure against a set of parts, keeping the difference if there is one worth asking about' })
  compare(
    @CurrentUser('organizationId') organizationId: string,
    @Param('groundId') groundId: string,
    @Body() dto: { statedFigureId: string; countedFigureIds: string[] },
  ) {
    return this.alignment.compare(organizationId, groundId, dto?.statedFigureId, dto?.countedFigureIds ?? []);
  }

  @Post('agreements')
  @ApiOperation({ summary: 'Start an agreement on this check-in, with its first version' })
  startAgreement(
    @CurrentUser('organizationId') organizationId: string,
    @Param('groundId') groundId: string,
    @Body() dto: { says: string; inForceFrom: string },
  ) {
    return this.agreements.start(organizationId, groundId, dto?.says, new Date(dto?.inForceFrom));
  }

  @Post('agreements/:agreementId/amend')
  @ApiOperation({ summary: 'An amendment is a new version. The one it replaces is closed the day before, never edited.' })
  amend(
    @CurrentUser('organizationId') organizationId: string,
    @Param('groundId') groundId: string,
    @Param('agreementId') agreementId: string,
    @Body() dto: { inForceFrom: string },
  ) {
    return this.agreements.amend(organizationId, groundId, agreementId, new Date(dto?.inForceFrom));
  }

  @Get('agreements/:agreementId/in-force')
  @ApiOperation({ summary: 'What governed a given day, or why nothing did' })
  inForce(
    @CurrentUser('organizationId') organizationId: string,
    @Param('groundId') groundId: string,
    @Param('agreementId') agreementId: string,
    @Query('on') on?: string,
  ) {
    return this.agreements.inForceOn(organizationId, groundId, agreementId, on ? new Date(on) : new Date());
  }

  @Post('versions/:versionId/agreed')
  @ApiOperation({ summary: 'A side says this version is what they signed. Two sides, and it is in force.' })
  agreedVersion(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('groundId') groundId: string,
    @Param('versionId') versionId: string,
    @Body() dto: { who: string },
  ) {
    return this.agreements.agreed(organizationId, groundId, versionId, dto?.who, { userId, role });
  }

  @Post('versions/:versionId/terms')
  @ApiOperation({ summary: 'A term read out of the document. Arrives as a reading and nothing may be judged against it.' })
  readTerm(
    @CurrentUser('organizationId') organizationId: string,
    @Param('groundId') groundId: string,
    @Param('versionId') versionId: string,
    @Body() dto: { says: string; reads: string; clause?: string },
  ) {
    return this.agreements.readTerm(organizationId, groundId, versionId, dto);
  }

  /**
   * "THAT IS NOT WHAT I SAID", for a term.
   *
   * The press the record has had all along, pointed at the one table where being held to words you
   * did not say costs money. `what: 'term'` takes the whole row off - it is not a clause, or not
   * what the clause says. `what: 'reading'` takes back only your own half of a difference and
   * leaves everybody else's exactly as it was.
   */
  @Post('terms/:termId/not-what-i-said')
  @ApiOperation({ summary: 'Say a term was misread, or take back your own reading of one' })
  notWhatISaid(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('groundId') groundId: string,
    @Param('termId') termId: string,
    @Body() dto: { who: string; what?: 'term' | 'reading' },
  ) {
    return this.agreements.notWhatISaid(
      organizationId, groundId, termId, dto?.who, dto?.what === 'reading' ? 'reading' : 'term', { userId, role },
    );
  }

  @Post('terms/:termId/checked')
  @ApiOperation({ summary: 'Somebody who would know says the reading is right' })
  checked(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('groundId') groundId: string,
    @Param('termId') termId: string,
    @Body() dto: { who: string },
  ) {
    return this.agreements.checked(organizationId, groundId, termId, dto?.who, { userId, role });
  }

  @Post('terms/:termId/read-differently')
  @ApiOperation({ summary: 'Somebody reads the same clause differently. Both readings are kept, in both their words.' })
  differently(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('groundId') groundId: string,
    @Param('termId') termId: string,
    @Body() dto: { who: string; reads: string },
  ) {
    return this.agreements.readsItDifferently(organizationId, groundId, termId, dto?.who, dto?.reads, { userId, role });
  }

  @Get('terms/:termId/may-be-used-to')
  @ApiOperation({ summary: 'Whether a term may be shown, used to ask, or used to judge - and why not, where not' })
  mayBeUsed(
    @CurrentUser('organizationId') organizationId: string,
    @Param('groundId') groundId: string,
    @Param('termId') termId: string,
    @Query('what') what: WhatFor,
  ) {
    return this.agreements.mayThisBeUsedTo(organizationId, groundId, termId, what);
  }

  @Post('versions/:versionId/signed')
  @ApiOperation({ summary: 'It was executed. A different moment from agreeing, and from governing anything.' })
  signed(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('groundId') groundId: string,
    @Param('versionId') versionId: string,
    @Body() dto: { said: string; on?: string },
  ) {
    return this.agreements.signed(organizationId, groundId, versionId, dto?.said, { userId, role }, dto?.on ? new Date(dto.on) : undefined);
  }

  @Get('versions/:versionId/standing')
  @ApiOperation({ summary: 'Where a version stands today - discussed, agreed, signed, in force - and whether anything may be settled against it' })
  standing(
    @CurrentUser('organizationId') organizationId: string,
    @Param('groundId') groundId: string,
    @Param('versionId') versionId: string,
    @Query('on') on?: string,
  ) {
    return this.agreements.standing(organizationId, groundId, versionId, on ? new Date(on) : undefined);
  }

  @Get('obligations')
  @ApiOperation({ summary: 'Every obligation on this check-in, each carrying what it is evidence of' })
  obligationsHere(@CurrentUser('organizationId') organizationId: string, @Param('groundId') groundId: string) {
    return this.obligations.whereEverythingStands(organizationId, groundId);
  }

  @Post('terms/:termId/obligations')
  @ApiOperation({ summary: 'An obligation from a term. Refused unless both sides agreed the reading of it.' })
  obligationFrom(
    @CurrentUser('organizationId') organizationId: string,
    @Param('groundId') groundId: string,
    @Param('termId') termId: string,
    @Body() dto: { says: string; whose: string; dueOn?: string },
  ) {
    return this.obligations.from(organizationId, groundId, termId, {
      says: dto?.says,
      whose: dto?.whose,
      dueOn: dto?.dueOn ? new Date(dto.dueOn) : undefined,
    });
  }

  @Post('obligations/:obligationId/asked')
  @ApiOperation({ summary: 'Somebody was asked about it in their own check-in' })
  obligationAsked(
    @CurrentUser('organizationId') organizationId: string,
    @Param('groundId') groundId: string,
    @Param('obligationId') obligationId: string,
  ) {
    return this.obligations.asked(organizationId, groundId, obligationId);
  }

  @Post('obligations/:obligationId/account')
  @ApiOperation({ summary: 'What somebody said about it, in their words. Whether it was done is theirs to say.' })
  obligationAccount(
    @CurrentUser('organizationId') organizationId: string,
    @Param('groundId') groundId: string,
    @Param('obligationId') obligationId: string,
    @Body() dto: { by: string; said: string; theyDid: boolean | null },
  ) {
    return this.obligations.accountOf(organizationId, groundId, obligationId, dto);
  }

  @Post('obligations/:obligationId/nothing-shown')
  @ApiOperation({ summary: 'Nothing was shown either way. Not a claim about anybody.' })
  obligationNothing(
    @CurrentUser('organizationId') organizationId: string,
    @Param('groundId') groundId: string,
    @Param('obligationId') obligationId: string,
  ) {
    return this.obligations.nothingShown(organizationId, groundId, obligationId);
  }

  @Get('parties')
  @ApiOperation({ summary: 'The two sides, what each may do, and what happens to the record afterwards' })
  sides(@CurrentUser('organizationId') organizationId: string, @Param('groundId') groundId: string) {
    return this.parties.sides(organizationId, groundId);
  }

  @Post('parties')
  @ApiOperation({ summary: 'Name a side. The one that set it up is the organisation the check-in lives in.' })
  nameParty(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('groundId') groundId: string,
    @Body() dto: { side: Side; name: string; organizationId?: string },
  ) {
    return this.parties.name(organizationId, userId, groundId, dto);
  }

  @Post('parties/:partyId/people')
  @ApiOperation({ summary: 'A party says which of its own people take part. Refused for anybody not part of it.' })
  designate(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('groundId') groundId: string,
    @Param('partyId') partyId: string,
    @Body() dto: { people: { email: string; roleAsDescribed?: string }[] },
  ) {
    return this.parties.designate({ organizationId, userId }, groundId, partyId, dto?.people ?? []);
  }

  @Post('assertions')
  @ApiOperation({ summary: 'One side said something. What it is about must be answerable by somebody who never heard the claim.' })
  said(
    @CurrentUser('organizationId') organizationId: string,
    @Param('groundId') groundId: string,
    @Body() dto: { claim: string; about: string; by: string; theOtherSide: string },
  ) {
    return this.assertions.said(organizationId, groundId, dto);
  }

  @Get('assertions')
  @ApiOperation({ summary: 'Where every claim on this check-in stands, and since when' })
  assertionsHere(@CurrentUser('organizationId') organizationId: string, @Param('groundId') groundId: string) {
    return this.assertions.whereEverythingStands(organizationId, groundId);
  }

  @Get('assertions/waiting-on/:who')
  @ApiOperation({ summary: 'What to ask somebody, with the claim not in it - this read cannot return a claim at all' })
  waitingOn(
    @CurrentUser('organizationId') organizationId: string,
    @Param('groundId') groundId: string,
    @Param('who') who: string,
  ) {
    return this.assertions.whatIsWaitingOn(organizationId, groundId, who);
  }

  @Post('assertions/:assertionId/asked')
  @ApiOperation({ summary: 'Record the question the other side was asked. Refused where it gives the claim away.' })
  asked(
    @CurrentUser('organizationId') organizationId: string,
    @Param('groundId') groundId: string,
    @Param('assertionId') assertionId: string,
    @Body() dto: { question: string },
  ) {
    return this.assertions.asked(organizationId, groundId, assertionId, dto?.question);
  }

  @Post('assertions/:assertionId/answered')
  @ApiOperation({ summary: 'Their own account, and whether a person judges it to say the same thing' })
  assertionAnswered(
    @CurrentUser('organizationId') organizationId: string,
    @Param('groundId') groundId: string,
    @Param('assertionId') assertionId: string,
    @Body() dto: { theirAccount: string; theyAgree: boolean },
  ) {
    return this.assertions.answered(organizationId, groundId, assertionId, dto);
  }

  @Get('differences')
  @ApiOperation({ summary: 'What is unexplained on this check-in, since when, and what has not been asked yet' })
  open(@CurrentUser('organizationId') organizationId: string, @Param('groundId') groundId: string) {
    return this.alignment.whatIsOpen(organizationId, groundId);
  }

  @Post('differences/:differenceId/answered')
  @ApiOperation({ summary: 'What somebody said about a difference. A candidate is only ever ruled out by a person saying so.' })
  answered(
    @CurrentUser('organizationId') organizationId: string,
    @Param('groundId') groundId: string,
    @Param('differenceId') differenceId: string,
    @Body() dto: { ruledOut?: CandidateKey[]; accountedForBy?: string },
  ) {
    return this.alignment.answered(organizationId, groundId, differenceId, dto ?? {});
  }
}
