import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserData } from '../../common';
import { PrismaService } from '../prisma/prisma.service';
import { Librarian } from './the-librarian';
import { theReaderOf } from './who-reads-memory';

/**
 * LOOKING AT MEMORY (steps 2 and 3). Every read goes through the librarian, so a person is given the sections they may read and nothing
 * else; there is no route that returns a file whole. Nothing here writes or rebuilds anything.
 */
@ApiTags('Memory')
@ApiBearerAuth()
@Controller('memory')
export class MemoryController {
  constructor(private readonly librarian: Librarian, private readonly prisma: PrismaService) {}

  @Get('catalogue')
  @ApiOperation({ summary: 'The books you may read here, one line each' })
  async catalogue(@CurrentUser() u: CurrentUserData, @Query('groundId') groundId?: string) {
    const reader = await theReaderOf(this.prisma, u.id, u.organizationId);
    return { books: await this.librarian.catalogueFor(reader, groundId ? { groundId } : {}) };
  }

  @Get('book')
  @ApiOperation({ summary: 'One book, as Markdown, with only the sections you may read' })
  async book(@CurrentUser() u: CurrentUserData, @Query('path') path: string) {
    const reader = await theReaderOf(this.prisma, u.id, u.organizationId);
    const [book] = await this.librarian.open(reader, [String(path ?? '')]);
    /* The same answer for a book that is not there and a book you may not read, so the route never says which. */
    if (!book) throw new NotFoundException('There is no book there that you can read.');
    return book;
  }

  @Get('pull')
  @ApiOperation({ summary: 'What the librarian would hand over for a question, and what that costs against the whole shelf' })
  async pull(@CurrentUser() u: CurrentUserData, @Query('question') question: string, @Query('groundId') groundId?: string) {
    return this.librarian.pull(u.id, u.organizationId, String(question ?? ''), groundId ? { groundId } : {});
  }
}
