"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

import {
  LayoutDashboard,
  ArrowLeftRight,
  Sparkles,
  Upload,
  Settings,
  Wallet,
  TrendingUp,
  TrendingDown,
  Repeat2,
  Camera,
  Search,
  Bell,
  CalendarDays,
  RefreshCw,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

/* =========================================================
   TYPES
========================================================= */

type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number | string;
  type: "income" | "expense";
  category: string | null;
  source: string | null;
};

type Subscription = {
  id: string;
  name: string;
  amount: number | string;
  category: string | null;
  billing_cycle: "weekly" | "monthly" | "yearly";
  next_payment_date: string;
  status: "active" | "cancelled" | "paused";
  reminder_enabled: boolean;
  reminder_days_before: number;
  reminder_time: string | null;
};

type Currency = "AUD" | "IDR";

/* =========================================================
   CONSTANTS
========================================================= */

// Only used if our live exchange-rate API fails.
const FALLBACK_AUD_TO_IDR = 12600;

const chartColors = [
  "#214f45",
  "#9FE870",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
];

/* =========================================================
   FORMATTERS
========================================================= */

function formatAUD(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactNumber(
  value: number,
  currency: Currency
) {
  const formatted = new Intl.NumberFormat(
    currency === "AUD" ? "en-AU" : "id-ID",
    {
      notation: "compact",
      maximumFractionDigits: 1,
    }
  ).format(value);

  return currency === "AUD"
    ? `A$${formatted}`
    : `Rp${formatted}`;
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function DashboardPage() {
  /* -------------------------------------------------------
     DATA
  ------------------------------------------------------- */

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [subscriptions, setSubscriptions] =
    useState<Subscription[]>([]);

  const [loading, setLoading] = useState(true);

  /* -------------------------------------------------------
     CURRENCY
  ------------------------------------------------------- */

  const [displayCurrency, setDisplayCurrency] =
    useState<Currency>("AUD");

  const [audToIdr, setAudToIdr] =
    useState(FALLBACK_AUD_TO_IDR);

  const [exchangeRateDate, setExchangeRateDate] =
    useState<string | null>(null);

  const [exchangeRateLoading, setExchangeRateLoading] =
    useState(true);

  const [usingFallbackRate, setUsingFallbackRate] =
    useState(false);

  /* =======================================================
     LOAD SUPABASE DATA
  ======================================================= */

  async function loadDashboardData() {
    setLoading(true);

    const [transactionsResult, subscriptionsResult] =
      await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .order("date", {
            ascending: false,
          }),

        supabase
          .from("subscriptions")
          .select("*")
          .order("next_payment_date", {
            ascending: true,
          }),
      ]);

    if (transactionsResult.error) {
      console.error(
        "Transaction error:",
        transactionsResult.error
      );
    }

    if (subscriptionsResult.error) {
      console.error(
        "Subscription error:",
        subscriptionsResult.error
      );
    }

    setTransactions(
      (transactionsResult.data as Transaction[]) ?? []
    );

    setSubscriptions(
      (subscriptionsResult.data as Subscription[]) ?? []
    );

    setLoading(false);
  }

  /* =======================================================
     LOAD EXCHANGE RATE
  ======================================================= */

  async function loadExchangeRate() {
    try {
      setExchangeRateLoading(true);
      setUsingFallbackRate(false);

      const response = await fetch(
        "/api/exchange-rate",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Could not fetch exchange rate"
        );
      }

      const data = await response.json();

      const rate = Number(data.rate);

      if (
        !Number.isFinite(rate) ||
        rate <= 0
      ) {
        throw new Error(
          "Invalid exchange rate returned"
        );
      }

      setAudToIdr(rate);
      setExchangeRateDate(
        data.date ?? null
      );
    } catch (error) {
      console.error(
        "Exchange rate error:",
        error
      );

      setAudToIdr(
        FALLBACK_AUD_TO_IDR
      );

      setExchangeRateDate(null);
      setUsingFallbackRate(true);
    } finally {
      setExchangeRateLoading(false);
    }
  }

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadDashboardData();
    loadExchangeRate();
  }, []);

  /* =======================================================
     ACTIVE SUBSCRIPTIONS
  ======================================================= */

  const activeSubscriptions =
    useMemo(() => {
      return subscriptions.filter(
        (subscription) =>
          subscription.status ===
          "active"
      );
    }, [subscriptions]);

  /* =======================================================
     MONTHLY SUBSCRIPTION COST
  ======================================================= */

  const estimatedMonthlySubscriptionCost =
    useMemo(() => {
      return activeSubscriptions.reduce(
        (
          total,
          subscription
        ) => {
          const amount =
            Number(
              subscription.amount
            );

          if (
            subscription.billing_cycle ===
            "weekly"
          ) {
            return (
              total +
              (amount * 52) / 12
            );
          }

          if (
            subscription.billing_cycle ===
            "yearly"
          ) {
            return (
              total + amount / 12
            );
          }

          return total + amount;
        },
        0
      );
    }, [activeSubscriptions]);

  /* =======================================================
     FINANCIAL TOTALS
  ======================================================= */

  const totalIncome =
    useMemo(() => {
      return transactions
        .filter(
          (transaction) =>
            transaction.type ===
            "income"
        )
        .reduce(
          (
            total,
            transaction
          ) =>
            total +
            Number(
              transaction.amount
            ),
          0
        );
    }, [transactions]);

  const totalExpenses =
    useMemo(() => {
      return transactions
        .filter(
          (transaction) =>
            transaction.type ===
            "expense"
        )
        .reduce(
          (
            total,
            transaction
          ) =>
            total +
            Number(
              transaction.amount
            ),
          0
        );
    }, [transactions]);

  const totalBalance =
    totalIncome -
    totalExpenses;

  /* =======================================================
     MONEY DISPLAY
  ======================================================= */

  function formatMoney(
    audValue: number
  ) {
    if (
      displayCurrency === "AUD"
    ) {
      return formatAUD(audValue);
    }

    return formatIDR(
      audValue * audToIdr
    );
  }

  /* =======================================================
     CASHFLOW CHART DATA
  ======================================================= */

  const last6MonthsData =
    useMemo(() => {
      const now = new Date();

      const months: {
        key: string;
        label: string;
        income: number;
        expense: number;
      }[] = [];

      for (
        let i = 5;
        i >= 0;
        i--
      ) {
        const date =
          new Date(
            now.getFullYear(),
            now.getMonth() - i,
            1
          );

        const key = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        months.push({
          key,

          label:
            date.toLocaleString(
              "en-AU",
              {
                month: "short",
              }
            ),

          income: 0,

          expense: 0,
        });
      }

      transactions.forEach(
        (transaction) => {
          const transactionDate =
            new Date(
              transaction.date
            );

          const key = `${transactionDate.getFullYear()}-${String(
            transactionDate.getMonth() +
              1
          ).padStart(2, "0")}`;

          const targetMonth =
            months.find(
              (month) =>
                month.key === key
            );

          if (!targetMonth) {
            return;
          }

          if (
            transaction.type ===
            "income"
          ) {
            targetMonth.income +=
              Number(
                transaction.amount
              );
          } else {
            targetMonth.expense +=
              Number(
                transaction.amount
              );
          }
        }
      );

      const converted =
        months.map((month) => ({
          month: month.label,

          income:
            displayCurrency ===
            "AUD"
              ? month.income
              : month.income *
                audToIdr,

          expense:
            displayCurrency ===
            "AUD"
              ? month.expense
              : month.expense *
                audToIdr,
        }));

      const nonEmptyMonths =
        converted.filter(
          (month) =>
            month.income > 0 ||
            month.expense > 0
        );

      return nonEmptyMonths.length >
        0
        ? nonEmptyMonths
        : converted;
    }, [
      transactions,
      displayCurrency,
      audToIdr,
    ]);

  /* =======================================================
     SPENDING BREAKDOWN
  ======================================================= */

  const spendingByCategory =
    useMemo(() => {
      const totals: Record<
        string,
        number
      > = {};

      transactions
        .filter(
          (transaction) =>
            transaction.type ===
            "expense"
        )
        .forEach(
          (transaction) => {
            const category =
              transaction.category ||
              "Other";

            totals[category] =
              (totals[category] ||
                0) +
              Number(
                transaction.amount
              );
          }
        );

      return Object.entries(
        totals
      )
        .map(
          ([name, value]) => ({
            name,

            value:
              displayCurrency ===
              "AUD"
                ? value
                : value *
                  audToIdr,
          })
        )
        .sort(
          (a, b) =>
            b.value - a.value
        );
    }, [
      transactions,
      displayCurrency,
      audToIdr,
    ]);

  /* =======================================================
     RECENT ITEMS
  ======================================================= */

  const recentTransactions =
    transactions.slice(0, 5);

  const upcomingSubscriptions =
    activeSubscriptions.slice(
      0,
      5
    );

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#eef4ee] p-4 text-slate-900 md:p-6">

      <div className="mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-white shadow-xl">

        <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[240px_1fr]">

          {/* =================================================
              SIDEBAR
          ================================================= */}

          <aside className="bg-[#eff5ea] p-5">

            <div className="mb-8 flex items-center gap-3">

              <div className="rounded-xl bg-green-800 p-3 text-white">
                <Wallet size={20} />
              </div>

              <div>
                <p className="text-lg font-bold">
                  Coinest
                </p>

                <p className="text-sm text-slate-500">
                  Personal Finance
                </p>
              </div>

            </div>

            {/* NAVIGATION */}

            <nav className="space-y-2">

              <Link
                href="/"
                className="flex items-center gap-3 rounded-xl bg-lime-200 px-4 py-3 font-medium text-slate-900"
              >
                <LayoutDashboard
                  size={18}
                />

                Dashboard
              </Link>

              <Link
                href="/transactions/new"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600 transition hover:bg-white"
              >
                <ArrowLeftRight
                  size={18}
                />

                Transactions
              </Link>

              <Link
                href="/subscriptions"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600 transition hover:bg-white"
              >
                <Repeat2 size={18} />

                Subscriptions
              </Link>

              <Link
                href="/scan"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600 transition hover:bg-white"
              >
                <Camera size={18} />

                Scan Receipt
              </Link>

              <Link
                href="/analysis"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600 transition hover:bg-white"
              >
                <Sparkles
                  size={18}
                />

                AI Analysis
              </Link>

              <Link
                href="/import"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600 transition hover:bg-white"
              >
                <Upload size={18} />

                CSV Import
              </Link>

              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-slate-600 transition hover:bg-white"
              >
                <Settings
                  size={18}
                />

                Settings
              </button>

            </nav>

            {/* =================================================
                CURRENCY
            ================================================= */}

            <div className="mt-10 rounded-2xl bg-green-900 p-5 text-white">

              <p className="text-sm text-green-100">
                Display currency
              </p>

              <div className="mt-3 flex gap-2">

                <button
                  type="button"
                  onClick={() =>
                    setDisplayCurrency(
                      "AUD"
                    )
                  }
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    displayCurrency ===
                    "AUD"
                      ? "bg-lime-200 text-slate-900"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  AUD
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDisplayCurrency(
                      "IDR"
                    )
                  }
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    displayCurrency ===
                    "IDR"
                      ? "bg-lime-200 text-slate-900"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  IDR
                </button>

              </div>

              {/* EXCHANGE RATE */}

              <div className="mt-5 rounded-xl bg-white/10 p-3">

                <div className="flex items-start justify-between gap-2">

                  <div>
                    <p className="text-xs text-green-100">
                      AUD → IDR
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {exchangeRateLoading
                        ? "Loading rate..."
                        : `1 AUD = ${formatIDR(
                            audToIdr
                          )}`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      loadExchangeRate
                    }
                    disabled={
                      exchangeRateLoading
                    }
                    title="Refresh exchange rate"
                    className="rounded-lg p-2 transition hover:bg-white/10 disabled:opacity-50"
                  >
                    <RefreshCw
                      size={15}
                      className={
                        exchangeRateLoading
                          ? "animate-spin"
                          : ""
                      }
                    />
                  </button>

                </div>

                {exchangeRateDate &&
                  !usingFallbackRate && (
                    <p className="mt-2 text-xs text-green-200">
                      Rate date:{" "}
                      {
                        exchangeRateDate
                      }
                    </p>
                  )}

                {usingFallbackRate && (
                  <p className="mt-2 text-xs text-amber-200">
                    Live rate unavailable.
                    Using fallback rate.
                  </p>
                )}

              </div>

            </div>

          </aside>

          {/* =================================================
              MAIN
          ================================================= */}

          <section className="min-w-0 p-5 md:p-6">

            {/* TOP BAR */}

            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

              <div>

                <h1 className="text-3xl font-bold">
                  Dashboard
                </h1>

                <p className="mt-1 text-slate-500">
                  Overview of your finances,
                  cash flow, and subscriptions
                </p>

              </div>

              <div className="flex flex-wrap items-center gap-3">

                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">

                  <Search
                    size={18}
                  />

                  <span className="text-sm">
                    Search transaction...
                  </span>

                </div>

                <button
                  type="button"
                  className="rounded-2xl border border-slate-200 bg-white p-3"
                >
                  <Bell size={18} />
                </button>

                <Link
                  href="/scan"
                  className="flex items-center gap-2 rounded-2xl bg-green-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-900"
                >
                  <Camera size={18} />

                  Scan Receipt
                </Link>

              </div>

            </div>

            {/* =================================================
                SUMMARY CARDS
            ================================================= */}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

              {/* BALANCE */}

              <div className="min-w-0 rounded-3xl bg-[#214f45] p-6 text-white">

                <p className="text-sm text-green-100">
                  Total Balance
                </p>

                <p className="mt-3 break-words text-3xl font-bold">
                  {formatMoney(
                    totalBalance
                  )}
                </p>

                <p className="mt-2 text-sm text-green-100">
                  Net position
                </p>

              </div>

              {/* INCOME */}

              <div className="min-w-0 rounded-3xl border border-slate-200 p-6">

                <p className="text-sm text-slate-500">
                  Total Income
                </p>

                <p className="mt-3 break-words text-3xl font-bold">
                  {formatMoney(
                    totalIncome
                  )}
                </p>

                <p className="mt-2 flex items-center gap-2 text-sm text-green-600">

                  <TrendingUp
                    size={16}
                  />

                  Money coming in

                </p>

              </div>

              {/* EXPENSES */}

              <div className="min-w-0 rounded-3xl border border-slate-200 p-6">

                <p className="text-sm text-slate-500">
                  Total Expenses
                </p>

                <p className="mt-3 break-words text-3xl font-bold">
                  {formatMoney(
                    totalExpenses
                  )}
                </p>

                <p className="mt-2 flex items-center gap-2 text-sm text-red-600">

                  <TrendingDown
                    size={16}
                  />

                  Money going out

                </p>

              </div>

              {/* SUBSCRIPTIONS */}

              <div className="min-w-0 rounded-3xl border border-slate-200 p-6">

                <p className="text-sm text-slate-500">
                  Subscriptions / Month
                </p>

                <p className="mt-3 break-words text-3xl font-bold">
                  {formatMoney(
                    estimatedMonthlySubscriptionCost
                  )}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  {
                    activeSubscriptions.length
                  }{" "}
                  active subscriptions
                </p>

              </div>

            </div>

            {/* =================================================
                CHARTS
            ================================================= */}

            <div className="mt-6 grid gap-4 xl:grid-cols-[1.7fr_1fr]">

              {/* CASH FLOW */}

              <div className="min-w-0 rounded-3xl border border-slate-200 p-5 md:p-6">

                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <p className="text-sm text-slate-500">
                      Cashflow
                    </p>

                    <h2 className="text-2xl font-bold">
                      Income vs Spending
                    </h2>

                  </div>

                  <p className="text-sm text-slate-500">
                    Last 6 months
                  </p>

                </div>

                <div className="h-[340px] w-full min-w-0">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <BarChart
                      data={
                        last6MonthsData
                      }
                      margin={{
                        top: 10,
                        right: 15,
                        left: 15,
                        bottom: 10,
                      }}
                      barCategoryGap="25%"
                    >

                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fontSize: 12,
                        }}
                      />

                      <YAxis
                        width={85}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{
                          fontSize: 12,
                        }}
                        domain={[
                          0,
                          (
                            dataMax: number
                          ) =>
                            dataMax ===
                            0
                              ? 100
                              : Math.ceil(
                                  dataMax *
                                    1.1
                                ),
                        ]}
                        tickFormatter={(
                          value
                        ) =>
                          formatCompactNumber(
                            Number(
                              value
                            ),
                            displayCurrency
                          )
                        }
                      />

                      <Tooltip
                        formatter={(
                          value,
                          name
                        ) => {
                          const numberValue =
                            Number(
                              value
                            );

                          const formatted =
                            displayCurrency ===
                            "AUD"
                              ? formatAUD(
                                  numberValue
                                )
                              : formatIDR(
                                  numberValue
                                );

                          return [
                            formatted,
                            name,
                          ];
                        }}
                      />

                      <Legend />

                      <Bar
                        dataKey="income"
                        name="Income"
                        fill="#214f45"
                        radius={[
                          8,
                          8,
                          0,
                          0,
                        ]}
                        maxBarSize={60}
                      />

                      <Bar
                        dataKey="expense"
                        name="Expense"
                        fill="#9FE870"
                        radius={[
                          8,
                          8,
                          0,
                          0,
                        ]}
                        maxBarSize={60}
                      />

                    </BarChart>

                  </ResponsiveContainer>

                </div>

              </div>

              {/* =================================================
                  SPENDING BREAKDOWN
              ================================================= */}

              <div className="min-w-0 rounded-3xl border border-slate-200 p-5 md:p-6">

                <div className="mb-4">

                  <p className="text-sm text-slate-500">
                    Statistics
                  </p>

                  <h2 className="text-2xl font-bold">
                    Spending Breakdown
                  </h2>

                </div>

                {spendingByCategory.length ===
                0 ? (

                  <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 text-center text-slate-500">
                    No spending data yet.
                  </div>

                ) : (
                  <>

                    <div className="h-[240px] w-full min-w-0">

                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >

                        <PieChart>

                          <Pie
                            data={
                              spendingByCategory
                            }
                            dataKey="value"
                            nameKey="name"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                          >

                            {spendingByCategory.map(
                              (
                                entry,
                                index
                              ) => (

                                <Cell
                                  key={
                                    entry.name
                                  }
                                  fill={
                                    chartColors[
                                      index %
                                        chartColors.length
                                    ]
                                  }
                                />

                              )
                            )}

                          </Pie>

                          <Tooltip
                            formatter={(
                              value,
                              name
                            ) => {
                              const numberValue =
                                Number(
                                  value
                                );

                              const formatted =
                                displayCurrency ===
                                "AUD"
                                  ? formatAUD(
                                      numberValue
                                    )
                                  : formatIDR(
                                      numberValue
                                    );

                              return [
                                formatted,
                                name,
                              ];
                            }}
                          />

                        </PieChart>

                      </ResponsiveContainer>

                    </div>

                    {/* CATEGORY LIST */}

                    <div className="mt-4 space-y-3">

                      {spendingByCategory
                        .slice(0, 5)
                        .map(
                          (
                            item,
                            index
                          ) => (

                            <div
                              key={
                                item.name
                              }
                              className="flex items-center justify-between gap-3 text-sm"
                            >

                              <div className="flex min-w-0 items-center gap-2">

                                <div
                                  className="h-3 w-3 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor:
                                      chartColors[
                                        index %
                                          chartColors.length
                                      ],
                                  }}
                                />

                                <span className="truncate text-slate-600">
                                  {
                                    item.name
                                  }
                                </span>

                              </div>

                              <span className="shrink-0 font-semibold">

                                {displayCurrency ===
                                "AUD"
                                  ? formatAUD(
                                      item.value
                                    )
                                  : formatIDR(
                                      item.value
                                    )}

                              </span>

                            </div>

                          )
                        )}

                    </div>

                  </>
                )}

              </div>

            </div>

            {/* =================================================
                BOTTOM SECTION
            ================================================= */}

            <div className="mt-6 grid gap-4 xl:grid-cols-[1.6fr_1fr]">

              {/* =================================================
                  TRANSACTIONS
              ================================================= */}

              <div className="min-w-0 rounded-3xl border border-slate-200 p-5 md:p-6">

                <div className="mb-5 flex items-center justify-between">

                  <div>

                    <p className="text-sm text-slate-500">
                      Recent Transactions
                    </p>

                    <h2 className="text-2xl font-bold">
                      Activity
                    </h2>

                  </div>

                  <Link
                    href="/transactions/new"
                    className="rounded-xl bg-[#214f45] px-4 py-2 text-sm font-semibold text-white"
                  >
                    + Add
                  </Link>

                </div>

                {loading ? (

                  <p className="text-slate-500">
                    Loading...
                  </p>

                ) : recentTransactions.length ===
                  0 ? (

                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                    No transactions yet.
                  </div>

                ) : (

                  <div className="overflow-x-auto">

                    <table className="w-full min-w-[650px] text-sm">

                      <thead>

                        <tr className="border-b text-left text-slate-500">

                          <th className="pb-3">
                            Name
                          </th>

                          <th className="pb-3">
                            Date
                          </th>

                          <th className="pb-3">
                            Category
                          </th>

                          <th className="pb-3 text-right">
                            Amount
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {recentTransactions.map(
                          (
                            transaction
                          ) => (

                            <tr
                              key={
                                transaction.id
                              }
                              className="border-b last:border-b-0"
                            >

                              <td className="py-4 font-medium">
                                {
                                  transaction.description
                                }
                              </td>

                              <td className="py-4 text-slate-500">
                                {
                                  transaction.date
                                }
                              </td>

                              <td className="py-4 text-slate-500">
                                {transaction.category ||
                                  "Other"}
                              </td>

                              <td
                                className={`py-4 text-right font-semibold ${
                                  transaction.type ===
                                  "income"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >

                                {transaction.type ===
                                "income"
                                  ? "+"
                                  : "-"}

                                {formatMoney(
                                  Number(
                                    transaction.amount
                                  )
                                )}

                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                )}

              </div>

              {/* =================================================
                  SUBSCRIPTIONS
              ================================================= */}

              <div className="min-w-0 rounded-3xl border border-slate-200 p-5 md:p-6">

                <div className="mb-5 flex items-center justify-between gap-4">

                  <div>

                    <p className="text-sm text-slate-500">
                      Subscription Manager
                    </p>

                    <h2 className="text-2xl font-bold">
                      Renewals
                    </h2>

                  </div>

                  <Link
                    href="/subscriptions"
                    className="shrink-0 text-sm font-semibold text-green-700"
                  >
                    Manage
                  </Link>

                </div>

                {upcomingSubscriptions.length ===
                0 ? (

                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                    No active subscriptions.
                  </div>

                ) : (

                  <div className="space-y-4">

                    {upcomingSubscriptions.map(
                      (
                        subscription
                      ) => (

                        <div
                          key={
                            subscription.id
                          }
                          className="rounded-2xl bg-slate-50 p-4"
                        >

                          <div className="flex items-start justify-between gap-3">

                            <div className="min-w-0">

                              <p className="truncate font-semibold">
                                {
                                  subscription.name
                                }
                              </p>

                              <p className="mt-1 text-sm capitalize text-slate-500">

                                {subscription.category ||
                                  "Other"}

                                {" • "}

                                {
                                  subscription.billing_cycle
                                }

                              </p>

                            </div>

                            <p className="shrink-0 font-bold">
                              {formatMoney(
                                Number(
                                  subscription.amount
                                )
                              )}
                            </p>

                          </div>

                          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">

                            <CalendarDays
                              size={15}
                            />

                            Renews{" "}
                            {
                              subscription.next_payment_date
                            }

                          </div>

                          {subscription.reminder_enabled && (

                            <p className="mt-1 text-sm text-slate-500">

                              Reminder{" "}
                              {
                                subscription.reminder_days_before
                              }{" "}
                              days before at{" "}
                              {subscription.reminder_time?.slice(
                                0,
                                5
                              )}

                            </p>

                          )}

                        </div>

                      )
                    )}

                  </div>

                )}

              </div>

            </div>

          </section>

        </div>

      </div>

    </main>
  );
}