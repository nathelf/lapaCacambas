import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'backend',
    environment: 'node',
    globals: true,
    include: ['backend/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**'],
    // Não carregar env de produção nos testes
    env: {
      NODE_ENV: 'test',
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    },
  },
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, './backend/src'),
    },
  },
});
