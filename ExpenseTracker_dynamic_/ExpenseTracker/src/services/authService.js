import { getSupabaseClient } from "../lib/supabaseClient";

export const authService = {
  /**
   * Get current authenticated user session
   */
  async getCurrentUser() {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        // Session might be missing or expired
        return null;
      }
      return user;
    } catch (err) {
      console.error("Error fetching current user:", err);
      return null;
    }
  },

  /**
   * Get active session
   */
  async getSession() {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) return null;
      return session;
    } catch (err) {
      return null;
    }
  },

  /**
   * Sign up with email & password
   */
  async signUp(email, password) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured yet.");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign in with email & password
   */
  async signIn(email, password) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured yet.");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign out current user
   */
  async signOut() {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Listen to auth state changes (sign in, sign out, token refresh)
   */
  onAuthStateChange(callback) {
    const supabase = getSupabaseClient();
    if (!supabase) return { unsubscribe: () => {} };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        callback(event, session?.user ?? null, session);
      }
    );

    return subscription;
  },
};
