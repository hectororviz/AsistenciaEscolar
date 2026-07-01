import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Clock, User } from 'lucide-react';

interface DashboardPersona {
  personaId: number; nombre: string;
  entrada: string | null; salida: string | null; dentro: boolean;
}

const HORA_INICIO = 6;
const HORA_FIN = 19;
const TOTAL_MIN = (HORA_FIN - HORA_INICIO) * 60;

const timeToMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m - HORA_INICIO * 60; };

export const DashboardPage: React.FC = () => {
  const hoy = new Date().toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', hoy],
    queryFn: async () => (await apiClient.get<{ fecha: string; personas: DashboardPersona[] }>(`/asistencia/dashboard?fecha=${hoy}`)).data,
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) return <div className="page-content"><p className="loading-text">Cargando...</p></div>;

  return (
    <div className="page-content" style={{ maxWidth: 1400 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Dashboard — {hoy.split('-').reverse().join('/')}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          <Clock size={14} />
          <span>{new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
          <span style={{ fontSize: '0.7rem' }}>(c/5 min)</span>
        </div>
      </div>

      {(!data?.personas || data.personas.length === 0) ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
          <Clock size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
          <p>Sin registros de asistencia para hoy.</p>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ flex: '0 0 170px', padding: '6px 8px', fontWeight: 700, fontSize: '0.75rem', borderRight: '1px solid var(--color-border)', background: 'var(--color-hover)' }}>Persona</div>
              <div style={{ flex: 1, position: 'relative', padding: '6px 0', minHeight: 18 }}>
                {Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, i) => {
                  const h = HORA_INICIO + i;
                  return (
                    <span key={h} style={{ position: 'absolute', left: `${((i * 60) / TOTAL_MIN) * 100}%`, transform: 'translateX(-50%)', fontSize: '0.6rem', color: 'var(--color-text-muted)', top: 1 }}>
                      {String(h).padStart(2, '0')}:00
                    </span>
                  );
                })}
              </div>
            </div>

            {data.personas.map((p) => {
              const eMin = p.entrada ? timeToMin(p.entrada) : 0;
              const now = new Date().getHours() * 60 + new Date().getMinutes() - HORA_INICIO * 60;
              const sMin = p.salida ? timeToMin(p.salida) : p.dentro ? now : eMin;
              const left = Math.max(0, (eMin / TOTAL_MIN) * 100);
              const width = Math.max(0.5, ((sMin - eMin) / TOTAL_MIN) * 100);

              return (
                <div key={p.personaId} style={{ display: 'flex', borderBottom: '1px solid var(--color-border-light)' }}>
                  <div style={{ flex: '0 0 170px', padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, borderRight: '1px solid var(--color-border-light)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    <User size={13} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</span>
                  </div>
                  <div style={{ flex: 1, position: 'relative', padding: '4px 0', minHeight: 30 }}>
                    {Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, i) => (
                      <div key={i} style={{ position: 'absolute', left: `${((i * 60) / TOTAL_MIN) * 100}%`, top: 0, bottom: 0, width: 1, background: 'var(--color-border-light)', opacity: 0.3 }} />
                    ))}
                  {p.entrada && (
                    <div style={{
                      position: 'absolute', left: `${left}%`, width: `${width}%`, top: 6, bottom: 6,
                      background: 'var(--accent-color)', opacity: 0.75,
                      borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', color: '#fff',
                      fontWeight: 600, minWidth: 16, overflow: 'visible',
                    }}>
                      {width < (p.salida ? 10 : 3) ? (
                        <div style={{ position: 'absolute', left: -2, whiteSpace: 'nowrap', color: 'var(--color-text)' }}>
                          <span style={{ fontSize: '0.6rem', fontWeight: 600 }}>
                            {p.entrada}{p.salida ? `→${p.salida}` : ''}
                          </span>
                        </div>
                      ) : (
                        <span>{p.entrada}{p.salida ? ` → ${p.salida}` : ''}</span>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
            {data.personas.length} personas {data.personas.filter(p => p.dentro).length} adentro
          </div>
        </>
      )}
    </div>
  );
};
