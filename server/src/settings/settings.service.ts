import { Injectable } from '@nestjs/common';
import { Platform } from '../common/enums/platform.enum';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private defaultSetting = {
    targetPlatforms: [Platform.INSTAGRAM, Platform.X, Platform.FACEBOOK],
    inferenceMode: 'local',
    sensitivity: 50,
    retentionDays: 30,
    notificationEnabled: true,
  };

  async getSettings() {
    const existing = await this.prisma.userSetting.findFirst();
    if (existing) return existing;

    return this.prisma.userSetting.create({
      data: this.defaultSetting,
    });
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const existing = await this.prisma.userSetting.findFirst();
    if (!existing) {
      return this.prisma.userSetting.create({ data: dto });
    }

    return this.prisma.userSetting.update({
      where: { id: existing.id },
      data: dto,
    });
  }
}
