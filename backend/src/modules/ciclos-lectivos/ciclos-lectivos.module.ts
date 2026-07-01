import { Module } from '@nestjs/common';
import { CiclosLectivosController } from './ciclos-lectivos.controller';

@Module({ controllers: [CiclosLectivosController] })
export class CiclosLectivosModule {}
