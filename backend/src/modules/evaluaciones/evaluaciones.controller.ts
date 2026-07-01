import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Controller('evaluaciones')
export class EvaluacionesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('cursoId') cursoId: string, @Query('materiaId') materiaId: string, @Query('trimestre') trimestre: string) {
    return this.prisma.evaluacion.findMany({
      where: { cursoId: +cursoId, materiaId: +materiaId, trimestre: +trimestre },
      orderBy: { fecha: 'asc' },
    });
  }

  @Post()
  create(@Body() d: { materiaId: number; cursoId: number; trimestre: number; nombre: string; fecha?: string }) {
    return this.prisma.evaluacion.create({
      data: { ...d, ...(d.fecha ? { fecha: new Date(d.fecha) } : {}) },
    });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() d: { nombre?: string }) {
    return this.prisma.evaluacion.update({ where: { id: +id }, data: d });
  }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.prisma.evaluacion.delete({ where: { id: +id } }); }
}

@Controller('notas')
export class NotasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('evaluacionId') evaluacionId: string) {
    return this.prisma.nota.findMany({
      where: { evaluacionId: +evaluacionId },
      include: { alumno: { select: { id: true, apellido: true, nombre: true } } },
    });
  }

  @Post('batch')
  async saveBatch(@Body() d: { evaluacionId: number; notas: { alumnoId: number; valor: number }[] }) {
    for (const n of d.notas) {
      await this.prisma.nota.upsert({
        where: { evaluacionId_alumnoId: { evaluacionId: d.evaluacionId, alumnoId: n.alumnoId } },
        update: { valor: n.valor },
        create: { evaluacionId: d.evaluacionId, alumnoId: n.alumnoId, valor: n.valor },
      });
    }
    return this.prisma.nota.findMany({ where: { evaluacionId: d.evaluacionId }, include: { alumno: { select: { id: true, apellido: true, nombre: true } } } });
  }
}

@Controller('notas-trimestre')
export class NotasTrimestreController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('cursoId') cursoId: string, @Query('materiaId') materiaId: string) {
    return this.prisma.notaTrimestre.findMany({
      where: { cursoId: +cursoId, materiaId: +materiaId },
      include: { alumno: { select: { id: true, apellido: true, nombre: true } } },
      orderBy: [{ trimestre: 'asc' }, { alumno: { apellido: 'asc' } }],
    });
  }

  @Post('cerrar')
  async cerrarTrimestre(@Body() d: { materiaId: number; cursoId: number; trimestre: number; notas: { alumnoId: number; valor: number }[] }) {
    for (const n of d.notas) {
      await this.prisma.notaTrimestre.upsert({
        where: { materiaId_cursoId_alumnoId_trimestre: { materiaId: d.materiaId, cursoId: d.cursoId, alumnoId: n.alumnoId, trimestre: d.trimestre } },
        update: { valor: n.valor, cerrada: true },
        create: { materiaId: d.materiaId, cursoId: d.cursoId, alumnoId: n.alumnoId, trimestre: d.trimestre, valor: n.valor, cerrada: true },
      });
    }
    return this.prisma.notaTrimestre.findMany({
      where: { cursoId: d.cursoId, materiaId: d.materiaId, trimestre: d.trimestre },
      include: { alumno: { select: { id: true, apellido: true, nombre: true } } },
    });
  }
}
