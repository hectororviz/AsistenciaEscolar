import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  usePersonas, usePersonaUpdate, useSincronizar,
  useTiposPersonal, useTipoPersonalCreate, useTipoPersonalUpdate, useTipoPersonalDelete,
  useMaterias, useMateriaCreate, useMateriaUpdate, useMateriaDelete,
} from '../../api/personal';
import type { Persona } from '../../api/personal';
import { Plus, Edit, Trash2, X, Eye, Check, Ban, User, RefreshCw, BookOpen, Users, Settings, BarChart3 } from 'lucide-react';

type Tab = 'personas' | 'config';

export const PersonalPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('personas');

  // Filtros
  const [search, setSearch] = useState('');
  const [filterTipoId, setFilterTipoId] = useState<number>(0);
  const [showDisabled, setShowDisabled] = useState(false);

  // Personas
  const { data: personas, isLoading } = usePersonas();
  const updatePersona = usePersonaUpdate();
  const sincronizar = useSincronizar();

  // Tipos
  const { data: tipos } = useTiposPersonal();
  const createTipo = useTipoPersonalCreate();
  const updateTipo = useTipoPersonalUpdate();
  const deleteTipo = useTipoPersonalDelete();

  // Materias
  const { data: materias } = useMaterias();
  const createMateria = useMateriaCreate();
  const updateMateria = useMateriaUpdate();
  const deleteMateria = useMateriaDelete();

  // Modal persona
  const [personaModal, setPersonaModal] = useState<{ open: boolean; persona: Persona; readOnly: boolean } | null>(null);
  const [editForm, setEditForm] = useState<Partial<Persona> & { materiaIds: number[] }>({
    habilitado: true, materiaIds: [],
  });

  // Modal tipo
  const [tipoModal, setTipoModal] = useState(false);
  const [editTipoId, setEditTipoId] = useState<number | null>(null);
  const [tipoNombre, setTipoNombre] = useState('');

  // Modal materia
  const [materiaModal, setMateriaModal] = useState(false);
  const [editMateriaId, setEditMateriaId] = useState<number | null>(null);
  const [materiaNombre, setMateriaNombre] = useState('');

  const openView = (p: Persona) => {
    setEditForm({
      habilitado: p.habilitado, fechaNacimiento: p.fechaNacimiento?.slice(0, 10) || '',
      dni: p.dni || '', direccion: p.direccion || '', telefono: p.telefono || '', email: p.email || '',
      notas: p.notas || '', tipoPersonalId: p.tipoPersonalId,
      horarioInicio: p.horarioInicio || '', horarioFin: p.horarioFin || '',
      materiaIds: p.materias?.map(m => m.materiaId) || [],
    });
    setPersonaModal({ open: true, persona: p, readOnly: true });
  };

  const openEdit = (p: Persona) => {
    setEditForm({
      habilitado: p.habilitado, fechaNacimiento: p.fechaNacimiento?.slice(0, 10) || '',
      dni: p.dni || '', direccion: p.direccion || '', telefono: p.telefono || '', email: p.email || '',
      notas: p.notas || '', tipoPersonalId: p.tipoPersonalId,
      horarioInicio: p.horarioInicio || '', horarioFin: p.horarioFin || '',
      materiaIds: p.materias?.map(m => m.materiaId) || [],
    });
    setPersonaModal({ open: true, persona: p, readOnly: false });
  };

  const [saving, setSaving] = useState(false);

  const handleSavePersona = async () => {
    if (!personaModal) return;
    setSaving(true);
    await updatePersona.mutateAsync({ id: personaModal.persona.id, ...editForm });
    setTimeout(() => { setPersonaModal(null); setSaving(false); }, 600);
  };

  const isDocente = editForm.tipoPersonalId === tipos?.find(t => t.nombre === 'Docente')?.id;

  // ─── RENDER ─────────────────────────────────────────────────

  return (
    <div className="page-content" style={{ maxWidth: 1400 }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--color-border)' }}>
        {([{ key: 'personas' as Tab, label: 'Personas', icon: <Users size={16} /> },
           { key: 'config' as Tab, label: 'Configuración', icon: <Settings size={16} /> }]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.6rem 1.5rem', border: 'none', background: 'none',
              fontSize: '0.9rem', fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? 'var(--accent-color)' : 'var(--color-text-muted)',
              borderBottom: tab === t.key ? '2px solid var(--accent-color)' : '2px solid transparent',
              marginBottom: -2, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >{t.icon} {t.label}</button>
        ))}
      </div>

      {/* TAB: Personas */}
      {tab === 'personas' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Personal</h2>
            <span style={{ color: 'var(--color-text-muted)' }}>{personas?.length || 0} personas</span>
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="login-input"
              style={{ flex: 1, minWidth: 180, padding: '5px 8px', fontSize: '0.85rem' }}
              type="text"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="login-input"
              style={{ flex: '0 0 180px', padding: '5px 8px', fontSize: '0.85rem' }}
              value={filterTipoId}
              onChange={e => setFilterTipoId(+e.target.value)}
            >
              <option value={0}>Todos los tipos</option>
              {tipos?.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <div
                onClick={() => setShowDisabled(!showDisabled)}
                style={{
                  width: 38, height: 20, borderRadius: 10, cursor: 'pointer',
                  background: showDisabled ? 'var(--color-success)' : 'var(--color-border-strong)',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3, left: showDisabled ? 21 : 3, transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
              <span style={{ color: 'var(--color-text-muted)' }}>Ver inactivos</span>
            </label>
          </div>

          <div className="sales-table-wrapper">
            <div className="sales-table">
              <div className="sales-table-head">
                <span style={{ flex: '0 0 40px', padding: '4px 8px', borderBottom: '2px solid var(--color-border)' }}>#</span>
                <span style={{ flex: '0 0 80px', padding: '4px 8px', borderBottom: '2px solid var(--color-border)' }}>ID</span>
                <span style={{ flex: 1, padding: '4px 8px', borderBottom: '2px solid var(--color-border)' }}>Nombre</span>
                <span style={{ flex: '0 0 140px', padding: '4px 8px', borderBottom: '2px solid var(--color-border)' }}>Tipo</span>
                <span style={{ flex: '0 0 90px', padding: '4px 8px', borderBottom: '2px solid var(--color-border)', textAlign: 'center' }}>Estado</span>
                <span style={{ flex: '0 0 110px', padding: '4px 8px', borderBottom: '2px solid var(--color-border)', display: 'flex', gap: 4, justifyContent: 'center' }}></span>
              </div>
              {isLoading ? (
                <div className="sales-table-row"><span style={{ flex: 1, textAlign: 'center', padding: 8 }}>Cargando...</span></div>
              ) : (() => {
                const filtered = personas?.filter(p => {
                  if (!showDisabled && !p.habilitado) return false;
                  if (filterTipoId > 0 && p.tipoPersonalId !== filterTipoId) return false;
                  if (search && !p.nombre.toLowerCase().includes(search.toLowerCase())) return false;
                  return true;
                }) || [];
                return filtered.length === 0 ? (
                  <div className="sales-table-row"><span style={{ flex: 1, textAlign: 'center', padding: 8, color: 'var(--color-text-muted)' }}>Sin resultados</span></div>
                ) : (
                  filtered.map((p, i) => (
                    <div key={p.id} className="sales-table-row" style={{ fontSize: '0.85rem' }}>
                      <span style={{ flex: '0 0 40px', padding: '3px 8px', textAlign: 'center' }}>{i + 1}</span>
                      <span style={{ flex: '0 0 80px', padding: '3px 8px' }}>{p.userId}</span>
                      <span style={{ flex: 1, padding: '3px 8px' }}><User size={13} style={{ marginRight: 4 }} />{p.nombre}</span>
                      <span style={{ flex: '0 0 140px', padding: '3px 8px' }}>{p.tipoPersonal?.nombre}</span>
                      <span style={{ flex: '0 0 90px', padding: '3px 8px', textAlign: 'center' }}>
                        <span className={`badge ${p.habilitado ? 'badge-success' : 'badge-warning'}`}>
                          {p.habilitado ? <><Check size={11} /> Habilitado</> : <><Ban size={11} /> Deshab.</>}
                        </span>
                      </span>
                      <span style={{ flex: '0 0 110px', padding: '2px 4px', display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button className="icon-button" style={{ width: 30, height: 28 }} onClick={() => openView(p)} title="Ver"><Eye size={13} /></button>
                        <button className="icon-button" style={{ width: 30, height: 28 }} onClick={() => openEdit(p)} title="Editar"><Edit size={13} /></button>
                        <button className="icon-button" style={{ width: 30, height: 28 }} onClick={() => navigate(`/admin/asistencia?personaId=${p.id}`)} title="Asistencia"><BarChart3 size={13} /></button>
                      </span>
                    </div>
                  ))
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* TAB: Configuración */}
      {tab === 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Tipos de Personal */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Tipos de Personal</h3>
              <button className="btn-secondary" onClick={() => { setEditTipoId(null); setTipoNombre(''); setTipoModal(true); }}>
                <Plus size={14} /> Agregar
              </button>
            </div>
            <div className="sales-table-wrapper">
              <div className="sales-table">
                <div className="sales-table-head">
                  <span style={{ flex: 1, padding: '4px 8px', borderBottom: '2px solid var(--color-border)' }}>Nombre</span>
                  <span style={{ flex: '0 0 60px', padding: '4px 8px', borderBottom: '2px solid var(--color-border)', display: 'flex', justifyContent: 'center' }}></span>
                </div>
                {tipos?.map(t => (
                  <div key={t.id} className="sales-table-row" style={{ fontSize: '0.85rem' }}>
                    <span style={{ flex: 1, padding: '3px 8px' }}>{t.nombre}</span>
                    <span style={{ flex: '0 0 60px', padding: '2px 4px', display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button className="icon-button" style={{ width: 30, height: 28 }} onClick={() => { setEditTipoId(t.id); setTipoNombre(t.nombre); setTipoModal(true); }}><Edit size={13} /></button>
                      <button className="icon-button" style={{ width: 30, height: 28 }} onClick={() => { if (confirm('Eliminar?')) deleteTipo.mutate(t.id); }}><Trash2 size={13} /></button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Materias */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Materias</h3>
              <button className="btn-secondary" onClick={() => { setEditMateriaId(null); setMateriaNombre(''); setMateriaModal(true); }}>
                <Plus size={14} /> Agregar
              </button>
            </div>
            <div className="sales-table-wrapper">
              <div className="sales-table">
                <div className="sales-table-head">
                  <span style={{ flex: 1, padding: '4px 8px', borderBottom: '2px solid var(--color-border)' }}>Nombre</span>
                  <span style={{ flex: '0 0 60px', padding: '4px 8px', borderBottom: '2px solid var(--color-border)', display: 'flex', justifyContent: 'center' }}></span>
                </div>
                {materias?.map(m => (
                  <div key={m.id} className="sales-table-row" style={{ fontSize: '0.85rem' }}>
                    <span style={{ flex: 1, padding: '3px 8px' }}><BookOpen size={13} style={{ marginRight: 4 }} />{m.nombre}</span>
                    <span style={{ flex: '0 0 60px', padding: '2px 4px', display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button className="icon-button" style={{ width: 30, height: 28 }} onClick={() => { setEditMateriaId(m.id); setMateriaNombre(m.nombre); setMateriaModal(true); }}><Edit size={13} /></button>
                      <button className="icon-button" style={{ width: 30, height: 28 }} onClick={() => { if (confirm('Eliminar?')) deleteMateria.mutate(m.id); }}><Trash2 size={13} /></button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sincronizar con Dahua */}
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: '0 0 4px' }}>Sincronizar con Dahua</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Consulta al equipo de control horario y crea las personas nuevas que aún no están en la base de datos.</p>
              </div>
              <button
                className="btn-secondary"
                onClick={async () => {
                  if (confirm('¿Consultar al Dahua y crear nuevas personas?')) {
                    const r = await sincronizar.mutateAsync();
                    alert(r.mensaje);
                  }
                }}
                style={{ whiteSpace: 'nowrap' }}
              >
                <RefreshCw size={14} /> Sincronizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Persona (Ver/Editar) ─────────────────────── */}
      {personaModal && (
        <div className="modal-backdrop" onClick={() => setPersonaModal(null)}>
          <div className="modal user-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {personaModal.persona.nombre}
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 8 }}>(ID: {personaModal.persona.userId})</span>
              </h3>
              <button className="icon-button" onClick={() => setPersonaModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="login-field">
                  <label className="login-label">Fecha Nacimiento</label>
                  <input className="login-input" type="text" placeholder="dd/mm/aaaa" value={editForm.fechaNacimiento || ''}
                    onChange={e => setEditForm({ ...editForm, fechaNacimiento: e.target.value })} disabled={personaModal.readOnly} />
                </div>
                <div className="login-field">
                  <label className="login-label">DNI</label>
                  <input className="login-input" value={editForm.dni || ''} onChange={e => setEditForm({ ...editForm, dni: e.target.value })} disabled={personaModal.readOnly} />
                </div>
              </div>
              <div className="login-field">
                <label className="login-label">Dirección</label>
                <input className="login-input" value={editForm.direccion || ''} onChange={e => setEditForm({ ...editForm, direccion: e.target.value })} disabled={personaModal.readOnly} />
              </div>
              <div className="login-field">
                <label className="login-label">Email</label>
                <input className="login-input" type="email" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} disabled={personaModal.readOnly} />
              </div>
              <div className="login-field">
                <label className="login-label">Teléfono</label>
                <input className="login-input" value={editForm.telefono || ''} onChange={e => setEditForm({ ...editForm, telefono: e.target.value })} disabled={personaModal.readOnly} />
              </div>

              <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

              <div className="login-field">
                <label className="login-label">Tipo</label>
                <select className="login-input" value={editForm.tipoPersonalId || ''} onChange={e => setEditForm({ ...editForm, tipoPersonalId: +e.target.value })} disabled={personaModal.readOnly}>
                  <option value="">Seleccionar...</option>
                  {tipos?.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              {isDocente && (
                <div className="login-field">
                  <label className="login-label">Materias</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 0' }}>
                    {materias?.map(m => {
                      const checked = editForm.materiaIds?.includes(m.id);
                      return (
                        <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', cursor: personaModal.readOnly ? 'default' : 'pointer', opacity: personaModal.readOnly ? 0.7 : 1 }}>
                          <input type="checkbox" checked={checked} onChange={() => {
                            if (personaModal.readOnly) return;
                            setEditForm(prev => ({
                              ...prev,
                              materiaIds: checked ? prev.materiaIds?.filter(id => id !== m.id) : [...(prev.materiaIds || []), m.id],
                            }));
                          }} disabled={personaModal.readOnly} />
                          {m.nombre}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              {!isDocente && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="login-field">
                    <label className="login-label">Horario Inicio</label>
                    <input className="login-input" type="time" value={editForm.horarioInicio || ''} onChange={e => setEditForm({ ...editForm, horarioInicio: e.target.value })} disabled={personaModal.readOnly} />
                  </div>
                  <div className="login-field">
                    <label className="login-label">Horario Fin</label>
                    <input className="login-input" type="time" value={editForm.horarioFin || ''} onChange={e => setEditForm({ ...editForm, horarioFin: e.target.value })} disabled={personaModal.readOnly} />
                  </div>
                </div>
              )}
              <div className="login-field">
                <label className="login-label">Notas</label>
                <textarea className="login-input" rows={2} value={editForm.notas || ''} onChange={e => setEditForm({ ...editForm, notas: e.target.value })} disabled={personaModal.readOnly} style={{ resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '10px 0', borderTop: '1px solid var(--color-border-light)' }}>
                <span className="login-label" style={{ margin: 0 }}>Habilitado</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: personaModal.readOnly ? 'default' : 'pointer', opacity: personaModal.readOnly ? 0.7 : 1 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No</span>
                  <div
                    onClick={() => { if (!personaModal.readOnly) setEditForm({ ...editForm, habilitado: !editForm.habilitado }); }}
                    style={{
                      width: 44, height: 24, borderRadius: 12, cursor: personaModal.readOnly ? 'default' : 'pointer',
                      background: editForm.habilitado ? 'var(--color-success)' : 'var(--color-border-strong)',
                      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3, left: editForm.habilitado ? 23 : 3, transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: editForm.habilitado ? 600 : 400, color: editForm.habilitado ? 'var(--color-success)' : 'var(--color-text-muted)' }}>Sí</span>
                </label>
              </div>
            </div>
            {!personaModal.readOnly && (
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setPersonaModal(null)}>Cancelar</button>
                <button className="login-submit" style={{ width: 'auto', padding: '0.5rem 1.5rem', margin: 0 }} onClick={handleSavePersona} disabled={saving}>
                  {saving ? '✓ Guardado' : 'Guardar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: Tipo Personal ────────────────────────────── */}
      {tipoModal && (
        <div className="modal-backdrop" onClick={() => setTipoModal(false)}>
          <div className="modal user-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>{editTipoId ? 'Editar' : 'Nuevo'} Tipo</h3><button className="icon-button" onClick={() => setTipoModal(false)}><X size={16} /></button></div>
            <div className="modal-body">
              <div className="login-field"><label className="login-label">Nombre</label><input className="login-input" value={tipoNombre} onChange={e => setTipoNombre(e.target.value)} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setTipoModal(false)}>Cancelar</button>
              <button className="login-submit" style={{ width: 'auto', padding: '0.5rem 1.5rem', margin: 0 }} onClick={async () => { editTipoId ? await updateTipo.mutateAsync({ id: editTipoId, nombre: tipoNombre }) : await createTipo.mutateAsync({ nombre: tipoNombre }); setTipoModal(false); }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Materia ──────────────────────────────────── */}
      {materiaModal && (
        <div className="modal-backdrop" onClick={() => setMateriaModal(false)}>
          <div className="modal user-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>{editMateriaId ? 'Editar' : 'Nueva'} Materia</h3><button className="icon-button" onClick={() => setMateriaModal(false)}><X size={16} /></button></div>
            <div className="modal-body">
              <div className="login-field"><label className="login-label">Nombre</label><input className="login-input" value={materiaNombre} onChange={e => setMateriaNombre(e.target.value)} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setMateriaModal(false)}>Cancelar</button>
              <button className="login-submit" style={{ width: 'auto', padding: '0.5rem 1.5rem', margin: 0 }} onClick={async () => { editMateriaId ? await updateMateria.mutateAsync({ id: editMateriaId, nombre: materiaNombre }) : await createMateria.mutateAsync({ nombre: materiaNombre }); setMateriaModal(false); }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
