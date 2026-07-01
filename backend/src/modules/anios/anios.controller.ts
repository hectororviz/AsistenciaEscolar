import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Controller('anios')
export class AniosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('nivelId') nivelId?: string, @Query('turnoId') turnoId?: string) {
    const where: Record<string, unknown> = {};
    if (nivelId) where.nivelId = +nivelId;
    if (turnoId) where.turnoId = +turnoId;
    return this.prisma.anio.findMany({
      where,
      include: { nivel: true, turno: true },
      orderBy: { orden: 'asc' },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prisma.anio.findUniqueOrThrow({
      where: { id: +id },
      include: { nivel: true, turno: true, divisiones: true },
    });
  }

  @Post()
  async create(@Body() data: { nombre: string; orden: number; nivelId: number; turnoId: number }) {
    return this.prisma.anio.create({ data, include: { nivel: true, turno: true } });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: { nombre?: string; orden?: number }) {
    return this.prisma.anio.update({ where: { id: +id }, data, include: { nivel: true, turno: true } });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.prisma.anio.delete({ where: { id: +id } });
  }
}
