import Link from "next/link";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Sparkles,
  Upload,
  Settings,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Search,
  Camera,
  Bell,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number | string;
  type: "income" | "expense";
  category: string | null;
  source: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(value);
}

export default async function Home() {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });

  const transactions: Transaction[] = data ?? [];

  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const expenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const balance = income - expenses;
  const savingsRate =
    income > 0 ? Number((((income - expenses) / income) * 100).toFixed(1)) : 0;

  const recentTransactions = transactions.slice(0, 5);

  const categoryTotals: Record<string, number> = {};
  transactions
    .filter((transaction) => transaction.type === "expense")
    .forEach((transaction) => {
      const category = transaction.category || "Other";
      categoryTotals[category] =
        (categoryTotals[category] || 0) + Number(transaction.amount);
    });

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxCategoryValue =
    topCategories.length > 0 ? Math.max(...topCategories.map(([, value]) => value)) : 1;

  if (error) {
    return (
      <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
        <p className="text-red-600">Error: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-6">
      <div className="mx-auto flex min-h-[90vh] max-w-7xl overflow-hidden rounded-[32px] bg-[#dfeaf7] p-3 shadow-2xl">
        <div className="grid w-full grid-cols-1 gap-3 rounded-[28px] bg-white p-3 lg:grid-cols-[250px_1fr]">
          {/* Sidebar */}
          <aside className="flex flex-col rounded-[24px] bg-slate-50 p-5">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                <Wallet size={20} />
              </div>
              <div>
                <p className="text-lg font-bold">Munthes</p>
                <p className="text-sm text-slate-500">Personal Finance</p>
              </div>
            </div>

            <nav className="space-y-2">
              <Link
                href="/"
                className="flex items-center gap-3 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white"
              >
                <LayoutDashboard size={18} />
                Dashboard
              </Link>

              <Link
                href="/transaction/new"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600 transition hover:bg-slate-100"
              >
                <ArrowLeftRight size={18} />
                Transactions
              </Link>

              <Link
                href="/analysis"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600 transition hover:bg-slate-100"
              >
                <Sparkles size={18} />
                AI Analysis
              </Link>

              <Link
                href="/scan"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600 transition hover:bg-slate-100"
              >
                <Camera size={18} />
                Scan Receipt
              </Link>

              <Link
                href="/import"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600 transition hover:bg-slate-100"
              >
                <Upload size={18} />
                CSV Import
              </Link>

              <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-slate-600 transition hover:bg-slate-100">
                <Settings size={18} />
                Settings
              </button>
            </nav>

            <div className="mt-auto rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 p-5 text-white">
              <p className="mb-2 text-sm font-semibold">AI insight ready</p>
              <h3 className="text-lg font-bold leading-snug">
                Ask AI about your spending habits and savings opportunities.
              </h3>

              <Link
                href="/analysis"
                className="mt-4 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-600"
              >
                Open Analysis
              </Link>
            </div>
          </aside>

          {/* Main content */}
          <section className="rounded-[24px] bg-white p-4 md:p-6">
            {/* Top bar */}
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm text-slate-500">Welcome back</p>
                <h1 className="text-2xl font-bold md:text-3xl">
                  Personal Finance Dashboard
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">
                  <Search size={18} />
                  <span className="text-sm">Search transaction...</span>
                </div>

                <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                  <Bell size={18} />
                </button>

                <Link
                  href="/transaction/new"
                  className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  + Add Transaction
                </Link>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-slate-500">Total Balance</p>
                  <div className="rounded-xl bg-blue-100 p-2 text-blue-600">
                    <Wallet size={18} />
                  </div>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(balance)}</p>
                <p className="mt-2 text-sm text-slate-500">Current net balance</p>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-slate-500">Income</p>
                  <div className="rounded-xl bg-green-100 p-2 text-green-600">
                    <TrendingUp size={18} />
                  </div>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(income)}</p>
                <p className="mt-2 text-sm text-green-600">Money coming in</p>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-slate-500">Expenses</p>
                  <div className="rounded-xl bg-red-100 p-2 text-red-600">
                    <TrendingDown size={18} />
                  </div>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(expenses)}</p>
                <p className="mt-2 text-sm text-red-600">Money going out</p>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-slate-500">Savings Rate</p>
                  <div className="rounded-xl bg-amber-100 p-2 text-amber-600">
                    <PiggyBank size={18} />
                  </div>
                </div>
                <p className="text-2xl font-bold">{savingsRate}%</p>
                <p className="mt-2 text-sm text-slate-500">Based on current data</p>
              </div>
            </div>

            {/* Middle section */}
            <div className="mt-6 grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
              {/* Overview card */}
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Overview</p>
                    <h2 className="text-xl font-bold">Spending Breakdown</h2>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-sm text-slate-500 shadow-sm">
                    Top categories
                  </span>
                </div>

                {topCategories.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
                    No expense data yet. Add some transactions to see spending patterns.
                  </div>
                ) : (
                  <div className="space-y-5">
                    {topCategories.map(([category, value]) => (
                      <div key={category}>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="font-medium">{category}</p>
                          <p className="text-sm text-slate-500">
                            {formatCurrency(value)}
                          </p>
                        </div>
                        <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{
                              width: `${(value / maxCategoryValue) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI card */}
              <div className="rounded-3xl bg-gradient-to-br from-blue-700 to-blue-500 p-6 text-white shadow-lg">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                  AI Summary
                </span>

                <h2 className="mt-4 text-2xl font-bold leading-snug">
                  Your finances are {balance >= 0 ? "stable" : "under pressure"}.
                </h2>

                <p className="mt-4 text-sm leading-6 text-blue-50">
                  {expenses > income
                    ? "Your expenses are currently higher than your income. Reviewing your biggest expense categories may help improve your cash flow."
                    : "Your income currently exceeds your expenses. You can now focus on improving savings consistency and reducing non-essential spending."}
                </p>

                <div className="mt-6 rounded-2xl bg-white/10 p-4">
                  <p className="text-sm font-semibold">Quick suggestion</p>
                  <p className="mt-2 text-sm leading-6 text-blue-50">
                    {topCategories[0]
                      ? `Your highest spending category is ${topCategories[0][0]}. This is a good place to start if you want to optimize your budget.`
                      : "Add more transactions so the AI can generate personalized insights."}
                  </p>
                </div>

                <Link
                  href="/analysis"
                  className="mt-6 inline-flex rounded-2xl bg-white px-4 py-3 font-semibold text-blue-600"
                >
                  Analyze with AI
                </Link>
              </div>
            </div>

            {/* Bottom section */}
            <div className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
              {/* Recent transactions */}
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Activity</p>
                    <h2 className="text-xl font-bold">Recent Transactions</h2>
                  </div>

                  <Link
                    href="/transaction/new"
                    className="text-sm font-medium text-blue-600"
                  >
                    Add new
                  </Link>
                </div>

                {recentTransactions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
                    No transactions yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between rounded-2xl bg-white px-4 py-4 shadow-sm"
                      >
                        <div>
                          <p className="font-semibold">{transaction.description}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {transaction.category || "Other"} • {transaction.date}
                          </p>
                        </div>

                        <p
                          className={`font-bold ${
                            transaction.type === "income"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : "-"}
                          {formatCurrency(Number(transaction.amount))}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats / quick view */}
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-5">
                  <p className="text-sm text-slate-500">Snapshot</p>
                  <h2 className="text-xl font-bold">Financial Health</h2>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Transactions</p>
                    <p className="mt-2 text-2xl font-bold">{transactions.length}</p>
                  </div>

                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Top expense category</p>
                    <p className="mt-2 text-lg font-bold">
                      {topCategories[0]?.[0] ?? "No data"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Net cash flow</p>
                    <p
                      className={`mt-2 text-2xl font-bold ${
                        balance >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(balance)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}