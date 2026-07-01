import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

export interface DahuaUser {
  recNo: string;
  userId: string;
  cardName: string;
  cardNo: string;
  cardStatus: string;
  cardType: string;
  citizenIdNo: string;
  password: string;
  userType: string;
  isValid: string;
  firstEnter: string;
  handicap: string;
  doors: string[];
  timeSections: string[];
  useTime: string;
  validDateStart: string;
  validDateEnd: string;
  vtoPosition: string;
  raw: Record<string, string>;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: number;
    username: string;
    role: string;
    personaId: number | null;
    persona: { id: number; nombre: string } | null;
  };
}

export interface Settings {
  appName: string;
  logoUrl: string;
  accentColor: string;
  clubName: string;
}

export interface SystemUser {
  username: string;
  role: string;
}

export const useDahuaUsers = () =>
  useQuery({
    queryKey: ['dahua-users'],
    queryFn: async () => {
      const { data } = await apiClient.get<DahuaUser[]>('/dahua/users');
      return data;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });

export const useSettings = () =>
  useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await apiClient.get<Settings>('/settings');
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

export const useSystemUsers = () =>
  useQuery({
    queryKey: ['system-users'],
    queryFn: async () => {
      return [{ username: 'admin', role: 'ADMIN' }] as SystemUser[];
    },
    staleTime: Infinity,
  });
