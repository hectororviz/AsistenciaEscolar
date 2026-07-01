import { Controller, Get, Put, Post, Body, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';
import * as crypto from 'crypto';
import * as http from 'http';

@Controller('personas')
export class PersonasController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async findAll() {
    return this.prisma.persona.findMany({
      include: { tipoPersonal: true, materias: { include: { materia: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prisma.persona.findUniqueOrThrow({
      where: { id: +id },
      include: { tipoPersonal: true, materias: { include: { materia: true } } },
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: {
      habilitado?: boolean;
      fechaNacimiento?: string;
      dni?: string;
      direccion?: string;
      telefono?: string;
      email?: string;
      notas?: string;
      horarioInicio?: string;
      horarioFin?: string;
      tipoPersonalId?: number;
      materiaIds?: number[];
    },
  ) {
    const { materiaIds, fechaNacimiento, ...data } = body;
    const updateData: Record<string, unknown> = { ...data };
    if (fechaNacimiento && fechaNacimiento.trim()) {
      const d = new Date(fechaNacimiento);
      if (!isNaN(d.getTime())) updateData.fechaNacimiento = d;
    } else if (fechaNacimiento === '') {
      updateData.fechaNacimiento = null;
    }
    await this.prisma.persona.update({
      where: { id: +id },
      data: updateData,
      include: { tipoPersonal: true, materias: { include: { materia: true } } },
    });

    if (materiaIds !== undefined) {
      await this.prisma.personaMateria.deleteMany({ where: { personaId: +id } });
      if (materiaIds.length > 0) {
        await this.prisma.personaMateria.createMany({
          data: materiaIds.map(mid => ({ personaId: +id, materiaId: mid })),
        });
      }
    }

    return this.prisma.persona.findUniqueOrThrow({
      where: { id: +id },
      include: { tipoPersonal: true, materias: { include: { materia: true } } },
    });
  }

  @Post('sincronizar')
  async sincronizar() {
    const raw = await this.dahuaRequest('/cgi-bin/recordFinder.cgi?action=find&name=AccessControlCard&condition=');
    const lines = raw.split(/[\r\n]+/).filter(l => l.trim());
    const cards: Record<string, Record<string, string>> = {};

    for (const line of lines) {
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq);
      const val = line.slice(eq + 1);
      const m = key.match(/^records\[(\d+)\]\.(.+)$/);
      if (m) {
        const idx = parseInt(m[1]);
        const field = m[2];
        if (!cards[idx]) cards[idx] = {};
        cards[idx][field] = val;
      }
    }

    let creados = 0;
    for (const idx of Object.keys(cards)) {
      const c = cards[+idx];
      const userId = c.UserID;
      const cardName = c.CardName;
      if (!userId || !cardName) continue;

      const existe = await this.prisma.persona.findUnique({ where: { userId } });
      if (!existe) {
        const tipoDefault = await this.prisma.tipoPersonal.findFirst({ where: { nombre: 'Administrativo' } });
        await this.prisma.persona.create({
          data: {
            userId,
            nombre: cardName,
            habilitado: true,
            tipoPersonalId: tipoDefault?.id || 0,
          },
        });
        creados++;
      }
    }

    return { creados, mensaje: `Se crearon ${creados} nuevas personas` };
  }

  private dahuaRequest(path: string): Promise<string> {
    const host = this.config.getOrThrow('DAHUA_HOST');
    const user = this.config.getOrThrow('DAHUA_USER');
    const pass = this.config.getOrThrow('DAHUA_PASSWORD');

    return new Promise((resolve, reject) => {
      const doReq = (authHdr?: string) => {
        const req = http.request({ hostname: host, port: 80, path, method: 'GET', headers: authHdr ? { Authorization: authHdr } : {}, timeout: 30000 }, res => {
          const chunks: Buffer[] = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString();
            if (res.statusCode === 200) resolve(body);
            else if (res.statusCode === 401 && !authHdr) {
              const wa = res.headers['www-authenticate'];
              if (wa) {
                const realm = (wa.match(/realm="([^"]+)"/) || [])[1] || '';
                const nonce = (wa.match(/nonce="([^"]+)"/) || [])[1] || '';
                const opaque = (wa.match(/opaque="([^"]+)"/) || [])[1] || '';
                const algo = (wa.match(/algorithm=(\w+)/) || [])[1] || 'MD5';
                const cnonce = crypto.randomBytes(16).toString('hex');
                const nc = '00000001';
                const ha1 = crypto.createHash('md5').update(`${user}:${realm}:${pass}`).digest('hex');
                const ha2 = crypto.createHash('md5').update(`GET:${path}`).digest('hex');
                const resp = crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:auth:${ha2}`).digest('hex');
                let hdr = `Digest username="${user}", realm="${realm}", nonce="${nonce}", uri="${path}", cnonce="${cnonce}", nc=${nc}, qop=auth, response="${resp}"`;
                if (opaque) hdr += `, opaque="${opaque}"`;
                if (algo) hdr += `, algorithm=${algo}`;
                doReq(hdr);
              } else reject(new Error('401 sin WWW-Authenticate'));
            } else reject(new Error(`Dahua: HTTP ${res.statusCode}`));
          });
        });
        req.on('error', e => reject(e));
        req.end();
      };
      doReq();
    });
  }
}
