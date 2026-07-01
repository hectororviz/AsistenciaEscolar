import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('settings')
export class SettingsController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  getSettings() {
    return {
      appName: this.config.get<string>('APP_NAME') || 'Asistencia Escolar',
      logoUrl: this.config.get<string>('APP_LOGO_URL') || '',
      accentColor: this.config.get<string>('APP_ACCENT_COLOR') || '',
      clubName: this.config.get<string>('APP_CLUB_NAME') || '',
    };
  }
}
