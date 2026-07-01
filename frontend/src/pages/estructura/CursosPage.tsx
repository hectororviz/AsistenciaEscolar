import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useCursosActivos, useCursos, useCrearCursos, useCursoDelete,
  useCiclosLectivos, useCicloLectivoCreate, useCicloLectivoUpdate, useCicloLectivoDelete,
  useNiveles, useNivelCreate, useNivelUpdate, useNivelDelete,
  useTurnos, useTurnoCreate, useTurnoUpdate, useTurnoDelete,
} from '../../api/estructura';
import type { CicloLectivo } from '../../api/estructura';
import { Plus, Edit, Trash2, X, Eye, Clock, Check, Ban, School, Users, Layers, BookOpen } from 'lucide-react';

type Tab = 'cursos' | 'ciclos' | 'configurar';

export const CursosPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('cursos');

  // Cursos
  const { data: cursosActivos, isLoading: loadingCursos } = useCursosActivos();
  const deleteCurso = useCursoDelete();

  // Ciclos
  const { data: ciclos } = useCiclosLectivos();
  const createCiclo = useCicloLectivoCreate();
  const updateCiclo = useCicloLectivoUpdate();
  const deleteCiclo = useCicloLectivoDelete();

  // Niveles
  const { data: niveles } = useNiveles();
  const createNivel = useNivelCreate();
  const updateNivel = useNivelUpdate();
  const deleteNivel = useNivelDelete();

  // Turnos
  const { data: turnos } = useTurnos();
  const createTurno = useTurnoCreate();
  const updateTurno = useTurnoUpdate();
  const deleteTurno = useTurnoDelete();

  // Crear cursos
  const crearCursos = useCrearCursos();

  // Modal nuevo ciclo
  const [showCicloModal, setShowCicloModal] = useState(false);
  const [editCicloId, setEditCicloId] = useState<number | null>(null);
  const [cicloForm, setCicloForm] = useState({ anio: new Date().getFullYear(), nombre: '', fechaInicio: '', fechaFin: '' });
  // Nivel+Turno pairs for this ciclo
  const [nivelTurnoPairs, setNivelTurnoPairs] = useState<{ nivelId: number; turnoId: number; divisiones: Record<string, string[]> }[]>([]);

  // Modal detalle ciclo (ojo)
  const [detalleCicloId, setDetalleCicloId] = useState<number | null>(null);
  const { data: cursosDetalle } = useCursos(detalleCicloId ?? undefined);

  // Cursos del ciclo en edición
  const { data: cursosEdicion } = useCursos(editCicloId ?? undefined);

  // Modal config Nivel
  const [nivelModal, setNivelModal] = useState(false);
  const [editNivelId, setEditNivelId] = useState<number | null>(null);
  const [nivelForm, setNivelForm] = useState({ nombre: '', duracionModuloMin: 50, cantidadAnios: 6 });

  // Modal config Turno
  const [turnoModal, setTurnoModal] = useState(false);
  const [editTurnoId, setEditTurnoId] = useState<number | null>(null);
  const [turnoForm, setTurnoForm] = useState({ nombre: 'Mañana', horaInicio: '08:00', horaFin: '12:00', nivelId: 0 });

  // Helpers
  const openNewCiclo = () => {
    setEditCicloId(null);
    setCicloForm({ anio: new Date().getFullYear(), nombre: '', fechaInicio: '', fechaFin: '' });
    setNivelTurnoPairs([]);
    setShowCicloModal(true);
  };

  const openEditCiclo = (c: CicloLectivo) => {
    setEditCicloId(c.id);
    setCicloForm({ anio: c.anio, nombre: c.nombre || '', fechaInicio: isoToDmy(c.fechaInicio || ''), fechaFin: isoToDmy(c.fechaFin || '') });
    setShowCicloModal(true);
  };

  // When cursosEdicion loads (for editing), build nivelTurnoPairs
  useEffect(() => {
    if (editCicloId && cursosEdicion && cursosEdicion.length > 0 && showCicloModal) {
      const map = new Map<string, { nivelId: number; turnoId: number; divisiones: Record<string, string[]> }>();
      for (const curso of cursosEdicion) {
        const key = `${curso.nivelId}-${curso.turnoId}`;
        if (!map.has(key)) {
          const nivel = niveles?.find(n => n.id === curso.nivelId);
          const cant = nivel?.cantidadAnios || 6;
          const divs: Record<string, string[]> = {};
          for (let i = 1; i <= cant; i++) divs[`${i}°`] = [];
          map.set(key, { nivelId: curso.nivelId, turnoId: curso.turnoId, divisiones: divs });
        }
        const pair = map.get(key)!;
        const anioNombre = curso.anio?.nombre;
        if (anioNombre && !pair.divisiones[anioNombre]?.includes(curso.division?.nombre || '')) {
          if (!pair.divisiones[anioNombre]) pair.divisiones[anioNombre] = [];
          pair.divisiones[anioNombre].push(curso.division?.nombre || '');
        }
      }
      setNivelTurnoPairs(Array.from(map.values()));
    }
  }, [cursosEdicion, editCicloId, showCicloModal]);

  const addNivelTurnoPair = () => {
    if (!niveles?.length) return;
    const nid = niveles[0].id;
    const nt = turnos?.find(t => t.nivelId === nid);
    const tid = nt?.id || 0;
    const nivel = niveles.find(n => n.id === nid);
    const cant = nivel?.cantidadAnios || 6;
    const divs: Record<string, string[]> = {};
    for (let i = 1; i <= cant; i++) divs[`${i}°`] = ['A'];
    setNivelTurnoPairs([...nivelTurnoPairs, { nivelId: nid, turnoId: tid, divisiones: divs }]);
  };

  const updatePairDivision = (pairIdx: number, anio: string, divIdx: number, value: string) => {
    const updated = [...nivelTurnoPairs];
    updated[pairIdx].divisiones[anio][divIdx] = value;
    setNivelTurnoPairs(updated);
  };

  const addDivisionToPair = (pairIdx: number, anio: string) => {
    const updated = [...nivelTurnoPairs];
    updated[pairIdx].divisiones[anio].push('');
    setNivelTurnoPairs(updated);
  };

  const removeDivisionFromPair = (pairIdx: number, anio: string, divIdx: number) => {
    const updated = [...nivelTurnoPairs];
    updated[pairIdx].divisiones[anio] = updated[pairIdx].divisiones[anio].filter((_, i) => i !== divIdx);
    setNivelTurnoPairs(updated);
  };

  const removeNivelTurnoPair = (idx: number) => {
    setNivelTurnoPairs(nivelTurnoPairs.filter((_, i) => i !== idx));
  };

  const handleSaveCiclo = async () => {
    let cicloId = editCicloId;
    if (editCicloId) {
      await updateCiclo.mutateAsync({ id: editCicloId, anio: cicloForm.anio, nombre: cicloForm.nombre, fechaInicio: dmyToIso(cicloForm.fechaInicio), fechaFin: dmyToIso(cicloForm.fechaFin) });
    } else {
      const created = await createCiclo.mutateAsync({ anio: cicloForm.anio, nombre: cicloForm.nombre, fechaInicio: dmyToIso(cicloForm.fechaInicio), fechaFin: dmyToIso(cicloForm.fechaFin) });
      cicloId = created.id;
    }
    // Crear cursos para cada nivel+turno pair
    if (cicloId) {
      for (const pair of nivelTurnoPairs) {
        if (pair.turnoId > 0) {
          await crearCursos.mutateAsync({
            cicloLectivoId: cicloId,
            nivelId: pair.nivelId,
            turnoId: pair.turnoId,
            divisiones: pair.divisiones,
          });
        }
      }
    }
    setShowCicloModal(false);
  };

  const activeCiclo = ciclos?.find(c => c.activo);

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  };
  const isoToDmy = (iso: string) => {
    if (!iso || iso.length < 10) return '';
    const [y, m, d] = iso.slice(0, 10).split('-');
    if (!y || !m || !d) return '';
    return `${d}/${m}/${y}`;
  };
  const dmyToIso = (dmy: string) => {
    const parts = dmy.trim().split('/');
    if (parts.length !== 3) return dmy;
    const [d, m, y] = parts;
    if (!d || !m || !y || y.length < 4) return dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  };

  // ─── RENDER ─────────────────────────────────────────────────

  return (
    <div className="page-content" style={{ maxWidth: 1400 }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--color-border)' }}>
        {(['cursos', 'ciclos', 'configurar'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.6rem 1.5rem',
              border: 'none',
              background: 'none',
              fontSize: '0.9rem',
              fontWeight: tab === t ? 700 : 500,
              color: tab === t ? 'var(--accent-color)' : 'var(--color-text-muted)',
              borderBottom: tab === t ? '2px solid var(--accent-color)' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {t === 'cursos' ? 'Cursos' : t === 'ciclos' ? 'Ciclos Lectivos' : 'Configurar'}
          </button>
        ))}
      </div>

      {/* TAB: Cursos */}
      {tab === 'cursos' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>
              Cursos {activeCiclo ? `— ${activeCiclo.anio}` : ''}
            </h2>
            <span style={{ color: 'var(--color-text-muted)' }}>
              {cursosActivos?.length ?? 0} cursos
              {!activeCiclo && ' — No hay ciclo lectivo activo'}
            </span>
          </div>
          {loadingCursos ? (
            <p className="loading-text">Cargando...</p>
          ) : (!cursosActivos || cursosActivos.length === 0) ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 24 }}>No hay cursos. Creá un ciclo lectivo y agregá cursos.</p>
          ) : (
            (() => {
              const byNivel = new Map<string, typeof cursosActivos>();
              for (const c of cursosActivos) {
                const name = c.nivel?.nombre || 'Sin nivel';
                if (!byNivel.has(name)) byNivel.set(name, []);
                byNivel.get(name)!.push(c);
              }
              const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#f59e0b';
              const pastel = (alpha: number) => {
                const hex = accent.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                return `rgba(${r},${g},${b},${alpha})`;
              };
              return (
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {Array.from(byNivel.entries()).map(([nivelName, cursos]) => {
                    const anios = [...new Set(cursos.map(c => c.anio?.orden || 0))].sort((a, b) => a - b);
                    return (
                      <div key={nivelName} style={{ flex: 1, minWidth: 320, maxWidth: 500 }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <School size={18} /> {nivelName}
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                            {cursos.length} cursos
                          </span>
                        </h3>
                        <div className="sales-table-wrapper">
                          <div className="sales-table">
                            <div className="sales-table-head" style={{ fontSize: '0.7rem' }}>
                              <span style={{ flex: '0 0 70px', padding: '4px 8px', borderBottom: '2px solid var(--color-border)' }}>Año</span>
                              <span style={{ flex: '0 0 80px', padding: '4px 8px', borderBottom: '2px solid var(--color-border)' }}>División</span>
                              <span style={{ flex: '0 0 90px', padding: '4px 8px', borderBottom: '2px solid var(--color-border)' }}>Turno</span>
                              <span style={{ flex: '0 0 80px', padding: '4px 8px', borderBottom: '2px solid var(--color-border)', display: 'flex', gap: 4, justifyContent: 'center' }}></span>
                            </div>
                            {cursos.map(c => {
                              const anioIdx = anios.indexOf(c.anio?.orden || 0);
                              const colored = anioIdx % 2 === 0;
                              return (
                                <div
                                  key={c.id}
                                  className="sales-table-row"
                                  style={{
                                    ...(colored ? { background: pastel(0.08) } : {}),
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  <span style={{ flex: '0 0 70px', padding: '3px 8px' }}>{c.anio?.nombre}</span>
                                  <span style={{ flex: '0 0 80px', padding: '3px 8px' }}>
                                    <Users size={13} style={{ marginRight: 2 }} />{c.division?.nombre}
                                  </span>
                                  <span style={{ flex: '0 0 90px', padding: '3px 8px' }}>
                                    <Clock size={13} style={{ marginRight: 2 }} />{c.turno?.nombre}
                                  </span>
                                  <span style={{ flex: '0 0 80px', padding: '2px 4px', display: 'flex', gap: 4, justifyContent: 'center' }}>
                                    <button className="icon-button" style={{ width: 30, height: 28 }} onClick={() => navigate(`/admin/cursos/${c.id}/asignacion`)} title="Asignar docentes">
                                      <BookOpen size={13} />
                                    </button>
                                    <button className="icon-button" style={{ width: 30, height: 28 }} onClick={() => { if (confirm('Eliminar curso?')) deleteCurso.mutate(c.id); }} title="Eliminar">
                                      <Trash2 size={13} />
                                    </button>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </>
      )}

      {/* TAB: Ciclos Lectivos */}
      {tab === 'ciclos' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Ciclos Lectivos</h2>
            <button className="btn-secondary" onClick={openNewCiclo}><Plus size={16} /> Nuevo Ciclo</button>
          </div>
          <div className="sales-table-wrapper">
            <div className="sales-table">
              <div className="sales-table-head">
                <span className="col-date">Año</span>
                <span className="col-team">Nombre</span>
                <span className="col-category">Inicio</span>
                <span className="col-type">Fin</span>
                <span className="col-user">Estado</span>
                <span className="col-method"></span>
              </div>
              {ciclos?.map(c => (
                <div key={c.id} className="sales-table-row">
                  <span className="col-date">📅 {c.anio}</span>
                  <span className="col-team">{c.nombre || '-'}</span>
                  <span className="col-category">{fmtDate(c.fechaInicio)}</span>
                  <span className="col-type">{fmtDate(c.fechaFin)}</span>
                  <span className="col-user">
                    <span className={`badge ${c.activo ? 'badge-success' : 'badge-warning'}`}>
                      {c.activo ? <><Check size={12} /> Activo</> : <><Ban size={12} /> Inactivo</>}
                    </span>
                  </span>
                  <span className="col-method" style={{ display: 'flex', gap: 4 }}>
                    <button className="icon-button" onClick={() => setDetalleCicloId(c.id)} title="Ver cursos"><Eye size={14} /></button>
                    <button className="icon-button" onClick={() => openEditCiclo(c)}><Edit size={14} /></button>
                    <button className="icon-button" onClick={() => { if (confirm('Eliminar?')) deleteCiclo.mutate(c.id); }}><Trash2 size={14} /></button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* TAB: Configurar */}
      {tab === 'configurar' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Niveles */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Niveles</h3>
              <button className="btn-secondary" onClick={() => { setEditNivelId(null); setNivelForm({ nombre: '', duracionModuloMin: 50, cantidadAnios: 6 }); setNivelModal(true); }}>
                <Plus size={14} /> Agregar
              </button>
            </div>
            <div className="sales-table-wrapper">
              <div className="sales-table">
                <div className="sales-table-head">
                  <span className="col-team">Nombre</span>
                  <span className="col-category">Años</span>
                  <span className="col-type">Módulo</span>
                  <span className="col-action"></span>
                </div>
                {niveles?.map(n => (
                  <div key={n.id} className="sales-table-row">
                    <span className="col-team"><Layers size={14} /> {n.nombre}</span>
                    <span className="col-category">{n.cantidadAnios} años</span>
                    <span className="col-type">{n.duracionModuloMin} min</span>
                    <span className="col-action">
                      <button className="icon-button" onClick={() => { setEditNivelId(n.id); setNivelForm({ nombre: n.nombre, duracionModuloMin: n.duracionModuloMin, cantidadAnios: n.cantidadAnios }); setNivelModal(true); }}><Edit size={14} /></button>
                      <button className="icon-button" onClick={() => { if (confirm('Eliminar nivel?')) deleteNivel.mutate(n.id); }}><Trash2 size={14} /></button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Turnos */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Turnos</h3>
              <button className="btn-secondary" onClick={() => { setEditTurnoId(null); setTurnoForm({ nombre: 'Mañana', horaInicio: '08:00', horaFin: '12:00', nivelId: niveles?.[0]?.id || 0 }); setTurnoModal(true); }}>
                <Plus size={14} /> Agregar
              </button>
            </div>
            <div className="sales-table-wrapper">
              <div className="sales-table">
                <div className="sales-table-head">
                  <span className="col-team">Nombre</span>
                  <span className="col-category">Nivel</span>
                  <span className="col-type">Inicio</span>
                  <span className="col-date">Fin</span>
                  <span className="col-action"></span>
                </div>
                {turnos?.map(t => (
                  <div key={t.id} className="sales-table-row">
                    <span className="col-team"><Clock size={14} /> {t.nombre}</span>
                    <span className="col-category">{t.nivel?.nombre || '-'}</span>
                    <span className="col-type">{t.horaInicio}</span>
                    <span className="col-date">{t.horaFin}</span>
                    <span className="col-action">
                      <button className="icon-button" onClick={() => { setEditTurnoId(t.id); setTurnoForm({ nombre: t.nombre, horaInicio: t.horaInicio, horaFin: t.horaFin, nivelId: t.nivelId }); setTurnoModal(true); }}><Edit size={14} /></button>
                      <button className="icon-button" onClick={() => { if (confirm('Eliminar turno?')) deleteTurno.mutate(t.id); }}><Trash2 size={14} /></button>
                      <button className="icon-button" onClick={() => navigate(`/admin/horarios/${t.nivelId}/${t.id}`)} title="Horario"><Clock size={14} /></button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Nuevo/Editar Ciclo ─────────────────────── */}
      {showCicloModal && (
        <div className="modal-backdrop" onClick={() => setShowCicloModal(false)}>
          <div className="modal user-modal" style={{ maxWidth: 700, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editCicloId ? 'Editar' : 'Nuevo'} Ciclo Lectivo</h3>
              <button className="icon-button" onClick={() => setShowCicloModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="login-field"><label className="login-label">Año</label><input className="login-input" type="number" value={cicloForm.anio} onChange={e => setCicloForm({ ...cicloForm, anio: +e.target.value })} /></div>
                <div className="login-field"><label className="login-label">Nombre</label><input className="login-input" value={cicloForm.nombre} onChange={e => setCicloForm({ ...cicloForm, nombre: e.target.value })} /></div>
                <div className="login-field"><label className="login-label">Fecha Inicio</label><input className="login-input" type="text" placeholder="dd/mm/aaaa" value={cicloForm.fechaInicio} onChange={e => setCicloForm({ ...cicloForm, fechaInicio: e.target.value })} /></div>
                <div className="login-field"><label className="login-label">Fecha Fin</label><input className="login-input" type="text" placeholder="dd/mm/aaaa" value={cicloForm.fechaFin} onChange={e => setCicloForm({ ...cicloForm, fechaFin: e.target.value })} /></div>
              </div>

              <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0 }}>Cursos del ciclo</h4>
                <button className="btn-secondary" onClick={addNivelTurnoPair}><Plus size={14} /> Agregar Nivel + Turno</button>
              </div>

              {nivelTurnoPairs.map((pair, pIdx) => {
                const nivel = niveles?.find(n => n.id === pair.nivelId);
                const turnosNivel = turnos?.filter(t => t.nivelId === pair.nivelId) || [];
                const cant = nivel?.cantidadAnios || 6;
                const anios = Array.from({ length: cant }, (_, i) => `${i + 1}°`);
                return (
                  <div key={pIdx} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, marginBottom: 12, background: 'var(--color-bg)' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                      <select className="login-input" style={{ flex: 1 }} value={pair.nivelId} onChange={e => {
                        const updated = [...nivelTurnoPairs];
                        updated[pIdx].nivelId = +e.target.value;
                        const nt = turnos?.find(t => t.nivelId === +e.target.value);
                        updated[pIdx].turnoId = nt?.id || 0;
                        const n = niveles?.find(n => n.id === +e.target.value);
                        const c = n?.cantidadAnios || 6;
                        updated[pIdx].divisiones = {};
                        for (let i = 1; i <= c; i++) updated[pIdx].divisiones[`${i}°`] = ['A'];
                        setNivelTurnoPairs(updated);
                      }}>
                        {niveles?.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                      </select>
                      <select className="login-input" style={{ flex: 1 }} value={pair.turnoId} onChange={e => {
                        const updated = [...nivelTurnoPairs];
                        updated[pIdx].turnoId = +e.target.value;
                        setNivelTurnoPairs(updated);
                      }}>
                        <option value={0}>Seleccionar turno</option>
                        {turnosNivel.map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.horaInicio}-{t.horaFin})</option>)}
                      </select>
                      <button className="icon-button" onClick={() => removeNivelTurnoPair(pIdx)}><Trash2 size={14} /></button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--color-hover)' }}>
                            <th style={{ padding: '4px 8px', textAlign: 'left' }}>Año</th>
                            <th style={{ padding: '4px 8px', textAlign: 'left' }} colSpan={10}>Divisiones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {anios.map(anio => {
                            const divs = pair.divisiones[anio] || [];
                            return (
                              <tr key={anio} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                                <td style={{ padding: '4px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>{anio}</td>
                                <td style={{ padding: '4px 8px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {divs.map((d, dIdx) => (
                                    <span key={dIdx} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <input
                                        className="login-input"
                                        style={{ width: 60, padding: '2px 4px', fontSize: '0.8rem' }}
                                        value={d}
                                        onChange={e => updatePairDivision(pIdx, anio, dIdx, e.target.value)}
                                        placeholder="Div"
                                      />
                                      {divs.length > 1 && (
                                        <button type="button" onClick={() => removeDivisionFromPair(pIdx, anio, dIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: 0 }}><X size={12} /></button>
                                      )}
                                    </span>
                                  ))}
                                  <button type="button" className="icon-button" style={{ width: 24, height: 24 }} onClick={() => addDivisionToPair(pIdx, anio)}><Plus size={12} /></button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {nivelTurnoPairs.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                  Agregá al menos un Nivel + Turno para crear cursos.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCicloModal(false)}>Cancelar</button>
              <button className="login-submit" style={{ width: 'auto', padding: '0.5rem 1.5rem', margin: 0 }} onClick={handleSaveCiclo}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Detalle Ciclo ─────────────────────────── */}
      {detalleCicloId && (
        <div className="modal-backdrop" onClick={() => setDetalleCicloId(null)}>
          <div className="modal user-modal" style={{ maxWidth: 800, maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cursos del ciclo {ciclos?.find(c => c.id === detalleCicloId)?.anio}</h3>
              <button className="icon-button" onClick={() => setDetalleCicloId(null)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ margin: '0 0 12px', color: 'var(--color-text-muted)' }}>{cursosDetalle?.length || 0} cursos</p>
              <div className="sales-table-wrapper">
                <div className="sales-table">
                  <div className="sales-table-head">
                    <span className="col-team">Nivel</span>
                    <span className="col-category">Año</span>
                    <span className="col-date">División</span>
                    <span className="col-type">Turno</span>
                  </div>
                  {cursosDetalle?.map(c => (
                    <div key={c.id} className="sales-table-row">
                      <span className="col-team">{c.nivel?.nombre}</span>
                      <span className="col-category">{c.anio?.nombre}</span>
                      <span className="col-date">{c.division?.nombre}</span>
                      <span className="col-type">{c.turno?.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDetalleCicloId(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Nivel ─────────────────────────────────── */}
      {nivelModal && (
        <div className="modal-backdrop" onClick={() => setNivelModal(false)}>
          <div className="modal user-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>{editNivelId ? 'Editar' : 'Nuevo'} Nivel</h3><button className="icon-button" onClick={() => setNivelModal(false)}><X size={16} /></button></div>
            <div className="modal-body">
              <div className="login-field"><label className="login-label">Nombre</label><input className="login-input" value={nivelForm.nombre} onChange={e => setNivelForm({ ...nivelForm, nombre: e.target.value })} /></div>
              <div className="login-field"><label className="login-label">Duración módulo (min)</label><input className="login-input" type="number" value={nivelForm.duracionModuloMin} onChange={e => setNivelForm({ ...nivelForm, duracionModuloMin: +e.target.value })} /></div>
              <div className="login-field"><label className="login-label">Cantidad de años</label><input className="login-input" type="number" value={nivelForm.cantidadAnios} onChange={e => setNivelForm({ ...nivelForm, cantidadAnios: +e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setNivelModal(false)}>Cancelar</button>
              <button className="login-submit" style={{ width: 'auto', padding: '0.5rem 1.5rem', margin: 0 }} onClick={async () => { editNivelId ? await updateNivel.mutateAsync({ id: editNivelId, ...nivelForm }) : await createNivel.mutateAsync(nivelForm); setNivelModal(false); }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Turno ─────────────────────────────────── */}
      {turnoModal && (
        <div className="modal-backdrop" onClick={() => setTurnoModal(false)}>
          <div className="modal user-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>{editTurnoId ? 'Editar' : 'Nuevo'} Turno</h3><button className="icon-button" onClick={() => setTurnoModal(false)}><X size={16} /></button></div>
            <div className="modal-body">
              <div className="login-field"><label className="login-label">Nombre</label><input className="login-input" value={turnoForm.nombre} onChange={e => setTurnoForm({ ...turnoForm, nombre: e.target.value })} /></div>
              <div className="login-field"><label className="login-label">Nivel</label><select className="login-input" value={turnoForm.nivelId} onChange={e => setTurnoForm({ ...turnoForm, nivelId: +e.target.value })}>{niveles?.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}</select></div>
              <div className="login-field"><label className="login-label">Hora Inicio</label><input className="login-input" type="time" value={turnoForm.horaInicio} onChange={e => setTurnoForm({ ...turnoForm, horaInicio: e.target.value })} /></div>
              <div className="login-field"><label className="login-label">Hora Fin</label><input className="login-input" type="time" value={turnoForm.horaFin} onChange={e => setTurnoForm({ ...turnoForm, horaFin: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setTurnoModal(false)}>Cancelar</button>
              <button className="login-submit" style={{ width: 'auto', padding: '0.5rem 1.5rem', margin: 0 }} onClick={async () => { editTurnoId ? await updateTurno.mutateAsync({ id: editTurnoId, ...turnoForm }) : await createTurno.mutateAsync(turnoForm); setTurnoModal(false); }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
