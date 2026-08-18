"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

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
  Plus,
  X,
  ChevronRight,
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

  currency?: "AUD" | "IDR";

  original_amount?:
    | number
    | string
    | null;
};

type Subscription = {
  id: string;
  name: string;
  amount: number | string;
  category: string | null;

  billing_cycle:
    | "weekly"
    | "monthly"
    | "yearly";

  next_payment_date: string;

  status:
    | "active"
    | "cancelled"
    | "paused";

  reminder_enabled: boolean;

  reminder_days_before: number;

  reminder_time: string | null;
};

type Currency =
  | "AUD"
  | "IDR";

/* =========================================================
   CONSTANTS
========================================================= */

const FALLBACK_AUD_TO_IDR =
  12600;

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

function formatAUD(
  value: number
) {
  return new Intl.NumberFormat(
    "en-AU",
    {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function formatIDR(
  value: number
) {
  return new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }
  ).format(value);
}

function formatCompactNumber(
  value: number,
  currency: Currency
) {
  const formatted =
    new Intl.NumberFormat(
      currency === "AUD"
        ? "en-AU"
        : "id-ID",
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
   DATE HELPERS
========================================================= */

function getDaysUntil(
  dateString: string
) {
  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const renewalDate =
    new Date(
      `${dateString}T00:00:00`
    );

  const difference =
    renewalDate.getTime() -
    today.getTime();

  return Math.ceil(
    difference /
      (
        1000 *
        60 *
        60 *
        24
      )
  );
}

function formatDate(
  dateString: string
) {
  const date =
    new Date(
      `${dateString}T00:00:00`
    );

  return date.toLocaleDateString(
    "en-AU",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function DashboardPage() {
  /* -------------------------------------------------------
     DATA
  ------------------------------------------------------- */

  const [
    transactions,
    setTransactions,
  ] =
    useState<Transaction[]>(
      []
    );

  const [
    subscriptions,
    setSubscriptions,
  ] =
    useState<Subscription[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  /* -------------------------------------------------------
     CURRENCY
  ------------------------------------------------------- */

  const [
    displayCurrency,
    setDisplayCurrency,
  ] =
    useState<Currency>(
      "AUD"
    );

  const [
    audToIdr,
    setAudToIdr,
  ] =
    useState(
      FALLBACK_AUD_TO_IDR
    );

  const [
    exchangeRateDate,
    setExchangeRateDate,
  ] =
    useState<
      string | null
    >(null);

  const [
    exchangeRateLoading,
    setExchangeRateLoading,
  ] =
    useState(true);

  const [
    usingFallbackRate,
    setUsingFallbackRate,
  ] =
    useState(false);

  /* -------------------------------------------------------
     SEARCH
  ------------------------------------------------------- */

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("");

  const [
    searchOpen,
    setSearchOpen,
  ] =
    useState(false);

  const [
    mobileSearchOpen,
    setMobileSearchOpen,
  ] =
    useState(false);

  /* -------------------------------------------------------
     NOTIFICATIONS
  ------------------------------------------------------- */

  const [
    notificationsOpen,
    setNotificationsOpen,
  ] =
    useState(false);

  const [
    mobileNotificationsOpen,
    setMobileNotificationsOpen,
  ] =
    useState(false);

  const [
    mobileToolsOpen,
    setMobileToolsOpen,
  ] =
    useState(false);

  /* =======================================================
     LOAD DATA
  ======================================================= */

  async function loadDashboardData() {
    setLoading(true);

    const [
      transactionsResult,
      subscriptionsResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "transactions"
          )
          .select("*")
          .order(
            "date",
            {
              ascending: false,
            }
          ),

        supabase
          .from(
            "subscriptions"
          )
          .select("*")
          .order(
            "next_payment_date",
            {
              ascending: true,
            }
          ),
      ]);

    if (
      transactionsResult.error
    ) {
      console.error(
        "Transaction error:",
        transactionsResult.error
      );
    }

    if (
      subscriptionsResult.error
    ) {
      console.error(
        "Subscription error:",
        subscriptionsResult.error
      );
    }

    setTransactions(
      (
        transactionsResult.data as
          Transaction[]
      ) ?? []
    );

    setSubscriptions(
      (
        subscriptionsResult.data as
          Subscription[]
      ) ?? []
    );

    setLoading(false);
  }

  /* =======================================================
     EXCHANGE RATE
  ======================================================= */

  async function loadExchangeRate() {
    try {
      setExchangeRateLoading(
        true
      );

      setUsingFallbackRate(
        false
      );

      const response =
        await fetch(
          "/api/exchange-rate",
          {
            cache:
              "no-store",
          }
        );

      if (!response.ok) {
        throw new Error(
          "Could not fetch exchange rate"
        );
      }

      const data =
        await response.json();

      const rate =
        Number(
          data.rate
        );

      if (
        !Number.isFinite(
          rate
        ) ||
        rate <= 0
      ) {
        throw new Error(
          "Invalid exchange rate returned"
        );
      }

      setAudToIdr(
        rate
      );

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

      setExchangeRateDate(
        null
      );

      setUsingFallbackRate(
        true
      );
    } finally {
      setExchangeRateLoading(
        false
      );
    }
  }

  useEffect(() => {
    loadDashboardData();
    loadExchangeRate();
  }, []);

  /* =======================================================
     SUBSCRIPTIONS
  ======================================================= */

  const activeSubscriptions =
    useMemo(() => {
      return subscriptions.filter(
        (
          subscription
        ) =>
          subscription.status ===
          "active"
      );
    }, [
      subscriptions,
    ]);

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
              (amount *
                52) /
                12
            );
          }

          if (
            subscription.billing_cycle ===
            "yearly"
          ) {
            return (
              total +
              amount /
                12
            );
          }

          return (
            total +
            amount
          );
        },
        0
      );
    }, [
      activeSubscriptions,
    ]);

  /* =======================================================
     FINANCIAL TOTALS
  ======================================================= */

  const totalIncome =
    useMemo(() => {
      return transactions
        .filter(
          (
            transaction
          ) =>
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
    }, [
      transactions,
    ]);

  const totalExpenses =
    useMemo(() => {
      return transactions
        .filter(
          (
            transaction
          ) =>
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
    }, [
      transactions,
    ]);

  const totalBalance =
    totalIncome -
    totalExpenses;

  /* =======================================================
     MONEY FORMAT
  ======================================================= */

  function formatMoney(
    audValue: number
  ) {
    if (
      displayCurrency ===
      "AUD"
    ) {
      return formatAUD(
        audValue
      );
    }

    return formatIDR(
      audValue *
        audToIdr
    );
  }

  /* =======================================================
     SEARCH
  ======================================================= */

  const searchResults =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      if (!query) {
        return [];
      }

      return transactions
        .filter(
          (
            transaction
          ) => {
            const description =
              (
                transaction.description ??
                ""
              ).toLowerCase();

            const category =
              (
                transaction.category ??
                ""
              ).toLowerCase();

            const source =
              (
                transaction.source ??
                ""
              ).toLowerCase();

            const type =
              (
                transaction.type ??
                ""
              ).toLowerCase();

            const date =
              transaction.date ??
              "";

            return (
              description.includes(
                query
              ) ||
              category.includes(
                query
              ) ||
              source.includes(
                query
              ) ||
              type.includes(
                query
              ) ||
              date.includes(
                query
              )
            );
          }
        )
        .slice(
          0,
          10
        );
    }, [
      transactions,
      searchQuery,
    ]);

  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  const subscriptionNotifications =
    useMemo(() => {
      return activeSubscriptions
        .filter(
          (
            subscription
          ) => {
            if (
              !subscription.reminder_enabled
            ) {
              return false;
            }

            const daysUntil =
              getDaysUntil(
                subscription.next_payment_date
              );

            return (
              daysUntil >=
                0 &&
              daysUntil <=
                subscription.reminder_days_before
            );
          }
        )
        .sort(
          (
            a,
            b
          ) => {
            return (
              new Date(
                `${a.next_payment_date}T00:00:00`
              ).getTime() -
              new Date(
                `${b.next_payment_date}T00:00:00`
              ).getTime()
            );
          }
        );
    }, [
      activeSubscriptions,
    ]);

  /* =======================================================
     CHART DATA
  ======================================================= */

  const last6MonthsData =
    useMemo(() => {
      const now =
        new Date();

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
            now.getMonth() -
              i,
            1
          );

        const key = `${date.getFullYear()}-${String(
          date.getMonth() +
            1
        ).padStart(
          2,
          "0"
        )}`;

        months.push({
          key,

          label:
            date.toLocaleString(
              "en-AU",
              {
                month:
                  "short",
              }
            ),

          income: 0,
          expense: 0,
        });
      }

      transactions.forEach(
        (
          transaction
        ) => {
          const transactionDate =
            new Date(
              transaction.date
            );

          const key = `${transactionDate.getFullYear()}-${String(
            transactionDate.getMonth() +
              1
          ).padStart(
            2,
            "0"
          )}`;

          const targetMonth =
            months.find(
              (
                month
              ) =>
                month.key ===
                key
            );

          if (
            !targetMonth
          ) {
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
        months.map(
          (
            month
          ) => ({
            month:
              month.label,

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
          })
        );

      const nonEmptyMonths =
        converted.filter(
          (
            month
          ) =>
            month.income >
              0 ||
            month.expense >
              0
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

  const spendingByCategory =
    useMemo(() => {
      const totals: Record<
        string,
        number
      > = {};

      transactions
        .filter(
          (
            transaction
          ) =>
            transaction.type ===
            "expense"
        )
        .forEach(
          (
            transaction
          ) => {
            const category =
              transaction.category ||
              "Other";

            totals[
              category
            ] =
              (
                totals[
                  category
                ] || 0
              ) +
              Number(
                transaction.amount
              );
          }
        );

      return Object.entries(
        totals
      )
        .map(
          ([
            name,
            value,
          ]) => ({
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
          (
            a,
            b
          ) =>
            b.value -
            a.value
        );
    }, [
      transactions,
      displayCurrency,
      audToIdr,
    ]);

  const recentTransactions =
    transactions.slice(
      0,
      5
    );

  const upcomingSubscriptions =
    activeSubscriptions.slice(
      0,
      4
    );

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#eef4ee] text-slate-900">

      <div className="mx-auto min-h-screen max-w-7xl bg-white lg:my-6 lg:min-h-0 lg:overflow-hidden lg:rounded-[28px] lg:shadow-xl">

        <div className="grid lg:grid-cols-[240px_1fr]">

          {/* =================================================
              DESKTOP SIDEBAR
          ================================================= */}

          <aside className="hidden min-h-screen bg-[#eff5ea] p-5 lg:block">

            <div className="mb-8 flex items-center gap-3">

              <div className="rounded-xl bg-green-800 p-3 text-white">
                <Wallet
                  size={20}
                />
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

            <nav className="space-y-2">

              <Link
                href="/"
                className="flex items-center gap-3 rounded-xl bg-lime-200 px-4 py-3 font-medium"
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
                <Repeat2
                  size={18}
                />
                Subscriptions
              </Link>

              <Link
                href="/scan"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600 transition hover:bg-white"
              >
                <Camera
                  size={18}
                />
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
                <Upload
                  size={18}
                />
                CSV Import
              </Link>

              <Link
                href="/settings"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600 transition hover:bg-white"
              >
                <Settings
                  size={18}
                />
                Settings
              </Link>


            </nav>

            {/* DESKTOP CURRENCY */}

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
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    displayCurrency ===
                    "AUD"
                      ? "bg-lime-200 text-slate-900"
                      : "bg-white/10"
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
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    displayCurrency ===
                    "IDR"
                      ? "bg-lime-200 text-slate-900"
                      : "bg-white/10"
                  }`}
                >
                  IDR
                </button>

              </div>

              <div className="mt-5 rounded-xl bg-white/10 p-3">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-xs text-green-100">
                      AUD → IDR
                    </p>

                    <p className="mt-1 text-sm font-semibold">

                      {exchangeRateLoading
                        ? "Loading..."
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
                    className="rounded-lg p-2"
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
                    Using fallback exchange rate
                  </p>

                )}

              </div>

            </div>

          </aside>

          {/* =================================================
              MAIN CONTENT
          ================================================= */}

          <section className="min-w-0 pb-28 lg:pb-8">

            {/* =================================================
                MOBILE HEADER
            ================================================= */}

            <div className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 px-4 py-4 backdrop-blur lg:hidden">

              <div className="flex items-center justify-between">

                <div className="relative">

                  <button
                    type="button"
                    onClick={() => {
                      setMobileToolsOpen(
                        !mobileToolsOpen
                      );

                      setMobileSearchOpen(
                        false
                      );

                      setMobileNotificationsOpen(
                        false
                      );
                    }}
                    className="flex items-center gap-3 text-left"
                    aria-expanded={mobileToolsOpen}
                    aria-label="Open Coinest tools"
                  >

                    <div className="rounded-xl bg-green-800 p-2.5 text-white">
                      <Wallet
                        size={18}
                      />
                    </div>

                    <div>

                      <p className="font-bold">
                        Coinest
                      </p>

                      <p className="text-xs text-slate-500">
                        Dashboard
                      </p>

                    </div>

                  </button>

                  {mobileToolsOpen && (

                    <>
                      <button
                        type="button"
                        aria-label="Close Coinest tools"
                        onClick={() =>
                          setMobileToolsOpen(
                            false
                          )
                        }
                        className="fixed inset-0 z-40 cursor-default"
                      />

                      <div className="absolute left-0 top-[calc(100%+12px)] z-50 w-[270px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">

                        <div className="border-b border-slate-100 px-4 py-3">

                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Coinest tools
                          </p>

                        </div>

                        <Link
                          href="/import"
                          onClick={() =>
                            setMobileToolsOpen(
                              false
                            )
                          }
                          className="flex items-center gap-3 px-4 py-4 transition hover:bg-slate-50"
                        >

                          <div className="rounded-xl bg-[#eff5ea] p-2.5 text-green-800">
                            <Upload
                              size={18}
                            />
                          </div>

                          <div className="min-w-0">

                            <p className="text-sm font-semibold">
                              CSV Import
                            </p>

                            <p className="text-xs text-slate-500">
                              Import bank transactions
                            </p>

                          </div>

                        </Link>

                        <Link
                          href="/settings"
                          onClick={() =>
                            setMobileToolsOpen(
                              false
                            )
                          }
                          className="flex items-center gap-3 border-t border-slate-100 px-4 py-4 transition hover:bg-slate-50"
                        >

                          <div className="rounded-xl bg-[#eff5ea] p-2.5 text-green-800">
                            <Settings
                              size={18}
                            />
                          </div>

                          <div className="min-w-0">

                            <p className="text-sm font-semibold">
                              Settings
                            </p>

                            <p className="text-xs text-slate-500">
                              Currency & preferences
                            </p>

                          </div>

                        </Link>

                      </div>
                    </>

                  )}

                </div>

                <div className="flex items-center gap-2">

                  {/* MOBILE SEARCH */}

                  <button
                    type="button"
                    onClick={() => {
                      setMobileSearchOpen(
                        true
                      );

                      setMobileNotificationsOpen(
                        false
                      );

                      setMobileToolsOpen(
                        false
                      );
                    }}
                    className="rounded-xl border border-slate-200 p-2.5"
                  >
                    <Search
                      size={18}
                    />
                  </button>

                  {/* MOBILE NOTIFICATIONS */}

                  <button
                    type="button"
                    onClick={() => {
                      setMobileNotificationsOpen(
                        true
                      );

                      setMobileSearchOpen(
                        false
                      );

                      setMobileToolsOpen(
                        false
                      );
                    }}
                    className="relative rounded-xl border border-slate-200 p-2.5"
                  >

                    <Bell
                      size={18}
                    />

                    {subscriptionNotifications.length >
                      0 && (

                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">

                        {
                          subscriptionNotifications.length
                        }

                      </span>

                    )}

                  </button>

                </div>

              </div>

              {/* MOBILE CURRENCY */}

              <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#eff5ea] p-2">

                <div className="flex gap-1">

                  <button
                    type="button"
                    onClick={() =>
                      setDisplayCurrency(
                        "AUD"
                      )
                    }
                    className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                      displayCurrency ===
                      "AUD"
                        ? "bg-green-800 text-white"
                        : "text-slate-600"
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
                    className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                      displayCurrency ===
                      "IDR"
                        ? "bg-green-800 text-white"
                        : "text-slate-600"
                    }`}
                  >
                    IDR
                  </button>

                </div>

                <div className="flex items-center gap-2 pr-2">

                  <span className="text-xs text-slate-500">

                    {exchangeRateLoading
                      ? "Loading..."
                      : `1 AUD = ${formatCompactNumber(
                          audToIdr,
                          "IDR"
                        )}`}

                  </span>

                  <button
                    type="button"
                    onClick={
                      loadExchangeRate
                    }
                    disabled={
                      exchangeRateLoading
                    }
                  >

                    <RefreshCw
                      size={14}
                      className={
                        exchangeRateLoading
                          ? "animate-spin"
                          : "text-slate-500"
                      }
                    />

                  </button>

                </div>

              </div>

            </div>

            {/* =================================================
                MOBILE SEARCH OVERLAY
            ================================================= */}

            {mobileSearchOpen && (

              <div className="fixed inset-0 z-[100] bg-white lg:hidden">

                <div className="flex items-center gap-3 border-b border-slate-100 p-4">

                  <div className="flex flex-1 items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3">

                    <Search
                      size={18}
                      className="shrink-0 text-slate-400"
                    />

                    <input
                      autoFocus
                      type="text"
                      value={
                        searchQuery
                      }
                      onChange={(e) =>
                        setSearchQuery(
                          e.target.value
                        )
                      }
                      placeholder="Search transactions..."
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />

                    {searchQuery && (

                      <button
                        type="button"
                        onClick={() =>
                          setSearchQuery(
                            ""
                          )
                        }
                      >
                        <X
                          size={17}
                          className="text-slate-400"
                        />
                      </button>

                    )}

                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileSearchOpen(
                        false
                      );

                      setSearchQuery(
                        ""
                      );
                    }}
                    className="font-semibold text-green-800"
                  >
                    Done
                  </button>

                </div>

                <div className="p-4">

                  {!searchQuery.trim() ? (

                    <div className="py-20 text-center">

                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff5ea] text-green-800">

                        <Search
                          size={24}
                        />

                      </div>

                      <p className="mt-4 font-semibold">
                        Search transactions
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Search by merchant, category, source, date, or type.
                      </p>

                    </div>

                  ) : searchResults.length ===
                    0 ? (

                    <div className="py-20 text-center">

                      <p className="font-semibold">
                        No results found
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Try another search term.
                      </p>

                    </div>

                  ) : (

                    <div className="space-y-3">

                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {
                          searchResults.length
                        }{" "}
                        result
                        {
                          searchResults.length !==
                          1
                            ? "s"
                            : ""
                        }
                      </p>

                      {searchResults.map(
                        (
                          transaction
                        ) => (

                          <div
                            key={
                              transaction.id
                            }
                            className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
                          >

                            <div className="min-w-0">

                              <p className="truncate font-semibold">
                                {
                                  transaction.description
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">

                                {transaction.category ||
                                  "Other"}

                                {" • "}

                                {
                                  transaction.date
                                }

                              </p>

                              <p className="mt-1 text-[11px] capitalize text-slate-400">
                                {transaction.source ||
                                  "manual"}
                              </p>

                            </div>

                            <div className="shrink-0 text-right">

                              <p
                                className={`font-semibold ${
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

                              </p>

                            </div>

                          </div>

                        )
                      )}

                    </div>

                  )}

                </div>

              </div>

            )}

            {/* =================================================
                MOBILE NOTIFICATION DRAWER
            ================================================= */}

            {mobileNotificationsOpen && (

              <div className="fixed inset-0 z-[100] bg-black/30 lg:hidden">

                <button
                  type="button"
                  aria-label="Close notifications"
                  onClick={() =>
                    setMobileNotificationsOpen(
                      false
                    )
                  }
                  className="absolute inset-0 h-full w-full"
                />

                <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-hidden rounded-t-[28px] bg-white shadow-2xl">

                  <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" />

                  <div className="flex items-center justify-between border-b border-slate-100 p-5">

                    <div>

                      <p className="text-xl font-bold">
                        Notifications
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Upcoming renewals
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setMobileNotificationsOpen(
                          false
                        )
                      }
                      className="rounded-xl bg-slate-100 p-2.5"
                    >
                      <X
                        size={18}
                      />
                    </button>

                  </div>

                  <div className="max-h-[60vh] overflow-y-auto p-4">

                    {subscriptionNotifications.length ===
                    0 ? (

                      <div className="py-16 text-center">

                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff5ea] text-green-800">

                          <Bell
                            size={24}
                          />

                        </div>

                        <p className="mt-4 font-semibold">
                          You're all caught up
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          No subscription reminders right now.
                        </p>

                      </div>

                    ) : (

                      <div className="space-y-3">

                        {subscriptionNotifications.map(
                          (
                            subscription
                          ) => {
                            const days =
                              getDaysUntil(
                                subscription.next_payment_date
                              );

                            return (

                              <Link
                                href="/subscriptions"
                                key={
                                  subscription.id
                                }
                                onClick={() =>
                                  setMobileNotificationsOpen(
                                    false
                                  )
                                }
                                className="block rounded-2xl bg-slate-50 p-4"
                              >

                                <div className="flex items-start justify-between gap-3">

                                  <div className="min-w-0">

                                    <p className="truncate font-semibold">
                                      {
                                        subscription.name
                                      }
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500">

                                      {days ===
                                      0
                                        ? "Renews today"
                                        : days ===
                                          1
                                        ? "Renews tomorrow"
                                        : `Renews in ${days} days`}

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

                                <div className="mt-3 flex items-center justify-between">

                                  <div className="flex items-center gap-2 text-xs text-slate-500">

                                    <CalendarDays
                                      size={14}
                                    />

                                    {formatDate(
                                      subscription.next_payment_date
                                    )}

                                  </div>

                                  <ChevronRight
                                    size={16}
                                    className="text-slate-400"
                                  />

                                </div>

                              </Link>

                            );
                          }
                        )}

                      </div>

                    )}

                  </div>

                  <div className="border-t border-slate-100 p-4">

                    <Link
                      href="/subscriptions"
                      onClick={() =>
                        setMobileNotificationsOpen(
                          false
                        )
                      }
                      className="block rounded-2xl bg-[#214f45] p-4 text-center font-semibold text-white"
                    >
                      Manage subscriptions
                    </Link>

                  </div>

                </div>

              </div>

            )}

            <div className="p-4 sm:p-5 lg:p-6">

              {/* =================================================
                  DESKTOP HEADER
              ================================================= */}

              <div className="mb-6 hidden items-center justify-between lg:flex">

                <div>

                  <h1 className="text-3xl font-bold">
                    Dashboard
                  </h1>

                  <p className="mt-1 text-slate-500">
                    Overview of your finances, cash flow, and subscriptions
                  </p>

                </div>

                <div className="flex items-center gap-3">

                  {/* DESKTOP SEARCH */}

                  <div className="relative">

                    <div className="flex w-[260px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-green-700 focus-within:bg-white focus-within:ring-2 focus-within:ring-green-100">

                      <Search
                        size={18}
                        className="shrink-0 text-slate-400"
                      />

                      <input
                        value={
                          searchQuery
                        }
                        onFocus={() =>
                          setSearchOpen(
                            true
                          )
                        }
                        onChange={(e) => {
                          setSearchQuery(
                            e.target.value
                          );

                          setSearchOpen(
                            true
                          );

                          setNotificationsOpen(
                            false
                          );
                        }}
                        placeholder="Search transaction..."
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                      />

                      {searchQuery && (

                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery(
                              ""
                            );

                            setSearchOpen(
                              false
                            );
                          }}
                        >
                          <X
                            size={16}
                            className="text-slate-400"
                          />
                        </button>

                      )}

                    </div>

                    {searchOpen &&
                      searchQuery.trim() && (

                        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[370px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">

                          <div className="border-b border-slate-100 px-4 py-3">

                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Search results
                            </p>

                          </div>

                          {searchResults.length ===
                          0 ? (

                            <div className="p-6 text-center text-sm text-slate-500">
                              No matching transactions.
                            </div>

                          ) : (

                            <div className="max-h-[420px] overflow-y-auto">

                              {searchResults.map(
                                (
                                  transaction
                                ) => (

                                  <div
                                    key={
                                      transaction.id
                                    }
                                    className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 last:border-0"
                                  >

                                    <div className="min-w-0">

                                      <p className="truncate text-sm font-semibold">
                                        {
                                          transaction.description
                                        }
                                      </p>

                                      <p className="mt-1 text-xs text-slate-500">

                                        {transaction.category ||
                                          "Other"}

                                        {" • "}

                                        {
                                          transaction.date
                                        }

                                      </p>

                                    </div>

                                    <p
                                      className={`shrink-0 text-sm font-semibold ${
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

                                    </p>

                                  </div>

                                )
                              )}

                            </div>

                          )}

                        </div>

                      )}

                  </div>

                  {/* DESKTOP NOTIFICATION BELL */}

                  <div className="relative">

                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(
                          !notificationsOpen
                        );

                        setSearchOpen(
                          false
                        );
                      }}
                      className="relative rounded-2xl border border-slate-200 bg-white p-3 transition hover:bg-slate-50"
                    >

                      <Bell
                        size={18}
                      />

                      {subscriptionNotifications.length >
                        0 && (

                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">

                          {
                            subscriptionNotifications.length
                          }

                        </span>

                      )}

                    </button>

                    {notificationsOpen && (

                      <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[370px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">

                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">

                          <div>

                            <p className="font-bold">
                              Notifications
                            </p>

                            <p className="text-xs text-slate-500">
                              Upcoming subscription renewals
                            </p>

                          </div>

                          <Bell
                            size={18}
                            className="text-green-700"
                          />

                        </div>

                        {subscriptionNotifications.length ===
                        0 ? (

                          <div className="p-7 text-center">

                            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#eff5ea] text-green-800">

                              <Bell
                                size={19}
                              />

                            </div>

                            <p className="mt-3 text-sm font-semibold">
                              You're all caught up
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              No subscription reminders right now.
                            </p>

                          </div>

                        ) : (

                          <div className="max-h-[420px] overflow-y-auto">

                            {subscriptionNotifications.map(
                              (
                                subscription
                              ) => {
                                const days =
                                  getDaysUntil(
                                    subscription.next_payment_date
                                  );

                                return (

                                  <Link
                                    href="/subscriptions"
                                    key={
                                      subscription.id
                                    }
                                    onClick={() =>
                                      setNotificationsOpen(
                                        false
                                      )
                                    }
                                    className="block border-b border-slate-100 px-4 py-4 transition last:border-0 hover:bg-slate-50"
                                  >

                                    <div className="flex items-start justify-between gap-3">

                                      <div className="min-w-0">

                                        <p className="truncate font-semibold">
                                          {
                                            subscription.name
                                          }
                                        </p>

                                        <p className="mt-1 text-sm text-slate-500">

                                          {days ===
                                          0
                                            ? "Renews today"
                                            : days ===
                                              1
                                            ? "Renews tomorrow"
                                            : `Renews in ${days} days`}

                                        </p>

                                      </div>

                                      <p className="shrink-0 text-sm font-bold">
                                        {formatMoney(
                                          Number(
                                            subscription.amount
                                          )
                                        )}
                                      </p>

                                    </div>

                                    <p className="mt-2 text-xs text-slate-400">
                                      Renewal:{" "}
                                      {formatDate(
                                        subscription.next_payment_date
                                      )}
                                    </p>

                                  </Link>

                                );
                              }
                            )}

                          </div>

                        )}

                        <div className="border-t border-slate-100 p-3">

                          <Link
                            href="/subscriptions"
                            onClick={() =>
                              setNotificationsOpen(
                                false
                              )
                            }
                            className="block rounded-xl bg-[#eff5ea] p-3 text-center text-sm font-semibold text-green-800"
                          >
                            Manage subscriptions
                          </Link>

                        </div>

                      </div>

                    )}

                  </div>

                  <Link
                    href="/scan"
                    className="flex items-center gap-2 rounded-2xl bg-green-800 px-4 py-3 text-sm font-semibold text-white"
                  >
                    <Camera
                      size={18}
                    />
                    Scan Receipt
                  </Link>

                </div>

              </div>

              {/* MOBILE TITLE */}

              <div className="mb-4 lg:hidden">

                <h1 className="text-2xl font-bold">
                  Your finances
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Here's your current financial overview.
                </p>

              </div>

              {/* =================================================
                  SUMMARY CARDS
              ================================================= */}

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">

                <div className="min-w-0 rounded-2xl bg-[#214f45] p-4 text-white sm:p-5 lg:rounded-3xl lg:p-6">

                  <p className="text-xs text-green-100 sm:text-sm">
                    Balance
                  </p>

                  <p className="mt-2 break-words text-xl font-bold sm:text-2xl lg:text-3xl">
                    {formatMoney(
                      totalBalance
                    )}
                  </p>

                  <p className="mt-2 hidden text-xs text-green-100 sm:block">
                    Net position
                  </p>

                </div>

                <div className="min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-5 lg:rounded-3xl lg:p-6">

                  <p className="text-xs text-slate-500 sm:text-sm">
                    Income
                  </p>

                  <p className="mt-2 break-words text-xl font-bold sm:text-2xl lg:text-3xl">
                    {formatMoney(
                      totalIncome
                    )}
                  </p>

                  <p className="mt-2 hidden items-center gap-1 text-xs text-green-600 sm:flex">
                    <TrendingUp
                      size={14}
                    />
                    Money in
                  </p>

                </div>

                <div className="min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-5 lg:rounded-3xl lg:p-6">

                  <p className="text-xs text-slate-500 sm:text-sm">
                    Expenses
                  </p>

                  <p className="mt-2 break-words text-xl font-bold sm:text-2xl lg:text-3xl">
                    {formatMoney(
                      totalExpenses
                    )}
                  </p>

                  <p className="mt-2 hidden items-center gap-1 text-xs text-red-600 sm:flex">
                    <TrendingDown
                      size={14}
                    />
                    Money out
                  </p>

                </div>

                <div className="min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-5 lg:rounded-3xl lg:p-6">

                  <p className="text-xs text-slate-500 sm:text-sm">
                    Subscriptions
                  </p>

                  <p className="mt-2 break-words text-xl font-bold sm:text-2xl lg:text-3xl">
                    {formatMoney(
                      estimatedMonthlySubscriptionCost
                    )}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {
                      activeSubscriptions.length
                    }{" "}
                    active
                  </p>

                </div>

              </div>

              {/* MOBILE QUICK ACTIONS */}

              <div className="mt-4 grid grid-cols-2 gap-3 lg:hidden">

                <Link
                  href="/transactions/new"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 p-3 text-sm font-semibold"
                >
                  <Plus
                    size={17}
                  />
                  Add Transaction
                </Link>

                <Link
                  href="/scan"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-green-800 p-3 text-sm font-semibold text-white"
                >
                  <Camera
                    size={17}
                  />
                  Scan Receipt
                </Link>

              </div>

              {/* =================================================
                  CHARTS
              ================================================= */}

              <div className="mt-5 grid gap-4 xl:grid-cols-[1.7fr_1fr]">

                {/* CASHFLOW */}

                <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 p-4 sm:p-5 lg:rounded-3xl lg:p-6">

                  <div className="mb-4 flex items-end justify-between gap-3">

                    <div>

                      <p className="text-xs text-slate-500 sm:text-sm">
                        Cashflow
                      </p>

                      <h2 className="text-lg font-bold sm:text-xl lg:text-2xl">
                        Income vs Spending
                      </h2>

                    </div>

                    <p className="text-xs text-slate-500">
                      Last 6 months
                    </p>

                  </div>

                  <div className="h-[260px] w-full min-w-0 sm:h-[310px] lg:h-[340px]">

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
                          right: 5,
                          left: -10,
                          bottom: 5,
                        }}
                        barCategoryGap="20%"
                      >

                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={
                            false
                          }
                        />

                        <XAxis
                          dataKey="month"
                          tickLine={
                            false
                          }
                          axisLine={
                            false
                          }
                          tick={{
                            fontSize: 11,
                          }}
                        />

                        <YAxis
                          width={65}
                          tickLine={
                            false
                          }
                          axisLine={
                            false
                          }
                          tickMargin={5}
                          tick={{
                            fontSize: 10,
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

                        <Legend
                          wrapperStyle={{
                            fontSize:
                              "12px",
                          }}
                        />

                        <Bar
                          dataKey="income"
                          name="Income"
                          fill="#214f45"
                          radius={[
                            6,
                            6,
                            0,
                            0,
                          ]}
                          maxBarSize={
                            55
                          }
                        />

                        <Bar
                          dataKey="expense"
                          name="Expense"
                          fill="#9FE870"
                          radius={[
                            6,
                            6,
                            0,
                            0,
                          ]}
                          maxBarSize={
                            55
                          }
                        />

                      </BarChart>

                    </ResponsiveContainer>

                  </div>

                </div>

                {/* SPENDING BREAKDOWN */}

                <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 p-4 sm:p-5 lg:rounded-3xl lg:p-6">

                  <div>

                    <p className="text-xs text-slate-500 sm:text-sm">
                      Statistics
                    </p>

                    <h2 className="text-lg font-bold sm:text-xl lg:text-2xl">
                      Spending Breakdown
                    </h2>

                  </div>

                  {spendingByCategory.length ===
                  0 ? (

                    <div className="mt-4 flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-300 text-center text-sm text-slate-500">
                      No spending data yet.
                    </div>

                  ) : (
                    <>

                      <div className="h-[210px] w-full sm:h-[230px]">

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
                              innerRadius={
                                48
                              }
                              outerRadius={
                                75
                              }
                              paddingAngle={
                                3
                              }
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

                      <div className="space-y-2">

                        {spendingByCategory
                          .slice(
                            0,
                            5
                          )
                          .map(
                            (
                              item,
                              index
                            ) => (

                              <div
                                key={
                                  item.name
                                }
                                className="flex items-center justify-between gap-2 text-sm"
                              >

                                <div className="flex min-w-0 items-center gap-2">

                                  <div
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
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

                                <span className="shrink-0 text-xs font-semibold sm:text-sm">

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
                  SUBSCRIPTIONS
              ================================================= */}

              <div className="mt-5 min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-5 lg:rounded-3xl lg:p-6">

                <div className="mb-4 flex items-center justify-between">

                  <div>

                    <p className="text-xs text-slate-500 sm:text-sm">
                      Subscriptions
                    </p>

                    <h2 className="text-lg font-bold sm:text-xl">
                      Upcoming Renewals
                    </h2>

                  </div>

                  <Link
                    href="/subscriptions"
                    className="text-sm font-semibold text-green-700"
                  >
                    Manage
                  </Link>

                </div>

                {upcomingSubscriptions.length ===
                0 ? (

                  <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                    No active subscriptions.
                  </div>

                ) : (

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

                    {upcomingSubscriptions.map(
                      (
                        subscription
                      ) => (

                        <Link
                          href="/subscriptions"
                          key={
                            subscription.id
                          }
                          className="rounded-2xl bg-slate-50 p-4 transition hover:bg-slate-100"
                        >

                          <div className="flex items-start justify-between gap-2">

                            <div className="min-w-0">

                              <p className="truncate font-semibold">
                                {
                                  subscription.name
                                }
                              </p>

                              <p className="mt-1 text-xs capitalize text-slate-500">
                                {
                                  subscription.billing_cycle
                                }
                              </p>

                            </div>

                            <p className="shrink-0 text-sm font-bold">
                              {formatMoney(
                                Number(
                                  subscription.amount
                                )
                              )}
                            </p>

                          </div>

                          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">

                            <CalendarDays
                              size={
                                14
                              }
                            />

                            {
                              subscription.next_payment_date
                            }

                          </div>

                        </Link>

                      )
                    )}

                  </div>

                )}

              </div>

              {/* =================================================
                  RECENT TRANSACTIONS
              ================================================= */}

              <div className="mt-5 min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-5 lg:rounded-3xl lg:p-6">

                <div className="mb-4 flex items-center justify-between">

                  <div>

                    <p className="text-xs text-slate-500 sm:text-sm">
                      Recent Transactions
                    </p>

                    <h2 className="text-lg font-bold sm:text-xl">
                      Activity
                    </h2>

                  </div>

                  <Link
                    href="/transactions/new"
                    className="rounded-xl bg-[#214f45] px-3 py-2 text-xs font-semibold text-white sm:px-4 sm:text-sm"
                  >
                    + Add
                  </Link>

                </div>

                {loading ? (

                  <p className="text-sm text-slate-500">
                    Loading...
                  </p>

                ) : recentTransactions.length ===
                  0 ? (

                  <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                    No transactions yet.
                  </div>

                ) : (
                  <>

                    {/* MOBILE TRANSACTION CARDS */}

                    <div className="space-y-3 md:hidden">

                      {recentTransactions.map(
                        (
                          transaction
                        ) => (

                          <div
                            key={
                              transaction.id
                            }
                            className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
                          >

                            <div className="min-w-0">

                              <p className="truncate font-semibold">
                                {
                                  transaction.description
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">

                                {transaction.category ||
                                  "Other"}

                                {" • "}

                                {
                                  transaction.date
                                }

                              </p>

                            </div>

                            <div className="shrink-0 text-right">

                              <p
                                className={`font-semibold ${
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

                              </p>

                              {transaction.currency &&
                                transaction.original_amount && (

                                  <p className="mt-1 text-xs text-slate-400">

                                    Original:{" "}

                                    {transaction.currency ===
                                    "AUD"
                                      ? formatAUD(
                                          Number(
                                            transaction.original_amount
                                          )
                                        )
                                      : formatIDR(
                                          Number(
                                            transaction.original_amount
                                          )
                                        )}

                                  </p>

                                )}

                            </div>

                          </div>

                        )
                      )}

                    </div>

                    {/* DESKTOP TABLE */}

                    <div className="hidden overflow-x-auto md:block">

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

                  </>
                )}

              </div>

            </div>

          </section>

        </div>

      </div>

      {/* =================================================
          MOBILE BOTTOM NAV
      ================================================= */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] lg:hidden">

        <div className="mx-auto grid max-w-md grid-cols-5 items-end">

          <Link
            href="/"
            className="flex flex-col items-center gap-1 py-1 text-green-800"
          >
            <LayoutDashboard
              size={20}
            />

            <span className="text-[10px] font-semibold">
              Home
            </span>
          </Link>

          <Link
            href="/transactions/new"
            className="flex flex-col items-center gap-1 py-1 text-slate-500"
          >
            <ArrowLeftRight
              size={20}
            />

            <span className="text-[10px]">
              Transactions
            </span>
          </Link>

          <Link
            href="/scan"
            className="-mt-6 flex flex-col items-center"
          >

            <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-green-800 text-white shadow-lg">
              <Camera
                size={23}
              />
            </div>

            <span className="mt-1 text-[10px] font-semibold text-green-800">
              Scan
            </span>

          </Link>

          <Link
            href="/subscriptions"
            className="flex flex-col items-center gap-1 py-1 text-slate-500"
          >
            <Repeat2
              size={20}
            />

            <span className="text-[10px]">
              Subs
            </span>
          </Link>

          <Link
            href="/analysis"
            className="flex flex-col items-center gap-1 py-1 text-slate-500"
          >
            <Sparkles
              size={20}
            />

            <span className="text-[10px]">
              AI
            </span>
          </Link>

        </div>

      </nav>

    </main>
  );
}