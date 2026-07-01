import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export interface TipoPersonal { id: number; nombre: string; }
export interface Materia { id: number; nombre: string; }
export interface Persona {
  id: number; userId: string; nombre: string; habilitado: boolean;
  fechaNacimiento?: string; dni?: string; direccion?: string;
  telefono?: string; email?: string; notas?: string;
  tipoPersonalId: number; tipoPersonal?: TipoPersonal;
  materias?: { id: number; materiaId: number; materia?: Materia }[];
}

// Tipos Personal
export const useTiposPersonal = () =>
  useQuery({ queryKey: ['tipos-personal'], queryFn: async () => (await apiClient.get<TipoPersonal[]>('/tipos-personal')).data, staleTime: 30 * 60 * 1000 });
export const useTipoPersonalCreate = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: { nombre: string }) => (await apiClient.post('/tipos-personal', d)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['tipos-personal'] }) }); };
export const useTipoPersonalUpdate = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async ({ id, ...d }: { nombre?: string } & { id: number }) => (await apiClient.put(`/tipos-personal/${id}`, d)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['tipos-personal'] }) }); };
export const useTipoPersonalDelete = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (id: number) => (await apiClient.delete(`/tipos-personal/${id}`)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['tipos-personal'] }) }); };

// Materias
export const useMaterias = () =>
  useQuery({ queryKey: ['materias'], queryFn: async () => (await apiClient.get<Materia[]>('/materias')).data, staleTime: 30 * 60 * 1000 });
export const useMateriaCreate = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: { nombre: string }) => (await apiClient.post('/materias', d)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['materias'] }) }); };
export const useMateriaUpdate = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async ({ id, ...d }: { nombre?: string } & { id: number }) => (await apiClient.put(`/materias/${id}`, d)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['materias'] }) }); };
export const useMateriaDelete = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (id: number) => (await apiClient.delete(`/materias/${id}`)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['materias'] }) }); };

// Personas
export const usePersonas = () =>
  useQuery({ queryKey: ['personas'], queryFn: async () => (await apiClient.get<Persona[]>('/personas')).data, staleTime: 60 * 1000 });
export const usePersonaUpdate = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async ({ id, ...d }: Partial<Persona> & { id: number; materiaIds?: number[] }) => (await apiClient.put(`/personas/${id}`, d)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['personas'] }) }); };
export const useSincronizar = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async () => (await apiClient.post('/personas/sincronizar')).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['personas'] }) }); };
