import { getSupabaseClient } from "../lib/supabaseClient";
import { authService } from "./authService";

function getEffectiveUserId(providedUserId) {
  if (providedUserId) return providedUserId;
  const currentUser = authService.getCurrentUser();
  return currentUser?.id || null;
}

export const categoryService = {
  /**
   * Fetch all categories (system defaults + user-specific custom categories).
   */
  async getCategories(userId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const effectiveUserId = getEffectiveUserId(userId);
    let query = supabase
      .from("categories")
      .select("*")
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });

    if (effectiveUserId) {
      query = query.or(`user_id.is.null,user_id.eq.${effectiveUserId}`);
    } else {
      query = query.is("user_id", null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Create a new custom category for the logged-in user.
   */
  async createCategory({ name, color = "#6b7280", icon = "Tag" }, userId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const effectiveUserId = getEffectiveUserId(userId);
    if (!effectiveUserId) {
      throw new Error("You must be signed in to create custom categories.");
    }

    const { data, error } = await supabase
      .from("categories")
      .insert([
        {
          user_id: effectiveUserId,
          name: name.trim(),
          color: color.trim(),
          icon: icon.trim(),
          is_default: false,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a custom category (cannot delete system default categories).
   */
  async deleteCategory(id, userId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const effectiveUserId = getEffectiveUserId(userId);
    let query = supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("is_default", false);

    if (effectiveUserId) {
      query = query.eq("user_id", effectiveUserId);
    }

    const { error } = await query;
    if (error) throw error;
    return true;
  },
};
