import React from "react";
import { NavLink, Link } from "react-router-dom";
import { Settings, Wallet, RefreshCw, LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useExpenses } from "../context/ExpenseContext";

function Navbar() {
  const { user, isAuthenticated, signOut } = useAuth();
  const { syncing, fetchCloudData } = useExpenses();

  const getLinkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? "text-brand-600 bg-brand-50 font-semibold"
        : "text-gray-600 hover:text-brand-600 hover:bg-gray-100"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-6">
          <NavLink to="/" className="flex items-center gap-2.5 font-bold text-lg text-gray-900">
            <Wallet className="w-6 h-6 text-brand-600" />
            <span>Expense Tracker</span>
          </NavLink>

          <div className="hidden sm:flex items-center gap-1">
            <NavLink to="/" end className={getLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/expenses" className={getLinkClass}>
              Expenses
            </NavLink>
            <NavLink to="/add" className={getLinkClass}>
              Add Expense
            </NavLink>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cloud Sync Status Indicator */}
          {isAuthenticated && (
            <button
              onClick={fetchCloudData}
              disabled={syncing}
              title={syncing ? "Syncing with Supabase..." : "Cloud connected. Click to refresh."}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">{syncing ? "Syncing..." : "Cloud Synced"}</span>
            </button>
          )}

          {/* Auth Action */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div
                title={`Logged in as ${user.email}`}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-medium"
              >
                <User className="w-3.5 h-3.5 text-brand-600" />
                <span className="max-w-[120px] truncate">{user.email}</span>
              </div>
              <button
                onClick={signOut}
                title="Sign out"
                className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </Link>
          )}

          {/* Settings link */}
          <NavLink
            to="/settings"
            className={getLinkClass}
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </NavLink>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
