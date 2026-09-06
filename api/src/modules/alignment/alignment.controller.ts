import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AlignmentService } from './alignment.service';
import { CandidateKey } from './an-explanation-is-a-candidate';

/**
 * Session-authenticated, and scoped to a check-in. Every route names the ground,
 * and every read is organisation-scoped in the service — a figure from somebody
 * else's relationship is not a thing anybody here may compare against.
 */
@ApiTags('Alignment')
@Controller('grounds/:groundId/alignment')
@UseGuards(JwtAuthGuard)
export class AlignmentController {
  constructor(private readonly alignment: AlignmentService) {}

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
    @CurrentUser('id') userId: string,
    @Param('figureId') figureId: string,
  ) {
    return this.alignment.confirmFigure(organizationId, figureId, userId);
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

  @Get('differences')
  @ApiOperation({ summary: 'What is unexplained on this check-in, since when, and what has not been asked yet' })
  open(@CurrentUser('organizationId') organizationId: string, @Param('groundId') groundId: string) {
    return this.alignment.whatIsOpen(organizationId, groundId);
  }

  @Post('differences/:differenceId/answered')
  @ApiOperation({ summary: 'What somebody said about a difference. A candidate is only ever ruled out by a person saying so.' })
  answered(
    @CurrentUser('organizationId') organizationId: string,
    @Param('differenceId') differenceId: string,
    @Body() dto: { ruledOut?: CandidateKey[]; accountedForBy?: string },
  ) {
    return this.alignment.answered(organizationId, differenceId, dto ?? {});
  }
}
