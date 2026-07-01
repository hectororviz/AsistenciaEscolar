import { useState } from 'react';
import { useDahuaUsers } from '../api/api';
import type { DahuaUser } from '../api/api';

export const DahuaUsersPage: React.FC = () => {
  const { data: users, isLoading, error, refetch } = useDahuaUsers();
  const [search, setSearch] = useState('');

  if (isLoading) return <p className="loading-text">Cargando...</p>;
  if (error) return <p className="error-text">Error: {String(error)}</p>;

  const filtered = users?.filter(
    (u) =>
      u.cardName.toLowerCase().includes(search.toLowerCase()) ||
      u.userId.includes(search) ||
      (u.citizenIdNo && u.citizenIdNo.includes(search)),
  ) ?? [];

  return (
    <div className="page-content">
      <div className="stock-toolbar">
        <input
          type="text"
          className="stock-search-input"
          placeholder="Buscar por nombre, UserID o DNI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-secondary" onClick={() => refetch()}>
          Actualizar
        </button>
      </div>
      <p style={{ margin: '8px 0', color: 'var(--color-text-secondary)' }}>
        {filtered.length} de {users?.length ?? 0} personas
      </p>
      <div className="sales-table-wrapper">
        <div className="sales-table">
          <div className="sales-table-head">
            <span className="col-num">#</span>
            <span className="col-date">UserID</span>
            <span className="col-team">Nombre</span>
            <span className="col-category">Tarjeta</span>
            <span className="col-type">DNI</span>
            <span className="col-user">Valido</span>
          </div>
          {filtered.map((u: DahuaUser, i: number) => (
            <div key={u.recNo} className="sales-table-row">
              <span className="col-num">{i + 1}</span>
              <span className="col-date">{u.userId}</span>
              <span className="col-team">{u.cardName}</span>
              <span className="col-category">{u.cardNo || '-'}</span>
              <span className="col-type">{u.citizenIdNo || '-'}</span>
              <span className="col-user">
                {u.validDateStart && u.validDateEnd
                  ? `${u.validDateStart.slice(0, 10)} → ${u.validDateEnd.slice(0, 10)}`
                  : '-'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
