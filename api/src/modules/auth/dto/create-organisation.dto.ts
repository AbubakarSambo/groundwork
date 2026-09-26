import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

/** "Fewer than 20" or "20 or more": what they chose, and the line they were shown. */
export class TeamSizeSaidDto {
  @IsIn(['fewer', 'more']) said!: 'fewer' | 'more';
  @IsInt() @Min(2) @Max(10_000) line!: number;
}

/**
 * "CREATE AN ORGANISATION" (U.3, #/org-new).
 *
 * The name is what the person typed. The billing email is optional ("Not shown to your team. You can
 * add it later."). The team size is only sent while the free trial is on.
 */
export class CreateOrganisationDto {
  @ApiPropertyOptional() @IsString() @MaxLength(255) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(255) billingEmail?: string;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => TeamSizeSaidDto) teamSize?: TeamSizeSaidDto;
}
