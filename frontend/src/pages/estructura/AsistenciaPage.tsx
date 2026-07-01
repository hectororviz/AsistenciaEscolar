import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { RefreshCw, ChevronLeft, ChevronRight, User } from 'lucide-react';

interface AsistenciaRecord {
  id: number; recNo: number; userId: string; personaId: number | null;
  fecha: string; tipo: string; method: number | null;
  readerId: number | null; door: number | null; status: number | null;
  persona?: { id: number; nombre: string } | null;
}

interface AsistenciaResponse {
  data: AsistenciaRecord[];
  total: number; page: number; limit: number; pages: number;
}

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
};

const fmtTime = (d: string) => {
  const dt = new Date(d);
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
};

export const AsistenciaPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const personaIdParam = searchParams.get('personaId') || '';
  const desdeParam = searchParams.get('desde') || '';
  const hastaParam = searchParams.get('hasta') || '';

  const [personaId, setPersonaId] = useState(personaIdParam);
  const [desde, setDesde] = useState(desdeParam);
  const [hasta, setHasta] = useState(hastaParam);
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (personaId) params.set('personaId', personaId);
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  params.set('page', String(page));
  params.set('limit', '50');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['asistencia', personaId, desde, hasta, page],
    queryFn: async () => (await apiClient.get<AsistenciaResponse>(`/asistencia?${params.toString()}`)).data,
  });

  const changeTipo = useMutation({
    mutationFn: async ({ id, tipo }: { id: number; tipo: string }) => (await apiClient.put(`/asistencia/${id}/tipo`, { tipo })).data,
    onSuccess: () => refetch(),
  });

  const [personas, setPersonas] = useState<{ id: number; nombre: string }[]>([]);
  const [personaSearch, setPersonaSearch] = useState('');

  useEffect(() => {
    if (personaSearch.length < 2) { setPersonas([]); return; }
    const t = setTimeout(async () => {
      const { data } = await apiClient.get<{ id: number; userId: string; nombre: string }[]>(`/personas`);
      setPersonas(data.filter(p => p.nombre.toLowerCase().includes(personaSearch.toLowerCase())).slice(0, 10));
    }, 300);
    return () => clearTimeout(t);
  }, [personaSearch]);

  const aplicarFiltros = () => {
    const p = new URLSearchParams();
    if (personaId) p.set('personaId', personaId);
    if (desde) p.set('desde', desde);
    if (hasta) p.set('hasta', hasta);
    setSearchParams(p);
    setPage(1);
  };

  const sync = async () => {
    try {
      const r = await apiClient.post('/asistencia/sincronizar');
      alert(r.data ? `Sincronizado: ${r.data.creados} nuevos registros` : 'Sincronización completada');
    } catch { alert('Error al sincronizar'); }
  };

  return (
    <div className="page-content" style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Asistencia</h2>
        <button className="btn-secondary" onClick={sync}><RefreshCw size={14} /> Sincronizar</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ position: 'relative', minWidth: 220 }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Persona</label>
          <input
            className="login-input"
            style={{ padding: '5px 8px', fontSize: '0.85rem' }}
            placeholder="Buscar persona..."
            value={personaSearch}
            onChange={e => { setPersonaSearch(e.target.value); if (personaId) { setPersonaId(''); setPersonaSearch(''); } }}
          />
          {personas.length > 0 && personaSearch.length >= 2 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 4, maxHeight: 160, overflowY: 'auto' }}>
              {personas.map(p => (
                <div key={p.id} style={{ padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}
                  onClick={() => { setPersonaId(String(p.id)); setPersonaSearch(p.nombre); setPersonas([]); }}>
                  <User size={12} /> {p.nombre}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Desde</label>
          <input className="login-input" type="date" style={{ padding: '5px 8px', fontSize: '0.85rem' }} value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Hasta</label>
          <input className="login-input" type="date" style={{ padding: '5px 8px', fontSize: '0.85rem' }} value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.85rem' }} onClick={aplicarFiltros}>Filtrar</button>
        {(personaId || desde || hasta) && (
          <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.85rem' }} onClick={() => {
            setPersonaId(''); setDesde(''); setHasta(''); setPersonaSearch('');
            setSearchParams({}); setPage(1);
          }}>Limpiar</button>
        )}
      </div>

      {/* Table */}
      <div className="sales-table-wrapper">
        <div className="sales-table">
          <div className="sales-table-head" style={{ fontSize: '0.72rem', padding: '2px 0' }}>
            <span className="col-date">Fecha</span>
            <span className="col-type">Hora</span>
            <span className="col-team">Persona</span>
            <span className="col-category">Tipo</span>
          </div>
          {isLoading ? (
            <div style={{ padding: 8, textAlign: 'center', fontSize: '0.8rem' }}>Cargando...</div>
          ) : (() => {
            let lastDay = '';
            let dayToggle = false;
            const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#f59e0b';
            const hex = accent.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return data?.data.map(rec => {
              const day = rec.fecha.slice(0, 10);
              if (day !== lastDay) { lastDay = day; dayToggle = !dayToggle; }
              return (
                <div key={rec.id} style={{
                  display: 'flex', alignItems: 'center',
                  fontSize: '0.78rem', padding: '1px 0',
                  borderBottom: '1px solid var(--color-border-light)',
                  background: dayToggle ? `rgba(${r},${g},${b},0.06)` : 'transparent',
                }}>
                  <span className="col-date" style={{ padding: '2px 8px' }}>{fmtDate(rec.fecha)}</span>
                  <span className="col-type" style={{ padding: '2px 8px' }}>{fmtTime(rec.fecha)}</span>
                  <span className="col-team" style={{ padding: '2px 8px' }}><User size={12} style={{ marginRight: 4 }} />{rec.persona?.nombre || rec.userId || '-'}</span>
                  <span className="col-category" style={{ padding: '2px 8px' }}>
                    <select
                      value={rec.tipo}
                      onChange={e => changeTipo.mutate({ id: rec.id, tipo: e.target.value })}
                      style={{
                        padding: '1px 4px', fontSize: '0.72rem', borderRadius: 3,
                        border: `1px solid var(--color-border)`,
                        background: rec.tipo === 'Entrada' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                        color: rec.tipo === 'Entrada' ? 'var(--color-success)' : 'var(--color-warning)',
                        fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <option value="Entrada">Entrada</option>
                      <option value="Salida">Salida</option>
                    </select>
                  </span>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={14} /> Anterior
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Pág {data.page} de {data.pages} ({data.total} registros)
          </span>
          <button className="btn-secondary" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>
            Siguiente <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
