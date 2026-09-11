import { Controller, Post, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsIn } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { FeedbackService } from './feedback.service';

/**
 * THE VOCABULARY THE WIDGET ACTUALLY USES. W-UX-C.
 *
 * These two lists and the widget's own option arrays were two vocabularies for one field, and NOT
 * ONE STRING OVERLAPPED. The widget sent `tab: 'build'` where this wanted `'build_request'`, sent
 * its chosen option under a field name this does not have, and sent no `pill` at all - so every
 * submission failed validation with a 400.
 *
 * That is why the table holds nothing. The floating Feedback button has been accepting what people
 * wrote and dropping all of it, and an earlier fix had already removed the catch that hid the error,
 * so a person doing it today gets a failure toast for their trouble.
 *
 * The client's wording is the wording people read, so it is what these lists now hold. Nothing was
 * migrated because there was nothing to migrate: zero rows, checked before changing it.
 *
 * KEPT IN STEP BY A PARITY SPEC, not by care - `client/src/components/gw/the-feedback-form-and-the-
 * server-agree.spec.ts` fails if these lists and the widget's arrays drift again. Same pattern as
 * the pricing parity guards, for the same reason.
 */
const VALID_TABS = ['reaction', 'build_request', 'something_went_wrong'];
const REACTION_PILLS = [
  'This clicked',
  'I could see myself using this',
  'Interesting but I am not sure',
  'Not for me',
];
const BUILD_PILLS = [
  'Reminder / email nudge',
  'Mobile app',
  'Slack integration',
  'Better reports',
  'More templates',
  'Team analytics',
];
/**
 * The "something went wrong" tab has no options - it is a free-text box - so its submissions carry
 * this as the pill and the account itself in `text`. A required field with one possible value is
 * better than a nullable one nothing can explain.
 */
const WENT_WRONG_PILL = 'Something went wrong';
const VALID_PILLS = [...REACTION_PILLS, ...BUILD_PILLS, WENT_WRONG_PILL];
const VALID_STATUSES = ['new', 'reviewed', 'resolved'];

class CreateFeedbackDto {
  @IsString()
  @IsIn(VALID_TABS)
  tab: string;

  @IsString()
  @IsIn(VALID_PILLS)
  pill: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string;
}

class UpdateStatusDto {
  @IsString()
  @IsIn(VALID_STATUSES)
  status: string;
}

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Public()
  /* Anonymous and writes a row on every call; the only public POST with no limit of its own (A9). */
  @Throttle({ global: { limit: 20, ttl: 60_000 } })
  @Post()
  create(@Body() dto: CreateFeedbackDto) {
    return this.feedback.create(dto);
  }

  @UseGuards(PlatformAdminGuard)
  @Get()
  findAll() {
    return this.feedback.findAll();
  }

  @UseGuards(PlatformAdminGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.feedback.updateStatus(id, dto.status);
  }
}
