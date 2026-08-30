import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Pencil, Search, Trash2, Upload, X } from "lucide-react";
import { useExpenses } from "../context/ExpenseContext";
import { CATEGORIES as DEFAULT_CATEGORIES } from "../utils/categories";

function ExpenseList() {
  const { expenses, deleteExpense, clearExpenses, importExpenses, categories, categoryColors } = useExpenses();
  const activeCategories = categories && categories.length ? categories : DEFAULT_CATEGORIES;

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [paymentMethod, setPaymentMethod] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const fileInput = useRef(null);

  const filteredExpenses = useMemo(() => {
    const search = query.trim().toLowerCase();
    return [...expenses]
      .filter((expense) => !search || `${expense.description} ${expense.category} ${expense.note || ""}`.toLowerCase().includes(search))
      .filter((expense) => category === "All" || expense.category === category)
      .filter((expense) => paymentMethod === "All" || expense.paymentMethod === paymentMethod)
      .filter((expense) => !fromDate || expense.date >= fromDate)
      .filter((expense) => !toDate || expense.date <= toDate)
      .sort((a, b) => {
        if (sortBy === "amount-desc") return Number(b.amount) - Number(a.amount);
        if (sortBy === "amount-asc") return Number(a.amount) - Number(b.amount);
        if (sortBy === "date-asc") return (a.date || "").localeCompare(b.date || "");
        return (b.date || "").localeCompare(a.date || "");
      });
  }, [expenses, query, category, paymentMethod, fromDate, toDate, sortBy]);

  const clearFilters = () => { setQuery(""); setCategory("All"); setPaymentMethod("All"); setFromDate(""); setToDate(""); };

  const exportCsv = () => {
    const headers = ["Date", "Category", "Description", "Amount", "Payment Method", "Note"];
    const rows = filteredExpenses.map((e) => [e.date, e.category, e.description, e.amount, e.paymentMethod || "", e.note || ""]);
    const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "expense-report.csv"; link.click(); URL.revokeObjectURL(url);
  };

  const importJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      await importExpenses(data);
      alert("Expenses imported successfully.");
    } catch { alert("That file is not valid expense data."); }
    event.target.value = "";
  };

  const handleDelete = (id) => { if (window.confirm("Delete this expense?")) deleteExpense(id); };
  const handleClear = () => { if (window.confirm("Delete every saved expense? This cannot be undone.")) clearExpenses(); };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Expenses</h1><p className="text-sm text-gray-500 mt-1">{filteredExpenses.length} of {expenses.length} records shown</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} className="action-button"><Download className="w-4 h-4" /> Export CSV</button>
          <button onClick={() => fileInput.current?.click()} className="action-button"><Upload className="w-4 h-4" /> Import JSON</button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={importJson} />
          <button onClick={handleClear} className="action-button text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"><Trash2 className="w-4 h-4" /> Clear all</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2"><Search className="icon-left" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search description, category, note..." className="input pl-9" /></div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input"><option>All</option>{activeCategories.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input"><option>All</option>{["Cash", "Card", "Bank Transfer", "Digital Wallet", "Other"].map((item) => <option key={item}>{item}</option>)}</select>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input" title="From date" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input" title="To date" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input max-w-xs"><option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="amount-desc">Highest amount</option><option value="amount-asc">Lowest amount</option></select>
          <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-brand-600 inline-flex items-center gap-1"><X className="w-4 h-4" /> Clear filters</button>
        </div>
      </div>

      {filteredExpenses.length === 0 ? <div className="text-center py-16 text-gray-500">No expenses match these filters.</div> : <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-left"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{filteredExpenses.map((expense) => { const color = (categoryColors && categoryColors[expense.category]) || "#94a3b8"; return <tr key={expense.id} className="border-t border-gray-100 dark:border-slate-800"><td className="px-4 py-3 text-gray-600 dark:text-gray-300">{expense.date}</td><td className="px-4 py-3"><span className="badge" style={{ backgroundColor: `${color}20`, color }}>{expense.category}</span></td><td className="px-4 py-3"><div className="font-medium text-gray-900 dark:text-white">{expense.description || "—"}</div>{expense.note && <div className="text-xs text-gray-500 mt-0.5">{expense.note}</div>}</td><td className="px-4 py-3 text-gray-600 dark:text-gray-300">{expense.paymentMethod || "Cash"}</td><td className="px-4 py-3 text-right font-semibold text-expense-600">-Rs. {Number(expense.amount).toFixed(2)}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><Link to={`/edit/${expense.id}`} className="icon-button"><Pencil className="w-4 h-4" /></Link><button onClick={() => handleDelete(expense.id)} className="icon-button hover:text-red-600"><Trash2 className="w-4 h-4" /></button></div></td></tr>; })}</tbody></table></div>}
    </div>
  );
}
export default ExpenseList;
