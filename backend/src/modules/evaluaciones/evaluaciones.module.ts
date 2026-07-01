import { Module } from '@nestjs/common';
import { EvaluacionesController, NotasController, NotasTrimestreController } from './evaluaciones.controller';
@Module({ controllers: [EvaluacionesController, NotasController, NotasTrimestreController] })
export class EvaluacionesModule {}
