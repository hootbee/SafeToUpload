import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdatePrivacyMemorySettingsDto {
  @IsOptional()
  @IsBoolean()
  privacyMemoryEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  privacyMemoryRetentionDays?: number;

  @IsOptional()
  @IsBoolean()
  privacyMemoryUseForBlocking?: boolean;

  @IsOptional()
  @IsBoolean()
  privacyMemoryUseForScoreBoost?: boolean;
}
