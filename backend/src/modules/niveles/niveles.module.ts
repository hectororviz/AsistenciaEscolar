import { Module } from '@nestjs/common';
import { NivelesController } from './niveles.controller';

@Module({ controllers: [NivelesController] })
export class NivelesModule {}
