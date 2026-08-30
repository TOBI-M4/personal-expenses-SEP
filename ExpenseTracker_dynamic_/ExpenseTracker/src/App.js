import React, { useState } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import "./App.css";
import Navbar from "./components/Navbar";
import AddExpense from "./Pages/AddExpense";
import Dashboard from "./Pages/Dashboard";
import EditExpense from "./Pages/EditExpense";
import ExpenseList from "./Pages/ExpenseList";
import Login from "./Pages/Login";
import Settings from "./Pages/Settings";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ExpenseProvider } from "./context/ExpenseContext";

function RootRoute() {
  const { isAuthenticated, loading } = useAuth();
  const [guestMode, setGuestMode] = useState(() => {
    try {
      return localStorage.getItem("expense-tracker:guest_mode") === "true";
    } catch {
      return false;
    }
  });

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // When someone first opens the website and is not logged in, show Login page
  if (!isAuthenticated && !guestMode) {
    return (
      <Login
        onContinueAsGuest={() => {
          try {
            localStorage.setItem("expense-tracker:guest_mode", "true");
          } catch (e) {}
          setGuestMode(true);
        }}
      />
    );
  }

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <ExpenseProvider>
        <BrowserRouter>
          <div className="App min-h-screen flex flex-col bg-gray-50 text-gray-900 transition-colors">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<RootRoute />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/expenses" element={<ExpenseList />} />
                <Route path="/add" element={<AddExpense />} />
                <Route path="/edit/:id" element={<EditExpense />} />
                <Route path="/login" element={<Login />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </ExpenseProvider>
    </AuthProvider>
  );
}

export default App;
