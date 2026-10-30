import { Controller, Post, Body, Req, UseGuards, HttpCode, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { MachineTokenGuard, RequiresScope, MachineCaller } from '../public-api/machine-token.guard';
import { PrismaService } from '../prisma/prisma.service';

/**
 * SUMMONING A CHECK-IN AGAINST A PIECE OF THE CUSTOMER'S OWN WORK.
 *
 * The moment somebody actually SAYS which objective a conversation is about. Every other link
 * between a check-in and a subject would be an inference - matching titles, guessing from who is in
 * the room - and a finding about two named people must not rest on a guess nobody made.
 *
 * What comes back is a link and an expiry, and the customer's system delivers it however it already
 * reaches people. It carries an invitation and nothing else: no name, no objective, no context, so
 * that a link forwarded to the wrong person reveals nothing before they sign in.
 */
@ApiTags('Integration API')
@Public()
@Controller('api/org/v1')
export class CheckinsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Post('checkins')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('checkins:write')
  @ApiOperation({ summary: 'Link a check-in to an objective, and get a link to send somebody' })
  async summon(
    @Req() req: { machine: MachineCaller },
    @Body() dto: { groundId?: string; subjectExternalId?: string },
  ) {
    const organizationId = req.machine.organizationId;
    if (!dto?.groundId || !dto?.subjectExternalId) {
      throw new BadRequestException('groundId and subjectExternalId are both required.');
    }

    /* Scoped, so a guessed id from another tenant resolves to nothing rather than to their ground. */
    const ground = await this.prisma.ground.findFirst({
      where: { id: dto.groundId, organizationId },
      select: { id: true, joinToken: true },
    });
    if (!ground) throw new BadRequestException('No such check-in.');

    /*
     * THE SUBJECT HAS TO EXIST, and this is the one place that is worth being strict about. A
     * check-in linked to an objective nobody pushed would produce findings about a title we cannot
     * show, and the customer would have no way to tell what it was talking about.
     */
    const subject = await this.prisma.subject.findFirst({
      where: { organizationId, externalId: dto.subjectExternalId, sourceDeletedAt: null },
      select: { externalId: true },
    });
    if (!subject) throw new BadRequestException('No subject with that externalId has been sent to us.');

    await this.prisma.ground.update({
      where: { id: ground.id },
      data: { subjectExternalId: subject.externalId },
    });

    const base = this.config.get<string>('resend.frontendUrl') ?? 'http://localhost:5173';
    return {
      checkinId: ground.id,
      /* The existing join link. A second invitation mechanism would be a second thing to keep
         working, and this one already has a page behind it. */
      /* `t`, the parameter the join page reads: `token` opened "That link didn't work" (26 October 2026). */
      url: ground.joinToken ? `${base.replace(/\/$/, '')}/join?t=${ground.joinToken}` : null,
      subjectExternalId: subject.externalId,
    };
  }
}
