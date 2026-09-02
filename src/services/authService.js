import { getSupabaseClient } from "../lib/supabaseClient";
import { hashPassword, verifyPassword } from "../utils/crypto";

const USER_STORAGE_KEY = "expense-tracker:current_user";
const AUTH_EVENT_NAME = "expense-tracker:auth_state_change";

function dispatchAuthChange(user) {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent(AUTH_EVENT_NAME, { detail: { user } })
      );
    } catch (e) {
      // Ignore if CustomEvent is restricted
    }
  }
}

export const authService = {
  /**
   * Get current authenticated user session from localStorage
   */
  getCurrentUser() {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.error("Error reading stored user:", err);
      return null;
    }
  },

  /**
   * Get active session object
   */
  async getSession() {
    const user = this.getCurrentUser();
    if (!user) return null;
    return { user, access_token: `custom_token_${user.id}` };
  },

  /**
   * Sign up with email & password into the custom `users` table
   */
  async signUp(email, password, name = "") {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured yet.");

    const normalizedEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!normalizedEmail || !cleanPassword) {
      throw new Error("Email and password are required.");
    }
    if (cleanPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    // 1. Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      // Table might not exist or schema issue
      if (checkError.code === "PGRST205" || checkError.message?.includes("schema cache")) {
        throw new Error(
          "The 'users' table does not exist in Supabase yet. Please execute schema.sql in your Supabase SQL Editor."
        );
      }
      throw checkError;
    }

    if (existingUser) {
      throw new Error(
        "An account with this email address already exists. Please sign in instead."
      );
    }

    // 2. Hash password
    const passwordHash = await hashPassword(cleanPassword);
    const displayName = name.trim() || normalizedEmail.split("@")[0];

    // 3. Insert new user into `users` table
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          email: normalizedEmail,
          password_hash: passwordHash,
          name: displayName,
        },
      ])
      .select("id, email, name, avatar_url, created_at")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        throw new Error("An account with this email address already exists.");
      }
      throw insertError;
    }

    // 4. Initialize default user_settings row for the new user
    try {
      await supabase.from("user_settings").insert([
        {
          user_id: newUser.id,
          monthly_budget: 0.0,
          theme: "light",
          currency: "Rs.",
        },
      ]);
    } catch (settingsErr) {
      console.warn("Could not auto-seed user_settings:", settingsErr);
    }

    // 5. Store active user in localStorage
    const sessionUser = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      avatar_url: newUser.avatar_url || "",
      created_at: newUser.created_at,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sessionUser));
      localStorage.removeItem("expense-tracker:guest_mode");
    }

    dispatchAuthChange(sessionUser);

    return {
      user: sessionUser,
      session: { user: sessionUser, access_token: `custom_token_${newUser.id}` },
    };
  },

  /**
   * Sign in with email & password against the custom `users` table
   */
  async signIn(email, password) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured yet.");

    const normalizedEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!normalizedEmail || !cleanPassword) {
      throw new Error("Email and password are required.");
    }

    // 1. Fetch user by email from `users` table
    const { data: foundUser, error: fetchError } = await supabase
      .from("users")
      .select("id, email, password_hash, name, avatar_url, created_at")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (fetchError) {
      if (fetchError.code === "PGRST205" || fetchError.message?.includes("schema cache")) {
        throw new Error(
          "The 'users' table does not exist in Supabase yet. Please execute schema.sql in your Supabase SQL Editor."
        );
      }
      throw fetchError;
    }

    if (!foundUser) {
      throw new Error("Invalid email or password. Please verify your credentials.");
    }

    // 2. Verify password hash
    const isValid = await verifyPassword(cleanPassword, foundUser.password_hash);
    if (!isValid) {
      throw new Error("Invalid email or password. Please verify your credentials.");
    }

    // 3. Store active session
    const sessionUser = {
      id: foundUser.id,
      email: foundUser.email,
      name: foundUser.name,
      avatar_url: foundUser.avatar_url || "",
      created_at: foundUser.created_at,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sessionUser));
      localStorage.removeItem("expense-tracker:guest_mode");
    }

    dispatchAuthChange(sessionUser);

    return {
      user: sessionUser,
      session: { user: sessionUser, access_token: `custom_token_${foundUser.id}` },
    };
  },

  /**
   * Sign out current user
   */
  async signOut() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
    dispatchAuthChange(null);
  },

  /**
   * Listen to auth state changes (sign in, sign out)
   */
  onAuthStateChange(callback) {
    if (typeof window === "undefined") {
      return { unsubscribe: () => {} };
    }

    const handleCustomEvent = (event) => {
      const user = event.detail?.user ?? null;
      const session = user ? { user, access_token: `custom_token_${user.id}` } : null;
      callback("USER_UPDATED", user, session);
    };

    const handleStorageEvent = (event) => {
      if (event.key === USER_STORAGE_KEY) {
        const user = event.newValue ? JSON.parse(event.newValue) : null;
        const session = user ? { user, access_token: `custom_token_${user.id}` } : null;
        callback("STORAGE_CHANGED", user, session);
      }
    };

    window.addEventListener(AUTH_EVENT_NAME, handleCustomEvent);
    window.addEventListener("storage", handleStorageEvent);

    return {
      unsubscribe: () => {
        window.removeEventListener(AUTH_EVENT_NAME, handleCustomEvent);
        window.removeEventListener("storage", handleStorageEvent);
      },
    };
  },
};
