import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { tab: string; pill: string; text?: string }) {
    return this.prisma.feedbackSubmission.create({ data });
  }

  async findAll() {
    return this.prisma.feedbackSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.feedbackSubmission.update({
      where: { id },
      data: { status },
    });
  }
}
