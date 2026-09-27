import { IsEmail, IsObject, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { AT_LEAST, A_NUMBER_OR_A_SYMBOL, NO_NUMBER_OR_SYMBOL, TOO_SHORT } from '../the-password-rules';

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
   * A PASSWORD, IF THE PERSON SIGNING UP CHOSE ONE. U.2, Hafsah's decision of 26 September.
   *
   * Sign-up offers an email link or a password. The password is only ever used for an address with
   * no account: it is hashed onto the waiting sign-up, and `verifyEmail` copies it onto the account
   * when the link is opened, so nothing exists before the address is proved. For an address that
   * already has an account it is ignored, and the answer is the same.
   */
  @IsOptional()
  @IsString()
  @MinLength(AT_LEAST, { message: TOO_SHORT })
  @MaxLength(100)
  @Matches(A_NUMBER_OR_A_SYMBOL, { message: NO_NUMBER_OR_SYMBOL })
  password?: string;

  /**
   * WHERE IN THE APP THEY WERE GOING (U.3 review), such as "/j/coamana-6rr7". Kept with the waiting
   * sign-up or the sign-in link, and handed back when the link is opened. Only a path inside this app
   * is kept (common/a-path-in-this-app); anything else is dropped, and the answer is the same.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  next?: string;

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
