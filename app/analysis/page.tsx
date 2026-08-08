"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AnalysisPage() {
  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyzeFinances() {
    setLoading(true);
    setAnalysis("");
    setError("");

    try {
      // 1. Load transactions from Supabase
      const { data: transactions, error: transactionError } =
        await supabase
          .from("transactions")
          .select("*")
          .order("date", { ascending: false });

      if (transactionError) {
        throw transactionError;
      }

      if (!transactions || transactions.length === 0) {
        setError("You don't have any transactions to analyze yet.");
        return;
      }

      // 2. Calculate reliable values ourselves
      const income = transactions
        .filter((transaction) => transaction.type === "income")
        .reduce(
          (total, transaction) =>
            total + Number(transaction.amount),
          0
        );

      const expenses = transactions
        .filter((transaction) => transaction.type === "expense")
        .reduce(
          (total, transaction) =>
            total + Number(transaction.amount),
          0
        );

      const spendingByCategory: Record<string, number> = {};

      transactions
        .filter((transaction) => transaction.type === "expense")
        .forEach((transaction) => {
          const category = transaction.category || "Other";

          spendingByCategory[category] =
            (spendingByCategory[category] || 0) +
            Number(transaction.amount);
        });

      const financialData = {
        income,
        expenses,
        netCashFlow: income - expenses,
        savingsRate:
          income > 0
            ? Number(
                (((income - expenses) / income) * 100).toFixed(1)
              )
            : 0,
        spendingByCategory,
        transactionCount: transactions.length,
        transactions,
      };

      // 3. Send summary + question to our server API
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          financialData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Analysis failed");
      }

      setAnalysis(result.analysis);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while analyzing your finances.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">
          AI Financial Analysis
        </h1>

        <p className="mt-2 text-gray-600">
          Ask questions about your spending, income, and financial
          habits.
        </p>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow">
          <label className="mb-2 block font-medium">
            What would you like to know?
          </label>

          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Where am I spending too much?"
            rows={4}
            className="w-full resize-none rounded-xl border border-gray-300 p-4 outline-none focus:border-black"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setQuestion("Where am I spending too much?")
              }
              className="rounded-full bg-gray-100 px-3 py-2 text-sm"
            >
              Where am I overspending?
            </button>

            <button
              type="button"
              onClick={() =>
                setQuestion(
                  "What are the biggest opportunities for me to save money?"
                )
              }
              className="rounded-full bg-gray-100 px-3 py-2 text-sm"
            >
              How can I save more?
            </button>

            <button
              type="button"
              onClick={() =>
                setQuestion(
                  "Give me an overall analysis of my financial situation."
                )
              }
              className="rounded-full bg-gray-100 px-3 py-2 text-sm"
            >
              Overall analysis
            </button>
          </div>

          <button
            onClick={analyzeFinances}
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-black p-3 font-medium text-white disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Analyze My Finances ✦"}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {analysis && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">
              AI Analysis
            </h2>

            <div className="whitespace-pre-wrap leading-7 text-gray-700">
              {analysis}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}