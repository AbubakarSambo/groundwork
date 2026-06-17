import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class AddParticipantDto {
  @ApiProperty({ example: 'ada@acme.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: 'Head of Engineering', description: 'The role as the initiator describes it (shown to the participant — never hidden)' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  roleAsDescribed?: string;

  @ApiPropertyOptional({ description: 'Pre-generated invite token from the entry flow. If provided, used as the invite token instead of a freshly generated one.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  inviteToken?: string;

  @ApiPropertyOptional({ description: 'A personal note from the initiator included in the invite email.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
