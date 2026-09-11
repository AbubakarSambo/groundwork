import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BackOfficeDoorService } from './back-office-door.service';

/**
 * THE DOOR ITSELF. Signed-in only, and deliberately not under /ops or /admin, which are what it
 * guards. Three calls: where do I stand, send me the code, here is the code.
 */
@ApiTags('Back office door')
@ApiBearerAuth()
@Controller('back-office/door')
@UseGuards(JwtAuthGuard)
export class BackOfficeDoorController {
  constructor(private readonly door: BackOfficeDoorService) {}

  @Get()
  @ApiOperation({ summary: 'Whether the back office is open to this session, and how' })
  status(@CurrentUser('id') userId: string, @Req() req: { user?: { signedInVia?: string | null } }) {
    return this.door.status(userId, req.user?.signedInVia);
  }

  @Post('code')
  @HttpCode(200)
  @ApiOperation({ summary: 'Email a six-digit code to the signed-in address' })
  sendCode(@CurrentUser('id') userId: string) {
    return this.door.sendCode(userId);
  }

  @Post('verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Enter the code. The back office then stays open for a week.' })
  verify(@CurrentUser('id') userId: string, @Body() body: { code: string }) {
    return this.door.verify(userId, body?.code);
  }
}
