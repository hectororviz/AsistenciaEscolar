import { Module } from '@nestjs/common';
import { TiposPersonalController } from './tipos-personal.controller';
@Module({ controllers: [TiposPersonalController] })
export class TiposPersonalModule {}
