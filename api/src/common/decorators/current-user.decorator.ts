import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  id: string;
  email: string;
  organizationId: string;
  role: string;
  firstName: string;
  lastName: string;
  isPlatformAdmin: boolean;
  /** How this session began: password, an emailed link, or Google. Read by the back-office door. */
  signedInVia?: string | null;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserData;

    if (data) {
      return user[data];
    }

    return user;
  },
);
