import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../api/api';
import { buildImageUrl } from '../api/client';
import {
  Users, UserCog, Settings, LogOut, Menu, ChevronDown, School, BookOpen, BarChart3, LayoutDashboard,
} from 'lucide-react';

const COLLAPSED_KEY = 'ae-sidebar-collapsed';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

interface NavCategory {
  label: string;
  icon: React.ReactNode;
  children: NavItem[];
}

const navCategories: NavCategory[] = [
  {
    label: 'Personal',
    icon: <Users size={20} />,
    children: [
      { to: '/admin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
      { to: '/admin/personal/personas', icon: <Users size={18} />, label: 'Personas' },
      { to: '/admin/asistencia', icon: <BarChart3 size={18} />, label: 'Asistencia' },
    ],
  },
  {
    label: 'Cursos',
    icon: <BookOpen size={20} />,
    children: [
      { to: '/admin/cursos', icon: <School size={18} />, label: 'Cursos' },
    ],
  },
  {
    label: 'Sistema',
    icon: <Settings size={20} />,
    children: [
      { to: '/admin/usuarios', icon: <UserCog size={18} />, label: 'Usuarios' },
    ],
  },
];

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { data: settings } = useSettings();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  });
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  const appName = settings?.appName ?? 'Asistencia Escolar';
  const logoUrl = buildImageUrl(settings?.logoUrl);
  const accentColor = settings?.accentColor || '';

  const getInitials = (name?: string | null) => {
    if (!name) return 'AE';
    const words = name.trim().split(' ').filter(Boolean);
    if (words.length <= 1) return words[0]?.slice(0, 2).toUpperCase() || 'AE';
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  };

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  };

  const toggleCategory = (label: string) => {
    setExpandedCats((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  useEffect(() => {
    if (accentColor) {
      document.documentElement.style.setProperty('--accent-color', accentColor);
    }
  }, [accentColor]);

  useEffect(() => {
    const handler = () => {
      if (window.innerWidth <= 900) setCollapsed(true);
    };
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-row">
          <div className="brand-block">
            <button className="icon-button sidebar-toggle" onClick={toggleCollapse}>
              <Menu size={20} />
            </button>
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="header-logo" />
            ) : (
              <School size={28} />
            )}
            <span className="brand-name">{appName}</span>
          </div>
          <div className="header-actions">
            <span className="header-user">{user?.username}</span>
            <button className="icon-button" onClick={logout} title="Salir">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>
      <div className="admin-layout">
        <nav className={`admin-sidebar${collapsed ? ' collapsed' : ''}`}>
          <div className="sidebar-brand" onClick={toggleCollapse}>
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="sidebar-logo" />
            ) : (
              <div className="sidebar-logo-placeholder">{getInitials(appName)}</div>
            )}
            {!collapsed && <span className="sidebar-app-name">{appName}</span>}
          </div>
          {navCategories.map((cat) => {
            const isExpanded = expandedCats[cat.label] ?? !collapsed;
            return (
              <div key={cat.label} className="sidebar-category">
                <button
                  className="sidebar-category-btn"
                  onClick={() => toggleCategory(cat.label)}
                >
                  <span className="sidebar-cat-icon">{cat.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="sidebar-cat-label">{cat.label}</span>
                      <ChevronDown
                        size={16}
                        className={`sidebar-chevron${isExpanded ? ' open' : ''}`}
                      />
                    </>
                  )}
                </button>
                {isExpanded && (
                  <div className="sidebar-subitems">
                    {cat.children.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `sidebar-link${isActive ? ' active' : ''}`
                        }
                      >
                        {item.icon}
                        {!collapsed && <span>{item.label}</span>}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
