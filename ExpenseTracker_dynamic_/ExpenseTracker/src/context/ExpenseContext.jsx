import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { expenseService } from "../services/expenseService";
import { categoryService } from "../services/categoryService";
import { settingsService } from "../services/settingsService";
import { CATEGORIES as DEFAULT_CATEGORIES, CATEGORY_COLORS as DEFAULT_CATEGORY_COLORS } from "../utils/categories";

const ExpenseContext = createContext(null);
const STORAGE_KEY = "expense-tracker:expenses";
const SETTINGS_KEY = "expense-tracker:settings";
const CATEGORIES_KEY = "expense-tracker:categories";

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function loadFromStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error(`Failed to load ${key}:`, error);
    return fallback;
  }
}

function loadInitialExpenses() {
  const saved = loadFromStorage(STORAGE_KEY, null);
  if (Array.isArray(saved)) return saved;

  const today = getToday();
  return [
    { id: createId(), amount: 12.5, category: "Food", description: "Lunch", date: today, paymentMethod: "Cash", note: "" },
    { id: createId(), amount: 40, category: "Transportation", description: "Bus pass top-up", date: today, paymentMethod: "Card", note: "" },
  ];
}

const DEFAULT_SETTINGS = { monthlyBudget: 0, theme: "light", currency: "Rs." };

export function ExpenseProvider({ children }) {
  const { isConfigured, isAuthenticated } = useAuth();

  const [expenses, setExpenses] = useState(loadInitialExpenses);
  const [settings, setSettings] = useState(() =>
    loadFromStorage(SETTINGS_KEY, DEFAULT_SETTINGS)
  );
  const [categoriesList, setCategoriesList] = useState(() =>
    loadFromStorage(CATEGORIES_KEY, DEFAULT_CATEGORIES.map((c) => ({
      name: c,
      color: DEFAULT_CATEGORY_COLORS[c] || "#6b7280",
      is_default: true,
    })))
  );
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // Apply Theme
  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categoriesList));
  }, [categoriesList]);

  // Fetch from Supabase when user authenticates or config changes
  const fetchCloudData = useCallback(async () => {
    if (!isAuthenticated || !isConfigured) return;

    setSyncing(true);
    setSyncError(null);

    try {
      // 1. Fetch Expenses
      const cloudExpenses = await expenseService.getExpenses();
      setExpenses(cloudExpenses);

      // 2. Fetch Settings
      const cloudSettings = await settingsService.getUserSettings();
      if (cloudSettings) {
        setSettings((prev) => ({ ...prev, ...cloudSettings }));
      }

      // 3. Fetch Categories
      try {
        const cloudCats = await categoryService.getCategories();
        if (cloudCats && cloudCats.length > 0) {
          setCategoriesList(cloudCats);
        }
      } catch (catErr) {
        console.warn("Categories table not queried:", catErr);
      }
    } catch (err) {
      console.error("Cloud sync error:", err);
      setSyncError(err.message || "Failed to sync with Supabase");
    } finally {
      setSyncing(false);
    }
  }, [isAuthenticated, isConfigured]);

  useEffect(() => {
    fetchCloudData();
  }, [fetchCloudData]);

  // Realtime subscription for Supabase expenses
  useEffect(() => {
    if (!isAuthenticated || !isConfigured) return;

    const subscription = expenseService.subscribeToExpenses((payload) => {
      if (payload.eventType === "INSERT") {
        setExpenses((curr) => {
          if (curr.some((e) => e.id === payload.new.id)) return curr;
          return [
            {
              id: payload.new.id,
              amount: Number(payload.new.amount),
              category: payload.new.category,
              category_id: payload.new.category_id,
              description: payload.new.description,
              date: payload.new.date,
              paymentMethod: payload.new.payment_method || "Cash",
              note: payload.new.note || "",
              created_at: payload.new.created_at,
              updated_at: payload.new.updated_at,
            },
            ...curr,
          ];
        });
      } else if (payload.eventType === "UPDATE") {
        setExpenses((curr) =>
          curr.map((e) =>
            e.id === payload.new.id
              ? {
                  ...e,
                  amount: Number(payload.new.amount),
                  category: payload.new.category,
                  category_id: payload.new.category_id,
                  description: payload.new.description,
                  date: payload.new.date,
                  paymentMethod: payload.new.payment_method || "Cash",
                  note: payload.new.note || "",
                  updated_at: payload.new.updated_at,
                }
              : e
          )
        );
      } else if (payload.eventType === "DELETE") {
        setExpenses((curr) => curr.filter((e) => e.id !== payload.old.id));
      }
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [isAuthenticated, isConfigured]);

  // Add Expense
  const addExpense = async (expenseData) => {
    if (isAuthenticated && isConfigured) {
      try {
        const created = await expenseService.createExpense(expenseData);
        setExpenses((current) => [created, ...current.filter((e) => e.id !== created.id)]);
        return created;
      } catch (err) {
        console.error("Failed to create expense in Supabase:", err);
        // Fallback to local
      }
    }

    const localNew = { id: createId(), ...expenseData };
    setExpenses((current) => [localNew, ...current]);
    return localNew;
  };

  // Update Expense
  const updateExpense = async (id, updatedExpense) => {
    if (isAuthenticated && isConfigured) {
      try {
        const saved = await expenseService.updateExpense(id, updatedExpense);
        setExpenses((current) =>
          current.map((expense) => (expense.id === id ? saved : expense))
        );
        return saved;
      } catch (err) {
        console.error("Failed to update in Supabase:", err);
      }
    }

    setExpenses((current) =>
      current.map((expense) =>
        expense.id === id ? { ...expense, ...updatedExpense } : expense
      )
    );
  };

  // Delete Expense
  const deleteExpense = async (id) => {
    if (isAuthenticated && isConfigured) {
      try {
        await expenseService.deleteExpense(id);
      } catch (err) {
        console.error("Failed to delete from Supabase:", err);
      }
    }

    setExpenses((current) => current.filter((expense) => expense.id !== id));
  };

  // Clear all expenses
  const clearExpenses = async () => {
    if (isAuthenticated && isConfigured) {
      try {
        await expenseService.clearAllExpenses();
      } catch (err) {
        console.error("Failed to clear cloud expenses:", err);
      }
    }

    setExpenses([]);
  };

  // Import expenses
  const importExpenses = async (items) => {
    if (!Array.isArray(items)) throw new Error("Invalid expense data.");
    const cleaned = items.map((item) => ({
      id: item.id || createId(),
      amount: Number(item.amount) || 0,
      category: item.category || "Other",
      category_id: item.category_id || null,
      description: item.description || "",
      date: item.date || getToday(),
      paymentMethod: item.paymentMethod || "Cash",
      note: item.note || "",
    }));

    if (isAuthenticated && isConfigured) {
      try {
        const imported = await expenseService.importExpenses(cleaned);
        setExpenses(imported);
        return;
      } catch (err) {
        console.error("Failed to import to Supabase:", err);
      }
    }

    setExpenses(cleaned);
  };

  // Update settings
  const updateSettings = async (changes) => {
    const updated = { ...settings, ...changes };
    setSettings(updated);

    if (isAuthenticated && isConfigured) {
      try {
        await settingsService.updateUserSettings(updated);
      } catch (err) {
        console.error("Failed to save settings to Supabase:", err);
      }
    }
  };

  // Add category
  const addCategory = async (catData) => {
    if (isAuthenticated && isConfigured) {
      try {
        const created = await categoryService.createCategory(catData);
        setCategoriesList((curr) => [...curr, created]);
        return created;
      } catch (err) {
        console.error("Failed to add category to Supabase:", err);
      }
    }

    const localCat = { id: createId(), ...catData, is_default: false };
    setCategoriesList((curr) => [...curr, localCat]);
    return localCat;
  };

  // Delete category
  const deleteCategory = async (id) => {
    if (isAuthenticated && isConfigured) {
      try {
        await categoryService.deleteCategory(id);
      } catch (err) {
        console.error("Failed to delete category from Supabase:", err);
      }
    }

    setCategoriesList((curr) => curr.filter((c) => c.id !== id));
  };

  // Derived category list & color map
  const categories = useMemo(() => {
    return categoriesList.map((c) => (typeof c === "string" ? c : c.name));
  }, [categoriesList]);

  const categoryColors = useMemo(() => {
    const map = { ...DEFAULT_CATEGORY_COLORS };
    categoriesList.forEach((c) => {
      if (typeof c === "object" && c.name && c.color) {
        map[c.name] = c.color;
      }
    });
    return map;
  }, [categoriesList]);

  const totalSpent = useMemo(
    () => expenses.reduce((total, expense) => total + Number(expense.amount), 0),
    [expenses]
  );

  const totalsByCategory = useMemo(
    () =>
      expenses.reduce((totals, expense) => {
        const amount = Number(expense.amount);
        totals[expense.category] = (totals[expense.category] || 0) + amount;
        return totals;
      }, {}),
    [expenses]
  );

  const currentMonth = getToday().slice(0, 7);
  const spentThisMonth = useMemo(
    () =>
      expenses
        .filter((expense) => expense.date?.startsWith(currentMonth))
        .reduce((total, expense) => total + Number(expense.amount), 0),
    [expenses, currentMonth]
  );

  const budgetRemaining = Math.max(Number(settings.monthlyBudget) - spentThisMonth, 0);
  const budgetPercent = settings.monthlyBudget
    ? Math.min((spentThisMonth / Number(settings.monthlyBudget)) * 100, 100)
    : 0;

  const contextValue = {
    expenses,
    settings,
    categories,
    categoriesList,
    categoryColors,
    syncing,
    syncError,
    addExpense,
    updateExpense,
    deleteExpense,
    clearExpenses,
    importExpenses,
    updateSettings,
    addCategory,
    deleteCategory,
    fetchCloudData,
    totalSpent,
    totalsByCategory,
    spentThisMonth,
    budgetRemaining,
    budgetPercent,
  };

  return <ExpenseContext.Provider value={contextValue}>{children}</ExpenseContext.Provider>;
}

export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (!context) throw new Error("useExpenses must be used within an ExpenseProvider");
  return context;
}
