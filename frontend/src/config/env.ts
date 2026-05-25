export const ENV = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'ResearchMind',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  APP_DESCRIPTION: import.meta.env.VITE_APP_DESCRIPTION || '',

  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  API_TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,

  JWT_SECRET: import.meta.env.VITE_JWT_SECRET || '',
  TOKEN_EXPIRY: import.meta.env.VITE_TOKEN_EXPIRY || '7d',

  ENABLE_STREAMING: import.meta.env.VITE_ENABLE_STREAMING === 'true',
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_MOCK_API: import.meta.env.VITE_ENABLE_MOCK_API === 'true',

  APP_URL: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
} as const

export default ENV
