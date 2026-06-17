import { Controller, Post, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsIn } from 'class-validator';
import { Public } from '../../common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { FeedbackService } from './feedback.service';

const VALID_TABS = ['reaction', 'build_request', 'something_went_wrong'];
const VALID_PILLS = [
  'This is exactly what I needed.',
  'This could work for me.',
  'Interesting but not sure yet.',
  'Not built for my situation.',
  'Too much to take in.',
  'I do not trust it yet.',
  'This feels like it matters.',
  'I would not use this.',
  'Other.',
  'Add a feature.',
  'Change something that exists.',
  'This works but needs to be simpler.',
  'Build this for my specific situation.',
  'It broke and I could not continue.',
  'It lost something I wrote.',
  'It did not do what I expected.',
  'Something felt wrong but I cannot name it.',
];
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
