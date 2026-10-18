import {
  IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, registerDecorator, ValidationArguments, ValidationOptions,
} from 'class-validator';

/**
 * FOUR DOORS INTO ONE CONVERSATION, ONE SET OF CHECKS.
 *
 * The app, the /start page, the embedded panel and WhatsApp all hand a person's words to the same
 * conversation, and each checked them differently - the app alone had a length cap, the panel's
 * inline type made the validation pipe inert, WhatsApp plucked fields off the raw request, and the
 * /start history's `role` was a bare string, so an anonymous caller could replay forged assistant
 * turns to the model (fix plan B14). This is the one posture. Every door constructs or declares it.
 */

/** What a person may say in one message. The app's cap since it shipped; now everybody's. */
export const A_MESSAGE_MAX = 8000;

/**
 * A replayed turn from the model is the model's words, bounded by its own output limit (8192
 * tokens), not by what a person types - so a history turn is allowed to be longer than a message,
 * but only when it is the assistant's. A user turn is a message and is capped like one.
 */
export const A_REPLAYED_TURN_MAX = 40_000;

export const TURN_ROLES = ['user', 'assistant'] as const;
export type TurnRole = (typeof TURN_ROLES)[number];

export class AMessageIntoACheckInDto {
  @IsString()
  @IsNotEmpty()
  /* Whitespace is not a message. Two doors trimmed by hand and two did not; now none of them do. */
  @Matches(/\S/, { message: 'a message has to say something' })
  @MaxLength(A_MESSAGE_MAX)
  message: string;

  /*
   * THE QUESTION ON THEIR SCREEN WHEN THEY ANSWERED (Drop Access run 1, item 26). Optional: the app sends the last thing Groundwork
   * said that the person was shown. The same answer twice is a second press only while the reply to the first has not reached
   * their screen; once it has, the same words are a new answer to it ("I do not know." twice), and get a new reply. See
   * a-second-press-is-not-a-second-answer.
   */
  @IsOptional()
  @IsString()
  @MaxLength(A_REPLAYED_TURN_MAX)
  answering?: string;
}

/** A user turn in a replayed history is a message, and is capped like one. */
export function IsAMessageWhenFromAPerson(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isAMessageWhenFromAPerson',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const role = (args.object as { role?: string }).role;
          if (role !== 'user') return true;
          return typeof value === 'string' && value.length <= A_MESSAGE_MAX;
        },
        defaultMessage() {
          return `a message is at most ${A_MESSAGE_MAX} characters`;
        },
      },
    });
  };
}

/** One turn of a history the client replays. Both fields are load-bearing: see the note above. */
export class ATurnDto {
  @IsIn(TURN_ROLES)
  role: TurnRole;

  @IsString()
  @MaxLength(A_REPLAYED_TURN_MAX)
  @IsAMessageWhenFromAPerson()
  content: string;
}

/** Long enough for any real setup conversation; short enough that a history is not a payload. */
export const A_HISTORY_MAX_TURNS = 200;
