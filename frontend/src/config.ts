// @ts-ignore
export const API_BASE_URL = (import.meta as any).env.VITE_API_URL
  ? `${(import.meta as any).env.VITE_API_URL}/api/v1`
  : 'http://localhost:8080/api/v1';