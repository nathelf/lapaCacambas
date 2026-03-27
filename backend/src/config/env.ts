import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.BACKEND_PORT || 3333),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  bancoWebhookSecret: process.env.BANCO_WEBHOOK_SECRET || '',
};

