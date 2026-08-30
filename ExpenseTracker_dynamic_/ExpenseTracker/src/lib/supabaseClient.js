import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL?.trim() || "";
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY?.trim() || "";

/**
 * Checks if Supabase credentials are validly provided via environment variables.
 */
export function isSupabaseConfigured() {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    supabaseUrl.startsWith("http") &&
    !supabaseUrl.includes("your-project-id") &&
    supabaseAnonKey.length > 20
  );
}

let supabaseInstance = null;

/**
 * Returns the centralized Supabase client instance.
 */
export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err);
      return null;
    }
  }

  return supabaseInstance;
}

export const supabase = getSupabaseClient();
