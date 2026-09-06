import { Controller, Get, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { EmbedSessionGuard, PanelCaller } from '../embed/embed-session.guard';
import { WhatIsTrueService } from './what-is-true.service';
import { whatICanSee } from './what-i-can-see';

/**
 * PANEL-AUTHENTICATED, AND IT COULD NOT BE ANYTHING ELSE.
 *
 * The question this answers is "what do you know about ME", so the answer is
 * built for exactly the person the token names. There is no parameter here for
 * whose material to show, because a route with one would be a route somebody
 * could point at a colleague.
 */
@ApiTags('Integration API')
@Public()
@Controller('api/org/v1/assistant')
export class WhatICanSeeController {
  constructor(private readonly truth: WhatIsTrueService) {}

  @Get('what-you-can-see')
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'The material your next answer will be built from, and what was left out of it' })
  async seen(@Req() req: { panel: PanelCaller }) {
    /* The SAME assembly the assistant is handed. See `what-i-can-see.ts` for why
       this may not become a second query of its own. */
    const truth = await this.truth.forPerson(req.panel.organizationId, req.panel.personId);
    if (!truth) throw new NotFoundException('There is nobody by that name in this organisation.');
    return whatICanSee(truth);
  }
}
