import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The moat. Every prompt is versioned; every change is versioned against
 * outcome data. The active version of a key is what the engine loads.
 *
 * Keys:
 *   - "system"             the alignment-ground conversation engine prompt
 *   - "report_synthesis"   reads both records, produces the shared picture
 *   - "scenario.<name>"    scenario-specific exact wording (Part 3)
 */
@Injectable()
export class PromptsService {
  constructor(private prisma: PrismaService) {}

  async getActive(key: string) {
    const prompt = await this.prisma.promptVersion.findFirst({
      where: { key, isActive: true },
      orderBy: { version: 'desc' },
    });
    if (!prompt) throw new NotFoundException(`No active prompt for key "${key}"`);
    return prompt;
  }

  async getActiveContent(key: string): Promise<string> {
    return (await this.getActive(key)).content;
  }

  /** All versions, newest first per key — for the prompt-management screen. */
  async list() {
    return this.prisma.promptVersion.findMany({
      orderBy: [{ key: 'asc' }, { version: 'desc' }],
      select: { id: true, key: true, version: true, summary: true, isActive: true, activatedAt: true, createdAt: true, content: true },
    });
  }

  /** Create a new version. Does not activate it — activation is deliberate. */
  async createVersion(key: string, content: string, summary?: string) {
    const latest = await this.prisma.promptVersion.findFirst({ where: { key }, orderBy: { version: 'desc' } });
    const version = (latest?.version ?? 0) + 1;
    return this.prisma.promptVersion.create({ data: { key, version, content, summary, isActive: false } });
  }

  /** Activate a version (deactivates other versions of the same key). */
  async activate(id: string) {
    const target = await this.prisma.promptVersion.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Prompt version not found');

    await this.prisma.$transaction([
      this.prisma.promptVersion.updateMany({ where: { key: target.key }, data: { isActive: false } }),
      this.prisma.promptVersion.update({ where: { id }, data: { isActive: true, activatedAt: new Date() } }),
    ]);
    return this.prisma.promptVersion.findUnique({ where: { id } });
  }
}
