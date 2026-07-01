import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export interface AsignacionData {
  id?: number;
  moduloHorarioId: number;
  diaSemana: number;
  materiaId: number;
  personaId: number;
}

export interface CursoAsignacionResponse {
  curso: any;
  modulos: { id: number; orden: number; etiqueta: string; horaInicio: string; horaFin: string; duracionMin: number }[];
  asignaciones: (AsignacionData & { id: number; materia?: { id: number; nombre: string }; persona?: { id: number; nombre: string } })[];
  materias: { id: number; nombre: string }[];
  docentes: { id: number; nombre: string; materias: { materia: { id: number; nombre: string } }[] }[];
  allAsignaciones: (AsignacionData & { id: number; cursoId: number })[];
}

export const useAsignacionesCurso = (cursoId: number) =>
  useQuery({
    queryKey: ['asignaciones', cursoId],
    queryFn: async () => (await apiClient.get<CursoAsignacionResponse>(`/asignaciones/curso/${cursoId}`)).data,
    enabled: !!cursoId,
  });

export const useSaveAsignaciones = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cursoId, asignaciones }: { cursoId: number; asignaciones: AsignacionData[] }) =>
      (await apiClient.put(`/asignaciones/curso/${cursoId}`, { asignaciones })).data,
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['asignaciones', vars.cursoId] }),
  });
};
