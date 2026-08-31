import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActionCadence } from '@prisma/client';

/**
 * CONFIGURING A ROLE, AND BEING TOLD ITS ACTION HAPPENED.
 *
 * Both halves come from the customer's own systems and neither can be observed here. The role and
 * its one converting action are a decision somebody makes about how their organisation works, and
 * an occurrence of that action happens in their world - a customer sat with, a test run, a value
 * presented. This product's job is to hold both and notice the gap between them.
 */
export interface RoleInput {
  key: string;
  name: string;
  description?: string | null;
  primaryActionKey?: string | null;
  primaryActionName?: string | null;
  primaryActionCadence?: string | null;
  externalId?: string | null;
  sourceSystem?: string | null;
}

export interface ActionInput {
  personExternalId: string;
  actionKey: string;
  occurredAt: string;
  sourceRef?: string | null;
  sourceSystem?: string | null;
  externalId?: string | null;
}

const CADENCES = new Set<string>(Object.values(ActionCadence));

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * BOTH OR NEITHER, and refused rather than half-stored.
   *
   * A primary action with no cadence has no period to be judged in, so nothing would ever fire and
   * the customer would reasonably believe they had configured it. A cadence with no action names
   * nothing at all. Storing either alone produces a role that looks configured and is not, which is
   * worse than a rejected write because nobody goes looking for it.
   */
  async put(organizationId: string, input: RoleInput) {
    const key = (input.key ?? '').trim();
    const name = (input.name ?? '').trim();
    if (!key) throw new BadRequestException('key is required - it is what makes this a change to a role rather than a new one.');
    if (!name) throw new BadRequestException('name is required.');

    const actionKey = input.primaryActionKey?.trim() || null;
    const cadence = input.primaryActionCadence?.trim().toUpperCase() || null;
    if (Boolean(actionKey) !== Boolean(cadence)) {
      throw new BadRequestException(
        'primaryActionKey and primaryActionCadence go together. One without the other is a role that looks configured and can never produce a finding.',
      );
    }
    if (cadence && !CADENCES.has(cadence)) {
      throw new BadRequestException(`primaryActionCadence must be one of ${[...CADENCES].join(', ')}.`);
    }

    const data = {
      name,
      description: input.description ?? null,
      primaryActionKey: actionKey,
      primaryActionName: input.primaryActionName?.trim() || null,
      primaryActionCadence: (cadence as ActionCadence | null),
      externalId: input.externalId ?? null,
      sourceSystem: input.sourceSystem ?? null,
      syncedAt: input.sourceSystem ? new Date() : null,
    };

    return this.prisma.role.upsert({
      where: { organizationId_key: { organizationId, key } },
      create: { organizationId, key, ...data },
      update: data,
    });
  }

  async list(organizationId: string) {
    return this.prisma.role.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
  }

  /**
   * ONE OCCURRENCE. Not a state, an event: it happened, at a time, and here is where to see it.
   *
   * DEDUPED ON THEIR ID WHEN THEY GIVE ONE. A nightly sync that re-sends the last month would
   * otherwise fill a period with copies of the same visit, which changes nothing about whether the
   * detector fires but makes the evidence unreadable by whoever opens it.
   *
   * The action key is NOT checked against a configured role, deliberately. An event can arrive
   * before somebody has configured the role that cares about it, and refusing it then would throw
   * away a fact the customer has already told us for a reason they will fix later.
   */
  async record(organizationId: string, input: ActionInput) {
    const personExternalId = (input.personExternalId ?? '').trim();
    const actionKey = (input.actionKey ?? '').trim();
    if (!personExternalId) throw new BadRequestException('personExternalId is required - an action is something a person did.');
    if (!actionKey) throw new BadRequestException('actionKey is required.');

    const occurredAt = new Date(input.occurredAt);
    if (!input.occurredAt || Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('occurredAt is required, as an ISO timestamp. Defaulting it to now would date every backfilled event to the day it was uploaded.');
    }

    const row = {
      organizationId, personExternalId, actionKey, occurredAt,
      sourceRef: input.sourceRef ?? null,
      sourceSystem: input.sourceSystem ?? null,
      externalId: input.externalId ?? null,
    };

    if (row.externalId && row.sourceSystem) {
      return this.prisma.primaryActionEvent.upsert({
        where: {
          organizationId_sourceSystem_externalId: {
            organizationId, sourceSystem: row.sourceSystem, externalId: row.externalId,
          },
        },
        create: row,
        update: { occurredAt, sourceRef: row.sourceRef },
      });
    }
    return this.prisma.primaryActionEvent.create({ data: row });
  }
}
