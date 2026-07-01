import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Controller('asignaciones')
export class AsignacionesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('curso/:cursoId')
  async getByCurso(@Param('cursoId') cursoId: string) {
    const curso = await this.prisma.curso.findUniqueOrThrow({
      where: { id: +cursoId },
      include: { nivel: true, turno: true, anio: true, division: true },
    });

    const horario = await this.prisma.horarioNivelTurno.findFirst({
      where: { nivelId: curso.nivelId, turnoId: curso.turnoId },
      include: { modulos: { orderBy: { orden: 'asc' } } },
    });

    const modulos = horario?.modulos?.filter(m => m.tipo === 'MODULO') || [];

    const asignaciones = await this.prisma.asignacion.findMany({
      where: { cursoId: +cursoId },
    });

    // Get all asignaciones for this nivel+turno to check docente availability
    const cursosNivelTurno = await this.prisma.curso.findMany({
      where: { nivelId: curso.nivelId, turnoId: curso.turnoId },
      select: { id: true },
    });
    const cursoIds = cursosNivelTurno.map(c => c.id);

    const allAsignaciones = await this.prisma.asignacion.findMany({
      where: { cursoId: { in: cursoIds } },
      include: { persona: true },
    });

    // Get docentes with their materias
    const docentes = await this.prisma.persona.findMany({
      where: { tipoPersonal: { nombre: 'Docente' }, habilitado: true },
      include: { materias: { include: { materia: true } } },
      orderBy: { nombre: 'asc' },
    });

    const materias = await this.prisma.materia.findMany({ orderBy: { nombre: 'asc' } });

    return {
      curso,
      modulos,
      asignaciones,
      materias,
      docentes,
      allAsignaciones, // for availability check on frontend
    };
  }

  @Put('curso/:cursoId')
  async saveByCurso(
    @Param('cursoId') cursoId: string,
    @Body() body: { asignaciones: { moduloHorarioId: number; diaSemana: number; materiaId: number; personaId: number }[] },
  ) {
    await this.prisma.asignacion.deleteMany({ where: { cursoId: +cursoId } });

    if (body.asignaciones.length > 0) {
      await this.prisma.asignacion.createMany({
        data: body.asignaciones.map(a => ({
          cursoId: +cursoId,
          moduloHorarioId: a.moduloHorarioId,
          diaSemana: a.diaSemana,
          materiaId: a.materiaId,
          personaId: a.personaId,
        })),
      });
    }

    return this.prisma.asignacion.findMany({
      where: { cursoId: +cursoId },
      include: { materia: true, persona: true },
    });
  }
}
