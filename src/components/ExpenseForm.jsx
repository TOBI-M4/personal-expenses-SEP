import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useExpenses } from "../context/ExpenseContext";
import { CATEGORIES as DEFAULT_CATEGORIES } from "../utils/categories";

const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer", "Digital Wallet", "Other"];

function ExpenseForm({ initialValues, onSubmit, submitLabel = "Add Expense" }) {
  const navigate = useNavigate();
  const { categories } = useExpenses();
  const activeCategories = categories && categories.length ? categories : DEFAULT_CATEGORIES;

  const [form, setForm] = useState(
    initialValues || {
      amount: "",
      category: activeCategories[0] || "Food",
      description: "",
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: "Cash",
      note: "",
    }
  );
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return setError("Enter an amount greater than 0.");
    if (!form.date) return setError("Please select a date.");
    if (!form.description.trim()) return setError("Add a short description so the expense is easy to recognize.");

    setError("");
    onSubmit({
      ...form,
      amount: Number(form.amount),
      description: form.description.trim(),
      note: (form.note || "").trim(),
    });
    navigate("/expenses");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-6 max-w-2xl shadow-sm">
      {error && <div className="mb-5 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-lg px-3 py-2">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Amount (Rs.)">
          <input required min="0.01" step="0.01" type="number" name="amount" value={form.amount} onChange={handleChange} placeholder="0.00" className="input" />
        </Field>
        <Field label="Date">
          <input required type="date" name="date" value={form.date} onChange={handleChange} className="input" />
        </Field>
        <Field label="Category">
          <select name="category" value={form.category} onChange={handleChange} className="input">
            {activeCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Payment method">
          <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange} className="input">
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Description">
        <input required type="text" name="description" maxLength="80" value={form.description} onChange={handleChange} placeholder="e.g. Grocery shopping" className="input" />
      </Field>
      <Field label="Optional note">
        <textarea name="note" maxLength="180" value={form.note} onChange={handleChange} placeholder="Add a note, receipt reference, or reminder..." rows="3" className="input resize-none" />
      </Field>
      <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-lg transition-colors">{submitLabel}</button>
    </form>
  );
}

function Field({ label, children }) {
  return <label className="block mb-4"><span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{label}</span>{children}</label>;
}

export default ExpenseForm;
