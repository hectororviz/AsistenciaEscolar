import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAsignacionesCurso, useSaveAsignaciones, AsignacionData } from '../../api/asignaciones';
import { ArrowLeft, Save, School, Clock } from 'lucide-react';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

export const AsignacionPage: React.FC = () => {
  const { cursoId } = useParams<{ cursoId: string }>();
  const navigate = useNavigate();
  const cid = +(cursoId || 0);

  const { data, isLoading } = useAsignacionesCurso(cid);
  const saveAsignaciones = useSaveAsignaciones();

  const [cells, setCells] = useState<Record<string, { materiaId: number; personaId: number }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      const initial: Record<string, { materiaId: number; personaId: number }> = {};
      for (const a of data.asignaciones) {
        const key = `${a.moduloHorarioId}-${a.diaSemana}`;
        initial[key] = { materiaId: a.materiaId, personaId: a.personaId };
      }
      setCells(initial);
    }
  }, [data]);

  if (isLoading) return <div className="page-content"><p className="loading-text">Cargando...</p></div>;
  if (!data) return null;

  const { curso, modulos, materias, docentes, allAsignaciones } = data;

  const getDocentesDisponibles = (moduloId: number, dia: number, materiaId: number) => {
    const ocupados = new Set<number>();
    for (const a of allAsignaciones) {
      if (a.moduloHorarioId === moduloId && a.diaSemana === dia && a.cursoId !== cid) {
        ocupados.add(a.personaId);
      }
    }
    return docentes.filter(d => {
      if (ocupados.has(d.id)) return false;
      if (materiaId) {
        return d.materias?.some(m => m.materia.id === materiaId);
      }
      return true;
    });
  };

  const handleSave = async () => {
    const asignaciones: AsignacionData[] = [];
    for (const mod of modulos) {
      for (let dia = 1; dia <= 5; dia++) {
        const key = `${mod.id}-${dia}`;
        const cell = cells[key];
        if (cell?.materiaId && cell?.personaId) {
          asignaciones.push({
            moduloHorarioId: mod.id,
            diaSemana: dia,
            materiaId: cell.materiaId,
            personaId: cell.personaId,
          });
        }
      }
    }
    setSaving(true);
    await saveAsignaciones.mutateAsync({ cursoId: cid, asignaciones });
    setTimeout(() => { navigate('/admin/cursos'); }, 600);
  };

  const cursoNombre = curso?.nivel?.nombre && curso?.anio?.nombre && curso?.division?.nombre && curso?.turno?.nombre
    ? `${curso.nivel.nombre}: ${curso.anio.nombre} ${curso.division.nombre} ${curso.turno.nombre}`
    : 'Curso';

  return (
    <div className="page-content" style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-button" onClick={() => navigate('/admin/cursos')}><ArrowLeft size={18} /></button>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}><School size={18} style={{ marginRight: 6 }} />{cursoNombre}</h2>
        </div>
        <button className="login-submit" style={{ width: 'auto', padding: '0.5rem 1.5rem', margin: 0 }} onClick={handleSave} disabled={saving}>
          {saving ? '✓ Guardado' : <><Save size={14} /> Guardar todo</>}
        </button>
      </div>

      {modulos.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 40 }}>
          No hay horario configurado para este nivel+turno. Configuralo en el turno correspondiente.
        </p>
      ) : (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'auto' }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px repeat(5, 1fr)', gap: 0, borderBottom: '2px solid var(--color-border)', background: 'var(--color-hover)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
            <div style={{ padding: '8px 12px' }}>Módulo</div>
            {DIAS.map(d => <div key={d} style={{ padding: '8px 12px', textAlign: 'center' }}>{d}</div>)}
          </div>

          {/* Module rows */}
          {modulos.map((mod, mi) => (
            <div key={mod.id} style={{ borderBottom: mi < modulos.length - 1 ? '1px solid var(--color-border-light)' : 'none' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '200px repeat(5, 1fr)', gap: 0 }}>
                <div style={{ padding: '10px 12px', fontWeight: 600, fontSize: '0.85rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span>{mod.etiqueta}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                    <Clock size={11} /> {mod.horaInicio} - {mod.horaFin}
                  </span>
                </div>
                {[1, 2, 3, 4, 5].map(dia => {
                  const key = `${mod.id}-${dia}`;
                  const cell = cells[key] || { materiaId: 0, personaId: 0 };
                  const docentesDisponibles = getDocentesDisponibles(mod.id, dia, cell.materiaId);
                  return (
                    <div key={dia} style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                      <select
                        style={{
                          width: '100%', padding: '3px 4px', fontSize: '0.75rem',
                          border: '1px solid var(--color-border)', borderRadius: 4,
                          background: 'var(--color-surface)', color: 'var(--color-text)',
                        }}
                        value={cell.materiaId || ''}
                        onChange={e => {
                          const mid = +e.target.value;
                          setCells(prev => ({
                            ...prev,
                            [key]: { materiaId: mid, personaId: 0 },
                          }));
                        }}
                      >
                        <option value="">Materia...</option>
                        {materias?.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                      <select
                        style={{
                          width: '100%', padding: '3px 4px', fontSize: '0.75rem',
                          border: '1px solid var(--color-border)', borderRadius: 4,
                          background: 'var(--color-surface)', color: 'var(--color-text)',
                        }}
                        value={cell.personaId || ''}
                        onChange={e => {
                          setCells(prev => ({
                            ...prev,
                            [key]: { ...prev[key], personaId: +e.target.value },
                          }));
                        }}
                      >
                        <option value="">Docente...</option>
                        {docentesDisponibles.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
