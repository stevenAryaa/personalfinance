"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Plus,
  Repeat2,
  Trash2,
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

  async function loadSubscriptions() {
    setLoading(true);

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .order("next_payment_date", { ascending: true });

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

  async function addSubscription(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError("");

    const { error } = await supabase
      .from("subscriptions")
      .insert([
        {
          name,
          amount: Number(amount),
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

    setName("");
    setAmount("");
    setNextPaymentDate("");
    setReminderDays("7");
    setReminderTime("09:00");

    await loadSubscriptions();
  }

  async function changeStatus(
    id: string,
    status: "active" | "cancelled" | "paused"
  ) {
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
    (total, subscription) => total + yearlyCost(subscription),
    0
  );

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl">

        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 font-medium text-blue-600"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Recurring payments
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Subscription Manager
          </h1>

          <p className="mt-2 text-slate-500">
            Track recurring payments and get reminded before they renew.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* SUMMARY */}

        <div className="grid gap-4 md:grid-cols-3">

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Active subscriptions
            </p>

            <p className="mt-2 text-3xl font-bold">
              {activeSubscriptions.length}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Estimated monthly
            </p>

            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(estimatedMonthlyCost)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Estimated yearly
            </p>

            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(estimatedYearlyCost)}
            </p>
          </div>

        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.5fr]">

          {/* ADD FORM */}

          <form
            onSubmit={addSubscription}
            className="rounded-3xl bg-white p-6 shadow-sm"
          >

            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
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

            <div className="space-y-5">

              <div>
                <label className="mb-2 block font-medium">
                  Subscription name
                </label>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Netflix"
                  required
                  className="w-full rounded-xl border border-slate-300 p-3"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Amount
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="18.99"
                  required
                  className="w-full rounded-xl border border-slate-300 p-3"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Category
                </label>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3"
                >
                  <option>Entertainment</option>
                  <option>Software</option>
                  <option>Music</option>
                  <option>Streaming</option>
                  <option>Fitness</option>
                  <option>Education</option>
                  <option>Utilities</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Billing cycle
                </label>

                <select
                  value={billingCycle}
                  onChange={(e) =>
                    setBillingCycle(
                      e.target.value as
                        | "weekly"
                        | "monthly"
                        | "yearly"
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 p-3"
                >
                  <option value="weekly">
                    Weekly
                  </option>

                  <option value="monthly">
                    Monthly
                  </option>

                  <option value="yearly">
                    Yearly
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Next renewal date
                </label>

                <input
                  type="date"
                  value={nextPaymentDate}
                  onChange={(e) => setNextPaymentDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 p-3"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Remind me
                </label>

                <select
                  value={reminderDays}
                  onChange={(e) => setReminderDays(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3"
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

              <div>
                <label className="mb-2 block font-medium">
                  Reminder time
                </label>

                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-blue-600 p-4 font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Add Subscription"}
              </button>

            </div>
          </form>

          {/* SUBSCRIPTION LIST */}

          <section className="rounded-3xl bg-white p-6 shadow-sm">

            <div className="mb-6 flex items-center justify-between">

              <div>
                <p className="text-sm text-slate-500">
                  Your subscriptions
                </p>

                <h2 className="text-2xl font-bold">
                  Recurring Payments
                </h2>
              </div>

              <Repeat2 className="text-blue-600" />
            </div>

            {loading ? (
              <p className="text-slate-500">
                Loading subscriptions...
              </p>
            ) : subscriptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
                You haven't added any subscriptions yet.
              </div>
            ) : (
              <div className="space-y-4">

                {subscriptions.map((subscription) => (

                  <div
                    key={subscription.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                      <div>

                        <div className="flex items-center gap-3">

                          <h3 className="text-lg font-bold">
                            {subscription.name}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              subscription.status === "active"
                                ? "bg-green-100 text-green-700"
                                : subscription.status === "paused"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {subscription.status}
                          </span>

                        </div>

                        <p className="mt-2 text-2xl font-bold">
                          {formatCurrency(
                            Number(subscription.amount)
                          )}
                          <span className="text-sm font-normal text-slate-500">
                            {" "}
                            / {subscription.billing_cycle}
                          </span>
                        </p>

                        <div className="mt-4 space-y-2 text-sm text-slate-500">

                          <p className="flex items-center gap-2">
                            <CalendarDays size={16} />

                            Renews {subscription.next_payment_date}
                          </p>

                          {subscription.reminder_enabled && (
                            <p className="flex items-center gap-2">
                              <Bell size={16} />

                              Reminder{" "}
                              {subscription.reminder_days_before} days before at{" "}
                              {subscription.reminder_time?.slice(0, 5)}
                            </p>
                          )}

                        </div>

                      </div>

                      <div className="flex flex-wrap gap-2">

                        {subscription.status !== "active" && (
                          <button
                            type="button"
                            onClick={() =>
                              changeStatus(subscription.id, "active")
                            }
                            className="rounded-xl bg-green-50 px-4 py-2 text-sm font-semibold text-green-700"
                          >
                            Activate
                          </button>
                        )}

                        {subscription.status === "active" && (
                          <button
                            type="button"
                            onClick={() =>
                              changeStatus(subscription.id, "paused")
                            }
                            className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700"
                          >
                            Pause
                          </button>
                        )}

                        {subscription.status !== "cancelled" && (
                          <button
                            type="button"
                            onClick={() =>
                              changeStatus(subscription.id, "cancelled")
                            }
                            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600"
                          >
                            Mark Cancelled
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            deleteSubscription(subscription.id)
                          }
                          className="rounded-xl bg-red-50 p-2 text-red-600"
                        >
                          <Trash2 size={18} />
                        </button>

                      </div>

                    </div>

                  </div>

                ))}

              </div>
            )}

          </section>

        </div>

      </div>
    </main>
  );
}