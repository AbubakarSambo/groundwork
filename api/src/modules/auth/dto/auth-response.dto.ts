import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlanInfoDto {
  @ApiProperty()
  planTier: string;

  @ApiProperty()
  subscriptionStatus: string;

  @ApiPropertyOptional()
  trialEndDate?: Date;

  @ApiProperty()
  isGrandfathered: boolean;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  organizationName: string;

  @ApiProperty()
  isPlatformAdmin: boolean;

  @ApiPropertyOptional({ type: PlanInfoDto })
  plan?: PlanInfoDto;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
