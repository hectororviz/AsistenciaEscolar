import { Module } from '@nestjs/common';
import { AsignacionesController } from './asignaciones.controller';
@Module({ controllers: [AsignacionesController] })
export class AsignacionesModule {}
