import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as bcrypt from 'bcrypt';

@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll() {
    return this.prisma.user.findMany({
      include: { persona: { select: { id: true, nombre: true } } },
      orderBy: { username: 'asc' },
    });
  }

  @Post()
  async create(@Body() d: { username: string; password: string; role?: string; personaId?: number }) {
    const hash = await bcrypt.hash(d.password, 10);
    return this.prisma.user.create({
      data: { username: d.username, password: hash, role: (d.role as any) || 'DOCENTE', personaId: d.personaId },
      include: { persona: { select: { id: true, nombre: true } } },
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() d: { password?: string; activo?: boolean }) {
    const data: any = { ...d };
    if (d.password) data.password = await bcrypt.hash(d.password, 10);
    return this.prisma.user.update({ where: { id: +id }, data, include: { persona: { select: { id: true, nombre: true } } } });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.prisma.user.delete({ where: { id: +id } });
  }
}
