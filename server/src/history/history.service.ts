import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { platform?: string; riskLevel?: string; limit?: string; offset?: string }) {
    const where: Record<string, string> = {};

    if (query.platform) where.platform = query.platform;
    if (query.riskLevel) where.riskLevel = query.riskLevel;

    const limit = Number(query.limit ?? 20);
    const offset = Number(query.offset ?? 0);

    return this.prisma.analysisRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number.isNaN(limit) ? 20 : Math.min(limit, 100),
      skip: Number.isNaN(offset) ? 0 : offset,
      select: {
        id: true,
        platform: true,
        sourceType: true,
        pageDomain: true,
        riskScore: true,
        riskLevel: true,
        summary: true,
        piiTypes: true,
        piiCount: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.analysisRecord.delete({ where: { id } });
    return { id, message: 'History deleted' };
  }

  async removeAll() {
    await this.prisma.analysisResult.deleteMany({});
    const deleted = await this.prisma.analysisRecord.deleteMany({});
    return { message: 'All history deleted', deletedCount: deleted.count };
  }
}
