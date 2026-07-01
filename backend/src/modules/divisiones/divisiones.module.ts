import { Module } from '@nestjs/common';
import { DivisionesController } from './divisiones.controller';

@Module({ controllers: [DivisionesController] })
export class DivisionesModule {}
