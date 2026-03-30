import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const fallbackUrl = 'http://127.0.0.1:54321';
const fallbackAnonKey = 'local-dev-anon-key';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const getSupabaseConfigError = () => {
  if (!supabaseUrl) {
    return 'Missing NEXT_PUBLIC_SUPABASE_URL in environment variables.';
  }

  if (!supabaseAnonKey) {
    return 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables.';
  }

  return null;
};

// ✅ Singleton pattern to prevent multiple client instances
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      supabaseUrl || fallbackUrl,
      supabaseAnonKey || fallbackAnonKey
    );
  }
  return supabaseInstance;
})();

// Para operaciones del servidor que necesitan más permisos
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

export const supabaseAdmin = () => {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin can only be used on the server.');
  }

  if (!supabaseAdminInstance) {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL for server admin client.');
    }

    supabaseAdminInstance = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );
  }

  return supabaseAdminInstance;
};
