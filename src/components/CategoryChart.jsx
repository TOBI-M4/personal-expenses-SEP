import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useExpenses } from "../context/ExpenseContext";
import { CATEGORY_COLORS as DEFAULT_CATEGORY_COLORS } from "../utils/categories";

function CategoryChart() {
  const { totalsByCategory, categoryColors } = useExpenses();
  const colorsMap = categoryColors || DEFAULT_CATEGORY_COLORS;

  const chartData = Object.entries(totalsByCategory).map(
    ([category, amount]) => ({
      name: category,
      value: amount,
    })
  );

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 text-center text-gray-500">
        No expenses yet. Add one to see the breakdown.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
        Spending by Category
      </h2>

      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={colorsMap[entry.name] || "#94a3b8"}
              />
            ))}
          </Pie>

          <Tooltip
            formatter={(value) => `Rs. ${Number(value).toFixed(2)}`}
            contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#fff", borderRadius: "8px" }}
            itemStyle={{ color: "#fff" }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CategoryChart;
