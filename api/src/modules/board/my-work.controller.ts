import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BoardService } from './board.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../../common';
import { withoutComparisonsAnywhere } from '../reports/no-comparison-between-people';
import { readMyWork } from './my-work';

/**
 * MY WORK (Release 1B, pull request 3 of 3): one person's page in one check-in, served to that person or to the lead alone.
 * A team member asking for anybody else's page is refused; anybody who is neither is refused. Only reads. In the board's module because it reads the board as this reader is served it.
 * See my-work.ts.
 */
@ApiTags('board')
@ApiBearerAuth()
@Controller('grounds/:id/my-work')
export class MyWorkController {
  constructor(private board: BoardService, private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'My work: one person’s page in this check-in, for that person or the lead (Release 1B)' })
  async get(@Param('id') id: string, @CurrentUser('id') userId: string, @Query('person') person?: string) {
    return withoutComparisonsAnywhere(await readMyWork(this.prisma as any, this.board, { groundId: id, userId, personId: person || null }));
  }
}
