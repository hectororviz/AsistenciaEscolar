import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Controller('divisiones')
export class DivisionesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('anioId') anioId?: string) {
    return this.prisma.division.findMany({
      where: anioId ? { anioId: +anioId } : undefined,
      include: { anio: { include: { nivel: true, turno: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prisma.division.findUniqueOrThrow({
      where: { id: +id },
      include: { anio: { include: { nivel: true, turno: true } } },
    });
  }

  @Post()
  async create(@Body() data: { nombre: string; anioId: number }) {
    return this.prisma.division.create({
      data,
      include: { anio: { include: { nivel: true, turno: true } } },
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: { nombre?: string }) {
    return this.prisma.division.update({
      where: { id: +id },
      data,
      include: { anio: { include: { nivel: true, turno: true } } },
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.prisma.division.delete({ where: { id: +id } });
  }
}
