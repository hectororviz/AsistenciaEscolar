import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Controller('materias')
export class MateriasController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() findAll() { return this.prisma.materia.findMany({ orderBy: { nombre: 'asc' } }); }
  @Post() create(@Body() d: { nombre: string }) { return this.prisma.materia.create({ data: d }); }
  @Put(':id') update(@Param('id') id: string, @Body() d: { nombre?: string }) { return this.prisma.materia.update({ where: { id: +id }, data: d }); }
  @Delete(':id') delete(@Param('id') id: string) { return this.prisma.materia.delete({ where: { id: +id } }); }
}
