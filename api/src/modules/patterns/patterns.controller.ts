import { Controller, Get, Patch, Post, Param, Body, UseGuards, HttpCode, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PatternsService } from './patterns.service';
import { CurrentUser } from '../../common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import type { ALeadPatternMark } from './who-reads-a-pattern';

const LEAD_MARKS: ALeadPatternMark[] = ['RIGHT', 'WRONG', 'NOT_SURE'];

@ApiTags('Patterns')
@ApiBearerAuth()
@Controller('patterns')
export class PatternsController {
  constructor(private readonly patterns: PatternsService) {}

  /**
   * PLATFORM ADMIN, not org admin. The guard used to be `@Roles(Role.ADMIN)`
   * while the summary said "platform admin only", and the two disagreed in the
   * direction that matters: `codeAccuracySummary()` takes no organizationId and
   * aggregates detections across EVERY org, so any customer's own admin could
   * read a statistic computed from every other customer's grounds.
   *
   * Nothing called this endpoint, so nobody exercised the gap. It is being wired
   * to the platform dashboard now, which is exactly why the guard has to be
   * right first.
   */
  @Get('accuracy')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: 'Per-code accuracy summary across all orgs (platform admin only)' })
  async accuracySummary() {
    return this.patterns.codeAccuracySummary();
  }

  /* The same mistake as the one above, one route down: `@Roles(Role.ADMIN)` is an ORG admin, while the
     service says "only platform admins can rate" and the ratings feed the cross-org summary. */
  @Patch(':id/rate')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: 'Rate accuracy of a surfaced pattern detection (platform admin only)' })
  async rate(
    @Param('id') id: string,
    @Body() body: { accurate: boolean },
    @CurrentUser('id') userId: string,
  ) {
    await this.patterns.rateAccuracy(id, body.accurate, userId);
    return { rated: true };
  }

  /**
   * THE PERSON A PATTERN IS ABOUT SAYS WHAT IS BEHIND IT. Any signed-in person may call it; the
   * service answers "not found" unless the pattern is theirs and they may already read it.
   */
  @Post(':id/answer')
  @HttpCode(200)
  @ApiOperation({ summary: 'The person a pattern is about says what is behind it' })
  async answer(
    @Param('id') id: string,
    @Body() body: { text?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.patterns.answerAsThePerson(id, userId, String(body?.text ?? ''));
  }

  /**
   * THE LEAD MARKS A PATTERN RIGHT, WRONG OR NOT SURE, AFTER TALKING IT THROUGH (decision 57, item
   * 2). Only the person who runs this check-in; the service answers 403 for anybody else, including
   * the person the pattern is about and a colleague, and for a pattern the lead may not read yet.
   */
  @Post(':id/mark')
  @HttpCode(200)
  @ApiOperation({ summary: 'The lead marks a pattern right, wrong or not sure, after talking it through' })
  async mark(
    @Param('id') id: string,
    @Body() body: { mark?: string },
    @CurrentUser('id') userId: string,
  ) {
    const mark = String(body?.mark ?? '').toUpperCase();
    if (!LEAD_MARKS.includes(mark as ALeadPatternMark)) {
      throw new BadRequestException('Say whether this was right, wrong or not sure.');
    }
    return this.patterns.markAsTheLead(id, userId, mark as ALeadPatternMark);
  }

  /**
   * THE LEAD MARKS THAT THEY TALKED A PATTERN THROUGH WITH THE PERSON (decision 57, item 3). Same
   * identity and timing as `mark` above. The nudge to have this conversation goes away once this is
   * set.
   */
  @Post(':id/talked-about')
  @HttpCode(200)
  @ApiOperation({ summary: 'The lead marks that they talked a pattern through with the person' })
  async talkedAbout(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.patterns.markTalkedAbout(id, userId);
  }
}
