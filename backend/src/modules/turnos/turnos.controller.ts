import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Controller('turnos')
export class TurnosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('nivelId') nivelId?: string) {
    return this.prisma.turno.findMany({
      where: nivelId ? { nivelId: +nivelId } : undefined,
      include: { nivel: true },
      orderBy: { nombre: 'asc' },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prisma.turno.findUniqueOrThrow({ where: { id: +id }, include: { nivel: true } });
  }

  @Post()
  async create(@Body() data: { nombre: string; horaInicio: string; horaFin: string; nivelId: number }) {
    return this.prisma.turno.create({ data, include: { nivel: true } });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: { nombre?: string; horaInicio?: string; horaFin?: string }) {
    return this.prisma.turno.update({ where: { id: +id }, data, include: { nivel: true } });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.prisma.turno.delete({ where: { id: +id } });
  }
}
