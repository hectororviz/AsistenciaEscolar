import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { AdminLayout } from './pages/AdminLayout';
import { SystemUsersPage } from './pages/SystemUsersPage';
import { CursosPage } from './pages/estructura/CursosPage';
import { HorarioEditorPage } from './pages/estructura/HorarioEditorPage';
import { PersonalPage } from './pages/estructura/PersonalPage';
import { AsignacionPage } from './pages/estructura/AsignacionPage';
import { AsistenciaPage } from './pages/estructura/AsistenciaPage';
import { DashboardPage } from './pages/estructura/DashboardPage';
import { useAuth } from './context/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/cursos" replace />} />
        <Route path="cursos" element={<CursosPage />} />
        <Route path="cursos/:cursoId/asignacion" element={<AsignacionPage />} />
        <Route path="personal/personas" element={<PersonalPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="asistencia" element={<AsistenciaPage />} />
        <Route path="usuarios" element={<SystemUsersPage />} />
        <Route path="horarios/:nivelId/:turnoId" element={<HorarioEditorPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};
