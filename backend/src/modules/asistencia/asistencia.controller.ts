import { Controller, Get, Post, Put, Query, Body, Param } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';
import * as crypto from 'crypto';
import * as http from 'http';

@Controller('asistencia')
export class AsistenciaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async findAll(
    @Query('personaId') personaId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, +(page || 1));
    const l = Math.min(200, Math.max(1, +(limit || 50)));
    const where: Record<string, unknown> = {
      personaId: { not: null }, // por defecto, solo registros con persona vinculada
    };

    if (personaId) where.personaId = +personaId;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) (where.fecha as Record<string, unknown>).gte = new Date(desde);
      if (hasta) (where.fecha as Record<string, unknown>).lte = new Date(hasta + 'T23:59:59');
    }

    const [data, total] = await Promise.all([
      this.prisma.asistencia.findMany({
        where,
        include: { persona: { select: { id: true, nombre: true } } },
        orderBy: { fecha: 'desc' },
        skip: (p - 1) * l,
        take: l,
      }),
      this.prisma.asistencia.count({ where }),
    ]);

    return { data, total, page: p, limit: l, pages: Math.ceil(total / l) };
  }

  @Get('dashboard')
  async dashboard(@Query('fecha') fecha?: string) {
    const dia = fecha || new Date().toISOString().slice(0, 10);
    const inicio = new Date(`${dia}T00:00:00`);
    const fin = new Date(`${dia}T23:59:59`);
    const diaSemana = new Date(dia).getDay(); // 0=Dom, 1=Lun, ..., 5=Vie
    const esDiaHabil = diaSemana >= 1 && diaSemana <= 5;

    // 1. Attendance records for today
    const registros = await this.prisma.asistencia.findMany({
      where: { fecha: { gte: inicio, lte: fin }, personaId: { not: null } },
      include: { persona: { select: { id: true, nombre: true, tipoPersonal: true, horarioInicio: true, horarioFin: true } } },
      orderBy: { fecha: 'asc' },
    });

    // 2. Personas with horarios (docentes with Asignacion, no docentes with horarioInicio/horarioFin)
    // that might NOT have attendance yet
    const personasSinAsistencia = [];
    
    if (esDiaHabil) {
      // Docentes with Asignacion for today
      const docentesConAsignacion = await this.prisma.asignacion.findMany({
        where: { diaSemana },
        select: { personaId: true, persona: { select: { id: true, nombre: true, tipoPersonal: true } } },
        distinct: ['personaId'],
      });
      
      // Non-docentes with horarioInicio set
      const noDocentesConHorario = await this.prisma.persona.findMany({
        where: {
          horarioInicio: { not: null },
          tipoPersonal: { nombre: { not: 'Docente' } },
        },
        select: { id: true, nombre: true, tipoPersonal: true, horarioInicio: true, horarioFin: true },
      });

      // Collect personaIds already in attendance records
      const presentesIds = new Set(registros.map(r => r.personaId));
      
      // Add docentes not yet present
      for (const d of docentesConAsignacion) {
        if (!presentesIds.has(d.personaId)) {
          personasSinAsistencia.push({ persona: d.persona, esDocente: true, horarioInicio: null, horarioFin: null });
          presentesIds.add(d.personaId);
        }
      }
      
      // Add no docentes not yet present
      for (const nd of noDocentesConHorario) {
        if (!presentesIds.has(nd.id)) {
          personasSinAsistencia.push({
            persona: nd,
            esDocente: false,
            horarioInicio: nd.horarioInicio,
            horarioFin: nd.horarioFin,
          });
          presentesIds.add(nd.id);
        }
      }
    }

    // Agrupar por persona (from attendance)
    const porPersona = new Map<number, {
      persona: { id: number; nombre: string; esDocente: boolean; horarioInicio: string | null; horarioFin: string | null };
      eventos: { fecha: Date; tipo: string }[];
    }>();
    for (const r of registros) {
      if (!r.personaId || !r.persona) continue;
      if (!porPersona.has(r.personaId)) {
        porPersona.set(r.personaId, {
          persona: {
            id: r.persona.id,
            nombre: r.persona.nombre,
            esDocente: r.persona.tipoPersonal?.nombre === 'Docente',
            horarioInicio: r.persona.horarioInicio,
            horarioFin: r.persona.horarioFin,
          },
          eventos: [],
        });
      }
      porPersona.get(r.personaId)!.eventos.push({ fecha: r.fecha, tipo: r.tipo });
    }

    // Add personas with horario but no attendance
    for (const psa of personasSinAsistencia) {
      if (!porPersona.has(psa.persona!.id)) {
        porPersona.set(psa.persona!.id, {
          persona: {
            id: psa.persona!.id,
            nombre: psa.persona!.nombre,
            esDocente: psa.esDocente,
            horarioInicio: psa.horarioInicio,
            horarioFin: psa.horarioFin,
          },
          eventos: [],
        });
      }
    }

    // Obtener horarios de docentes desde Asignacion
    const docenteIds = Array.from(porPersona.values())
      .filter(p => p.persona.esDocente)
      .map(p => p.persona.id);

    const horariosDocentes = new Map<number, { horaInicio: string; horaFin: string }[]>();

    if (docenteIds.length > 0 && diaSemana >= 1 && diaSemana <= 5) {
      const asignaciones = await this.prisma.asignacion.findMany({
        where: { personaId: { in: docenteIds }, diaSemana },
        include: { moduloHorario: true },
        orderBy: { moduloHorario: { horaInicio: 'asc' } },
      });

      const porDocente = new Map<number, { horaInicio: string; horaFin: string }[]>();
      for (const a of asignaciones) {
        if (!porDocente.has(a.personaId)) porDocente.set(a.personaId, []);
        porDocente.get(a.personaId)!.push({
          horaInicio: a.moduloHorario.horaInicio,
          horaFin: a.moduloHorario.horaFin,
        });
      }

      // Merge módulos contiguos (incluyendo recreos de hasta 15 min)
      for (const [pid, modulos] of porDocente) {
        const merged: { horaInicio: string; horaFin: string }[] = [];
        for (const m of modulos) {
          const last = merged.length > 0 ? merged[merged.length - 1] : null;
          if (last) {
            const [lh, lm] = last.horaFin.split(':').map(Number);
            const [mh, mm] = m.horaInicio.split(':').map(Number);
            const gap = (mh * 60 + mm) - (lh * 60 + lm);
            if (gap <= 15) {
              last.horaFin = m.horaFin;
              continue;
            }
          }
          merged.push({ ...m });
        }
        horariosDocentes.set(pid, merged);
      }
    }

    const personas = [];
    for (const [, data] of porPersona) {
      let entrada: string | null = null;
      let salida: string | null = null;
      let dentro = false;

      for (const ev of data.eventos) {
        const hhmm = `${String(ev.fecha.getHours()).padStart(2, '0')}:${String(ev.fecha.getMinutes()).padStart(2, '0')}`;
        if (ev.tipo === 'Entrada') {
          if (!entrada || !salida) entrada = hhmm;
          else { entrada = hhmm; salida = null; }
          dentro = true;
        } else {
          salida = hhmm;
          dentro = false;
        }
      }

      const horario = data.persona.esDocente
        ? horariosDocentes.get(data.persona.id) || []
        : (data.persona.horarioInicio && data.persona.horarioFin
            ? [{ horaInicio: data.persona.horarioInicio, horaFin: data.persona.horarioFin }]
            : []);

      personas.push({
        personaId: data.persona.id,
        nombre: data.persona.nombre,
        entrada,
        salida,
        dentro,
        esDocente: data.persona.esDocente,
        horario,
      });
    }

    // Ordenar: los que están adentro primero, luego por hora de entrada
    personas.sort((a, b) => {
      if (a.dentro !== b.dentro) return a.dentro ? -1 : 1;
      return (a.entrada || '').localeCompare(b.entrada || '');
    });

    return { fecha: dia, personas };
  }

  @Put(':id/tipo')
  async cambiarTipo(@Param('id') id: string, @Body() d: { tipo: string }) {
    const registro = await this.prisma.asistencia.update({
      where: { id: +id },
      data: { tipo: d.tipo },
    });

    // Recalcular Entrada/Salida para este persona+día
    if (registro.personaId) {
      const dia = registro.fecha.toISOString().slice(0, 10);
      const inicio = new Date(dia + 'T00:00:00');
      const fin = new Date(dia + 'T23:59:59');
      const registros = await this.prisma.asistencia.findMany({
        where: { personaId: registro.personaId, fecha: { gte: inicio, lte: fin } },
        orderBy: { fecha: 'asc' },
      });
      for (let i = 0; i < registros.length; i++) {
        const esperado = i % 2 === 0 ? 'Entrada' : 'Salida';
        if (registros[i].tipo !== esperado) {
          await this.prisma.asistencia.update({ where: { id: registros[i].id }, data: { tipo: esperado } });
        }
      }
    }

    return this.prisma.asistencia.findUnique({ where: { id: +id }, include: { persona: { select: { id: true, nombre: true } } } });
  }

  @Post('sincronizar')
  async sincronizarManual() {
    return this.sincronizar();
  }

  @Cron('*/5 * * * *')
  async sincronizarCron() {
    try {
      const result = await this.sincronizar();
      if (result.creados > 0) console.log(`[Asistencia] Sincronización automática: ${result.creados} nuevos registros`);
    } catch (e) {
      console.error('[Asistencia] Error en sincronización automática:', e);
    }
  }

  private async sincronizar() {
    // Get last synced timestamp from DB
    const ultimoRegistro = await this.prisma.asistencia.findFirst({
      orderBy: { fecha: 'desc' },
      select: { fecha: true },
    });
    const ultimoTs = ultimoRegistro
      ? Math.floor(ultimoRegistro.fecha.getTime() / 1000)
      : 0;

    let startTs = ultimoTs > 0 ? ultimoTs + 1 : 0;
    const count = 500;
    let creados = 0;
    let allRecords: Record<string, Record<string, string>> = {};
    const recNosVistos = new Set<number>();
    let page = 0;

    while (true) {
      const sParam = startTs > 0 ? `&StartTime=${startTs}` : '';
      const path = `/cgi-bin/recordFinder.cgi?action=find&name=AccessControlCardRec${sParam}&count=${count}`;
      const raw = await this.dahuaRequest(path);

      const lines = raw.split(/[\r\n]+/).filter(l => l.trim());
      const records: Record<number, Record<string, string>> = {};

      for (const line of lines) {
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const key = line.slice(0, eq);
        const val = line.slice(eq + 1);
        const m = key.match(/^records\[(\d+)\]\.(.+)$/);
        if (m) {
          const idx = parseInt(m[1]);
          const field = m[2];
          if (!records[idx]) records[idx] = {};
          records[idx][field] = val;
        }
      }

      const found = parseInt((raw.match(/found=(\d+)/) || [])[1] || '0');
      page++;
      console.log(`[Asistencia] Página ${page}: found=${found}, startTs=${startTs}`);

      // Merge records, skip already-seen RecNos
      let newInPage = 0;
      const maxRecNo = 0;
      let lastCreateTime = 0;
      for (const idx of Object.keys(records)) {
        const r = records[+idx];
        const recNo = parseInt(r.RecNo);
        if (recNo && !recNosVistos.has(recNo)) {
          recNosVistos.add(recNo);
          allRecords[idx] = r;
          newInPage++;
          const ct = parseInt(r.CreateTime);
          if (ct > lastCreateTime) lastCreateTime = ct;
        }
      }

      if (found < count || newInPage === 0) break;
      if (lastCreateTime > 0) startTs = lastCreateTime + 1;
      else break;
    }

    // Insert new records
    for (const idx of Object.keys(allRecords)) {
      const r = allRecords[+idx];
      const recNo = parseInt(r.RecNo);
      if (!recNo) continue;

      const userId = r.UserID;
      if (!userId) continue;
      const errorCode = parseInt(r.ErrorCode) || 0;
      if (errorCode !== 0) continue;

      const fecha = new Date(parseInt(r.CreateTime) * 1000);

      const exists = await this.prisma.asistencia.findFirst({
        where: { userId, fecha },
      });
      if (exists) continue;

      const persona = await this.prisma.persona.findUnique({ where: { userId } });

      await this.prisma.asistencia.create({
        data: {
          recNo,
          userId,
          personaId: persona?.id || null,
          fecha,
          tipo: 'Entry',
          method: parseInt(r.Method) || null,
          readerId: parseInt(r.ReaderID) || null,
          door: parseInt(r.Door) || null,
          status: parseInt(r.Status) || null,
          errorCode: parseInt(r.ErrorCode) || null,
          raw: r,
        },
      });
      creados++;
    }

    // Recalcular Entrada/Salida para todas las personas con registros
    if (creados > 0) {
      const personasConRegistros = await this.prisma.asistencia.findMany({
        where: { personaId: { not: null } },
        select: { personaId: true },
        distinct: ['personaId'],
      });

      for (const { personaId } of personasConRegistros) {
        if (!personaId) continue;

        const registros = await this.prisma.asistencia.findMany({
          where: { personaId },
          orderBy: { fecha: 'asc' },
        });

        // Agrupar por día (fecha en UTC)
        const porDia = new Map<string, typeof registros>();
        for (const reg of registros) {
          const dia = reg.fecha.toISOString().slice(0, 10);
          if (!porDia.has(dia)) porDia.set(dia, []);
          porDia.get(dia)!.push(reg);
        }

        for (const [, regsDia] of porDia) {
          for (let i = 0; i < regsDia.length; i++) {
            const esperado = i % 2 === 0 ? 'Entrada' : 'Salida';
            if (regsDia[i].tipo !== esperado) {
              await this.prisma.asistencia.update({
                where: { id: regsDia[i].id },
                data: { tipo: esperado },
              });
            }
          }
        }
      }
    }

    return { creados };
  }

  private dahuaRequest(path: string): Promise<string> {
    const host = this.config.getOrThrow('DAHUA_HOST');
    const user = this.config.getOrThrow('DAHUA_USER');
    const pass = this.config.getOrThrow('DAHUA_PASSWORD');

    return new Promise((resolve, reject) => {
      const doReq = (authHdr?: string) => {
        const req = http.request(
          { hostname: host, port: 80, path, method: 'GET', headers: authHdr ? { Authorization: authHdr } : {}, timeout: 60000 },
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
          },
        );
        req.on('error', e => reject(e));
        req.end();
      };
      doReq();
    });
  }
}
