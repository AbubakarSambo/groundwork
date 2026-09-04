import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Reads of the standing furniture: periods and workstreams. */
@Injectable()
export class OpsFoundationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Newest first, because the period anybody wants is nearly always the current one. */
  periods() {
    return this.prisma.opsPeriod.findMany({ orderBy: { startsOn: 'desc' } });
  }

  workstreams() {
    return this.prisma.opsWorkstream.findMany({ orderBy: { name: 'asc' } });
  }
}
