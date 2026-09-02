import { getSupabaseClient } from "../lib/supabaseClient";
import { authService } from "./authService";

function getEffectiveUserId(providedUserId) {
  if (providedUserId) return providedUserId;
  const currentUser = authService.getCurrentUser();
  return currentUser?.id || null;
}

export const settingsService = {
  /**
   * Fetch settings for a specific user from Supabase.
   */
  async getUserSettings(userId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const effectiveUserId = getEffectiveUserId(userId);
    if (!effectiveUserId) return null;

    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", effectiveUserId)
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
   * Update or insert settings for a user.
   */
  async updateUserSettings(settings, userId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const effectiveUserId = getEffectiveUserId(userId);
    if (!effectiveUserId) throw new Error("User must be signed in to save cloud settings.");

    const payload = {
      user_id: effectiveUserId,
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
