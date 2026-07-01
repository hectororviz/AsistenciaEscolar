import { Module } from '@nestjs/common';
import { CursosController } from './cursos.controller';
@Module({ controllers: [CursosController] })
export class CursosModule {}
