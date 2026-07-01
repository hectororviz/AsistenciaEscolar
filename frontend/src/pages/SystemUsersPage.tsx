import { useSystemUsers } from '../api/api';

export const SystemUsersPage: React.FC = () => {
  const { data: users, isLoading } = useSystemUsers();

  if (isLoading) return <p className="loading-text">Cargando...</p>;

  return (
    <div className="page-content">
      <h2 style={{ margin: '0 0 16px' }}>Usuarios del sistema</h2>
      <div className="sales-table-wrapper">
        <div className="sales-table">
          <div className="sales-table-head">
            <span className="col-date">Usuario</span>
            <span className="col-team">Rol</span>
          </div>
          {users?.map((u) => (
            <div key={u.username} className="sales-table-row">
              <span className="col-date">{u.username}</span>
              <span className="col-team">
                <span className="badge badge-info">{u.role}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
