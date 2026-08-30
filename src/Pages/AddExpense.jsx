import React from "react";
import ExpenseForm from "../components/ExpenseForm";
import { useExpenses } from "../context/ExpenseContext";

function AddExpense() {
  const { addExpense } = useExpenses();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Add Expense
      </h1>

      <ExpenseForm onSubmit={addExpense} submitLabel="Add Expense" />
    </div>
  );
}

export default AddExpense;
