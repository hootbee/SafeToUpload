import { Type } from 'class-transformer';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { InferenceMode } from '../../common/enums/inference-mode.enum';
import { Platform } from '../../common/enums/platform.enum';

export class UpdateSettingsDto {
  @IsOptional()
  @IsEnum(InferenceMode)
  inferenceMode?: InferenceMode;
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(Platform, { each: true })
  targetPlatforms!: Platform[];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  sensitivity!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  retentionDays!: number;

  @IsBoolean()
  notificationEnabled!: boolean;
}
