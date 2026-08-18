"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Wallet,
  TrendingDown,
  TrendingUp,
  Save,
  RefreshCw,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Currency = "AUD" | "IDR";

export default function NewTransactionPage() {
  const router = useRouter();

  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const [currency, setCurrency] =
    useState<Currency>("AUD");

  const [type, setType] = useState<
    "income" | "expense"
  >("expense");

  const [category, setCategory] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const expenseCategories = [
    "Groceries",
    "Dining",
    "Transport",
    "Shopping",
    "Bills",
    "Subscriptions",
    "Entertainment",
    "Healthcare",
    "Education",
    "Travel",
    "Other",
  ];

  const incomeCategories = [
    "Salary",
    "Freelance",
    "Bonus",
    "Gift",
    "Refund",
    "Other",
  ];

  const categories =
    type === "income"
      ? incomeCategories
      : expenseCategories;

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const numericAmount =
        Number(amount);

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
      ) {
        setMessage(
          "Please enter a valid amount."
        );

        return;
      }

      let normalizedAUDAmount =
        numericAmount;

      /*
        All dashboard calculations use AUD internally.

        AUD:
        original_amount = amount
        amount = amount

        IDR:
        original_amount = IDR entered
        amount = converted AUD
      */

      if (currency === "IDR") {
        const rateResponse =
          await fetch(
            "/api/exchange-rate"
          );

        if (!rateResponse.ok) {
          throw new Error(
            "Could not get the AUD/IDR exchange rate."
          );
        }

        const rateData =
          await rateResponse.json();

        const audToIdr =
          Number(
            rateData.rate
          );

        if (
          !Number.isFinite(audToIdr) ||
          audToIdr <= 0
        ) {
          throw new Error(
            "Invalid exchange rate returned."
          );
        }

        normalizedAUDAmount =
          numericAmount /
          audToIdr;
      }

      const { error } =
        await supabase
          .from("transactions")
          .insert([
            {
              date,
              description,

              // Normalized AUD value
              amount:
                normalizedAUDAmount,

              // Exactly what the user entered
              original_amount:
                numericAmount,

              currency,

              type,
              category,

              source:
                "manual",
            },
          ]);

      if (error) {
        throw error;
      }

      setMessage(
        "Transaction added successfully!"
      );

      setDate("");
      setDescription("");
      setAmount("");
      setCurrency("AUD");
      setType("expense");
      setCategory("");

      router.refresh();
    } catch (err) {
      console.error(err);

      setMessage(
        err instanceof Error
          ? `Error: ${err.message}`
          : "Error: Could not save transaction."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef4ee] p-4 text-slate-900 sm:p-6">

      <div className="mx-auto max-w-3xl">

        {/* TOP BAR */}

        <div className="mb-5 flex items-center justify-between">

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-green-800 shadow-sm transition hover:bg-green-50"
          >
            <ArrowLeft size={17} />
            Dashboard
          </Link>

          <div className="flex items-center gap-2 text-green-800">

            <div className="rounded-xl bg-green-800 p-2.5 text-white">
              <Wallet size={18} />
            </div>

            <span className="hidden font-bold sm:block">
              Coinest
            </span>

          </div>

        </div>

        {/* HEADER */}

        <div className="mb-6">

          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
            Transaction
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Add Transaction
          </h1>

          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Add income or spending manually in AUD or IDR.
          </p>

        </div>

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-[28px] bg-white shadow-sm"
        >

          {/* TYPE */}

          <div className="border-b border-slate-100 p-5 sm:p-6">

            <p className="mb-3 text-sm font-medium text-slate-600">
              Transaction type
            </p>

            <div className="grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() => {
                  setType("expense");
                  setCategory("");
                }}
                className={`flex items-center justify-center gap-2 rounded-2xl border p-4 font-semibold transition ${
                  type === "expense"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                <TrendingDown size={18} />
                Expense
              </button>

              <button
                type="button"
                onClick={() => {
                  setType("income");
                  setCategory("");
                }}
                className={`flex items-center justify-center gap-2 rounded-2xl border p-4 font-semibold transition ${
                  type === "income"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                <TrendingUp size={18} />
                Income
              </button>

            </div>

          </div>

          <div className="space-y-5 p-5 sm:p-6">

            {/* DATE */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Date
              </label>

              <input
                type="date"
                value={date}
                onChange={(e) =>
                  setDate(
                    e.target.value
                  )
                }
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-100"
              />

            </div>

            {/* DESCRIPTION */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Description
              </label>

              <input
                type="text"
                placeholder={
                  type === "expense"
                    ? "e.g. Woolworths or Indomaret"
                    : "e.g. Salary"
                }
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-100"
              />

            </div>

            {/* CURRENCY */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Currency
              </label>

              <div className="grid grid-cols-2 gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setCurrency(
                      "AUD"
                    )
                  }
                  className={`rounded-2xl border p-3.5 font-semibold transition ${
                    currency === "AUD"
                      ? "border-green-700 bg-[#eff5ea] text-green-800"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  🇦🇺 AUD
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCurrency(
                      "IDR"
                    )
                  }
                  className={`rounded-2xl border p-3.5 font-semibold transition ${
                    currency === "IDR"
                      ? "border-green-700 bg-[#eff5ea] text-green-800"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  🇮🇩 IDR
                </button>

              </div>

            </div>

            {/* AMOUNT */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Amount ({currency})
              </label>

              <div className="relative">

                <div className="absolute inset-y-0 left-0 flex items-center pl-4 font-semibold text-slate-500">
                  {currency === "AUD"
                    ? "A$"
                    : "Rp"}
                </div>

                <input
                  type="number"
                  step={
                    currency === "IDR"
                      ? "1"
                      : "0.01"
                  }
                  min={
                    currency === "IDR"
                      ? "1"
                      : "0.01"
                  }
                  placeholder={
                    currency === "AUD"
                      ? "0.00"
                      : "150000"
                  }
                  value={amount}
                  onChange={(e) =>
                    setAmount(
                      e.target.value
                    )
                  }
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-14 pr-4 text-lg font-semibold outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-100"
                />

              </div>

              <div className="mt-2 flex items-start gap-2 text-xs text-slate-400">

                {currency === "IDR" && (
                  <RefreshCw
                    size={13}
                    className="mt-0.5 shrink-0"
                  />
                )}

                <p>
                  {currency === "AUD"
                    ? "This transaction will be stored directly as AUD."
                    : "The original IDR value will be preserved and converted to AUD using the live exchange rate when saved."}
                </p>

              </div>

            </div>

            {/* CATEGORY */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Category
              </label>

              <select
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value
                  )
                }
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-100"
              >

                <option value="">
                  Select category
                </option>

                {categories.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* MESSAGE */}

            {message && (

              <div
                className={`rounded-2xl border p-4 text-sm ${
                  message.startsWith(
                    "Error"
                  ) ||
                  message.startsWith(
                    "Please"
                  )
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-green-200 bg-green-50 text-green-700"
                }`}
              >
                {message}
              </div>

            )}

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#214f45] p-4 font-semibold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={18} />

              {loading
                ? currency === "IDR"
                  ? "Converting & Saving..."
                  : "Adding..."
                : "Add Transaction"}
            </button>

          </div>

        </form>

        {/* TIP */}

        <div className="mt-5 rounded-2xl bg-[#eff5ea] p-4 text-sm text-slate-600">

          <p className="font-semibold text-green-900">
            Tip
          </p>

          <p className="mt-1">
            Have a receipt instead? Coinest can detect whether it is AUD or IDR automatically.
          </p>

          <Link
            href="/scan"
            className="mt-3 inline-block font-semibold text-green-800"
          >
            Scan a receipt →
          </Link>

        </div>

      </div>

    </main>
  );
}