import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { persona: { select: { id: true, nombre: true, tipoPersonal: true } } },
    });
    if (!user || !user.activo) throw new UnauthorizedException('Usuario o contraseña invalidos');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Usuario o contraseña invalidos');
    return user;
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    const payload = { sub: user.id, username: user.username, role: user.role, personaId: user.personaId };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        personaId: user.personaId,
        persona: user.persona ? { id: user.persona.id, nombre: user.persona.nombre } : null,
      },
    };
  }

  async register(username: string, password: string, personaId: number) {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) throw new UnauthorizedException('El usuario ya existe');
    const hash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { username, password: hash, role: 'DOCENTE', personaId },
    });
    return user;
  }
}
