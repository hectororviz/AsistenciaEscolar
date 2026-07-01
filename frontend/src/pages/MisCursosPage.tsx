import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { School, BookOpen, Users } from 'lucide-react';

export const MisCursosPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['mis-cursos', user?.personaId],
    queryFn: async () => {
      if (!user?.personaId) return [];
      return (await apiClient.get<{ cursoId: number; cursoNombre: string; materiaId: number; materiaNombre: string }[]>(`/me/cursos?personaId=${user.personaId}`)).data;
    },
    enabled: !!user?.personaId,
  });

  if (isLoading) return <div className="page-content"><p className="loading-text">Cargando...</p></div>;

  return (
    <div className="page-content" style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Mis Cursos</h2>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          {user?.persona?.nombre}
        </span>
      </div>

      {(!data || data.length === 0) ? (
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 40 }}>
          No tenés cursos asignados.
        </p>
      ) : (
        <div className="sales-table-wrapper">
          <div className="sales-table">
            <div className="sales-table-head">
              <span className="col-team">Curso</span>
              <span className="col-category">Materia</span>
              <span className="col-action"></span>
            </div>
            {data.map((c, i) => (
              <div key={i} className="sales-table-row" style={{ fontSize: '0.85rem' }}>
                <span className="col-team"><School size={14} style={{ marginRight: 6 }} />{c.cursoNombre}</span>
                <span className="col-category"><BookOpen size={14} style={{ marginRight: 4 }} />{c.materiaNombre}</span>
                <span className="col-action">
                  <button className="icon-button" onClick={() => navigate(`/docente/notas/${c.cursoId}/${c.materiaId}`)} title="Cargar notas">
                    <BookOpen size={14} />
                  </button>
                  <button className="icon-button" onClick={() => navigate(`/docente/asistencia/${c.cursoId}`)} title="Asistencia alumnos">
                    <Users size={14} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
