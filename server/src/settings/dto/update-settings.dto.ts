import { Type } from 'class-transformer';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsBoolean, IsEnum, IsInt, Max, Min } from 'class-validator';
import { Platform } from '../../common/enums/platform.enum';

export class UpdateSettingsDto {
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
