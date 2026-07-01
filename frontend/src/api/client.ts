import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export const normalizeApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (Array.isArray(data?.message)) {
      return data.message.join(', ');
    }
    if (typeof data?.message === 'string') {
      return data.message;
    }
    return `Error ${error.response?.status || ''}`;
  }
  if (error instanceof Error) return error.message;
  return 'Error desconocido';
};

export const buildImageUrl = (imagePath?: string | null) => {
  if (!imagePath) return undefined;
  if (imagePath.startsWith('http')) return imagePath;
  const origin = import.meta.env.VITE_API_BASE_URL
    ? new URL(import.meta.env.VITE_API_BASE_URL).origin
    : window.location.origin;
  return imagePath.startsWith('/') ? `${origin}${imagePath}` : `${origin}/${imagePath}`;
};
