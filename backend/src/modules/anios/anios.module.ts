import { Module } from '@nestjs/common';
import { AniosController } from './anios.controller';

@Module({ controllers: [AniosController] })
export class AniosModule {}
