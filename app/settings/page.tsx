"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  Wallet,
  Save,
  Settings,
  Monitor,
  Receipt,
  Repeat2,
  FileSpreadsheet,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

type Currency =
  | "AUD"
  | "IDR";

type SettingsData = {
  displayCurrency:
    Currency;

  transactionCurrency:
    Currency;

  subscriptionCurrency:
    Currency;

  csvCurrency:
    Currency;

  dateFormat:
    "DD/MM/YYYY" |
    "YYYY-MM-DD";
};

const DEFAULT_SETTINGS: SettingsData = {
  displayCurrency:
    "AUD",

  transactionCurrency:
    "AUD",

  subscriptionCurrency:
    "AUD",

  csvCurrency:
    "AUD",

  dateFormat:
    "DD/MM/YYYY",
};

export default function SettingsPage() {
  const [
    settings,
    setSettings,
  ] =
    useState<SettingsData>(
      DEFAULT_SETTINGS
    );

  const [
    saved,
    setSaved,
  ] =
    useState(false);

  const [
    loaded,
    setLoaded,
  ] =
    useState(false);

  /* =========================================================
     LOAD SETTINGS
  ========================================================= */

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(
          "coinest-settings"
        );

      if (stored) {
        const parsed =
          JSON.parse(
            stored
          );

        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
        });
      }
    } catch (error) {
      console.error(
        "Could not load settings:",
        error
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  /* =========================================================
     UPDATE SETTING
  ========================================================= */

  function updateSetting<
    K extends keyof SettingsData
  >(
    key: K,
    value:
      SettingsData[K]
  ) {
    setSettings(
      (
        previous
      ) => ({
        ...previous,
        [key]:
          value,
      })
    );

    setSaved(false);
  }

  /* =========================================================
     SAVE
  ========================================================= */

  function saveSettings() {
    localStorage.setItem(
      "coinest-settings",
      JSON.stringify(
        settings
      )
    );

    setSaved(true);

    window.setTimeout(
      () => {
        setSaved(
          false
        );
      },
      3000
    );
  }

  /* =========================================================
     RESET
  ========================================================= */

  function resetSettings() {
    setSettings(
      DEFAULT_SETTINGS
    );

    localStorage.setItem(
      "coinest-settings",
      JSON.stringify(
        DEFAULT_SETTINGS
      )
    );

    setSaved(true);
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-[#eef4ee] p-4 text-slate-900 sm:p-6">

        <div className="mx-auto max-w-4xl">

          <div className="rounded-[28px] bg-white p-10 text-center shadow-sm">

            <p className="text-sm text-slate-500">
              Loading settings...
            </p>

          </div>

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef4ee] p-4 text-slate-900 sm:p-6">

      <div className="mx-auto max-w-4xl">

        {/* TOP BAR */}

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

        {/* HEADER */}

        <div className="mb-6">

          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-green-700">

            <Settings
              size={16}
            />

            Preferences

          </div>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Settings
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
            Choose your preferred defaults. You can still manually change currency when adding transactions, subscriptions, or CSV imports.
          </p>

        </div>

        {/* SAVED */}

        {saved && (

          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">

            <CheckCircle2
              size={18}
            />

            Settings saved.

          </div>

        )}

        <div className="space-y-5">

          {/* =================================================
              DASHBOARD CURRENCY
          ================================================= */}

          <SettingCard
            icon={
              <Monitor
                size={20}
              />
            }
            title="Dashboard currency"
            description="The currency Coinest should display by default when you open your dashboard."
          >

            <CurrencySelector
              value={
                settings.displayCurrency
              }
              onChange={(
                value
              ) =>
                updateSetting(
                  "displayCurrency",
                  value
                )
              }
            />

            <p className="mt-3 text-xs leading-5 text-slate-400">
              You can still use the AUD / IDR switch on the dashboard whenever you want.
            </p>

          </SettingCard>

          {/* =================================================
              TRANSACTION DEFAULT
          ================================================= */}

          <SettingCard
            icon={
              <Receipt
                size={20}
              />
            }
            title="Manual transaction currency"
            description="The currency selected automatically when you open Add Transaction."
          >

            <CurrencySelector
              value={
                settings.transactionCurrency
              }
              onChange={(
                value
              ) =>
                updateSetting(
                  "transactionCurrency",
                  value
                )
              }
            />

            <p className="mt-3 text-xs leading-5 text-slate-400">
              This is only the starting selection. AUD and IDR buttons remain available on every manual transaction.
            </p>

          </SettingCard>

          {/* =================================================
              SUBSCRIPTION DEFAULT
          ================================================= */}

          <SettingCard
            icon={
              <Repeat2
                size={20}
              />
            }
            title="Subscription currency"
            description="The currency selected automatically when you add a subscription."
          >

            <CurrencySelector
              value={
                settings.subscriptionCurrency
              }
              onChange={(
                value
              ) =>
                updateSetting(
                  "subscriptionCurrency",
                  value
                )
              }
            />

            <p className="mt-3 text-xs leading-5 text-slate-400">
              You can still manually choose AUD or IDR for each individual subscription.
            </p>

          </SettingCard>

          {/* =================================================
              CSV DEFAULT
          ================================================= */}

          <SettingCard
            icon={
              <FileSpreadsheet
                size={20}
              />
            }
            title="CSV import currency"
            description="The default currency selected when importing a CSV file."
          >

            <CurrencySelector
              value={
                settings.csvCurrency
              }
              onChange={(
                value
              ) =>
                updateSetting(
                  "csvCurrency",
                  value
                )
              }
            />

            <p className="mt-3 text-xs leading-5 text-slate-400">
              The CSV Import page will still let you change the currency before importing.
            </p>

          </SettingCard>

          {/* =================================================
              DATE FORMAT
          ================================================= */}

          <SettingCard
            icon={
              <Settings
                size={20}
              />
            }
            title="Date format"
            description="Your preferred date format for Coinest."
          >

            <div className="grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() =>
                  updateSetting(
                    "dateFormat",
                    "DD/MM/YYYY"
                  )
                }
                className={`rounded-2xl border p-4 text-sm font-semibold transition ${
                  settings.dateFormat ===
                  "DD/MM/YYYY"
                    ? "border-green-700 bg-[#eff5ea] text-green-800"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                18/08/2026
              </button>

              <button
                type="button"
                onClick={() =>
                  updateSetting(
                    "dateFormat",
                    "YYYY-MM-DD"
                  )
                }
                className={`rounded-2xl border p-4 text-sm font-semibold transition ${
                  settings.dateFormat ===
                  "YYYY-MM-DD"
                    ? "border-green-700 bg-[#eff5ea] text-green-800"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                2026-08-18
              </button>

            </div>

          </SettingCard>

        </div>

        {/* =================================================
            SAVE
        ================================================= */}

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">

          <button
            type="button"
            onClick={
              saveSettings
            }
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#214f45] p-4 font-semibold text-white transition hover:bg-green-900"
          >

            <Save
              size={18}
            />

            Save Settings

          </button>

          <button
            type="button"
            onClick={
              resetSettings
            }
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 font-semibold text-slate-600 transition hover:bg-slate-50"
          >

            <RotateCcw
              size={17}
            />

            Reset

          </button>

        </div>

        {/* INFO */}

        <div className="mt-5 rounded-2xl bg-[#eff5ea] p-4 text-sm text-slate-600">

          <p className="font-semibold text-green-900">
            Defaults, not restrictions
          </p>

          <p className="mt-1">
            These settings only determine what Coinest selects first. You can always override the currency manually when entering financial data.
          </p>

        </div>

      </div>

    </main>
  );
}

/* =========================================================
   SETTING CARD
========================================================= */

function SettingCard({
  icon,
  title,
  description,
  children,
}: {
  icon:
    React.ReactNode;

  title:
    string;

  description:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-6">

      <div className="mb-5 flex items-start gap-3">

        <div className="rounded-xl bg-[#eff5ea] p-3 text-green-800">
          {icon}
        </div>

        <div>

          <h2 className="font-bold sm:text-lg">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>

        </div>

      </div>

      {children}

    </section>
  );
}

/* =========================================================
   CURRENCY SELECTOR
========================================================= */

function CurrencySelector({
  value,
  onChange,
}: {
  value:
    Currency;

  onChange:
    (
      value:
        Currency
    ) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">

      <button
        type="button"
        onClick={() =>
          onChange(
            "AUD"
          )
        }
        className={`rounded-2xl border p-4 text-sm font-semibold transition ${
          value ===
          "AUD"
            ? "border-green-700 bg-[#eff5ea] text-green-800"
            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        }`}
      >
        <span className="mr-2">
          🇦🇺
        </span>

        AUD
      </button>

      <button
        type="button"
        onClick={() =>
          onChange(
            "IDR"
          )
        }
        className={`rounded-2xl border p-4 text-sm font-semibold transition ${
          value ===
          "IDR"
            ? "border-green-700 bg-[#eff5ea] text-green-800"
            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        }`}
      >
        <span className="mr-2">
          🇮🇩
        </span>

        IDR
      </button>

    </div>
  );
}