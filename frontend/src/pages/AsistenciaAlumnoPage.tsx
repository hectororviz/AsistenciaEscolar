import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ArrowLeft, ChevronLeft, ChevronRight, Save, Check } from 'lucide-react';

export const AsistenciaAlumnoPage: React.FC = () => {
  const { cursoId } = useParams<{ cursoId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());

  // Alumnos del curso
  const { data: cursoAlumnos } = useQuery({
    queryKey: ['curso-alumnos', cursoId],
    queryFn: async () => (await apiClient.get(`/cursos/${cursoId}/alumnos`)).data as { alumno: { id: number; apellido: string; nombre: string } }[],
  });

  // Asistencias existentes
  const { data: asistencias } = useQuery({
    queryKey: ['asistencia-alumnos', cursoId, mes, anio],
    queryFn: async () => {
      const { data } = await apiClient.get(`/asistencia-alumnos?cursoId=${cursoId}&mes=${mes}&anio=${anio}`);
      return data as { id: number; alumnoId: number; fecha: string }[];
    },
  });

  // Checked state
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (asistencias) {
      const c: Record<string, boolean> = {};
      for (const a of asistencias) {
        c[`${a.alumnoId}-${a.fecha}`] = true;
      }
      setChecked(c);
    }
  }, [asistencias]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const registros: { alumnoId: number; fecha: string }[] = [];
      for (const [key, val] of Object.entries(checked)) {
        if (val) {
          const [alumnoId, fecha] = key.split('-');
          registros.push({ alumnoId: +alumnoId, fecha });
        }
      }
      await apiClient.put('/asistencia-alumnos', { cursoId: +cursoId!, registros });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asistencia-alumnos', cursoId, mes, anio] }),
  });

  const alumnos = cursoAlumnos?.map(ca => ca.alumno) || [];
  const diasEnMes = new Date(anio, mes, 0).getDate();
  const hoy = new Date().toISOString().slice(0, 10);

  const toggleDay = (alumnoId: number, dia: number) => {
    const fecha = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    if (fecha > hoy) return; // No futuro
    const diaSemana = new Date(anio, mes - 1, dia).getDay();
    if (diaSemana === 0 || diaSemana === 6) return; // No finde
    setChecked(prev => ({ ...prev, [`${alumnoId}-${fecha}`]: !prev[`${alumnoId}-${fecha}`] }));
  };

  const toggleAll = (dia: number) => {
    const fecha = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    if (fecha > hoy) return;
    const diaSemana = new Date(anio, mes - 1, dia).getDay();
    if (diaSemana === 0 || diaSemana === 6) return;
    const allChecked = alumnos.every(a => checked[`${a.id}-${fecha}`]);
    setChecked(prev => {
      const next = { ...prev };
      for (const a of alumnos) {
        if (allChecked) delete next[`${a.id}-${fecha}`];
        else next[`${a.id}-${fecha}`] = true;
      }
      return next;
    });
  };

  const mesAnterior = () => { if (mes === 1) { setMes(12); setAnio(a => a - 1); } else setMes(m => m - 1); };
  const mesSiguiente = () => { const nextM = mes === 12 ? 1 : mes + 1; const nextA = mes === 12 ? anio + 1 : anio; if (new Date(nextA, nextM - 1, 1) > new Date()) return; setMes(nextM); setAnio(nextA); };

  const nombreMes = new Date(anio, mes - 1, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <div className="page-content" style={{ maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-button" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <h2 style={{ margin: 0, fontSize: '1rem', textTransform: 'capitalize' }}>{nombreMes}</h2>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="icon-button" onClick={mesAnterior}><ChevronLeft size={18} /></button>
          <button className="icon-button" onClick={mesSiguiente}><ChevronRight size={18} /></button>
          <button className="login-submit" style={{ width: 'auto', padding: '0.4rem 1rem', margin: 0, fontSize: '0.8rem' }}
            onClick={() => { saveMutation.mutate(); alert('Asistencia guardada'); }}>
            <Save size={14} /> Guardar
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.75rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-hover)' }}>
              <th style={{ padding: '4px 8px', textAlign: 'left', position: 'sticky', left: 0, background: 'var(--color-hover)', zIndex: 2, minWidth: 160 }}>
                Alumno
              </th>
              {Array.from({ length: diasEnMes }, (_, i) => i + 1).map(dia => {
                const fecha = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                const diaSem = new Date(anio, mes - 1, dia).getDay();
                const esFinde = diaSem === 0 || diaSem === 6;
                const esFuturo = fecha > hoy;
                return (
                  <th key={dia} style={{
                    padding: '4px 4px', textAlign: 'center', width: 28,
                    background: esFinde ? 'var(--color-hover)' : 'transparent',
                    color: esFinde || esFuturo ? 'var(--color-text-muted)' : 'var(--color-text)',
                    opacity: esFuturo ? 0.4 : 1,
                  }}>
                    {dia}
                    <div style={{ fontSize: '0.55rem', color: 'var(--color-text-faint)' }}>
                      {['Do','Lu','Ma','Mi','Ju','Vi','Sá'][diaSem]}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {alumnos.map(a => (
              <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                <td style={{ padding: '2px 8px', position: 'sticky', left: 0, background: 'var(--color-surface)', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                  {a.apellido}, {a.nombre}
                </td>
                {Array.from({ length: diasEnMes }, (_, i) => i + 1).map(dia => {
                  const fecha = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                  const diaSem = new Date(anio, mes - 1, dia).getDay();
                  const esFinde = diaSem === 0 || diaSem === 6;
                  const esFuturo = fecha > hoy;
                  const active = checked[`${a.id}-${fecha}`];
                  return (
                    <td key={dia} style={{ textAlign: 'center', padding: 0,
                      background: esFinde ? 'var(--color-hover)' : active ? 'var(--color-accent-ring)' : 'transparent',
                    }}>
                      <input type="checkbox"
                        checked={!!active}
                        onChange={() => toggleDay(a.id, dia)}
                        disabled={esFinde || esFuturo}
                        style={{ cursor: esFinde || esFuturo ? 'default' : 'pointer' }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Fila "Marcar todos" */}
            <tr style={{ background: 'var(--color-hover)', borderTop: '2px solid var(--color-border)' }}>
              <td style={{ padding: '3px 8px', position: 'sticky', left: 0, background: 'var(--color-hover)', fontSize: '0.7rem', fontWeight: 600 }}>
                Marcar todos
              </td>
              {Array.from({ length: diasEnMes }, (_, i) => i + 1).map(dia => {
                const fecha = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                const diaSem = new Date(anio, mes - 1, dia).getDay();
                const esFinde = diaSem === 0 || diaSem === 6;
                const esFuturo = fecha > hoy;
                return (
                  <td key={dia} style={{ textAlign: 'center', padding: 0 }}>
                    <Check size={14}
                      onClick={() => toggleAll(dia)}
                      style={{
                        cursor: esFinde || esFuturo ? 'default' : 'pointer',
                        color: esFinde || esFuturo ? 'var(--color-text-faint)' : 'var(--color-accent)',
                        opacity: esFuturo ? 0.3 : 1,
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
