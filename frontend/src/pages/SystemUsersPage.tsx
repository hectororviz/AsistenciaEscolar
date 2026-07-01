import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Plus, Edit, Trash2, X, Check, Ban, User, UserPlus } from 'lucide-react';

interface SystemUser { id: number; username: string; role: string; activo: boolean; persona?: { id: number; nombre: string } | null; }
interface DocenteSinCuenta { id: number; userId: string; nombre: string; tipoPersonal: { nombre: string }; }

export const SystemUsersPage: React.FC = () => {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ username: '', password: '', personaId: 0 });

  const { data: users } = useQuery({
    queryKey: ['system-users'],
    queryFn: async () => (await apiClient.get<SystemUser[]>('/users')).data,
  });

  const { data: sinCuenta } = useQuery({
    queryKey: ['docentes-sin-cuenta'],
    queryFn: async () => {
      const personas = (await apiClient.get('/personas')).data as any[];
      return personas.filter((p: any) => p.tipoPersonal?.nombre === 'Docente' && !users?.some(u => u.persona?.id === p.id)) as DocenteSinCuenta[];
    },
    enabled: !!users,
  });

  const createUser = useMutation({
    mutationFn: async (d: { username: string; password: string; personaId?: number }) => (await apiClient.post('/users', d)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['system-users'] }); qc.invalidateQueries({ queryKey: ['docentes-sin-cuenta'] }); setModal(false); },
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, ...d }: { id: number; password?: string; activo?: boolean }) => (await apiClient.put(`/users/${id}`, d)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system-users'] }),
  });

  const deleteUser = useMutation({
    mutationFn: async (id: number) => (await apiClient.delete(`/users/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system-users'] }),
  });

  const openNew = (personaId = 0, username = '') => { setEditId(null); setForm({ username, password: '', personaId }); setModal(true); };

  return (
    <div className="page-content" style={{ maxWidth: 1000 }}>
      <h2 style={{ marginBottom: 16 }}>Usuarios del sistema</h2>

      <div className="sales-table-wrapper" style={{ marginBottom: 32 }}>
        <div className="sales-table">
          <div className="sales-table-head">
            <span className="col-team">Usuario</span>
            <span className="col-category">Rol</span>
            <span className="col-date">Persona</span>
            <span className="col-type">Estado</span>
            <span className="col-action"></span>
          </div>
          {users?.map(u => (
            <div key={u.id} className="sales-table-row" style={{ fontSize: '0.85rem' }}>
              <span className="col-team">{u.username}</span>
              <span className="col-category"><span className={`badge ${u.role === 'ADMIN' ? 'badge-warning' : 'badge-info'}`}>{u.role}</span></span>
              <span className="col-date">{u.persona?.nombre || '-'}</span>
              <span className="col-type">
                <span className={`badge ${u.activo ? 'badge-success' : 'badge-warning'}`}>
                  {u.activo ? <><Check size={11} /> Activo</> : <><Ban size={11} /> Inactivo</>}
                </span>
              </span>
              <span className="col-action">
                <button className="icon-button" style={{ width: 30, height: 28 }} onClick={() => { openNew(0, u.username); setEditId(u.id); }}><Edit size={13} /></button>
                <button className="icon-button" style={{ width: 30, height: 28 }} onClick={() => { if (confirm('Eliminar?')) deleteUser.mutate(u.id); }}><Trash2 size={13} /></button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Docentes sin cuenta */}
      <h3 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <UserPlus size={18} /> Docentes sin cuenta de usuario
      </h3>

      {(!sinCuenta || sinCuenta.length === 0) ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Todos los docentes tienen cuenta.</p>
      ) : (
        <div className="sales-table-wrapper">
          <div className="sales-table">
            <div className="sales-table-head">
              <span className="col-team">Dahua ID</span>
              <span className="col-category">Nombre</span>
              <span className="col-action"></span>
            </div>
            {sinCuenta.map(d => (
              <div key={d.id} className="sales-table-row" style={{ fontSize: '0.85rem' }}>
                <span className="col-team">{d.userId}</span>
                <span className="col-category"><User size={13} style={{ marginRight: 4 }} />{d.nombre}</span>
                <span className="col-action">
                  <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '2px 8px' }} onClick={() => openNew(d.id, d.userId)}>
                    <Plus size={12} /> Crear usuario
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal user-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>{editId ? 'Cambiar contraseña' : 'Crear usuario'}</h3><button className="icon-button" onClick={() => setModal(false)}><X size={16} /></button></div>
            <div className="modal-body">
              {!editId && (
                <div className="login-field"><label className="login-label">Username</label><input className="login-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></div>
              )}
              <div className="login-field"><label className="login-label">Contraseña</label><input className="login-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editId ? 'Nueva contraseña' : ''} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="login-submit" style={{ width: 'auto', padding: '0.5rem 1.5rem', margin: 0 }} onClick={async () => {
                if (editId) await updateUser.mutateAsync({ id: editId, password: form.password || undefined });
                else await createUser.mutateAsync(form);
                setModal(false);
              }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
