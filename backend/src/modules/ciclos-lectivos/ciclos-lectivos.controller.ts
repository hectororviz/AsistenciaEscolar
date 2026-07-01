import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Controller('ciclos-lectivos')
export class CiclosLectivosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll() {
    return this.prisma.cicloLectivo.findMany({ orderBy: { anio: 'desc' } });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prisma.cicloLectivo.findUniqueOrThrow({ where: { id: +id } });
  }

  @Post()
  async create(@Body() data: { anio: number; nombre?: string; fechaInicio: string; fechaFin: string }) {
    return this.prisma.cicloLectivo.create({
      data: {
        anio: data.anio,
        nombre: data.nombre,
        fechaInicio: new Date(data.fechaInicio),
        fechaFin: new Date(data.fechaFin),
      },
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: { anio?: number; nombre?: string; fechaInicio?: string; fechaFin?: string; activo?: boolean }) {
    return this.prisma.cicloLectivo.update({
      where: { id: +id },
      data: {
        ...data,
        ...(data.fechaInicio && { fechaInicio: new Date(data.fechaInicio) }),
        ...(data.fechaFin && { fechaFin: new Date(data.fechaFin) }),
      },
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.prisma.cicloLectivo.delete({ where: { id: +id } });
  }
}
