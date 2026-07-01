import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AsistenciaController } from './asistencia.controller';
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AsistenciaController],
})
export class AsistenciaModule {}
