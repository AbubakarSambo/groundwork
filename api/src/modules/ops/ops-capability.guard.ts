import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OpsPeopleService } from './ops-people.service';
import { OpsCapability, isAKnownCapability } from './what-somebody-may-do';

const OPS_CAPABILITY_KEY = 'opsCapability';

/**
 * What a route needs before it will run. The capability is checked against the
 * registry at startup rather than at request time, so a typo is a boot failure
 * instead of a route nobody can reach.
 */
export const NeedsOps = (capability: OpsCapability) => {
  if (!isAKnownCapability(capability)) {
    throw new Error(`${capability} is not a capability this system knows about`);
  }
  return SetMetadata(OPS_CAPABILITY_KEY, capability);
};

@Injectable()
export class OpsCapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly people: OpsPeopleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const identity = await this.people.identify(request.user?.id);

    // Attached whether or not a capability is required, so a route that only
    // needs to know WHO is asking does not have to look it up a second time.
    request.opsIdentity = identity;

    const wanted = this.reflector.getAllAndOverride<OpsCapability | undefined>(
      OPS_CAPABILITY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!wanted) return identity !== null;

    this.people.assert(identity, wanted);
    return true;
  }
}
