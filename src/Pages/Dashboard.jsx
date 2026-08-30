import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Lightbulb, Plus, Target, Wallet } from "lucide-react";
import SummaryCards from "../components/SummaryCards";
import CategoryChart from "../components/CategoryChart";
import { useExpenses } from "../context/ExpenseContext";

function Dashboard() {
  const { expenses, settings, spentThisMonth, budgetRemaining, budgetPercent } = useExpenses();
  const [period, setPeriod] = useState("month");
  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7);
  const filtered = expenses.filter((expense) => period === "all" || expense.date?.startsWith(currentMonth));
  const recentExpenses = [...filtered].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);
  const topCategory = useMemo(() => {
    const counts = filtered.reduce((totals, expense) => {
      totals[expense.category] = (totals[expense.category] || 0) + Number(expense.amount);
      return totals;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  }, [filtered]);
  const largestExpense = [...filtered].sort((a, b) => Number(b.amount) - Number(a.amount))[0];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">A quick view of your spending habits.</p>
        </div>
        <div className="flex gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input">
            <option value="month">This month</option>
            <option value="all">All time</option>
          </select>
          <Link to="/add" className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Expense
          </Link>
        </div>
      </div>

      <SummaryCards />

      {settings.monthlyBudget > 0 && (
        <div className="panel mt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
              <Target className="w-5 h-5 text-brand-600" /> Monthly budget
            </div>
            <span className="text-sm text-gray-500">Rs. {budgetRemaining.toFixed(2)} left</span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${budgetPercent >= 90 ? "bg-red-500" : "bg-brand-600"}`}
              style={{ width: `${budgetPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Rs. {spentThisMonth.toFixed(2)} spent</span>
            <span>{budgetPercent.toFixed(0)}%</span>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <CategoryChart />
        </div>
        <div className="panel">
          <h2 className="section-title">Smart insights</h2>
          <div className="space-y-4">
            <Insight
              icon={Lightbulb}
              label="Top category"
              value={topCategory ? `${topCategory[0]} · Rs. ${topCategory[1].toFixed(2)}` : "No data yet"}
            />
            <Insight
              icon={Wallet}
              label="Largest expense"
              value={largestExpense ? `${largestExpense.description} · Rs. ${Number(largestExpense.amount).toFixed(2)}` : "No data yet"}
            />
          </div>
        </div>
      </div>

      <div className="panel mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="section-title mb-0">Recent expenses</h2>
          <Link to="/expenses" className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1">
            View all <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
        {recentExpenses.length ? (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {recentExpenses.map((expense) => (
              <div key={expense.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{expense.description}</p>
                  <p className="text-xs text-gray-500">
                    {expense.category} · {expense.paymentMethod || "Cash"} · {expense.date}
                  </p>
                </div>
                <span className="font-semibold text-expense-600">-Rs. {Number(expense.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No expenses recorded for this period.</p>
        )}
      </div>
    </div>
  );
}

function Insight({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-600">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default Dashboard;
