import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpenseForm from "../components/ExpenseForm";
import { useExpenses } from "../context/ExpenseContext";

function EditExpense() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { expenses, updateExpense } = useExpenses();

  const expense = expenses.find((item) => item.id === id);

  if (!expense) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-gray-500">Expense not found.</p>

        <button
          onClick={() => navigate("/expenses")}
          className="mt-4 text-brand-600 hover:underline"
        >
          ← Back to expenses
        </button>
      </div>
    );
  }

  const handleSubmit = (updatedExpense) => {
    updateExpense(id, updatedExpense);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Edit Expense
      </h1>

      <ExpenseForm
        initialValues={{
          amount: expense.amount,
          category: expense.category,
          description: expense.description,
          date: expense.date,
          paymentMethod: expense.paymentMethod || "Cash",
          note: expense.note || "",
        }}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      />
    </div>
  );
}

export default EditExpense;
