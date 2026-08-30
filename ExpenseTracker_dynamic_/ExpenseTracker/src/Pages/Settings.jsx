import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun, Download, Upload, Trash2, Plus, Tag, User, LogIn, LogOut, CheckCircle2 } from "lucide-react";
import { useExpenses } from "../context/ExpenseContext";
import { useAuth } from "../context/AuthContext";

function Settings() {
  const {
    expenses,
    settings,
    updateSettings,
    importExpenses,
    categoriesList,
    addCategory,
    deleteCategory,
  } = useExpenses();
  const { user, isAuthenticated, signOut } = useAuth();

  const fileInput = useRef(null);

  // New Category State
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#3b82f6");
  const [catError, setCatError] = useState("");

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setCatError("Category name is required.");
      return;
    }
    setCatError("");
    await addCategory({ name: newCatName.trim(), color: newCatColor });
    setNewCatName("");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(expenses, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "expense-tracker-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importExpenses(JSON.parse(await file.text()));
      alert("Backup restored successfully.");
    } catch {
      alert("Invalid backup file.");
    }
    event.target.value = "";
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Personalize your tracker preferences, account status, and custom categories.
      </p>

      {/* Account Status */}
      <section className="panel mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="section-title mb-0">Account & Cloud Sync</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isAuthenticated ? `Signed in as ${user.email}` : "Currently using local offline storage"}
              </p>
            </div>
          </div>

          {isAuthenticated ? (
            <button
              onClick={signOut}
              className="action-button text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          ) : (
            <Link
              to="/login"
              className="action-button bg-brand-600 hover:bg-brand-700 text-white border-transparent"
            >
              <LogIn className="w-4 h-4" /> Sign In / Sign Up
            </Link>
          )}
        </div>

        {isAuthenticated && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Your expenses are automatically synced with your Supabase cloud account.</span>
          </div>
        )}
      </section>

      {/* Monthly Budget */}
      <section className="panel mb-6">
        <h2 className="section-title">Monthly budget</h2>
        <p className="text-sm text-gray-500 mb-4">
          Set a spending limit for each month. The dashboard will track your remaining balance.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-500">Rs.</span>
          <input
            type="number"
            min="0"
            step="100"
            value={settings.monthlyBudget || ""}
            onChange={(e) => updateSettings({ monthlyBudget: Number(e.target.value) || 0 })}
            placeholder="e.g. 30000"
            className="input max-w-sm"
          />
        </div>
      </section>

      {/* Dynamic Categories */}
      <section className="panel mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-5 h-5 text-brand-600" />
          <h2 className="section-title mb-0">Expense Categories</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Manage default and custom categories with personalized colors.
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          {categoriesList.map((cat) => {
            const name = typeof cat === "string" ? cat : cat.name;
            const color = (typeof cat === "object" && cat.color) || "#6b7280";
            const isDefault = typeof cat === "object" ? cat.is_default : true;
            return (
              <div
                key={name}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-sm"
              >
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-medium text-gray-800">{name}</span>
                {!isDefault && (
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    title="Delete custom category"
                    className="text-gray-400 hover:text-red-500 ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <form onSubmit={handleAddCategory} className="border-t border-gray-100 pt-4">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Add Custom Category
          </h3>
          {catError && <p className="text-xs text-red-600 mb-2">{catError}</p>}
          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Travel, Gym, Subscriptions..."
              className="input flex-1"
              maxLength={30}
            />
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                className="w-10 h-10 p-0.5 rounded-lg border border-gray-300 cursor-pointer bg-transparent"
                title="Choose category color"
              />
              <button
                type="submit"
                className="action-button bg-brand-600 hover:bg-brand-700 text-white border-transparent whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Add Category
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Appearance */}
      <section className="panel mb-6">
        <h2 className="section-title">Appearance</h2>
        <div className="flex gap-3">
          <button
            onClick={() => updateSettings({ theme: "light" })}
            className={`setting-button ${settings.theme === "light" ? "selected" : ""}`}
          >
            <Sun className="w-4 h-4" /> Light
          </button>
          <button
            onClick={() => updateSettings({ theme: "dark" })}
            className={`setting-button ${settings.theme === "dark" ? "selected" : ""}`}
          >
            <Moon className="w-4 h-4" /> Dark
          </button>
        </div>
      </section>

      {/* Data Backup */}
      <section className="panel">
        <h2 className="section-title">Data backup & migration</h2>
        <p className="text-sm text-gray-500 mb-4">
          Export a JSON backup of your current expenses or restore an existing backup.
        </p>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportData} className="action-button">
            <Download className="w-4 h-4" /> Export backup
          </button>
          <button onClick={() => fileInput.current?.click()} className="action-button">
            <Upload className="w-4 h-4" /> Restore backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={importData}
          />
        </div>
      </section>
    </div>
  );
}

export default Settings;
