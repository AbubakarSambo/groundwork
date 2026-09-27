import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, CurrentUserData } from '../../common';
import { SuggestionsService } from './suggestions.service';

class DecideDto {
  @IsOptional() @IsString() @MaxLength(1000) decision?: string;
  @IsOptional() @IsString() @MaxLength(2000) reasons?: string;
}
class SideDto {
  @IsOptional() @IsString() @MaxLength(4000) side?: string;
}
class AppealDto {
  @IsOptional() @IsString() @MaxLength(4000) why?: string;
}
class DecideAppealDto {
  @IsOptional() @IsString() @IsIn(['stands', 'changed']) outcome?: string;
  @IsOptional() @IsString() @MaxLength(2000) reasons?: string;
}

/**
 * SUGGESTIONS FROM A VERDICT, AND APPEALS (C3, U.13). Who may read and do what is decided in
 * SuggestionsService, on the server, for every route here. There is no route that creates a
 * suggestion: only the engine does, through `SuggestionsService.record`.
 */
@ApiTags('Suggestions')
@ApiBearerAuth()
@Controller()
export class SuggestionsController {
  constructor(private readonly suggestions: SuggestionsService) {}

  private reader(user: CurrentUserData) {
    return { userId: user.id, organizationId: user.organizationId };
  }

  @Get('grounds/:groundId/suggestions')
  @ApiOperation({ summary: "Groundwork's suggestions on one check-in, as this reader may read them" })
  forGround(@Param('groundId') groundId: string, @CurrentUser() user: CurrentUserData) {
    return this.suggestions.forGround(groundId, this.reader(user));
  }

  @Get('suggestions/appeals')
  @ApiOperation({ summary: 'Appeals still to be decided in this organisation (admins only)' })
  appeals(@CurrentUser() user: CurrentUserData) {
    return this.suggestions.appealsToDecide(this.reader(user));
  }

  @Post('suggestions/:id/decision')
  @ApiOperation({ summary: 'The lead decides, giving reasons' })
  decide(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Body() dto: DecideDto) {
    return this.suggestions.decide(id, this.reader(user), dto);
  }

  @Post('suggestions/:id/side')
  @ApiOperation({ summary: 'The person this is about adds their side' })
  side(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Body() dto: SideDto) {
    return this.suggestions.addSide(id, this.reader(user), dto);
  }

  @Post('suggestions/:id/appeal')
  @ApiOperation({ summary: 'The person this is about appeals the decision' })
  appeal(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Body() dto: AppealDto) {
    return this.suggestions.appeal(id, this.reader(user), dto);
  }

  @Post('suggestions/:id/appeal/decision')
  @ApiOperation({ summary: 'An admin decides the appeal, giving reasons' })
  decideAppeal(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Body() dto: DecideAppealDto) {
    return this.suggestions.decideAppeal(id, this.reader(user), dto);
  }
}
