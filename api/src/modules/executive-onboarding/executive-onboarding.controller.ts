import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser, CurrentUserData, Role, Roles } from '../../common';
import { ExecutiveOnboardingService } from './executive-onboarding.service';

class ThePermissionsDto {
  @IsOptional() @IsBoolean() dataHandling?: boolean;
  @IsOptional() @IsBoolean() teamOutreach?: boolean;
  @IsOptional() @IsBoolean() confidentialInformation?: boolean;
  @IsOptional() @IsBoolean() messaging?: boolean;
}

export class AddAnExecutiveDto {
  @IsString() @IsNotEmpty() @MaxLength(80) firstName: string;
  @IsString() @IsNotEmpty() @MaxLength(80) lastName: string;
  @IsEmail({}, { message: 'That does not look like an email address. Please write the whole address.' }) email: string;
  @IsOptional() @IsString() @MaxLength(40) whatsappNumber?: string;
  /** For the two team notes: "Abuja office" gives "the Abuja office". */
  @IsOptional() @IsString() @MaxLength(120) officeName?: string;
  /** The starting brief, as the admin has it. */
  @IsOptional() @IsString() @MaxLength(4000) brief?: string;
  @IsObject() @ValidateNested() @Type(() => ThePermissionsDto) permissions: ThePermissionsDto;
}

@ApiTags('executives')
@ApiBearerAuth()
@Controller('executives')
export class ExecutiveOnboardingController {
  constructor(private readonly onboarding: ExecutiveOnboardingService) {}

  /**
   * AN ADMIN ADDS A SENIOR PERSON WHO NEVER REGISTERS. One act makes her identity, starts both standing jobs, records her preferences and the
   * organisation's approvals, and sends her the two introductions. The administrator check is made again inside, from the membership row.
   */
  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Add a senior person by email and WhatsApp number; she is introduced by both and never signs up' })
  async add(@CurrentUser() user: CurrentUserData, @Body() dto: AddAnExecutiveDto) {
    const r = await this.onboarding.add({ organizationId: user.organizationId, byUserId: user.id, firstName: dto.firstName, lastName: dto.lastName, email: dto.email, whatsappNumber: dto.whatsappNumber, officeName: dto.officeName, brief: dto.brief, permissions: dto.permissions });
    if (!r.ok) throw new BadRequestException(r.said);
    return { said: r.said, principalUserId: r.principalUserId, introductions: r.deliveries };
  }
}
