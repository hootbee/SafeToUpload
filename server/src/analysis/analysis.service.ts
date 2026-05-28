import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AnalysisStatus } from '../common/enums/analysis-status.enum';
import { InferenceMode } from '../common/enums/inference-mode.enum';
import { RiskLevel } from '../common/enums/risk-level.enum';
import { extractDomain } from '../common/utils/extract-domain.util';
import { PrismaService } from '../prisma/prisma.service';
import { AiProxyService } from '../ai-proxy/ai-proxy.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { RunAnalysisDto } from './dto/run-analysis.dto';
import { PrivacyMemoryService } from '../privacy-memory/privacy-memory.service';
import { SettingsService } from '../settings/settings.service';
import { ImageStorageService } from '../storage/image-storage.service';
import { StorageService } from '../storage/storage.service';
import { AnalysisRunResult } from './types/analysis.types';

@Injectable()
export class AnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProxyService: AiProxyService,
    private readonly storageService: StorageService,
    private readonly imageStorage: ImageStorageService,
    private readonly privacyMemoryService: PrivacyMemoryService,
    private readonly settingsService: SettingsService,
  ) {}

  async create(dto: CreateAnalysisDto) {
    const record = await this.prisma.analysisRecord.create({
      data: {
        sourceType: dto.sourceType,
        platform: dto.platform,
        inferenceMode: dto.inferenceMode ?? InferenceMode.SERVER,
        pageUrl: this.storageService.redactRawField(dto.pageUrl ?? null),
        pageDomain: extractDomain(dto.pageUrl),
        inputText: this.storageService.redactRawField(dto.inputText ?? null),
        imagePath: this.storageService.redactRawField(dto.imagePath ?? null),
        status: AnalysisStatus.PENDING,
      },
      select: { id: true, status: true },
    });

    return {
      id: record.id,
      status: record.status,
      message: 'Analysis request created',
    };
  }

  async run(id: string, dto: RunAnalysisDto = {}): Promise<AnalysisRunResult> {
    const record = await this.prisma.analysisRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Analysis record not found');
    if (record.status === AnalysisStatus.CANCELED) throw new BadRequestException('Canceled analysis cannot run');

    await this.prisma.analysisRecord.update({ where: { id }, data: { status: AnalysisStatus.PROCESSING } });

    const inferenceMode = (record.inferenceMode as InferenceMode) || InferenceMode.SERVER;
    const effectiveInferenceMode =
      inferenceMode === InferenceMode.LOCAL ? InferenceMode.SERVER : inferenceMode;
    let aiResult = await this.aiProxyService.analyze(
      {
        sourceType: record.sourceType as any,
        platform: record.platform as any,
        inferenceMode: effectiveInferenceMode,
        inputText: record.inputText ?? undefined,
        pageUrl: record.pageUrl ?? undefined,
        imagePath: record.imagePath ?? undefined,
        analysisId: id,
      },
      effectiveInferenceMode,
      dto.llm,
    );

    const userSettings = await this.settingsService.getSettings();
    const userSettingsAny = userSettings as Record<string, unknown>;
    const memorySettings = this.settingsService.getPrivacyMemorySettingsFromRecord({
      privacyMemoryEnabled: (userSettingsAny.privacyMemoryEnabled as boolean | undefined) ?? true,
      privacyMemoryRetentionDays: (userSettingsAny.privacyMemoryRetentionDays as number | undefined) ?? 90,
      privacyMemoryUseForBlocking: (userSettingsAny.privacyMemoryUseForBlocking as boolean | undefined) ?? true,
      privacyMemoryUseForScoreBoost: (userSettingsAny.privacyMemoryUseForScoreBoost as boolean | undefined) ?? true,
    });

    aiResult = await this.privacyMemoryService.matchAndBoost(
      aiResult,
      memorySettings,
      record.platform,
    );

    const piiTypes = Array.from(
      new Set((aiResult.piiItems as Array<{ type?: string }>).map((item) => item.type).filter(Boolean) as string[]),
    );

    const summary = String((aiResult.contextResult?.summary as string) || '개인정보 노출 가능성이 있습니다.');

    const toJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

    const contextResultPayload = {
      ...aiResult.contextResult,
      categoryScores: aiResult.categoryScores,
      scoreBreakdown: aiResult.scoreBreakdown,
      riskReasons: aiResult.riskReasons,
      escalationRules: aiResult.escalationRules,
      memorySignal: aiResult.memorySignal,
    };

    await this.prisma.analysisResult.upsert({
      where: { analysisId: id },
      update: {
        piiItems: toJson(aiResult.piiItems),
        exifItems: toJson(aiResult.exifItems),
        imageRisks: toJson(aiResult.imageRisks),
        contextResult: toJson(contextResultPayload),
        rewriteSuggestion: aiResult.rewriteSuggestion,
        rawAiResponse: toJson(
          this.storageService.getPersistPolicy().persistRawInput ? aiResult.rawAiResponse : { mode: 'redacted' },
        ),
      },
      create: {
        analysisId: id,
        piiItems: toJson(aiResult.piiItems),
        exifItems: toJson(aiResult.exifItems),
        imageRisks: toJson(aiResult.imageRisks),
        contextResult: toJson(contextResultPayload),
        rewriteSuggestion: aiResult.rewriteSuggestion,
        rawAiResponse: toJson(
          this.storageService.getPersistPolicy().persistRawInput ? aiResult.rawAiResponse : { mode: 'redacted' },
        ),
      },
    });

    await this.privacyMemoryService.upsertAfterAnalysis(aiResult, memorySettings);

    const updated = await this.prisma.analysisRecord.update({
      where: { id },
      data: {
        status: AnalysisStatus.COMPLETED,
        riskScore: aiResult.riskScore,
        riskLevel: aiResult.riskLevel,
        summary,
        piiTypes,
        piiCount: Array.isArray(aiResult.piiItems) ? aiResult.piiItems.length : 0,
      },
      select: {
        id: true,
        status: true,
        riskScore: true,
        riskLevel: true,
        summary: true,
        piiTypes: true,
        piiCount: true,
      },
    });

    return {
      id: updated.id,
      status: updated.status as AnalysisStatus,
      riskScore: updated.riskScore,
      riskLevel: (updated.riskLevel as RiskLevel | null) ?? null,
      summary: updated.summary,
      piiTypes: (updated.piiTypes as string[] | null) ?? [],
      piiCount: updated.piiCount ?? 0,
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.analysisRecord.findUnique({
      where: { id },
      include: { result: true },
    });
    if (!record) throw new NotFoundException('Analysis record not found');
    return record;
  }

  async findStatus(id: string) {
    const record = await this.prisma.analysisRecord.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!record) throw new NotFoundException('Analysis record not found');
    return record;
  }

  async uploadImage(
    id: string,
    file: { buffer: Buffer; originalname: string; mimetype?: string },
  ) {
    const record = await this.prisma.analysisRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Analysis record not found');

    const storedName = this.imageStorage.saveAnalysisImage(
      id,
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    await this.prisma.analysisRecord.update({
      where: { id },
      data: {
        imagePath: this.storageService.redactRawField(record.imagePath ?? file.originalname),
      },
    });

    return {
      id,
      storedImage: storedName,
      message: 'Image uploaded for server vision analysis',
    };
  }

  async cancel(id: string) {
    const record = await this.prisma.analysisRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Analysis record not found');

    if (record.status === AnalysisStatus.COMPLETED) {
      return { id, status: record.status, message: 'Completed analysis cannot be canceled' };
    }
    if (record.status === AnalysisStatus.FAILED || record.status === AnalysisStatus.CANCELED) {
      return { id, status: record.status, message: `Analysis is already ${record.status}` };
    }

    const updated = await this.prisma.analysisRecord.update({
      where: { id },
      data: { status: AnalysisStatus.CANCELED },
      select: { id: true, status: true },
    });

    return { ...updated, message: 'Analysis canceled' };
  }
}
