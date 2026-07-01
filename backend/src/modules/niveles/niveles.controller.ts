import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Controller('niveles')
export class NivelesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll() {
    return this.prisma.nivel.findMany({ orderBy: { nombre: 'asc' } });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prisma.nivel.findUniqueOrThrow({ where: { id: +id } });
  }

  @Post()
  async create(@Body() data: { nombre: string; duracionModuloMin?: number; cantidadAnios?: number }) {
    return this.prisma.nivel.create({ data });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: { nombre?: string; duracionModuloMin?: number; cantidadAnios?: number }) {
    return this.prisma.nivel.update({ where: { id: +id }, data });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.prisma.nivel.delete({ where: { id: +id } });
  }
}
