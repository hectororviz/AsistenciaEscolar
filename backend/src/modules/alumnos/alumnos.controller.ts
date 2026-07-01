import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Controller('alumnos')
export class AlumnosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('search') search?: string) {
    const where: any = {};
    if (search) where.OR = [{ nombre: { contains: search, mode: 'insensitive' } }, { apellido: { contains: search, mode: 'insensitive' } }, { dni: { contains: search } }];
    return this.prisma.alumno.findMany({ where, orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }] });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prisma.alumno.findUniqueOrThrow({ where: { id: +id }, include: { cursos: { include: { curso: { include: { nivel: true, anio: true, division: true, turno: true } } } } } });
  }

  @Post()
  create(@Body() d: { dni?: string; apellido: string; nombre: string; fechaNacimiento?: string; direccion?: string; contacto1Nombre?: string; contacto1Tel?: string; contacto2Nombre?: string; contacto2Tel?: string; contacto3Nombre?: string; contacto3Tel?: string }) {
    return this.prisma.alumno.create({ data: { ...d, ...(d.fechaNacimiento ? { fechaNacimiento: new Date(d.fechaNacimiento) } : {}) } });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() d: any) {
    return this.prisma.alumno.update({ where: { id: +id }, data: { ...d, ...(d.fechaNacimiento ? { fechaNacimiento: new Date(d.fechaNacimiento) } : {}) } });
  }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.prisma.alumno.delete({ where: { id: +id } }); }
}
