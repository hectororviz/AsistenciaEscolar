import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, LogOut, Menu, School } from 'lucide-react';
import { useState } from 'react';

export const DocenteLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-row">
          <div className="brand-block">
            <button className="icon-button" onClick={() => setCollapsed(!collapsed)}><Menu size={20} /></button>
            <School size={28} />
            <span className="brand-name">Asistencia Escolar</span>
          </div>
          <div className="header-actions">
            <span className="header-user">{user?.persona?.nombre || user?.username}</span>
            <button className="icon-button" onClick={logout} title="Salir"><LogOut size={20} /></button>
          </div>
        </div>
      </header>
      <div className="admin-layout">
        <nav className={`admin-sidebar${collapsed ? ' collapsed' : ''}`}>
          <div className="sidebar-brand" onClick={() => setCollapsed(!collapsed)}>
            <div className="sidebar-logo-placeholder">AE</div>
            {!collapsed && <span className="sidebar-app-name">Docente</span>}
          </div>
          <div className="sidebar-category">
            <NavLink to="/docente/mis-cursos" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <BookOpen size={18} />
              {!collapsed && <span>Mis Cursos</span>}
            </NavLink>
          </div>
        </nav>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
