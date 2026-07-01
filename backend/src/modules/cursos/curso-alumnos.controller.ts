import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Controller('cursos')
export class CursoAlumnosExtController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':cursoId/alumnos')
  async getAlumnos(@Param('cursoId') cursoId: string) {
    return this.prisma.cursoAlumno.findMany({
      where: { cursoId: +cursoId },
      include: { alumno: true },
      orderBy: [{ alumno: { apellido: 'asc' } }, { alumno: { nombre: 'asc' } }],
    });
  }

  @Post(':cursoId/alumnos')
  async addAlumno(@Param('cursoId') cursoId: string, @Body() d: { alumnoId: number }) {
    return this.prisma.cursoAlumno.create({ data: { cursoId: +cursoId, alumnoId: d.alumnoId }, include: { alumno: true } });
  }

  @Delete(':cursoId/alumnos/:alumnoId')
  async removeAlumno(@Param('cursoId') cursoId: string, @Param('alumnoId') alumnoId: string) {
    return this.prisma.cursoAlumno.deleteMany({ where: { cursoId: +cursoId, alumnoId: +alumnoId } });
  }
}
