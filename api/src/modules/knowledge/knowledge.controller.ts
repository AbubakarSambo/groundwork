import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Req, UseGuards, HttpCode, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { MachineTokenGuard, RequiresScope, MachineCaller } from '../public-api/machine-token.guard';
import { KnowledgeService, CardInput, DocumentInput } from './knowledge.service';

/**
 * The knowledge surface, on the integration path with everything else a customer's systems call.
 * Same reasoning as the rest of it: their server pushes, we never pull.
 */
@ApiTags('Integration API')
@Public()
@Controller('api/org/v1/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Post('cards')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('knowledge:write')
  @ApiOperation({ summary: 'Put a card. A changed body supersedes; an identical one just re-stamps.' })
  put(@Req() req: { machine: MachineCaller }, @Body() dto: CardInput) {
    return this.knowledge.put(req.machine.organizationId, dto);
  }

  /**
   * A DOCUMENT, NOT A CARD. It is split here and stored as cards, so everything downstream - the
   * retrieval, the supersession, the as-of history - treats it as one.
   *
   * Same scope as a card write, because that is what it is. The route is separate so that a caller
   * sending a handbook cannot silently land it in one 40,000-character card, which is what happened
   * when the only way in was `cards`.
   */
  @Post('documents')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('knowledge:write')
  @ApiOperation({ summary: 'Put a whole document. Split into cards; a shorter version retires what it no longer covers.' })
  document(@Req() req: { machine: MachineCaller }, @Body() dto: DocumentInput) {
    return this.knowledge.ingestDocument(req.machine.organizationId, dto);
  }

  @Post('cards/bulk')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('knowledge:write')
  @ApiOperation({ summary: 'Put many cards' })
  async bulk(@Req() req: { machine: MachineCaller }, @Body() dto: { cards?: CardInput[] }) {
    const results: { key: string; ok: boolean; error?: string }[] = [];
    for (const c of dto?.cards ?? []) {
      try {
        await this.knowledge.put(req.machine.organizationId, c);
        results.push({ key: c.key, ok: true });
      } catch (e: any) {
        /* Skip and report, same as a subject import: one bad card must not block the rest. */
        results.push({ key: c?.key ?? '(no key)', ok: false, error: String(e?.response?.message ?? e?.message) });
      }
    }
    return { total: results.length, succeeded: results.filter((r) => r.ok).length, results };
  }

  @Patch('cards/:key')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('knowledge:write')
  @ApiOperation({ summary: 'Correct a typo in place. Does not bump the version or change the dates.' })
  correct(@Req() req: { machine: MachineCaller }, @Param('key') key: string, @Body() dto: { title?: string; sourceRef?: string | null }) {
    return this.knowledge.correct(req.machine.organizationId, key, dto ?? {});
  }

  @Get('cards')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('findings:read')
  @ApiOperation({ summary: 'List current cards, or the whole history with includeHistory=true' })
  list(@Req() req: { machine: MachineCaller }, @Query('kind') kind?: string, @Query('key') key?: string, @Query('includeHistory') includeHistory?: string) {
    return this.knowledge.list(req.machine.organizationId, { kind, key, includeHistory: includeHistory === 'true' });
  }

  @Get('cards/:key/as-of')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('findings:read')
  @ApiOperation({ summary: 'What this card said on a given date. The reason supersession exists.' })
  asOf(@Req() req: { machine: MachineCaller }, @Param('key') key: string, @Query('at') at: string) {
    /*
     * A MISSING OR UNREADABLE DATE IS REFUSED RATHER THAN TREATED AS NOW.
     *
     * It defaulted to `new Date()`, so `?when=2026-03-01` - the wrong parameter name, which is easy
     * to reach for - returned today's card with no sign that the date had been ignored. That is the
     * worst shape a wrong answer can take here: the caller asked what the handbook said in March,
     * got what it says today, and has every reason to believe it is March's. I did this while
     * driving the endpoint and believed the answer for a full minute.
     *
     * `new Date("nonsense")` is an Invalid Date rather than a throw, so the check is on the value.
     */
    const when = new Date(at);
    if (!at || Number.isNaN(when.getTime())) {
      throw new BadRequestException('as-of needs a date in `at`, as an ISO timestamp. Without one this would answer for today, which is what `GET cards` is for.');
    }
    return this.knowledge.asOf(req.machine.organizationId, key, when);
  }

  @Delete('cards/:key')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('knowledge:write')
  @ApiOperation({ summary: 'Retire a card. Supersedes, never hard deletes.' })
  retire(@Req() req: { machine: MachineCaller }, @Param('key') key: string) {
    return this.knowledge.retire(req.machine.organizationId, key);
  }
}
