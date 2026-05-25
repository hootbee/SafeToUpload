import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UpdatePrivacyMemorySettingsDto } from './dto/update-privacy-memory-settings.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(dto);
  }

  @Patch('privacy-memory')
  updatePrivacyMemory(@Body() dto: UpdatePrivacyMemorySettingsDto) {
    return this.settingsService.updatePrivacyMemorySettings(dto);
  }
}
