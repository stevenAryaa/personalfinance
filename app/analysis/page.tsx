"use client";

import {
  useState,
  useRef,
  useEffect,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  Bot,
  Send,
  Sparkles,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  RefreshCw,
  Trash2,
  Lightbulb,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type FinancialSnapshot = {
  income: number;
  expenses: number;
  netCashFlow: number;
  savingsRate: number;
  transactionCount: number;
};

const suggestedQuestions = [
  {
    label: "Where am I overspending?",
    question:
      "Where am I spending too much? Identify the biggest areas of unnecessary spending and explain why.",
  },
  {
    label: "How can I save more?",
    question:
      "What are the biggest opportunities for me to save more money based on my transactions?",
  },
  {
    label: "Overall analysis",
    question:
      "Give me an overall analysis of my financial situation, including what I am doing well and what I should improve.",
  },
  {
    label: "Spending habits",
    question:
      "What patterns or habits can you identify from my recent spending?",
  },
  {
    label: "Cut expenses",
    question:
      "If I wanted to reduce my expenses, which categories should I focus on first?",
  },
];

function formatAUD(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function AnalysisPage() {
  const [question, setQuestion] =
    useState("");

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [snapshot, setSnapshot] =
    useState<FinancialSnapshot | null>(
      null
    );

  const bottomRef =
    useRef<HTMLDivElement>(null);

  /* =========================================================
     AUTO SCROLL CHAT
  ========================================================= */

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  /* =========================================================
     LOAD FINANCIAL DATA
  ========================================================= */

  async function getFinancialData() {
    const {
      data: transactions,
      error: transactionError,
    } = await supabase
      .from("transactions")
      .select("*")
      .order("date", {
        ascending: false,
      });

    if (transactionError) {
      throw transactionError;
    }

    if (
      !transactions ||
      transactions.length === 0
    ) {
      throw new Error(
        "You don't have any transactions to analyze yet."
      );
    }

    /* -------------------------------------------------------
       CALCULATE RELIABLE TOTALS OURSELVES
    ------------------------------------------------------- */

    const income =
      transactions
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

    const expenses =
      transactions
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

    const spendingByCategory: Record<
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

          spendingByCategory[
            category
          ] =
            (spendingByCategory[
              category
            ] || 0) +
            Number(
              transaction.amount
            );
        }
      );

    const netCashFlow =
      income - expenses;

    const savingsRate =
      income > 0
        ? Number(
            (
              (netCashFlow /
                income) *
              100
            ).toFixed(1)
          )
        : 0;

    setSnapshot({
      income,
      expenses,
      netCashFlow,
      savingsRate,
      transactionCount:
        transactions.length,
    });

    return {
      income,
      expenses,
      netCashFlow,
      savingsRate,
      spendingByCategory,
      transactionCount:
        transactions.length,
      transactions,
    };
  }

  /* =========================================================
     ASK AI
  ========================================================= */

  async function analyzeFinances(
    customQuestion?: string
  ) {
    const finalQuestion =
      customQuestion ??
      question.trim();

    if (!finalQuestion) {
      setError(
        "Please enter a question first."
      );

      return;
    }

    if (loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content:
        finalQuestion,
    };

    setMessages(
      (previous) => [
        ...previous,
        userMessage,
      ]
    );

    setQuestion("");
    setLoading(true);
    setError("");

    try {
      const financialData =
        await getFinancialData();

      const response =
        await fetch(
          "/api/analyze",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              question:
                finalQuestion,

              financialData,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Analysis failed"
        );
      }

      const assistantMessage: Message =
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            result.analysis,
        };

      setMessages(
        (previous) => [
          ...previous,
          assistantMessage,
        ]
      );
    } catch (err) {
      console.error(err);

      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while analyzing your finances.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     KEYBOARD SHORTCUT
  ========================================================= */

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key ===
        "Enter" &&
      (event.ctrlKey ||
        event.metaKey)
    ) {
      event.preventDefault();

      analyzeFinances();
    }
  }

  /* =========================================================
     CLEAR CHAT
  ========================================================= */

  function clearConversation() {
    setMessages([]);
    setQuestion("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#eef4ee] p-4 text-slate-900 sm:p-6">

      <div className="mx-auto max-w-6xl">

        {/* =====================================================
            TOP BAR
        ===================================================== */}

        <div className="mb-5 flex items-center justify-between">

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-green-800 shadow-sm transition hover:bg-green-50"
          >
            <ArrowLeft
              size={17}
            />

            Dashboard
          </Link>

          <div className="flex items-center gap-2 text-green-800">

            <div className="rounded-xl bg-green-800 p-2.5 text-white">
              <Wallet
                size={18}
              />
            </div>

            <span className="hidden font-bold sm:block">
              Coinest
            </span>

          </div>

        </div>

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-6">

          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-green-700">

            <Sparkles
              size={16}
            />

            AI assistant

          </div>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Financial Assistant
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
            Ask Coinest questions about your spending,
            income, cash flow, and financial habits.
          </p>

        </div>

        {/* =====================================================
            SNAPSHOT
        ===================================================== */}

        {snapshot && (

          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

            {/* INCOME */}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">

              <div className="flex items-center gap-2 text-sm text-slate-500">

                <TrendingUp
                  size={16}
                  className="text-green-600"
                />

                Income

              </div>

              <p className="mt-2 break-words text-xl font-bold sm:text-2xl">
                {formatAUD(
                  snapshot.income
                )}
              </p>

            </div>

            {/* EXPENSES */}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">

              <div className="flex items-center gap-2 text-sm text-slate-500">

                <TrendingDown
                  size={16}
                  className="text-red-600"
                />

                Expenses

              </div>

              <p className="mt-2 break-words text-xl font-bold sm:text-2xl">
                {formatAUD(
                  snapshot.expenses
                )}
              </p>

            </div>

            {/* CASHFLOW */}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">

              <div className="flex items-center gap-2 text-sm text-slate-500">

                <Wallet
                  size={16}
                  className="text-green-700"
                />

                Net cash flow

              </div>

              <p
                className={`mt-2 break-words text-xl font-bold sm:text-2xl ${
                  snapshot.netCashFlow >=
                  0
                    ? "text-green-700"
                    : "text-red-600"
                }`}
              >
                {formatAUD(
                  snapshot.netCashFlow
                )}
              </p>

            </div>

            {/* SAVINGS */}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">

              <div className="flex items-center gap-2 text-sm text-slate-500">

                <PiggyBank
                  size={16}
                  className="text-green-700"
                />

                Savings rate

              </div>

              <p className="mt-2 text-xl font-bold sm:text-2xl">
                {
                  snapshot.savingsRate
                }
                %
              </p>

            </div>

          </div>

        )}

        {/* =====================================================
            AI WORKSPACE
        ===================================================== */}

        <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">

          {/* ===================================================
              LEFT PANEL
          =================================================== */}

          <aside className="h-fit rounded-[28px] bg-white p-5 shadow-sm sm:p-6">

            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-[#eff5ea] p-3 text-green-800">
                <Lightbulb
                  size={20}
                />
              </div>

              <div>

                <p className="font-bold">
                  Suggested Questions
                </p>

                <p className="text-sm text-slate-500">
                  Not sure what to ask?
                </p>

              </div>

            </div>

            <div className="mt-5 space-y-2">

              {suggestedQuestions.map(
                (suggestion) => (

                  <button
                    key={
                      suggestion.label
                    }
                    type="button"
                    onClick={() =>
                      analyzeFinances(
                        suggestion.question
                      )
                    }
                    disabled={loading}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left text-sm font-medium text-slate-700 transition hover:border-green-200 hover:bg-[#eff5ea] disabled:opacity-50"
                  >
                    {
                      suggestion.label
                    }
                  </button>

                )
              )}

            </div>

            <div className="mt-5 rounded-2xl bg-[#eff5ea] p-4">

              <p className="text-sm font-semibold text-green-900">
                How it works
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Coinest calculates your totals directly from your
                transactions first, then gives the data to AI for
                interpretation and suggestions.
              </p>

            </div>

          </aside>

          {/* ===================================================
              CHAT PANEL
          =================================================== */}

          <section className="flex min-h-[620px] flex-col overflow-hidden rounded-[28px] bg-white shadow-sm">

            {/* CHAT HEADER */}

            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">

              <div className="flex items-center gap-3">

                <div className="relative">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#214f45] text-white">
                    <Bot
                      size={21}
                    />
                  </div>

                  <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />

                </div>

                <div>

                  <p className="font-bold">
                    Coinest AI
                  </p>

                  <p className="text-xs text-slate-500">
                    Financial analysis assistant
                  </p>

                </div>

              </div>

              {messages.length >
                0 && (

                <button
                  type="button"
                  onClick={
                    clearConversation
                  }
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2
                    size={16}
                  />

                  <span className="hidden sm:inline">
                    Clear
                  </span>

                </button>

              )}

            </div>

            {/* =================================================
                MESSAGES
            ================================================= */}

            <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">

              {messages.length ===
                0 && (
                <div className="flex min-h-[330px] flex-col items-center justify-center text-center">

                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eff5ea] text-green-800">

                    <Sparkles
                      size={28}
                    />

                  </div>

                  <h2 className="mt-5 text-xl font-bold">
                    Ask about your finances
                  </h2>

                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    I can analyze your spending patterns,
                    identify costly categories, and suggest
                    areas where you may be able to save.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      analyzeFinances(
                        "Give me an overall analysis of my financial situation."
                      )
                    }
                    className="mt-5 rounded-2xl bg-[#214f45] px-5 py-3 text-sm font-semibold text-white"
                  >
                    Analyze my finances
                  </button>

                </div>
              )}

              {messages.map(
                (message) => (

                  <div
                    key={
                      message.id
                    }
                    className={`flex ${
                      message.role ===
                      "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >

                    {message.role ===
                      "assistant" && (

                      <div className="mr-2 mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#214f45] text-white sm:flex">

                        <Bot
                          size={16}
                        />

                      </div>

                    )}

                    <div
                      className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-7 sm:max-w-[80%] ${
                        message.role ===
                        "user"
                          ? "rounded-br-md bg-[#214f45] text-white"
                          : "rounded-bl-md bg-slate-100 text-slate-700"
                      }`}
                    >

                      {message.role ===
                      "assistant" ? (

                        <div className="whitespace-pre-wrap">
                          {
                            message.content
                          }
                        </div>

                      ) : (
                        message.content
                      )}

                    </div>

                  </div>

                )
              )}

              {/* THINKING */}

              {loading && (

                <div className="flex justify-start">

                  <div className="mr-2 mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#214f45] text-white sm:flex">

                    <Bot
                      size={16}
                    />

                  </div>

                  <div className="flex items-center gap-3 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm text-slate-600">

                    <RefreshCw
                      size={16}
                      className="animate-spin text-green-700"
                    />

                    Analyzing your finances...

                  </div>

                </div>

              )}

              <div
                ref={
                  bottomRef
                }
              />

            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (

              <div className="mx-4 mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-5">
                {error}
              </div>

            )}

            {/* =================================================
                INPUT
            ================================================= */}

            <div className="border-t border-slate-100 bg-white p-4 sm:p-5">

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 transition focus-within:border-green-700 focus-within:bg-white focus-within:ring-2 focus-within:ring-green-100">

                <textarea
                  value={question}
                  onChange={(e) =>
                    setQuestion(
                      e.target.value
                    )
                  }
                  onKeyDown={
                    handleKeyDown
                  }
                  placeholder="Ask Coinest about your finances..."
                  rows={3}
                  className="w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400"
                />

                <div className="flex items-center justify-between gap-3 px-2 pb-1">

                  <p className="hidden text-xs text-slate-400 sm:block">
                    Ctrl / Cmd + Enter to send
                  </p>

                  <div className="ml-auto">

                    <button
                      type="button"
                      onClick={() =>
                        analyzeFinances()
                      }
                      disabled={
                        loading ||
                        !question.trim()
                      }
                      className="flex items-center gap-2 rounded-xl bg-[#214f45] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Send
                        size={16}
                      />

                      Ask AI
                    </button>

                  </div>

                </div>

              </div>

              <p className="mt-2 text-center text-[11px] leading-4 text-slate-400">
                AI-generated financial insights may be imperfect.
                Review important financial decisions independently.
              </p>

            </div>

          </section>

        </div>

      </div>

    </main>
  );
}