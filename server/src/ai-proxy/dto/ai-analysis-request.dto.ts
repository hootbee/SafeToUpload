import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InferenceMode } from '../../common/enums/inference-mode.enum';
import { Platform } from '../../common/enums/platform.enum';
import { SourceType } from '../../common/enums/source-type.enum';

export class AiAnalysisRequestDto {
  @IsEnum(SourceType)
  sourceType!: SourceType;

  @IsEnum(Platform)
  platform!: Platform;

  @IsOptional()
  @IsEnum(InferenceMode)
  inferenceMode?: InferenceMode;

  @IsOptional()
  @IsString()
  inputText?: string;

  @IsOptional()
  @IsString()
  pageUrl?: string;

  @IsOptional()
  @IsString()
  imagePath?: string;

  /** 분석 ID 기준 저장된 업로드 이미지 (서버 디스크) */
  @IsOptional()
  @IsString()
  analysisId?: string;
}
