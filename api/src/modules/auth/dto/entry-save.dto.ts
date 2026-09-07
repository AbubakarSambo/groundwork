import { IsEmail, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * THE DOOR EVERYBODY ACTUALLY WALKS.
 *
 * `/auth/entry-save` is how sign-up happens, and it had no DTO, no field validation and no
 * honeypot — only a throttle of ten a minute. The two endpoints that DO carry a honeypot,
 * `/auth/register` and `/auth/magic-link-register`, are reached by no client form, so the
 * protection sat on the paths nobody uses. See the note in auth.service.ts register().
 *
 * The draft is deliberately loose: it carries whatever the entry chat had gathered before an
 * address was given, and pinning its shape here would mean a client change that adds a field
 * silently loses somebody's work at the validation pipe. It is capped rather than described.
 */
export class EntrySaveDto {
  @IsEmail({}, { message: 'That does not look like an email address. Check it and try again.' })
  @MaxLength(320)
  email: string;

  @IsOptional()
  @IsObject()
  draft?: { payload?: Record<string, unknown>; history?: unknown[] };

  /**
   * A FIELD A PERSON CANNOT SEE. Filled in means a bot.
   *
   * Named `_hp` to match the two existing endpoints, so there is one convention rather than two.
   * The client renders it — see the guard: a honeypot nothing renders catches nothing, which is
   * exactly the state this is fixing.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  _hp?: string;
}
