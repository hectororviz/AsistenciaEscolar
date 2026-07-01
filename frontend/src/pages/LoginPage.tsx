import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { apiClient, normalizeApiError, buildImageUrl } from '../api/client';
import type { AuthResponse } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../api/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { data: settings } = useSettings();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appName = settings?.appName ?? 'Asistencia Escolar';
  const logoUrl = buildImageUrl(settings?.logoUrl);

  const getInitials = (name?: string | null) => {
    if (!name) return 'AE';
    const words = name.trim().split(' ').filter(Boolean);
    if (words.length === 0) return 'AE';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', { username, password });
      login(response.data);
      if (response.data.user.role === 'DOCENTE') {
        navigate('/docente', { replace: true });
      } else {
        navigate('/admin', { replace: true });
      }
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" />
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="login-logo" />
          ) : (
            <div className="login-logo-placeholder">{getInitials(appName)}</div>
          )}
          <div className="login-brand-text">
            <h1 className="login-store-name">{appName}</h1>
            {settings?.clubName && <p className="login-club-name">{settings.clubName}</p>}
          </div>
        </div>
        <div className="login-field">
          <label className="login-label">Usuario</label>
          <input
            className="login-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nombre de usuario"
            autoComplete="username"
            required
          />
        </div>
        <div className="login-field">
          <label className="login-label">Contrasena</label>
          <input
            className="login-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contrasena"
            autoComplete="current-password"
            required
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="login-submit" disabled={loading || !username || !password}>
          {loading ? 'Ingresando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};
