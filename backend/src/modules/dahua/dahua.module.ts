import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DahuaService } from './dahua.service';
import { DahuaController } from './dahua.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'asistencia-escolar-secret',
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  providers: [DahuaService],
  controllers: [DahuaController],
  exports: [DahuaService],
})
export class DahuaModule {}
