import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export interface CicloLectivo {
  id: number; anio: number; nombre: string | null;
  fechaInicio: string; fechaFin: string; activo: boolean;
}
export interface Nivel {
  id: number; nombre: string; duracionModuloMin: number; cantidadAnios: number;
  turnos?: Turno[];
}
export interface Turno {
  id: number; nombre: string; horaInicio: string; horaFin: string;
  nivelId: number; nivel?: Nivel;
}
export interface Curso {
  id: number; cicloLectivoId: number; nivelId: number; turnoId: number;
  anioId: number; divisionId: number;
  cicloLectivo?: CicloLectivo; nivel?: Nivel; turno?: Turno;
  anio?: { id: number; nombre: string; orden: number };
  division?: { id: number; nombre: string };
}
export interface ModuloHorario {
  id?: number; orden: number; tipo: string; etiqueta: string;
  horaInicio: string; horaFin: string; duracionMin: number;
}
export interface HorarioNivelTurno {
  id: number; nivelId: number; turnoId: number;
  nivel?: Nivel; turno?: Turno;
  modulos?: ModuloHorario[];
}

// Cursos
export const useCursosActivos = () =>
  useQuery({ queryKey: ['cursos-activos'], queryFn: async () => (await apiClient.get<Curso[]>('/cursos/activo')).data, staleTime: 60 * 1000 });

export const useCursos = (cicloId?: number) =>
  useQuery({ queryKey: ['cursos', cicloId], queryFn: async () => (await apiClient.get<Curso[]>('/cursos', { params: cicloId ? { cicloLectivoId: cicloId } : {} })).data, staleTime: 60 * 1000, enabled: !!cicloId });

export const useCrearCursos = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: { cicloLectivoId: number; nivelId: number; turnoId: number; divisiones: Record<string, string[]> }) =>
      (await apiClient.post('/cursos/crear', d)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cursos-activos'] }); qc.invalidateQueries({ queryKey: ['cursos'] }); },
  });
};

export const useCursoDelete = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.delete(`/cursos/${id}`)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cursos-activos'] }); qc.invalidateQueries({ queryKey: ['cursos'] }); },
  });
};

// Ciclos Lectivos
export const useCiclosLectivos = () =>
  useQuery({ queryKey: ['ciclos-lectivos'], queryFn: async () => (await apiClient.get<CicloLectivo[]>('/ciclos-lectivos')).data, staleTime: 5 * 60 * 1000 });

export const useCicloLectivoCreate = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (d: Partial<CicloLectivo>) => (await apiClient.post('/ciclos-lectivos', d)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['ciclos-lectivos'] }) });
};
export const useCicloLectivoUpdate = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ id, ...d }: Partial<CicloLectivo> & { id: number }) => (await apiClient.put(`/ciclos-lectivos/${id}`, d)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['ciclos-lectivos'] }) });
};
export const useCicloLectivoDelete = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: number) => (await apiClient.delete(`/ciclos-lectivos/${id}`)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['ciclos-lectivos'] }) });
};

// Niveles
export const useNiveles = () =>
  useQuery({ queryKey: ['niveles'], queryFn: async () => (await apiClient.get<Nivel[]>('/niveles')).data, staleTime: 10 * 60 * 1000 });

export const useNivelCreate = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (d: Partial<Nivel>) => (await apiClient.post('/niveles', d)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['niveles'] }) });
};
export const useNivelUpdate = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ id, ...d }: Partial<Nivel> & { id: number }) => (await apiClient.put(`/niveles/${id}`, d)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['niveles'] }) });
};
export const useNivelDelete = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: number) => (await apiClient.delete(`/niveles/${id}`)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['niveles'] }) });
};

// Turnos
export const useTurnos = (nivelId?: number) =>
  useQuery({ queryKey: ['turnos', nivelId], queryFn: async () => (await apiClient.get<Turno[]>('/turnos', { params: nivelId ? { nivelId } : {} })).data, staleTime: 5 * 60 * 1000 });

export const useTurnoCreate = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (d: Partial<Turno>) => (await apiClient.post('/turnos', d)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['turnos'] }) });
};
export const useTurnoUpdate = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ id, ...d }: Partial<Turno> & { id: number }) => (await apiClient.put(`/turnos/${id}`, d)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['turnos'] }) });
};
export const useTurnoDelete = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: number) => (await apiClient.delete(`/turnos/${id}`)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['turnos'] }) });
};

// Horarios
export const useHorarios = (nivelId?: number, turnoId?: number) =>
  useQuery({ queryKey: ['horarios', nivelId, turnoId], queryFn: async () => (await apiClient.get<HorarioNivelTurno[]>('/horarios', { params: { ...(nivelId ? { nivelId } : {}), ...(turnoId ? { turnoId } : {}) } })).data, staleTime: 5 * 60 * 1000 });

export const useHorarioCreate = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (d: { nivelId: number; turnoId: number }) => (await apiClient.post('/horarios', d)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['horarios'] }) });
};
export const useHorarioUpdateModulos = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ id, modulos }: { id: number; modulos: ModuloHorario[] }) => (await apiClient.put(`/horarios/${id}/modulos`, modulos)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['horarios'] }) });
};
export const useHorarioGenerarDefault = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: number) => (await apiClient.post(`/horarios/${id}/generar-default`)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['horarios'] }) });
};
