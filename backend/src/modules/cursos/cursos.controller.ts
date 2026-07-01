import { Controller, Get, Post, Body, Query, Param, Delete } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Controller('cursos')
export class CursosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('cicloLectivoId') cicloLectivoId?: string) {
    const where = cicloLectivoId ? { cicloLectivoId: +cicloLectivoId } : {};
    return this.prisma.curso.findMany({
      where,
      include: {
        cicloLectivo: true,
        nivel: true,
        turno: true,
        anio: true,
        division: true,
      },
      orderBy: [
        { nivel: { nombre: 'asc' } },
        { turno: { nombre: 'asc' } },
        { anio: { orden: 'asc' } },
        { division: { nombre: 'asc' } },
      ],
    });
  }

  @Get('activo')
  async findActivos() {
    const cicloActivo = await this.prisma.cicloLectivo.findFirst({
      where: { activo: true },
      orderBy: { anio: 'desc' },
    });
    if (!cicloActivo) return [];
    return this.prisma.curso.findMany({
      where: { cicloLectivoId: cicloActivo.id },
      include: {
        cicloLectivo: true,
        nivel: true,
        turno: true,
        anio: true,
        division: true,
      },
      orderBy: [
        { nivel: { nombre: 'asc' } },
        { turno: { nombre: 'asc' } },
        { anio: { orden: 'asc' } },
        { division: { nombre: 'asc' } },
      ],
    });
  }

  @Post('crear')
  async crearCursos(
    @Body() body: {
      cicloLectivoId: number;
      nivelId: number;
      turnoId: number;
      divisiones: Record<string, string[]>;
    },
  ) {
    const { cicloLectivoId, nivelId, turnoId, divisiones } = body;

    const nivel = await this.prisma.nivel.findUniqueOrThrow({ where: { id: nivelId } });
    const nombresAnio: string[] = [];
    for (let i = 1; i <= nivel.cantidadAnios; i++) {
      nombresAnio.push(`${i}°`);
    }

    const created: number[] = [];

    for (const nombreAnio of nombresAnio) {
      const divs = divisiones[nombreAnio];
      if (!divs || divs.length === 0) continue;

      let anio = await this.prisma.anio.findFirst({
        where: { nombre: nombreAnio, nivelId, turnoId },
      });
      if (!anio) {
        anio = await this.prisma.anio.create({
          data: {
            nombre: nombreAnio,
            orden: parseInt(nombreAnio),
            nivelId,
            turnoId,
          },
        });
      }

      for (const nombreDiv of divs) {
        if (!nombreDiv.trim()) continue;
        let division = await this.prisma.division.findFirst({
          where: { nombre: nombreDiv.trim(), anioId: anio.id },
        });
        if (!division) {
          division = await this.prisma.division.create({
            data: { nombre: nombreDiv.trim(), anioId: anio.id },
          });
        }

        const existing = await this.prisma.curso.findFirst({
          where: { cicloLectivoId, nivelId, turnoId, anioId: anio.id, divisionId: division.id },
        });
        if (!existing) {
          await this.prisma.curso.create({
            data: {
              cicloLectivoId,
              nivelId,
              turnoId,
              anioId: anio.id,
              divisionId: division.id,
            },
          });
        }

        created.push(division.id);
      }
    }

    return this.prisma.curso.findMany({
      where: { cicloLectivoId },
      include: {
        cicloLectivo: true,
        nivel: true,
        turno: true,
        anio: true,
        division: true,
      },
      orderBy: [
        { nivel: { nombre: 'asc' } },
        { turno: { nombre: 'asc' } },
        { anio: { orden: 'asc' } },
        { division: { nombre: 'asc' } },
      ],
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.prisma.curso.delete({ where: { id: +id } });
  }
}
