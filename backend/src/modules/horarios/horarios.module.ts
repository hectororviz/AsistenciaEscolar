import { Module } from '@nestjs/common';
import { HorariosController } from './horarios.controller';

@Module({ controllers: [HorariosController] })
export class HorariosModule {}
