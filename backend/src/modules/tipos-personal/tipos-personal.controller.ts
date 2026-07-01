import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Controller('tipos-personal')
export class TiposPersonalController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() findAll() { return this.prisma.tipoPersonal.findMany({ orderBy: { nombre: 'asc' } }); }
  @Post() create(@Body() d: { nombre: string }) { return this.prisma.tipoPersonal.create({ data: d }); }
  @Put(':id') update(@Param('id') id: string, @Body() d: { nombre?: string }) { return this.prisma.tipoPersonal.update({ where: { id: +id }, data: d }); }
  @Delete(':id') delete(@Param('id') id: string) { return this.prisma.tipoPersonal.delete({ where: { id: +id } }); }
}
