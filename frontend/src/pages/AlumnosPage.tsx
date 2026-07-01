import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Plus, Edit, X, Search, Download, Upload, Check, Ban, User, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Alumno {
  id: number; dni?: string; apellido: string; nombre: string;
  fechaNacimiento?: string; direccion?: string;
  contacto1Nombre?: string; contacto1Tel?: string;
  contacto2Nombre?: string; contacto2Tel?: string;
  contacto3Nombre?: string; contacto3Tel?: string;
  activo: boolean;
  cursos?: { id: number; curso: { nivel?: { nombre: string }; anio?: { nombre: string }; division?: { nombre: string }; turno?: { nombre: string } } }[];
}

export const AlumnosPage: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showInactivos, setShowInactivos] = useState(false);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ apellido: '', nombre: '', dni: '', fechaNacimiento: '', direccion: '', contacto1Nombre: '', contacto1Tel: '', contacto2Nombre: '', contacto2Tel: '', contacto3Nombre: '', contacto3Tel: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: alumnos } = useQuery({
    queryKey: ['alumnos', search],
    queryFn: async () => (await apiClient.get<Alumno[]>(`/alumnos?search=${search}`)).data,
  });

  const createAlumno = useMutation({
    mutationFn: async (d: any) => (await apiClient.post('/alumnos', d)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alumnos'] }); setModal(false); },
  });
  const updateAlumno = useMutation({
    mutationFn: async ({ id, ...d }: any) => (await apiClient.put(`/alumnos/${id}`, d)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alumnos'] }); setModal(false); },
  });
  const toggleAlumno = useMutation({
    mutationFn: async ({ id, activo }: { id: number; activo: boolean }) => (await apiClient.put(`/alumnos/${id}`, { activo })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumnos'] }),
  });

  const openNew = () => { setEditId(null); setForm({ apellido: '', nombre: '', dni: '', fechaNacimiento: '', direccion: '', contacto1Nombre: '', contacto1Tel: '', contacto2Nombre: '', contacto2Tel: '', contacto3Nombre: '', contacto3Tel: '' }); setModal(true); };
  const openEdit = (a: Alumno) => { setEditId(a.id); setForm({ apellido: a.apellido, nombre: a.nombre, dni: a.dni || '', fechaNacimiento: a.fechaNacimiento?.slice(0, 10) || '', direccion: a.direccion || '', contacto1Nombre: a.contacto1Nombre || '', contacto1Tel: a.contacto1Tel || '', contacto2Nombre: a.contacto2Nombre || '', contacto2Tel: a.contacto2Tel || '', contacto3Nombre: a.contacto3Nombre || '', contacto3Tel: a.contacto3Tel || '' }); setModal(true); };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });
    let count = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i] as any[];
      if (r && r.length >= 2 && r[0] && r[1]) {
        await apiClient.post('/alumnos', { apellido: String(r[0]).trim(), nombre: String(r[1]).trim(), dni: r[2] ? String(r[2]).trim() : '' });
        count++;
      }
    }
    alert(`${count} alumnos importados`);
    qc.invalidateQueries({ queryKey: ['alumnos'] });
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleExport = () => {
    if (!alumnos) return;
    const data = [['Apellido', 'Nombre', 'DNI', 'Contacto 1', 'Tel 1', 'Contacto 2', 'Tel 2', 'Contacto 3', 'Tel 3'],
      ...alumnos.map(a => [a.apellido, a.nombre, a.dni || '', a.contacto1Nombre || '', a.contacto1Tel || '', a.contacto2Nombre || '', a.contacto2Tel || '', a.contacto3Nombre || '', a.contacto3Tel || ''])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos');
    XLSX.writeFile(wb, 'alumnos.xlsx');
  };

  const filtered = alumnos?.filter(a => showInactivos ? true : a.activo) || [];

  const cuentaActivos = filtered.filter(a => a.activo).length;

  return (
    <div className="page-content" style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Alumnos</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImportFile} style={{ display: 'none' }} />
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}><Download size={14} /> Importar XLSX</button>
          <button className="btn-secondary" onClick={handleExport}><Upload size={14} /> Exportar XLSX</button>
          <button className="btn-secondary" onClick={openNew}><Plus size={14} /> Nuevo</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input className="login-input" style={{ padding: '5px 8px 5px 28px', fontSize: '0.85rem' }} placeholder="Buscar por nombre, apellido o DNI..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={showInactivos} onChange={e => setShowInactivos(e.target.checked)} />
          <span style={{ color: 'var(--color-text-muted)' }}>Ver inactivos</span>
        </label>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{cuentaActivos} activos</span>
      </div>

      <div className="sales-table-wrapper">
        <div className="sales-table">
          <div className="sales-table-head" style={{ fontSize: '0.75rem' }}>
            <span style={{ flex: '0 0 40px', padding: '4px 8px', borderBottom: '2px solid var(--color-border)' }}>#</span>
            <span className="col-team">Apellido, Nombre</span>
            <span style={{ flex: '0 0 120px', padding: '4px 8px', borderBottom: '2px solid var(--color-border)' }}>DNI</span>
            <span className="col-category">Curso</span>
            <span style={{ flex: '0 0 80px', padding: '4px 8px', borderBottom: '2px solid var(--color-border)', textAlign: 'center' }}>Estado</span>
            <span style={{ flex: '0 0 90px', padding: '4px 8px', borderBottom: '2px solid var(--color-border)', display: 'flex', justifyContent: 'center' }}></span>
          </div>
          {filtered.map((a, i) => (
            <div key={a.id} className="sales-table-row" style={{ fontSize: '0.82rem', opacity: a.activo ? 1 : 0.6 }}>
              <span style={{ flex: '0 0 40px', padding: '3px 8px', textAlign: 'center' }}>{i + 1}</span>
              <span className="col-team"><User size={13} style={{ marginRight: 4 }} />{a.apellido}, {a.nombre}</span>
              <span style={{ flex: '0 0 120px', padding: '3px 8px' }}>{a.dni || '-'}</span>
              <span className="col-category">{a.cursos?.map(c => `${c.curso.anio?.nombre} ${c.curso.division?.nombre}`).join(', ') || '-'}</span>
              <span style={{ flex: '0 0 80px', padding: '3px 8px', textAlign: 'center' }}>
                <span className={`badge ${a.activo ? 'badge-success' : 'badge-warning'}`}>
                  {a.activo ? <><Check size={11} /> Activo</> : <><Ban size={11} /> Baja</>}
                </span>
              </span>
              <span style={{ flex: '0 0 90px', padding: '2px 4px', display: 'flex', gap: 4, justifyContent: 'center' }}>
                <button className="icon-button" style={{ width: 30, height: 28 }} onClick={() => openEdit(a)}><Edit size={13} /></button>
                <button className="icon-button" style={{ width: 30, height: 28 }}
                  onClick={() => { if (confirm(a.activo ? 'Dar de baja?' : 'Reactivar?')) toggleAlumno.mutate({ id: a.id, activo: !a.activo }); }}>
                  {a.activo ? <Ban size={13} /> : <Check size={13} />}
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal user-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>{editId ? 'Editar' : 'Nuevo'} Alumno</h3><button className="icon-button" onClick={() => setModal(false)}><X size={16} /></button></div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="login-field"><label className="login-label">Apellido *</label><input className="login-input" value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} /></div>
                <div className="login-field"><label className="login-label">Nombre *</label><input className="login-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
                <div className="login-field"><label className="login-label">DNI</label><input className="login-input" value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} /></div>
                <div className="login-field"><label className="login-label">Fecha Nac.</label><input className="login-input" type="date" value={form.fechaNacimiento} onChange={e => setForm({ ...form, fechaNacimiento: e.target.value })} /></div>
              </div>
              <div className="login-field"><label className="login-label">Dirección</label><input className="login-input" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
              <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />
              {[1, 2, 3].map(n => {
                const nombreKey = `contacto${n}Nombre` as keyof typeof form;
                const telKey = `contacto${n}Tel` as keyof typeof form;
                return (
                  <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
                    <div className="login-field"><label className="login-label">Contacto {n} - Nombre</label><input className="login-input" value={form[nombreKey] || ''} onChange={e => setForm({ ...form, [nombreKey]: e.target.value })} /></div>
                    <div className="login-field"><label className="login-label">Contacto {n} - Teléfono</label><input className="login-input" value={form[telKey] || ''} onChange={e => setForm({ ...form, [telKey]: e.target.value })} /></div>
                  </div>
                );
              })}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="login-submit" style={{ width: 'auto', padding: '0.5rem 1.5rem', margin: 0 }} onClick={async () => {
                if (!form.apellido || !form.nombre) { alert('Apellido y nombre obligatorios'); return; }
                editId ? await updateAlumno.mutateAsync({ id: editId, ...form }) : await createAlumno.mutateAsync(form);
              }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const CursoAlumnosPage: React.FC = () => {
  const { cursoId } = useParams<{ cursoId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: cursoAlumnos } = useQuery({
    queryKey: ['curso-alumnos', cursoId],
    queryFn: async () => (await apiClient.get(`/cursos/${cursoId}/alumnos`)).data as { id: number; alumno: Alumno }[],
  });

  const { data: todosAlumnos } = useQuery({
    queryKey: ['alumnos', ''],
    queryFn: async () => (await apiClient.get<Alumno[]>('/alumnos')).data,
  });

  const addAlumno = useMutation({
    mutationFn: async (alumnoId: number) => (await apiClient.post(`/cursos/${cursoId}/alumnos`, { alumnoId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['curso-alumnos', cursoId] }),
  });

  const removeAlumno = useMutation({
    mutationFn: async (alumnoId: number) => (await apiClient.delete(`/cursos/${cursoId}/alumnos/${alumnoId}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['curso-alumnos', cursoId] }),
  });

  const inscriptos = new Set(cursoAlumnos?.map(ca => ca.alumno.id) || []);
  const disponibles = todosAlumnos?.filter(a => a.activo && !inscriptos.has(a.id) && 
    (search === '' || `${a.apellido} ${a.nombre}`.toLowerCase().includes(search.toLowerCase()))) || [];

  return (
    <div className="page-content" style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="icon-button" onClick={() => navigate('/admin/cursos')}><ArrowLeft size={18} /></button>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>Alumnos del curso</h2>
        </div>
      </div>

      <h3 style={{ fontSize: '0.9rem', marginBottom: 8 }}>Inscriptos ({inscriptos.size})</h3>
      <div className="sales-table-wrapper" style={{ marginBottom: 24 }}>
        <div className="sales-table">
          {cursoAlumnos?.map(ca => (
            <div key={ca.id} className="sales-table-row" style={{ fontSize: '0.82rem' }}>
              <span className="col-team"><User size={13} style={{ marginRight: 4 }} />{ca.alumno.apellido}, {ca.alumno.nombre}</span>
              <span style={{ flex: '0 0 100px', padding: '3px 8px' }}>{ca.alumno.dni || '-'}</span>
              <span className="col-action">
                <button className="icon-button" style={{ width: 28, height: 26 }} onClick={() => { if (confirm('Quitar alumno?')) removeAlumno.mutate(ca.alumno.id); }}><X size={12} /></button>
              </span>
            </div>
          ))}
        </div>
      </div>

      <h3 style={{ fontSize: '0.9rem', marginBottom: 8 }}>Agregar alumno</h3>
      <input className="login-input" style={{ marginBottom: 8, fontSize: '0.85rem' }} placeholder="Buscar alumno..." value={search} onChange={e => setSearch(e.target.value)} />
      <div className="sales-table-wrapper" style={{ maxHeight: 300, overflowY: 'auto' }}>
        <div className="sales-table">
          {disponibles?.slice(0, 20).map(a => (
            <div key={a.id} className="sales-table-row" style={{ fontSize: '0.82rem', cursor: 'pointer' }} onClick={() => addAlumno.mutate(a.id)}>
              <span className="col-team"><Plus size={13} style={{ marginRight: 4 }} />{a.apellido}, {a.nombre}</span>
              <span style={{ flex: '0 0 100px', padding: '3px 8px' }}>{a.dni || '-'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
