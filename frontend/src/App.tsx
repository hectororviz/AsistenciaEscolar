import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { AdminLayout } from './pages/AdminLayout';
import { DocenteLayout } from './pages/DocenteLayout';
import { SystemUsersPage } from './pages/SystemUsersPage';
import { CursosPage } from './pages/estructura/CursosPage';
import { HorarioEditorPage } from './pages/estructura/HorarioEditorPage';
import { PersonalPage } from './pages/estructura/PersonalPage';
import { AsignacionPage } from './pages/estructura/AsignacionPage';
import { AsistenciaPage } from './pages/estructura/AsistenciaPage';
import { DashboardPage } from './pages/estructura/DashboardPage';
import { MisCursosPage } from './pages/MisCursosPage';
import { NotasPage } from './pages/NotasPage';
import { useAuth } from './context/AuthContext';

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role === 'DOCENTE') return <Navigate to="/docente" replace />;
  return <>{children}</>;
};

const DocenteRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'DOCENTE') return <Navigate to="/admin" replace />;
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<Navigate to="/admin/cursos" replace />} />
        <Route path="cursos" element={<CursosPage />} />
        <Route path="cursos/:cursoId/asignacion" element={<AsignacionPage />} />
        <Route path="personal/personas" element={<PersonalPage />} />
        <Route path="asistencia" element={<AsistenciaPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="usuarios" element={<SystemUsersPage />} />
        <Route path="horarios/:nivelId/:turnoId" element={<HorarioEditorPage />} />
      </Route>
      <Route path="/docente" element={<DocenteRoute><DocenteLayout /></DocenteRoute>}>
        <Route index element={<Navigate to="/docente/mis-cursos" replace />} />
        <Route path="mis-cursos" element={<MisCursosPage />} />
        <Route path="notas/:cursoId/:materiaId" element={<NotasPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};
