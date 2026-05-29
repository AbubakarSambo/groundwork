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
}
