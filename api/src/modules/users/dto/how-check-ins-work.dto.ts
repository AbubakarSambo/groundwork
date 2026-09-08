import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * A BODY WITH NO SHAPE ANSWERED 200 AND CHANGED NOTHING.
 *
 * This endpoint took `{ whoMayOpen?: string; needsApproval?: boolean }` as a bare inline type. Nest
 * validates a DTO class, not an inline type, so an unknown key was accepted, ignored, and reported
 * as success. Sending `{ whoCanOpen: 'EVERYONE' }` - one word wrong - returned 200 with the setting
 * still on its old value. An admin changing who may open a check-in got a green result and no
 * change, and nothing anywhere would ever tell them.
 *
 * `forbidNonWhitelisted` in the global pipe is what turns a typo into an error instead of a silent
 * no-op. The values themselves were already checked in the service and stay checked there - this is
 * about the SHAPE of the request, which nothing was checking at all.
 */
export class HowCheckInsWorkDto {
  @ApiPropertyOptional({ enum: ['NAMED_LEADS', 'EVERYONE'] })
  @IsOptional()
  @IsIn(['NAMED_LEADS', 'EVERYONE'], { message: 'whoMayOpen must be NAMED_LEADS or EVERYONE.' })
  whoMayOpen?: 'NAMED_LEADS' | 'EVERYONE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'needsApproval must be true or false.' })
  needsApproval?: boolean;
}
