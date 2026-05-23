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
}
