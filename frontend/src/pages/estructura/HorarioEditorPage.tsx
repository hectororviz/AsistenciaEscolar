import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHorarios, useHorarioUpdateModulos, useHorarioGenerarDefault, useHorarioCreate } from '../../api/estructura';
import type { ModuloHorario } from '../../api/estructura';
import { Plus, Trash2, RotateCcw, Save, ArrowLeft, Clock } from 'lucide-react';

export const HorarioEditorPage: React.FC = () => {
  const { nivelId, turnoId } = useParams<{ nivelId: string; turnoId: string }>();
  const navigate = useNavigate();
  const nid = +(nivelId || 0);
  const tid = +(turnoId || 0);
  const { data: horarios } = useHorarios();
  const updateModulos = useHorarioUpdateModulos();
  const generarDefault = useHorarioGenerarDefault();
  const createHorario = useHorarioCreate();

  const horario = horarios?.find(h => h.nivelId === nid && h.turnoId === tid);
  const turno = horario?.turno;
  const nivel = horario?.nivel;

  const [modulos, setModulos] = useState<ModuloHorario[]>([]);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState<{ idx: number; edge: 'start' | 'end' | 'move'; startX: number; origMod: ModuloHorario } | null>(null);

  useEffect(() => {
    if (horario?.modulos) setModulos(horario.modulos.map(m => ({ ...m })));
    else setModulos([]);
  }, [horario]);

  const timeToMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const minToTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  const startMin = turno ? timeToMin(turno.horaInicio) : 0;
  const endMin = turno ? timeToMin(turno.horaFin) : 0;
  const totalMin = endMin - startMin;
  const durModulo = nivel?.duracionModuloMin || 50;

  const getLeft = (mod: ModuloHorario) => totalMin > 0 ? ((timeToMin(mod.horaInicio) - startMin) / totalMin) * 100 : 0;
  const getWidth = (mod: ModuloHorario) => totalMin > 0 ? (mod.duracionMin / totalMin) * 100 : 0;

  const snap = (min: number) => Math.round(min / 5) * 5;

  const handleMouseDown = (idx: number, edge: 'start' | 'end' | 'move', e: React.MouseEvent) => {
    e.preventDefault();
    setDragging({ idx, edge, startX: e.clientX, origMod: { ...modulos[idx] } });
  };

  useEffect(() => {
    if (!dragging || !turno) return;
    const handleMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragging.startX;
      const deltaMin = Math.round((deltaX / (window.innerWidth * 0.6)) * totalMin);
      const snapDelta = snap(deltaMin);
      const mod = { ...dragging.origMod };
      const start = timeToMin(mod.horaInicio);
      const end = timeToMin(mod.horaFin);
      let newStart = start, newEnd = end;

      if (dragging.edge === 'move') { newStart = snap(start + snapDelta); newEnd = snap(end + snapDelta); }
      else if (dragging.edge === 'start') newStart = snap(start + snapDelta);
      else if (dragging.edge === 'end') newEnd = snap(end + snapDelta);

      if (newStart < startMin) newStart = startMin;
      if (newEnd > endMin) newEnd = endMin;
      if (newEnd <= newStart) {
        if (dragging.edge === 'end') newEnd = newStart + durModulo;
        else newStart = newEnd - durModulo;
      }
      setModulos(prev => {
        const updated = [...prev];
        updated[dragging.idx] = { ...updated[dragging.idx], horaInicio: minToTime(newStart), horaFin: minToTime(newEnd), duracionMin: newEnd - newStart };
        return updated;
      });
    };
    const handleUp = () => setDragging(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [dragging, totalMin, startMin, endMin, turno]);

  const addModulo = () => {
    const last = modulos[modulos.length - 1];
    const cursor = last ? timeToMin(last.horaFin) : startMin;
    const fin = Math.min(cursor + durModulo, endMin);
    setModulos([...modulos, { orden: modulos.length + 1, tipo: 'MODULO', etiqueta: `${modulos.length + 1}° Módulo`, horaInicio: minToTime(cursor), horaFin: minToTime(fin), duracionMin: fin - cursor }]);
  };

  const removeModulo = (idx: number) => setModulos(modulos.filter((_, i) => i !== idx));

  const handleSave = async () => {
    const hid = horario?.id || (await createHorario.mutateAsync({ nivelId: nid, turnoId: tid })).id;
    await updateModulos.mutateAsync({ id: hid, modulos: modulos.map((m, i) => ({ ...m, orden: i + 1 })) });
    setSaved(true);
    setTimeout(() => navigate('/admin/cursos'), 800);
  };

  const handleGenerarDefault = async () => {
    const hid = horario?.id || (await createHorario.mutateAsync({ nivelId: nid, turnoId: tid })).id;
    await generarDefault.mutateAsync(hid);
  };

  if (!turno || !nivel) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: 40 }}>
        <Clock size={48} style={{ color: 'var(--color-text-muted)', marginBottom: 16 }} />
        <h3>No hay horario configurado</h3>
        <button className="login-submit" style={{ width: 'auto', padding: '0.5rem 2rem', margin: '16px auto' }} onClick={async () => { await createHorario.mutateAsync({ nivelId: nid, turnoId: tid }); }}>Crear horario</button>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-button" onClick={() => navigate('/admin/cursos')}><ArrowLeft size={18} /></button>
          <h2 style={{ margin: 0 }}>{nivel.nombre} · {turno.nombre}</h2>
          <span style={{ color: 'var(--color-text-muted)' }}>({turno.horaInicio} - {turno.horaFin})</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={handleGenerarDefault}><RotateCcw size={14} /> Auto-generar</button>
          <button className="btn-secondary" onClick={addModulo}><Plus size={14} /> Agregar módulo</button>
          <button className="login-submit" style={{ width: 'auto', padding: '0.5rem 1.2rem', margin: 0 }} onClick={handleSave} disabled={saved}>
            {saved ? '✓ Guardado' : <><Save size={14} /> Guardar</>}
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '16px 20px' }}>
        <div style={{ display: 'flex', padding: '0 0 6px 0', position: 'relative', minHeight: 18 }}>
          {Array.from({ length: Math.floor(totalMin / 60) + 1 }, (_, i) => {
            const h = Math.floor(startMin / 60) + i;
            return `${String(h).padStart(2, '0')}:00`;
          }).map((label, i) => (
            <div key={i} style={{ position: 'absolute', left: `${(i * 60 / totalMin) * 100}%`, fontSize: '0.7rem', color: 'var(--color-text-muted)', transform: 'translateX(-50%)' }}>{label}</div>
          ))}
        </div>
        <div style={{ position: 'relative', minHeight: 160 }}>
          {Array.from({ length: Math.floor(totalMin / 30) + 1 }, (_, i) => (
            <div key={i} style={{ position: 'absolute', left: `${(i * 30 / totalMin) * 100}%`, top: 0, bottom: 0, width: 1, background: 'var(--color-border-light)', opacity: 0.4 }} />
          ))}
          {modulos.map((mod, idx) => {
            const left = getLeft(mod);
            const width = getWidth(mod);
            const isDragging = dragging?.idx === idx;
            // Gap (recreo) from previous module
            const prevEnd = idx > 0 ? timeToMin(modulos[idx - 1].horaFin) : startMin;
            const gap = timeToMin(mod.horaInicio) - prevEnd;
            const gapLeft = totalMin > 0 ? ((prevEnd - startMin) / totalMin) * 100 : 0;
            const gapWidth = totalMin > 0 ? (gap / totalMin) * 100 : 0;
            return (
              <div key={idx}>
                {gap > 0 && (
                  <div style={{ position: 'absolute', left: `${gapLeft}%`, width: `${Math.max(gapWidth, 0.3)}%`, top: 6, height: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--color-text-faint)' }}>{gap}min recreo</span>
                  </div>
                )}
                <div style={{ position: 'relative', height: 44, marginTop: gap > 0 ? 22 : 6, marginBottom: 6 }}>
                  <div
                    style={{
                      position: 'absolute', left: `${left}%`, width: `${Math.max(width, 0.5)}%`, height: '100%',
                      background: 'var(--accent-color)', borderRadius: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '0.8rem', fontWeight: 600,
                      cursor: isDragging ? 'grabbing' : 'grab',
                      opacity: isDragging ? 0.8 : 1, userSelect: 'none',
                      minWidth: 50, overflow: 'hidden',
                      boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                      zIndex: isDragging ? 10 : 1,
                    }}
                    onMouseDown={(e) => handleMouseDown(idx, 'move', e)}
                  >
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'w-resize', zIndex: 2 }} onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(idx, 'start', e); }} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, pointerEvents: 'none', lineHeight: 1.1, flex: 1 }}>
                      <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>{mod.horaInicio} - {mod.horaFin}</span>
                      <span>{mod.etiqueta}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeModulo(idx); }}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: 4, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 3 }}
                      title="Eliminar módulo"
                    ><Trash2 size={12} /></button>
                    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'e-resize', zIndex: 2 }} onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(idx, 'end', e); }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
        Arrastrá los bloques para moverlos. Bordes para redimensionar. Snap 5 min. Los espacios entre módulos son recreos.
      </div>
    </div>
  );
};
