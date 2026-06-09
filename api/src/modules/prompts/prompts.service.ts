import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SEED_PROMPTS } from '../conversation/prompt-library';

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
export class PromptsService implements OnModuleInit {
  private readonly logger = new Logger(PromptsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Seed-on-deploy (B7): ensure every seeded prompt key has an active version.
   * Idempotent — skips when the active content already matches; otherwise
   * activates the matching version or creates and activates a new one (history
   * preserved). Runs on every boot, so a deploy that changes a seed prompt
   * (e.g. report_synthesis) takes effect without manual SQL.
   */
  async onModuleInit() {
    for (const seed of SEED_PROMPTS) {
      const active = await this.prisma.promptVersion.findFirst({ where: { key: seed.key, isActive: true } });
      if (active && active.content === seed.content) continue;

      const sameContent = await this.prisma.promptVersion.findFirst({
        where: { key: seed.key, content: seed.content },
        orderBy: { version: 'desc' },
      });
      if (sameContent) {
        await this.activate(sameContent.id);
        continue;
      }

      const created = await this.createVersion(seed.key, seed.content, 'Seeded on deploy');
      await this.activate(created.id);
    }
    this.logger.log(`Prompt seed ensured for ${SEED_PROMPTS.length} key(s).`);
  }

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
