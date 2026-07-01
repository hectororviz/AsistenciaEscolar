import { Module } from '@nestjs/common';
import { CursosController } from './cursos.controller';
import { CursoAlumnosExtController } from './curso-alumnos.controller';

@Module({ controllers: [CursosController, CursoAlumnosExtController] })
export class CursosModule {}
