import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Req, UseGuards, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { MachineTokenGuard, RequiresScope, MachineCaller } from '../public-api/machine-token.guard';
import { KnowledgeService, CardInput } from './knowledge.service';

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
    return this.knowledge.asOf(req.machine.organizationId, key, at ? new Date(at) : new Date());
  }

  @Delete('cards/:key')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('knowledge:write')
  @ApiOperation({ summary: 'Retire a card. Supersedes, never hard deletes.' })
  retire(@Req() req: { machine: MachineCaller }, @Param('key') key: string) {
    return this.knowledge.retire(req.machine.organizationId, key);
  }
}
