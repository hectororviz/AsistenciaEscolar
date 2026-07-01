import { Module } from '@nestjs/common';
import { AsistenciaAlumnosController, MeController } from './asistencia-alumnos.controller';
@Module({ controllers: [AsistenciaAlumnosController, MeController] })
export class AsistenciaAlumnosModule {}
