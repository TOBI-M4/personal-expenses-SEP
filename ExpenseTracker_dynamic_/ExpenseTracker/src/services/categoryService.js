import { getSupabaseClient } from "../lib/supabaseClient";

export const categoryService = {
  /**
   * Fetch all categories (system defaults + user-specific custom categories).
   */
  async getCategories() {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Create a new custom category for the logged-in user.
   */
  async createCategory({ name, color = "#6b7280", icon = "Tag" }) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be signed in to create custom categories.");

    const { data, error } = await supabase
      .from("categories")
      .insert([
        {
          user_id: user.id,
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
  async deleteCategory(id) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("is_default", false);

    if (error) throw error;
    return true;
  },
};
