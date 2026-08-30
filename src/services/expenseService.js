import { getSupabaseClient } from "../lib/supabaseClient";

export const expenseService = {
  /**
   * Fetch all expenses for the current user from Supabase.
   */
  async getExpenses() {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Normalize field names to match frontend expectations (camelCase compatibility)
    return (data || []).map((item) => ({
      id: item.id,
      amount: Number(item.amount),
      category: item.category,
      category_id: item.category_id,
      description: item.description,
      date: item.date,
      paymentMethod: item.payment_method || "Cash",
      note: item.note || "",
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  },

  /**
   * Create a new expense.
   */
  async createExpense(expense) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const payload = {
      amount: Number(expense.amount),
      category: expense.category,
      category_id: expense.category_id || null,
      description: expense.description.trim(),
      date: expense.date,
      payment_method: expense.paymentMethod || "Cash",
      note: (expense.note || "").trim(),
    };

    if (expense.id && expense.id.length === 36 && expense.id.includes("-")) {
      payload.id = expense.id;
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      amount: Number(data.amount),
      category: data.category,
      category_id: data.category_id,
      description: data.description,
      date: data.date,
      paymentMethod: data.payment_method || "Cash",
      note: data.note || "",
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  /**
   * Update an existing expense by ID.
   */
  async updateExpense(id, updates) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const payload = {};
    if (updates.amount !== undefined) payload.amount = Number(updates.amount);
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.category_id !== undefined) payload.category_id = updates.category_id;
    if (updates.description !== undefined) payload.description = updates.description.trim();
    if (updates.date !== undefined) payload.date = updates.date;
    if (updates.paymentMethod !== undefined) payload.payment_method = updates.paymentMethod;
    if (updates.note !== undefined) payload.note = updates.note.trim();

    const { data, error } = await supabase
      .from("expenses")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      amount: Number(data.amount),
      category: data.category,
      category_id: data.category_id,
      description: data.description,
      date: data.date,
      paymentMethod: data.payment_method || "Cash",
      note: data.note || "",
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  /**
   * Delete an expense by ID.
   */
  async deleteExpense(id) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },

  /**
   * Delete all expenses for current user.
   */
  async clearAllExpenses() {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in to clear cloud expenses.");

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("user_id", user.id);

    if (error) throw error;
    return true;
  },

  /**
   * Import / bulk insert expenses.
   */
  async importExpenses(items) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const rows = items.map((item) => ({
      amount: Number(item.amount) || 0,
      category: item.category || "Other",
      category_id: item.category_id || null,
      description: (item.description || "").trim() || "Imported expense",
      date: item.date || new Date().toISOString().slice(0, 10),
      payment_method: item.paymentMethod || "Cash",
      note: (item.note || "").trim(),
    }));

    const { data, error } = await supabase
      .from("expenses")
      .insert(rows)
      .select();

    if (error) throw error;

    return (data || []).map((item) => ({
      id: item.id,
      amount: Number(item.amount),
      category: item.category,
      category_id: item.category_id,
      description: item.description,
      date: item.date,
      paymentMethod: item.payment_method || "Cash",
      note: item.note || "",
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  },

  /**
   * Realtime subscription for expenses.
   */
  subscribeToExpenses(onPayload) {
    const supabase = getSupabaseClient();
    if (!supabase) return { unsubscribe: () => {} };

    const channel = supabase
      .channel("public:expenses")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        (payload) => {
          onPayload(payload);
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      },
    };
  },
};
