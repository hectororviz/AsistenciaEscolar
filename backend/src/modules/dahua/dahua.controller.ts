import { Controller, Get, Post, UseGuards, UseInterceptors, UploadedFiles, Req, Body, Logger, HttpCode } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';
import * as http from 'http';
import { DahuaService } from './dahua.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../common/prisma.service';

@Controller('dahua')
export class DahuaController {
  private readonly logger = new Logger(DahuaController.name);

  constructor(
    private readonly dahuaService: DahuaService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get('users')
  @UseGuards(JwtAuthGuard)
  async getUsers() {
    return this.dahuaService.getUsers();
  }

  @Post('event')
  @HttpCode(200)
  @UseInterceptors(AnyFilesInterceptor())
  async receiveEvent(@Req() req: Request, @Body() body: any, @UploadedFiles() files: any[]) {
    this.logger.log('=== DAHUA WEBHOOK RECEIVED ===');
    this.logger.log('Content-Type: ' + req.headers['content-type']);
    this.logger.log('Body keys: ' + (typeof body === 'object' ? Object.keys(body).join(', ') : 'N/A'));
    this.logger.log('Files: ' + (files?.length || 0));
    this.logger.log('Raw body: ' + JSON.stringify(body).slice(0, 500));

    // Extract userId and time from Dahua multipart payload
    // Dahua sends: CardNo, Name, Time, Method, EventType, etc.
    let userId = body.UserID || body.CardNo || body.userId || '';
    let fecha: Date | null = null;
    const eventTime = body.Time || body.time || body.EventTime || '';

    if (eventTime) {
      fecha = new Date(eventTime);
      if (isNaN(fecha.getTime())) fecha = null;
    }

    // If no Time field, try CreateTime
    if (!fecha && body.CreateTime) {
      const ts = parseInt(body.CreateTime);
      if (!isNaN(ts)) fecha = new Date(ts * 1000);
    }

    if (userId && fecha) {
      try {
        let persona = await this.prisma.persona.findUnique({ where: { userId } });

        // Si no existe, crear persona automáticamente desde el Dahua
        if (!persona) {
          persona = await this.crearPersonaDesdeDahua(userId);
        }

        // Usar upsert-like para evitar duplicados
        const existing = await this.prisma.asistencia.findFirst({
          where: { userId, fecha },
        });
        if (!existing) {
          await this.prisma.asistencia.create({
            data: {
              recNo: 0,
              userId,
              personaId: persona?.id || null,
              fecha,
              tipo: 'Entrada',
              raw: typeof body === 'object' ? body : {},
            },
          });
        }

        // Recalculate entry/exit for this person today
        const dia = fecha.toISOString().slice(0, 10);
        const inicio = new Date(dia + 'T00:00:00');
        const fin = new Date(dia + 'T23:59:59');

        if (persona) {
          const registros = await this.prisma.asistencia.findMany({
            where: { personaId: persona.id, fecha: { gte: inicio, lte: fin } },
            orderBy: { fecha: 'asc' },
          });
          for (let i = 0; i < registros.length; i++) {
            const esperado = i % 2 === 0 ? 'Entrada' : 'Salida';
            if (registros[i].tipo !== esperado) {
              await this.prisma.asistencia.update({
                where: { id: registros[i].id },
                data: { tipo: esperado },
              });
            }
          }
        }

        this.logger.log(`Evento guardado: userId=${userId} fecha=${fecha.toISOString()} persona=${persona?.nombre || 'nueva'}`);
        return 'OK';
      } catch (err) {
        this.logger.error('Error guardando evento: ' + err);
        return 'ERROR';
      }
    }

    this.logger.log('No se pudo parsear userId+fecha del evento.');
    return 'OK';
  }

  private async crearPersonaDesdeDahua(userId: string) {
    try {
      const raw = await this.dahuaGet(
        '/cgi-bin/recordFinder.cgi?action=find&name=AccessControlCard&condition=',
      );
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

      for (const idx of Object.keys(cards)) {
        const c = cards[+idx];
        if (c.UserID === userId && c.CardName) {
          const tipo = await this.prisma.tipoPersonal.findFirst({ where: { nombre: 'Administrativo' } });
          const persona = await this.prisma.persona.create({
            data: {
              userId,
              nombre: c.CardName,
              habilitado: true,
              tipoPersonalId: tipo?.id || 1,
            },
          });
          this.logger.log(`Persona creada automáticamente: ${c.CardName} (userId=${userId})`);
          return persona;
        }
      }
    } catch (e) {
      this.logger.warn(`No se pudo crear persona para userId=${userId}: ${e}`);
    }
    return null;
  }

  private dahuaGet(path: string): Promise<string> {
    const host = this.config.getOrThrow('DAHUA_HOST');
    const user = this.config.getOrThrow('DAHUA_USER');
    const pass = this.config.getOrThrow('DAHUA_PASSWORD');

    return new Promise((resolve, reject) => {
      const doReq = (authHdr?: string) => {
        const req = http.request(
          { hostname: host, port: 80, path, method: 'GET', headers: authHdr ? { Authorization: authHdr } : {}, timeout: 15000 },
          res => {
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
                  const qop = (wa.match(/qop="([^"]+)"/) || [])[1] || 'auth';
                  const opaque = (wa.match(/opaque="([^"]+)"/) || [])[1] || '';
                  const algo = (wa.match(/algorithm=(\w+)/) || [])[1] || 'MD5';
                  const cnonce = crypto.randomBytes(16).toString('hex');
                  const nc = '00000001';
                  const ha1 = crypto.createHash('md5').update(`${user}:${realm}:${pass}`).digest('hex');
                  const ha2 = crypto.createHash('md5').update(`GET:${path}`).digest('hex');
                  const resp = crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex');
                  let hdr = `Digest username="${user}", realm="${realm}", nonce="${nonce}", uri="${path}", cnonce="${cnonce}", nc=${nc}, qop=${qop}, response="${resp}"`;
                  if (opaque) hdr += `, opaque="${opaque}"`;
                  if (algo) hdr += `, algorithm=${algo}`;
                  doReq(hdr);
                } else reject(new Error('401 sin WWW-Authenticate'));
              } else reject(new Error(`HTTP ${res.statusCode}`));
            });
          },
        );
        req.on('error', e => reject(e));
        req.end();
      };
      doReq();
    });
  }
}
