import { Module } from '@nestjs/common';
import { AlumnosController } from './alumnos.controller';
@Module({ controllers: [AlumnosController] })
export class AlumnosModule {}
