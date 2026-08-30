import { getSupabaseClient } from "../lib/supabaseClient";

export const settingsService = {
  /**
   * Fetch settings for current user from Supabase.
   */
  async getUserSettings() {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      monthlyBudget: Number(data.monthly_budget) || 0,
      theme: data.theme || "light",
      currency: data.currency || "Rs.",
    };
  },

  /**
   * Update or insert settings for current user.
   */
  async updateUserSettings(settings) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be signed in to save cloud settings.");

    const payload = {
      user_id: user.id,
      monthly_budget: Number(settings.monthlyBudget) || 0,
      theme: settings.theme || "light",
      currency: settings.currency || "Rs.",
    };

    const { data, error } = await supabase
      .from("user_settings")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) throw error;

    return {
      monthlyBudget: Number(data.monthly_budget) || 0,
      theme: data.theme || "light",
      currency: data.currency || "Rs.",
    };
  },
};
