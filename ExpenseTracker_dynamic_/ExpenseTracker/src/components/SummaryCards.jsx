import React from "react";
import { Wallet, Calendar, TrendingUp } from "lucide-react";
import { useExpenses } from "../context/ExpenseContext";

function SummaryCards() {
  const { expenses, totalSpent } = useExpenses();

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  const spentToday = expenses
    .filter((expense) => expense.date === today)
    .reduce((total, expense) => total + Number(expense.amount), 0);

  const spentThisMonth = expenses
    .filter((expense) => expense.date && expense.date.startsWith(currentMonth))
    .reduce((total, expense) => total + Number(expense.amount), 0);

  const cards = [
    {
      label: "Total Spent",
      value: totalSpent,
      icon: Wallet,
      iconStyle: "text-brand-600 bg-brand-50 dark:bg-brand-950/40",
    },
    {
      label: "This Month",
      value: spentThisMonth,
      icon: TrendingUp,
      iconStyle: "text-blue-600 bg-blue-50 dark:bg-blue-950/40",
    },
    {
      label: "Today",
      value: spentToday,
      icon: Calendar,
      iconStyle: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
    },
  ];

  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {cards.map(({ label, value, icon: Icon, iconStyle }) => (
        <div
          key={label}
          className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 flex items-center gap-4 shadow-sm"
        >
          <div className={`p-3 rounded-lg ${iconStyle}`}>
            <Icon className="w-5 h-5" />
          </div>

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              Rs. {value.toFixed(2)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SummaryCards;
