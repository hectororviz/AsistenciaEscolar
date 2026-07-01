import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';

export const NotasPage: React.FC = () => {
  const { cursoId, materiaId } = useParams<{ cursoId: string; materiaId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [trimestre, setTrimestre] = useState(1);
  const [notas, setNotas] = useState<Record<string, number>>({});

  const { data: cursoAlumnos } = useQuery({
    queryKey: ['curso-alumnos', cursoId],
    queryFn: async () => (await apiClient.get(`/cursos/${cursoId}/alumnos`)).data as { alumno: { id: number; apellido: string; nombre: string } }[],
  });

  const { data: evaluaciones } = useQuery({
    queryKey: ['evaluaciones', cursoId, materiaId, trimestre],
    queryFn: async () => (await apiClient.get(`/evaluaciones?cursoId=${cursoId}&materiaId=${materiaId}&trimestre=${trimestre}`)).data as { id: number; nombre: string; fecha: string }[],
  });

  const [selectedEval, setSelectedEval] = useState<number>(0);
  const { data: notasEval } = useQuery({
    queryKey: ['notas', selectedEval],
    queryFn: async () => (await apiClient.get(`/notas?evaluacionId=${selectedEval}`)).data as { alumnoId: number; valor: number }[],
    enabled: !!selectedEval,
  });

  const saveNotas = useMutation({
    mutationFn: async (d: { evaluacionId: number; notas: { alumnoId: number; valor: number }[] }) => (await apiClient.post('/notas/batch', d)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notas', selectedEval] }),
  });

  const addEval = useMutation({
    mutationFn: async () => (await apiClient.post('/evaluaciones', { materiaId: +materiaId!, cursoId: +cursoId!, trimestre, nombre: `Eval ${trimestre}`, fecha: new Date().toISOString() })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluaciones'] }),
  });

  const deleteEval = useMutation({
    mutationFn: async (id: number) => (await apiClient.delete(`/evaluaciones/${id}`)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evaluaciones'] }); setSelectedEval(0); },
  });

  const alumnos = cursoAlumnos?.map(ca => ca.alumno) || [];

  return (
    <div className="page-content" style={{ maxWidth: 1400 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-button" onClick={() => navigate('/docente/mis-cursos')}><ArrowLeft size={18} /></button>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>Notas</h2>
          <select value={trimestre} onChange={e => setTrimestre(+e.target.value)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
            <option value={1}>1° Trimestre</option>
            <option value={2}>2° Trimestre</option>
            <option value={3}>3° Trimestre</option>
          </select>
        </div>
        <button className="btn-secondary" onClick={() => addEval.mutate()}><Plus size={14} /> Nueva evaluación</button>
      </div>

      {evaluaciones && evaluaciones.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {evaluaciones.map(ev => (
            <button key={ev.id} onClick={() => setSelectedEval(ev.id)}
              style={{
                padding: '4px 12px', borderRadius: 16, border: '1px solid var(--color-border)',
                background: selectedEval === ev.id ? 'var(--accent-color)' : 'transparent',
                color: selectedEval === ev.id ? '#fff' : 'var(--color-text)',
                cursor: 'pointer', fontSize: '0.8rem',
              }}>
              {ev.nombre} <Trash2 size={10} style={{ marginLeft: 4, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); if (confirm('Eliminar?')) deleteEval.mutate(ev.id); }} />
            </button>
          ))}
        </div>
      )}

      {selectedEval > 0 && alumnos.length > 0 ? (
        <>
          <div className="sales-table-wrapper">
            <div className="sales-table">
              <div className="sales-table-head">
                <span className="col-team">Alumno</span>
                <span className="col-date">Nota (0-10)</span>
              </div>
              {alumnos.map(a => {
                const n = notasEval?.find(nota => nota.alumnoId === a.id);
                return (
                  <div key={a.id} className="sales-table-row" style={{ fontSize: '0.85rem' }}>
                    <span className="col-team">{a.apellido}, {a.nombre}</span>
                    <span className="col-date">
                      <input
                        type="number" min={0} max={10} step={0.5}
                        className="login-input" style={{ width: 70, padding: '3px 6px', fontSize: '0.8rem' }}
                        value={notas[a.id] ?? n?.valor ?? ''}
                        onChange={e => setNotas({ ...notas, [a.id]: +e.target.value })}
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <button className="login-submit" style={{ width: 'auto', padding: '0.5rem 1.5rem', margin: '16px 0' }} onClick={() => {
            const payload = alumnos.filter(a => notas[a.id] !== undefined).map(a => ({ alumnoId: a.id, valor: notas[a.id] }));
            saveNotas.mutate({ evaluacionId: selectedEval, notas: payload });
            alert('Notas guardadas');
          }}><Save size={14} /> Guardar notas</button>
        </>
      ) : (
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 20 }}>
          {evaluaciones?.length === 0 ? 'No hay evaluaciones. Creá una.' : 'Seleccioná una evaluación para cargar notas.'}
        </p>
      )}
    </div>
  );
};
