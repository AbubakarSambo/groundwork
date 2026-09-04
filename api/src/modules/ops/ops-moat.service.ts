import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  THE_MOAT,
  THE_COMPOUNDING_LOOP,
  PRIVACY_IS_ARCHITECTURE,
  MAXIMUM_LEARNING_MINIMUM_EXPOSURE,
  WHAT_THE_PRIVACY_ARCHITECTURE_IS,
  WHAT_AN_ACQUIRER_IS_BUYING,
  WHAT_GROUNDWORK_IS_BUILDING,
} from './what-the-moat-is-made-of';

/**
 * The moat, and what has actually been built on it.
 *
 * The board shows the five components with their statements and everything
 * recorded against each, newest first. The statements are there because a list
 * of entries with no definition above it becomes a list of things somebody
 * shipped — and the whole reason for the definitions is that they say what
 * would count.
 */
@Injectable()
export class OpsMoatService {
  constructor(private readonly prisma: PrismaService) {}

  async board() {
    const [components, people] = await Promise.all([
      this.prisma.opsMoatComponent.findMany({
        include: { entries: { orderBy: { builtAt: 'desc' } } },
        orderBy: { ordinal: 'asc' },
      }),
      this.prisma.opsPerson.findMany(),
    ]);

    const name = new Map(people.map((p) => [p.id, p.displayName]));

    return {
      title: THE_MOAT,
      building: WHAT_GROUNDWORK_IS_BUILDING,
      loop: THE_COMPOUNDING_LOOP,
      /** Three parts, and all three are shown. See the note on the constants. */
      privacyFraming: PRIVACY_IS_ARCHITECTURE,
      privacy: MAXIMUM_LEARNING_MINIMUM_EXPOSURE,
      privacyArchitecture: WHAT_THE_PRIVACY_ARCHITECTURE_IS,
      acquirer: WHAT_AN_ACQUIRER_IS_BUYING,
      components: components.map((c) => ({
        key: c.key,
        ordinal: c.ordinal,
        name: c.name,
        statement: c.statement,
        built: c.entries.length,
        /**
         * Named rather than counted. A component with nothing against it is the
         * useful signal here — four of five moving and one untouched for a
         * quarter is the shape of a strategy quietly narrowing, and only a list
         * shows it.
         */
        entries: c.entries.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          evidenceUrl: e.evidenceUrl,
          builtAt: e.builtAt,
          by: e.builtById ? name.get(e.builtById) ?? null : null,
        })),
      })),
      /** Which of the five nothing has been built on. */
      untouched: components.filter((c) => c.entries.length === 0).map((c) => c.name),
    };
  }

  async record(input: {
    componentKey: string;
    title: string;
    description?: string;
    evidenceUrl?: string;
    builtById: string;
    builtAt?: Date;
  }) {
    const component = await this.prisma.opsMoatComponent.findUnique({
      where: { key: input.componentKey },
    });
    if (!component) throw new NotFoundException(`No moat component called ${input.componentKey}`);

    return this.prisma.opsMoatEntry.create({
      data: {
        componentId: component.id,
        title: input.title,
        description: input.description,
        evidenceUrl: input.evidenceUrl,
        builtById: input.builtById,
        builtAt: input.builtAt ?? new Date(),
      },
    });
  }
}
