import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DahuaModule } from './dahua/dahua.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { CommonModule } from './common/common.module';
import { CiclosLectivosModule } from './ciclos-lectivos/ciclos-lectivos.module';
import { NivelesModule } from './niveles/niveles.module';
import { TurnosModule } from './turnos/turnos.module';
import { AniosModule } from './anios/anios.module';
import { DivisionesModule } from './divisiones/divisiones.module';
import { HorariosModule } from './horarios/horarios.module';
import { CursosModule } from './cursos/cursos.module';
import { TiposPersonalModule } from './tipos-personal/tipos-personal.module';
import { MateriasModule } from './materias/materias.module';
import { PersonasModule } from './personas/personas.module';
import { AsignacionesModule } from './asignaciones/asignaciones.module';
import { AsistenciaModule } from './asistencia/asistencia.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    AuthModule,
    SettingsModule,
    DahuaModule,
    CiclosLectivosModule,
    NivelesModule,
    TurnosModule,
    AniosModule,
    DivisionesModule,
    HorariosModule,
    CursosModule,
    TiposPersonalModule,
    MateriasModule,
    PersonasModule,
    AsignacionesModule,
    AsistenciaModule,
  ],
})
export class AppModule {}
