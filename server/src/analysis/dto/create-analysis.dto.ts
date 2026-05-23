import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InferenceMode } from '../../common/enums/inference-mode.enum';
import { Platform } from '../../common/enums/platform.enum';
import { SourceType } from '../../common/enums/source-type.enum';

export class CreateAnalysisDto {
  @IsEnum(SourceType)
  sourceType!: SourceType;

  @IsEnum(Platform)
  platform!: Platform;

  @IsOptional()
  @IsEnum(InferenceMode)
  inferenceMode?: InferenceMode;

  @IsOptional()
  @IsString()
  pageUrl?: string;

  @IsOptional()
  @IsString()
  inputText?: string;

  @IsOptional()
  @IsString()
  imagePath?: string;
}
