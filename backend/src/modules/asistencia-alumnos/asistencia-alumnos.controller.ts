import { Controller, Get, Put, Body, Param, Query } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Controller('asistencia-alumnos')
export class AsistenciaAlumnosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('cursoId') cursoId: string, @Query('mes') mes: string, @Query('anio') anio: string) {
    const m = +(mes || new Date().getMonth() + 1);
    const a = +(anio || new Date().getFullYear());
    const inicio = new Date(a, m - 1, 1);
    const fin = new Date(a, m, 0);
    const registros = await this.prisma.asistenciaAlumno.findMany({
      where: { cursoId: +cursoId, fecha: { gte: inicio, lte: fin } },
    });
    return registros.map(r => ({ id: r.id, alumnoId: r.alumnoId, fecha: r.fecha.toISOString().slice(0, 10) }));
  }

  @Put()
  async save(@Body() d: { cursoId: number; registros: { alumnoId: number; fecha: string }[] }) {
    if (d.registros.length === 0) return { ok: true };
    const fecha = new Date(d.registros[0].fecha);
    // Delete existing for this day
    await this.prisma.asistenciaAlumno.deleteMany({ where: { cursoId: d.cursoId, fecha } });
    // Insert new
    for (const r of d.registros) {
      await this.prisma.asistenciaAlumno.create({
        data: { cursoId: d.cursoId, alumnoId: r.alumnoId, fecha },
      });
    }
    return { ok: true };
  }
}

@Controller('me')
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('cursos')
  async misCursos(@Query('personaId') personaId: string) {
    const asignaciones = await this.prisma.asignacion.findMany({
      where: { personaId: +personaId },
      include: {
        curso: { include: { nivel: true, anio: true, division: true, turno: true } },
        materia: true,
      },
      orderBy: [{ curso: { nivel: { nombre: 'asc' } } }, { curso: { anio: { orden: 'asc' } } }, { curso: { division: { nombre: 'asc' } } }],
      distinct: ['cursoId', 'materiaId'],
    });

    // Group by curso+materia
    const result = asignaciones.map(a => ({
      cursoId: a.cursoId,
      cursoNombre: `${a.curso.nivel?.nombre}: ${a.curso.anio?.nombre} ${a.curso.division?.nombre} ${a.curso.turno?.nombre}`,
      materiaId: a.materiaId,
      materiaNombre: a.materia.nombre,
    }));

    return result;
  }
}
