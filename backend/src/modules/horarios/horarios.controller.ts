import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Controller('horarios')
export class HorariosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('nivelId') nivelId?: string, @Query('turnoId') turnoId?: string) {
    const where: Record<string, unknown> = {};
    if (nivelId) where.nivelId = +nivelId;
    if (turnoId) where.turnoId = +turnoId;
    return this.prisma.horarioNivelTurno.findMany({
      where,
      include: { nivel: true, turno: true, modulos: { orderBy: { orden: 'asc' } } },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prisma.horarioNivelTurno.findUniqueOrThrow({
      where: { id: +id },
      include: { nivel: true, turno: true, modulos: { orderBy: { orden: 'asc' } } },
    });
  }

  @Post()
  async create(@Body() data: { nivelId: number; turnoId: number }) {
    return this.prisma.horarioNivelTurno.create({
      data: { nivelId: data.nivelId, turnoId: data.turnoId },
      include: { nivel: true, turno: true, modulos: true },
    });
  }

  @Put(':id/modulos')
  async updateModulos(
    @Param('id') id: string,
    @Body() modulos: { orden: number; tipo: string; etiqueta: string; horaInicio: string; horaFin: string; duracionMin: number }[],
  ) {
    await this.prisma.moduloHorario.deleteMany({ where: { horarioId: +id } });
    await this.prisma.moduloHorario.createMany({
      data: modulos.map((m) => ({ ...m, horarioId: +id })),
    });
    return this.prisma.horarioNivelTurno.findUniqueOrThrow({
      where: { id: +id },
      include: { nivel: true, turno: true, modulos: { orderBy: { orden: 'asc' } } },
    });
  }

  @Post(':id/generar-default')
  async generarDefault(@Param('id') id: string) {
    const horario = await this.prisma.horarioNivelTurno.findUniqueOrThrow({
      where: { id: +id },
      include: { nivel: true, turno: true },
    });
    const duracionModulo = horario.nivel.duracionModuloMin;
    const espacioRecreo = 10;
    const [hInicio, mInicio] = horario.turno.horaInicio.split(':').map(Number);
    const [hFin, mFin] = horario.turno.horaFin.split(':').map(Number);
    const inicioMin = hInicio * 60 + mInicio;
    const finMin = hFin * 60 + mFin;
    const modulos: { orden: number; tipo: string; etiqueta: string; horaInicio: string; horaFin: string; duracionMin: number }[] = [];
    let cursor = inicioMin;
    let num = 1;
    while (cursor + duracionModulo <= finMin) {
      const hi = String(Math.floor(cursor / 60)).padStart(2, '0');
      const mi = String(cursor % 60).padStart(2, '0');
      const finBloque = cursor + duracionModulo;
      const hf = String(Math.floor(finBloque / 60)).padStart(2, '0');
      const mf = String(finBloque % 60).padStart(2, '0');
      modulos.push({
        orden: num,
        tipo: 'MODULO',
        etiqueta: `${num}° Módulo`,
        horaInicio: `${hi}:${mi}`,
        horaFin: `${hf}:${mf}`,
        duracionMin: duracionModulo,
      });
      cursor = finBloque + espacioRecreo;
      num++;
    }
    await this.prisma.moduloHorario.deleteMany({ where: { horarioId: +id } });
    await this.prisma.moduloHorario.createMany({
      data: modulos.map((m) => ({ ...m, horarioId: +id })),
    });
    return this.prisma.horarioNivelTurno.findUniqueOrThrow({
      where: { id: +id },
      include: { nivel: true, turno: true, modulos: { orderBy: { orden: 'asc' } } },
    });
  }
}
