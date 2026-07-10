import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class AddParticipantDto {
  @ApiProperty({ example: 'ada@acme.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: 'Head of Engineering', description: 'The role as the initiator describes it (shown to the participant - never hidden)' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  roleAsDescribed?: string;

  @ApiPropertyOptional({ example: 'Looking forward to aligning on the roadmap with you.', description: 'Optional personal note included in the invite email' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ description: 'Pre-generated invite token from the anonymous entry flow. If absent, a new token is generated.' })
  @IsOptional()
  @IsString()
  inviteToken?: string;
}
