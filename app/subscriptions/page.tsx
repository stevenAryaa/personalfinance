"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Pause,
  Play,
  Plus,
  Repeat2,
  Trash2,
  Wallet,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

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

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Entertainment");

  const [billingCycle, setBillingCycle] = useState<
    "weekly" | "monthly" | "yearly"
  >("monthly");

  const [nextPaymentDate, setNextPaymentDate] = useState("");
  const [reminderDays, setReminderDays] = useState("7");
  const [reminderTime, setReminderTime] = useState("09:00");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadSubscriptions() {
    setLoading(true);

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .order("next_payment_date", {
        ascending: true,
      });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSubscriptions(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadSubscriptions();
  }, []);

  async function addSubscription(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError("Please enter a valid subscription amount.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("subscriptions")
      .insert([
        {
          name,
          amount: numericAmount,
          category,
          billing_cycle: billingCycle,
          next_payment_date: nextPaymentDate,
          status: "active",
          reminder_enabled: true,
          reminder_days_before: Number(reminderDays),
          reminder_time: reminderTime,
          source: "manual",
        },
      ]);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Subscription added successfully.");

    setName("");
    setAmount("");
    setCategory("Entertainment");
    setBillingCycle("monthly");
    setNextPaymentDate("");
    setReminderDays("7");
    setReminderTime("09:00");

    await loadSubscriptions();
  }

  async function changeStatus(
    id: string,
    status: "active" | "cancelled" | "paused"
  ) {
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("subscriptions")
      .update({ status })
      .eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    await loadSubscriptions();
  }

  async function deleteSubscription(id: string) {
    const confirmed = window.confirm(
      "Delete this subscription from your tracker?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error } = await supabase
      .from("subscriptions")
      .delete()
      .eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    await loadSubscriptions();
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 2,
    }).format(value);
  }

  function yearlyCost(subscription: Subscription) {
    const amount = Number(subscription.amount);

    if (subscription.billing_cycle === "weekly") {
      return amount * 52;
    }

    if (subscription.billing_cycle === "monthly") {
      return amount * 12;
    }

    return amount;
  }

  function formatRenewalDate(dateString: string) {
    if (!dateString) return "No renewal date";

    const date = new Date(`${dateString}T00:00:00`);

    return date.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const activeSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === "active"
  );

  const estimatedMonthlyCost = activeSubscriptions.reduce(
    (total, subscription) => {
      const amount = Number(subscription.amount);

      if (subscription.billing_cycle === "weekly") {
        return total + (amount * 52) / 12;
      }

      if (subscription.billing_cycle === "yearly") {
        return total + amount / 12;
      }

      return total + amount;
    },
    0
  );

  const estimatedYearlyCost = activeSubscriptions.reduce(
    (total, subscription) =>
      total + yearlyCost(subscription),
    0
  );

  return (
    <main className="min-h-screen bg-[#eef4ee] p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-6xl">

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
            Recurring payments
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Subscription Manager
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
            Track recurring payments, upcoming renewals, and reminder dates.
          </p>

        </div>

        {/* ALERTS */}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* SUMMARY */}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">

          <div className="rounded-2xl bg-[#214f45] p-4 text-white sm:p-5 lg:rounded-3xl lg:p-6">

            <p className="text-xs text-green-100 sm:text-sm">
              Active subscriptions
            </p>

            <p className="mt-2 text-2xl font-bold sm:text-3xl">
              {activeSubscriptions.length}
            </p>

            <p className="mt-2 text-xs text-green-100">
              Currently renewing
            </p>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 lg:rounded-3xl lg:p-6">

            <p className="text-xs text-slate-500 sm:text-sm">
              Monthly cost
            </p>

            <p className="mt-2 break-words text-xl font-bold sm:text-3xl">
              {formatCurrency(estimatedMonthlyCost)}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Estimated recurring spend
            </p>

          </div>

          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 lg:col-span-1 lg:rounded-3xl lg:p-6">

            <p className="text-xs text-slate-500 sm:text-sm">
              Yearly cost
            </p>

            <p className="mt-2 break-words text-xl font-bold sm:text-3xl">
              {formatCurrency(estimatedYearlyCost)}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Estimated annual total
            </p>

          </div>

        </div>

        {/* MAIN AREA */}

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.5fr]">

          {/* =================================================
              ADD SUBSCRIPTION
          ================================================= */}

          <form
            onSubmit={addSubscription}
            className="rounded-[28px] bg-white shadow-sm"
          >

            <div className="border-b border-slate-100 p-5 sm:p-6">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-[#eff5ea] p-3 text-green-800">
                  <Plus size={20} />
                </div>

                <div>

                  <p className="font-bold">
                    Add Subscription
                  </p>

                  <p className="text-sm text-slate-500">
                    Add a recurring payment manually.
                  </p>

                </div>

              </div>

            </div>

            <div className="space-y-5 p-5 sm:p-6">

              {/* NAME */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Subscription name
                </label>

                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="e.g. Netflix"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-100"
                />

              </div>

              {/* AMOUNT */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Amount
                </label>

                <div className="relative">

                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 font-semibold text-slate-500">
                    A$
                  </div>

                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value)
                    }
                    placeholder="18.99"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-lg font-semibold outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-100"
                  />

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
                    setCategory(e.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-100"
                >
                  <option>
                    Entertainment
                  </option>

                  <option>
                    Software
                  </option>

                  <option>
                    Music
                  </option>

                  <option>
                    Streaming
                  </option>

                  <option>
                    Fitness
                  </option>

                  <option>
                    Education
                  </option>

                  <option>
                    Utilities
                  </option>

                  <option>
                    Other
                  </option>
                </select>

              </div>

              {/* BILLING */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Billing cycle
                </label>

                <div className="grid grid-cols-3 gap-2">

                  {[
                    "weekly",
                    "monthly",
                    "yearly",
                  ].map((cycle) => (

                    <button
                      key={cycle}
                      type="button"
                      onClick={() =>
                        setBillingCycle(
                          cycle as
                            | "weekly"
                            | "monthly"
                            | "yearly"
                        )
                      }
                      className={`rounded-xl border px-2 py-3 text-sm font-semibold capitalize transition ${
                        billingCycle === cycle
                          ? "border-green-700 bg-[#eff5ea] text-green-800"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {cycle}
                    </button>

                  ))}

                </div>

              </div>

              {/* NEXT DATE */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Next renewal date
                </label>

                <input
                  type="date"
                  value={nextPaymentDate}
                  onChange={(e) =>
                    setNextPaymentDate(
                      e.target.value
                    )
                  }
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-100"
                />

              </div>

              {/* REMINDER */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Remind me
                </label>

                <select
                  value={reminderDays}
                  onChange={(e) =>
                    setReminderDays(
                      e.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-100"
                >
                  <option value="1">
                    1 day before
                  </option>

                  <option value="3">
                    3 days before
                  </option>

                  <option value="7">
                    7 days before
                  </option>

                  <option value="14">
                    14 days before
                  </option>

                  <option value="30">
                    30 days before
                  </option>
                </select>

              </div>

              {/* TIME */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Reminder time
                </label>

                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) =>
                    setReminderTime(
                      e.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-100"
                />

              </div>

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#214f45] p-4 font-semibold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-50"
              >

                <Plus size={18} />

                {saving
                  ? "Saving..."
                  : "Add Subscription"}

              </button>

            </div>

          </form>

          {/* =================================================
              SUBSCRIPTIONS LIST
          ================================================= */}

          <section className="min-w-0 rounded-[28px] bg-white p-5 shadow-sm sm:p-6">

            <div className="mb-6 flex items-center justify-between gap-3">

              <div>

                <p className="text-sm text-slate-500">
                  Your subscriptions
                </p>

                <h2 className="text-2xl font-bold">
                  Recurring Payments
                </h2>

              </div>

              <div className="rounded-xl bg-[#eff5ea] p-3 text-green-800">
                <Repeat2 size={21} />
              </div>

            </div>

            {loading ? (

              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                Loading subscriptions...
              </div>

            ) : subscriptions.length === 0 ? (

              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">

                <Repeat2 className="mx-auto text-slate-300" />

                <p className="mt-3 font-semibold">
                  No subscriptions yet
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Add your first recurring payment using the form.
                </p>

              </div>

            ) : (

              <div className="space-y-4">

                {subscriptions.map(
                  (subscription) => (

                    <div
                      key={subscription.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-green-200 sm:p-5"
                    >

                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">

                        {/* DETAILS */}

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="truncate text-lg font-bold">
                              {subscription.name}
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                                subscription.status ===
                                "active"
                                  ? "bg-green-100 text-green-700"
                                  : subscription.status ===
                                    "paused"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {subscription.status}
                            </span>

                          </div>

                          <p className="mt-2 text-2xl font-bold">

                            {formatCurrency(
                              Number(
                                subscription.amount
                              )
                            )}

                            <span className="ml-1 text-sm font-normal capitalize text-slate-500">
                              / {subscription.billing_cycle}
                            </span>

                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {subscription.category || "Other"}
                          </p>

                          <div className="mt-4 space-y-2 text-sm text-slate-500">

                            <div className="flex items-center gap-2">

                              <CalendarDays
                                size={16}
                                className="shrink-0 text-green-700"
                              />

                              <span>
                                Renews{" "}
                                {formatRenewalDate(
                                  subscription.next_payment_date
                                )}
                              </span>

                            </div>

                            {subscription.reminder_enabled && (

                              <div className="flex items-center gap-2">

                                <Bell
                                  size={16}
                                  className="shrink-0 text-green-700"
                                />

                                <span>
                                  Reminder{" "}
                                  {
                                    subscription.reminder_days_before
                                  }{" "}
                                  days before at{" "}
                                  {subscription.reminder_time?.slice(
                                    0,
                                    5
                                  ) || "09:00"}
                                </span>

                              </div>

                            )}

                          </div>

                        </div>

                        {/* ACTIONS */}

                        <div className="flex flex-wrap gap-2">

                          {subscription.status !==
                            "active" && (

                            <button
                              type="button"
                              onClick={() =>
                                changeStatus(
                                  subscription.id,
                                  "active"
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100"
                            >
                              <Play size={15} />
                              Activate
                            </button>

                          )}

                          {subscription.status ===
                            "active" && (

                            <button
                              type="button"
                              onClick={() =>
                                changeStatus(
                                  subscription.id,
                                  "paused"
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                            >
                              <Pause size={15} />
                              Pause
                            </button>

                          )}

                          {subscription.status !==
                            "cancelled" && (

                            <button
                              type="button"
                              onClick={() =>
                                changeStatus(
                                  subscription.id,
                                  "cancelled"
                                )
                              }
                              className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
                            >
                              Mark Cancelled
                            </button>

                          )}

                          <button
                            type="button"
                            onClick={() =>
                              deleteSubscription(
                                subscription.id
                              )
                            }
                            title="Delete subscription"
                            className="rounded-xl bg-red-50 p-2.5 text-red-600 transition hover:bg-red-100"
                          >
                            <Trash2 size={17} />
                          </button>

                        </div>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </section>

        </div>

        {/* INFO */}

        <div className="mt-5 rounded-2xl bg-[#eff5ea] p-4 text-sm text-slate-600">

          <p className="font-semibold text-green-900">
            Subscription tracking
          </p>

          <p className="mt-1">
            Pause, activate, and cancel currently update the status inside Coinest only.
            They do not cancel or pause the subscription with the actual provider.
          </p>

        </div>

      </div>
    </main>
  );
}