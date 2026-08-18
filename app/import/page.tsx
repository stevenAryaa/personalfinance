"use client";

import {
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import Papa from "papaparse";

import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Save,
  X,
  RefreshCw,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Currency =
  | "AUD"
  | "IDR";

type TransactionType =
  | "income"
  | "expense";

type CsvRow =
  Record<string, string>;

type ParsedTransaction = {
  rowNumber: number;

  date: string;
  description: string;
  amount: number;

  type:
    | TransactionType
    | "";

  category: string;

  valid: boolean;
  error?: string;
};

const categories = [
  "Groceries",
  "Dining",
  "Transport",
  "Shopping",
  "Bills",
  "Subscriptions",
  "Entertainment",
  "Salary",
  "Healthcare",
  "Education",
  "Travel",
  "Other",
];

/* =========================================================
   HELPERS
========================================================= */

function normalizeHeader(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[_-]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    );
}

function cleanNumber(
  value: string
) {
  if (!value) {
    return 0;
  }

  let cleaned =
    value
      .trim()
      .replace(
        /\s/g,
        ""
      )
      .replace(
        /[A-Za-z$€£¥₹]/g,
        ""
      )
      .replace(
        /Rp/gi,
        ""
      );

  /*
    Handle values like:

    AUD:
    1,250.50

    IDR:
    1.250.000
    1,250,000

    We try to infer which separators
    are thousands separators.
  */

  const commaCount =
    (
      cleaned.match(
        /,/g
      ) || []
    ).length;

  const dotCount =
    (
      cleaned.match(
        /\./g
      ) || []
    ).length;

  if (
    commaCount >
      1 &&
    dotCount ===
      0
  ) {
    cleaned =
      cleaned.replace(
        /,/g,
        ""
      );
  } else if (
    dotCount >
      1 &&
    commaCount ===
      0
  ) {
    cleaned =
      cleaned.replace(
        /\./g,
        ""
      );
  } else if (
    commaCount ===
      1 &&
    dotCount ===
      0
  ) {
    const parts =
      cleaned.split(
        ","
      );

    /*
      1,250 -> likely thousands
      18,99 -> likely decimal
    */

    if (
      parts[1]?.length ===
      3
    ) {
      cleaned =
        cleaned.replace(
          ",",
          ""
        );
    } else {
      cleaned =
        cleaned.replace(
          ",",
          "."
        );
    }
  } else if (
    commaCount >
      0 &&
    dotCount >
      0
  ) {
    /*
      1,250.50
      vs
      1.250,50
    */

    if (
      cleaned.lastIndexOf(
        "."
      ) >
      cleaned.lastIndexOf(
        ","
      )
    ) {
      cleaned =
        cleaned.replace(
          /,/g,
          ""
        );
    } else {
      cleaned =
        cleaned
          .replace(
            /\./g,
            ""
          )
          .replace(
            ",",
            "."
          );
    }
  }

  const parsed =
    Number(cleaned);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function normalizeDate(
  value: string
) {
  if (!value) {
    return "";
  }

  const trimmed =
    value.trim();

  /*
    Already YYYY-MM-DD
  */

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      trimmed
    )
  ) {
    return trimmed;
  }

  /*
    DD/MM/YYYY
    DD-MM-YYYY
  */

  const dmy =
    trimmed.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
    );

  if (dmy) {
    const day =
      dmy[1].padStart(
        2,
        "0"
      );

    const month =
      dmy[2].padStart(
        2,
        "0"
      );

    const year =
      dmy[3];

    return `${year}-${month}-${day}`;
  }

  const parsed =
    new Date(
      trimmed
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return "";
  }

  return parsed
    .toISOString()
    .slice(
      0,
      10
    );
}

function detectColumn(
  headers: string[],
  candidates: string[]
) {
  const normalized =
    headers.map(
      (
        header
      ) => ({
        original:
          header,

        normalized:
          normalizeHeader(
            header
          ),
      })
    );

  for (
    const candidate of
    candidates
  ) {
    const match =
      normalized.find(
        (
          header
        ) =>
          header.normalized ===
          candidate
      );

    if (match) {
      return match.original;
    }
  }

  for (
    const candidate of
    candidates
  ) {
    const match =
      normalized.find(
        (
          header
        ) =>
          header.normalized.includes(
            candidate
          )
      );

    if (match) {
      return match.original;
    }
  }

  return "";
}

function guessType(
  value: string
):
  | TransactionType
  | "" {
  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    [
      "income",
      "credit",
      "deposit",
      "in",
      "incoming",
    ].includes(
      normalized
    )
  ) {
    return "income";
  }

  if (
    [
      "expense",
      "debit",
      "withdrawal",
      "out",
      "outgoing",
    ].includes(
      normalized
    )
  ) {
    return "expense";
  }

  return "";
}

/* =========================================================
   PAGE
========================================================= */

export default function CsvImportPage() {
  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    rawRows,
    setRawRows,
  ] =
    useState<CsvRow[]>(
      []
    );

  const [
    headers,
    setHeaders,
  ] =
    useState<string[]>(
      []
    );

  const [
    dateColumn,
    setDateColumn,
  ] =
    useState("");

  const [
    descriptionColumn,
    setDescriptionColumn,
  ] =
    useState("");

  const [
    amountColumn,
    setAmountColumn,
  ] =
    useState("");

  const [
    typeColumn,
    setTypeColumn,
  ] =
    useState("");

  const [
    categoryColumn,
    setCategoryColumn,
  ] =
    useState("");

  const [
    debitColumn,
    setDebitColumn,
  ] =
    useState("");

  const [
    creditColumn,
    setCreditColumn,
  ] =
    useState("");

  const [
    currency,
    setCurrency,
  ] =
    useState<Currency>(
      "AUD"
    );

  const [
    defaultType,
    setDefaultType,
  ] =
    useState<TransactionType>(
      "expense"
    );

  const [
    defaultCategory,
    setDefaultCategory,
  ] =
    useState(
      "Other"
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    importing,
    setImporting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  /* =======================================================
     FILE
  ======================================================= */

  function resetImport() {
    setFile(null);
    setRawRows([]);
    setHeaders([]);

    setDateColumn("");
    setDescriptionColumn("");
    setAmountColumn("");
    setTypeColumn("");
    setCategoryColumn("");
    setDebitColumn("");
    setCreditColumn("");

    setError("");
    setMessage("");
  }

  function handleFile(
    selectedFile: File
  ) {
    setLoading(true);
    setError("");
    setMessage("");

    setFile(
      selectedFile
    );

    Papa.parse<CsvRow>(
      selectedFile,
      {
        header: true,

        skipEmptyLines:
          "greedy",

        transformHeader:
          (
            header
          ) =>
            header.trim(),

        complete:
          (results) => {
            const rows =
              results.data;

            if (
              rows.length ===
              0
            ) {
              setError(
                "This CSV does not contain any rows."
              );

              setLoading(
                false
              );

              return;
            }

            const csvHeaders =
              results.meta
                .fields ??
              Object.keys(
                rows[0] ||
                  {}
              );

            setHeaders(
              csvHeaders
            );

            setRawRows(
              rows
            );

            /*
              Automatically guess common
              banking CSV column names.
            */

            setDateColumn(
              detectColumn(
                csvHeaders,
                [
                  "date",
                  "transaction date",
                  "posted date",
                  "tanggal",
                ]
              )
            );

            setDescriptionColumn(
              detectColumn(
                csvHeaders,
                [
                  "description",
                  "details",
                  "merchant",
                  "narrative",
                  "transaction description",
                  "keterangan",
                ]
              )
            );

            setAmountColumn(
              detectColumn(
                csvHeaders,
                [
                  "amount",
                  "transaction amount",
                  "value",
                  "nominal",
                ]
              )
            );

            setDebitColumn(
              detectColumn(
                csvHeaders,
                [
                  "debit",
                  "withdrawal",
                  "money out",
                ]
              )
            );

            setCreditColumn(
              detectColumn(
                csvHeaders,
                [
                  "credit",
                  "deposit",
                  "money in",
                ]
              )
            );

            setTypeColumn(
              detectColumn(
                csvHeaders,
                [
                  "type",
                  "transaction type",
                  "debit credit",
                ]
              )
            );

            setCategoryColumn(
              detectColumn(
                csvHeaders,
                [
                  "category",
                  "kategori",
                ]
              )
            );

            setLoading(
              false
            );
          },

        error:
          (
            parseError
          ) => {
            console.error(
              parseError
            );

            setError(
              "Could not read this CSV file."
            );

            setLoading(
              false
            );
          },
      }
    );
  }

  function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target
        .files?.[0];

    if (!selectedFile) {
      return;
    }

    const isCsv =
      selectedFile.name
        .toLowerCase()
        .endsWith(
          ".csv"
        );

    if (!isCsv) {
      setError(
        "Please upload a CSV file."
      );

      return;
    }

    handleFile(
      selectedFile
    );
  }

  /* =======================================================
     PARSE TRANSACTIONS
  ======================================================= */

  const parsedTransactions =
    useMemo<
      ParsedTransaction[]
    >(() => {
      if (
        rawRows.length ===
        0
      ) {
        return [];
      }

      return rawRows.map(
        (
          row,
          index
        ) => {
          const date =
            normalizeDate(
              row[
                dateColumn
              ] || ""
            );

          const description =
            (
              row[
                descriptionColumn
              ] || ""
            ).trim();

          let amount =
            0;

          let type:
            | TransactionType
            | "" =
            defaultType;

          /*
            CASE 1:
            One Amount column
          */

          if (
            amountColumn
          ) {
            const rawAmount =
              cleanNumber(
                row[
                  amountColumn
                ] || ""
              );

            /*
              Negative amount = expense
              Positive amount = default/type column
            */

            if (
              rawAmount <
              0
            ) {
              amount =
                Math.abs(
                  rawAmount
                );

              type =
                "expense";
            } else {
              amount =
                rawAmount;
            }
          }

          /*
            CASE 2:
            Separate debit and credit
          */

          if (
            !amountColumn &&
            (
              debitColumn ||
              creditColumn
            )
          ) {
            const debit =
              debitColumn
                ? cleanNumber(
                    row[
                      debitColumn
                    ] ||
                      ""
                  )
                : 0;

            const credit =
              creditColumn
                ? cleanNumber(
                    row[
                      creditColumn
                    ] ||
                      ""
                  )
                : 0;

            if (
              credit >
              0
            ) {
              amount =
                Math.abs(
                  credit
                );

              type =
                "income";
            } else if (
              debit >
              0
            ) {
              amount =
                Math.abs(
                  debit
                );

              type =
                "expense";
            }
          }

          /*
            Explicit type column wins
            when it is recognizable.
          */

          if (
            typeColumn
          ) {
            const detectedType =
              guessType(
                row[
                  typeColumn
                ] || ""
              );

            if (
              detectedType
            ) {
              type =
                detectedType;
            }
          }

          const category =
            (
              categoryColumn
                ? row[
                    categoryColumn
                  ]
                : ""
            )?.trim() ||
            defaultCategory;

          let rowError =
            "";

          if (!date) {
            rowError =
              "Invalid date";
          } else if (
            !description
          ) {
            rowError =
              "Missing description";
          } else if (
            !amount ||
            amount <= 0
          ) {
            rowError =
              "Invalid amount";
          } else if (
            !type
          ) {
            rowError =
              "Missing transaction type";
          }

          return {
            rowNumber:
              index + 2,

            date,
            description,
            amount,
            type,
            category,

            valid:
              !rowError,

            error:
              rowError ||
              undefined,
          };
        }
      );
    }, [
      rawRows,
      dateColumn,
      descriptionColumn,
      amountColumn,
      typeColumn,
      categoryColumn,
      debitColumn,
      creditColumn,
      defaultType,
      defaultCategory,
    ]);

  const validTransactions =
    parsedTransactions.filter(
      (
        transaction
      ) =>
        transaction.valid
    );

  const invalidTransactions =
    parsedTransactions.filter(
      (
        transaction
      ) =>
        !transaction.valid
    );

  /* =======================================================
     IMPORT
  ======================================================= */

  async function importTransactions() {
    if (
      validTransactions.length ===
      0
    ) {
      setError(
        "There are no valid transactions to import."
      );

      return;
    }

    setImporting(true);
    setError("");
    setMessage("");

    try {
      let audToIdr =
        1;

      /*
        Fetch rate once for the entire
        IDR CSV rather than once per row.
      */

      if (
        currency ===
        "IDR"
      ) {
        const rateResponse =
          await fetch(
            "/api/exchange-rate"
          );

        if (
          !rateResponse.ok
        ) {
          throw new Error(
            "Could not get the AUD/IDR exchange rate."
          );
        }

        const rateData =
          await rateResponse.json();

        audToIdr =
          Number(
            rateData.rate
          );

        if (
          !Number.isFinite(
            audToIdr
          ) ||
          audToIdr <=
            0
        ) {
          throw new Error(
            "Invalid exchange rate returned."
          );
        }
      }

      const rowsToInsert =
        validTransactions.map(
          (
            transaction
          ) => {
            const normalizedAUD =
              currency ===
              "AUD"
                ? transaction.amount
                : transaction.amount /
                  audToIdr;

            return {
              date:
                transaction.date,

              description:
                transaction.description,

              /*
                Internal AUD value
              */

              amount:
                normalizedAUD,

              /*
                Original CSV value
              */

              original_amount:
                transaction.amount,

              currency,

              type:
                transaction.type,

              category:
                transaction.category,

              source:
                "csv",
            };
          }
        );

      const { error } =
        await supabase
          .from(
            "transactions"
          )
          .insert(
            rowsToInsert
          );

      if (error) {
        throw error;
      }

      setMessage(
        `${rowsToInsert.length} transaction${
          rowsToInsert.length ===
          1
            ? ""
            : "s"
        } imported successfully.`
      );

      setRawRows([]);
      setHeaders([]);
      setFile(null);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not import transactions."
      );
    } finally {
      setImporting(
        false
      );
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#eef4ee] p-4 text-slate-900 sm:p-6">

      <div className="mx-auto max-w-6xl">

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

          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
            Bulk transactions
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            CSV Import
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
            Upload transaction history from your bank, map the columns, review the rows, and import everything into Coinest.
          </p>

        </div>

        {/* ALERTS */}

        {error && (

          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <p>
              {error}
            </p>

          </div>

        )}

        {message && (

          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">

            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />

            <p>
              {message}
            </p>

          </div>

        )}

        {/* =================================================
            UPLOAD
        ================================================= */}

        {!file &&
          rawRows.length ===
            0 && (

          <div className="overflow-hidden rounded-[28px] bg-white shadow-sm">

            <div className="border-b border-slate-100 p-5 sm:p-6">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-[#eff5ea] p-3 text-green-800">

                  <FileSpreadsheet
                    size={
                      21
                    }
                  />

                </div>

                <div>

                  <p className="font-bold">
                    Upload CSV
                  </p>

                  <p className="text-sm text-slate-500">
                    Choose a bank transaction export.
                  </p>

                </div>

              </div>

            </div>

            <div className="p-4 sm:p-6">

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center transition hover:border-green-300 hover:bg-[#f5f8f2] sm:py-16">

                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eff5ea] text-green-800">

                  <Upload
                    size={
                      28
                    }
                  />

                </div>

                <h2 className="mt-5 text-xl font-bold">
                  Choose CSV file
                </h2>

                <p className="mt-2 max-w-md text-sm text-slate-500">
                  Export your transaction history from your bank as CSV and upload it here.
                </p>

                <div className="mt-6 rounded-2xl bg-[#214f45] px-6 py-3 font-semibold text-white">
                  Select CSV
                </div>

                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={
                    handleUpload
                  }
                  className="hidden"
                />

              </label>

              <div className="mt-4 rounded-2xl bg-[#eff5ea] p-4 text-sm text-slate-600">

                <p className="font-semibold text-green-900">
                  Supported formats
                </p>

                <p className="mt-1">
                  Coinest can work with a single Amount column or separate Debit/Credit columns. You can map your CSV columns before importing.
                </p>

              </div>

            </div>

          </div>

        )}

        {/* LOADING */}

        {loading && (

          <div className="rounded-[28px] bg-white p-10 text-center shadow-sm">

            <RefreshCw
              size={25}
              className="mx-auto animate-spin text-green-800"
            />

            <p className="mt-4 font-semibold">
              Reading CSV...
            </p>

          </div>

        )}

        {/* =================================================
            MAPPING
        ================================================= */}

        {!loading &&
          rawRows.length >
            0 && (

          <>

            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.5fr]">

              {/* SETTINGS */}

              <div className="h-fit rounded-[28px] bg-white p-5 shadow-sm sm:p-6">

                <div className="mb-6 flex items-center justify-between">

                  <div>

                    <p className="text-sm text-slate-500">
                      Import setup
                    </p>

                    <h2 className="text-xl font-bold">
                      Map Columns
                    </h2>

                  </div>

                  <button
                    type="button"
                    onClick={
                      resetImport
                    }
                    className="rounded-xl bg-slate-100 p-2.5 text-slate-500"
                  >
                    <X
                      size={
                        18
                      }
                    />
                  </button>

                </div>

                {/* FILE */}

                <div className="mb-5 rounded-2xl bg-[#eff5ea] p-4">

                  <p className="truncate font-semibold text-green-900">
                    {
                      file?.name
                    }
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {
                      rawRows.length
                    }{" "}
                    rows found
                  </p>

                </div>

                <div className="space-y-5">

                  {/* CURRENCY */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      CSV currency
                    </label>

                    <div className="grid grid-cols-2 gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          setCurrency(
                            "AUD"
                          )
                        }
                        className={`rounded-xl border p-3 text-sm font-semibold ${
                          currency ===
                          "AUD"
                            ? "border-green-700 bg-[#eff5ea] text-green-800"
                            : "border-slate-200 text-slate-500"
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
                        className={`rounded-xl border p-3 text-sm font-semibold ${
                          currency ===
                          "IDR"
                            ? "border-green-700 bg-[#eff5ea] text-green-800"
                            : "border-slate-200 text-slate-500"
                        }`}
                      >
                        🇮🇩 IDR
                      </button>

                    </div>

                  </div>

                  {/* DATE */}

                  <ColumnSelect
                    label="Date column"
                    value={
                      dateColumn
                    }
                    headers={
                      headers
                    }
                    onChange={
                      setDateColumn
                    }
                  />

                  {/* DESCRIPTION */}

                  <ColumnSelect
                    label="Description column"
                    value={
                      descriptionColumn
                    }
                    headers={
                      headers
                    }
                    onChange={
                      setDescriptionColumn
                    }
                  />

                  {/* AMOUNT */}

                  <div>

                    <p className="mb-2 text-sm font-semibold text-slate-700">
                      Amount format
                    </p>

                    <p className="mb-3 text-xs text-slate-500">
                      Choose either one Amount column or separate Debit/Credit columns.
                    </p>

                    <ColumnSelect
                      label="Amount"
                      value={
                        amountColumn
                      }
                      headers={
                        headers
                      }
                      onChange={
                        setAmountColumn
                      }
                      optional
                    />

                    {!amountColumn && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">

                        <ColumnSelect
                          label="Debit"
                          value={
                            debitColumn
                          }
                          headers={
                            headers
                          }
                          onChange={
                            setDebitColumn
                          }
                          optional
                        />

                        <ColumnSelect
                          label="Credit"
                          value={
                            creditColumn
                          }
                          headers={
                            headers
                          }
                          onChange={
                            setCreditColumn
                          }
                          optional
                        />

                      </div>
                    )}

                  </div>

                  {/* TYPE */}

                  <ColumnSelect
                    label="Type column"
                    value={
                      typeColumn
                    }
                    headers={
                      headers
                    }
                    onChange={
                      setTypeColumn
                    }
                    optional
                  />

                  {!typeColumn &&
                    amountColumn && (

                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Default type
                      </label>

                      <select
                        value={
                          defaultType
                        }
                        onChange={(e) =>
                          setDefaultType(
                            e.target
                              .value as TransactionType
                          )
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-green-700"
                      >
                        <option value="expense">
                          Expense
                        </option>

                        <option value="income">
                          Income
                        </option>
                      </select>

                    </div>

                  )}

                  {/* CATEGORY */}

                  <ColumnSelect
                    label="Category column"
                    value={
                      categoryColumn
                    }
                    headers={
                      headers
                    }
                    onChange={
                      setCategoryColumn
                    }
                    optional
                  />

                  {!categoryColumn && (

                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Default category
                      </label>

                      <select
                        value={
                          defaultCategory
                        }
                        onChange={(e) =>
                          setDefaultCategory(
                            e.target
                              .value
                          )
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-green-700"
                      >

                        {categories.map(
                          (
                            category
                          ) => (

                            <option
                              key={
                                category
                              }
                              value={
                                category
                              }
                            >
                              {
                                category
                              }
                            </option>

                          )
                        )}

                      </select>

                    </div>

                  )}

                </div>

              </div>

              {/* PREVIEW */}

              <div className="min-w-0 rounded-[28px] bg-white p-5 shadow-sm sm:p-6">

                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

                  <div>

                    <p className="text-sm text-slate-500">
                      Import preview
                    </p>

                    <h2 className="text-xl font-bold">
                      Transactions
                    </h2>

                  </div>

                  <div className="flex gap-2 text-xs">

                    <span className="rounded-full bg-green-100 px-3 py-1.5 font-semibold text-green-700">
                      {
                        validTransactions.length
                      }{" "}
                      valid
                    </span>

                    {invalidTransactions.length >
                      0 && (

                      <span className="rounded-full bg-red-100 px-3 py-1.5 font-semibold text-red-700">
                        {
                          invalidTransactions.length
                        }{" "}
                        invalid
                      </span>

                    )}

                  </div>

                </div>

                {/* MOBILE PREVIEW */}

                <div className="space-y-3 md:hidden">

                  {parsedTransactions
                    .slice(
                      0,
                      20
                    )
                    .map(
                      (
                        transaction
                      ) => (

                        <div
                          key={
                            transaction.rowNumber
                          }
                          className={`rounded-2xl border p-4 ${
                            transaction.valid
                              ? "border-slate-200 bg-slate-50"
                              : "border-red-200 bg-red-50"
                          }`}
                        >

                          <div className="flex items-start justify-between gap-3">

                            <div className="min-w-0">

                              <p className="truncate font-semibold">
                                {transaction.description ||
                                  "Missing description"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {transaction.date ||
                                  "Invalid date"}
                                {" • "}
                                {transaction.category}
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

                                {currency ===
                                "AUD"
                                  ? `A$${transaction.amount.toLocaleString(
                                      "en-AU"
                                    )}`
                                  : `Rp${transaction.amount.toLocaleString(
                                      "id-ID"
                                    )}`}
                              </p>

                            </div>

                          </div>

                          {!transaction.valid && (

                            <p className="mt-3 text-xs font-medium text-red-600">
                              Row{" "}
                              {
                                transaction.rowNumber
                              }
                              :{" "}
                              {
                                transaction.error
                              }
                            </p>

                          )}

                        </div>

                      )
                    )}

                </div>

                {/* DESKTOP TABLE */}

                <div className="hidden overflow-x-auto md:block">

                  <table className="w-full min-w-[700px] text-sm">

                    <thead>

                      <tr className="border-b text-left text-slate-500">

                        <th className="pb-3">
                          Row
                        </th>

                        <th className="pb-3">
                          Date
                        </th>

                        <th className="pb-3">
                          Description
                        </th>

                        <th className="pb-3">
                          Category
                        </th>

                        <th className="pb-3">
                          Type
                        </th>

                        <th className="pb-3 text-right">
                          Amount
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {parsedTransactions
                        .slice(
                          0,
                          30
                        )
                        .map(
                          (
                            transaction
                          ) => (

                            <tr
                              key={
                                transaction.rowNumber
                              }
                              className={`border-b ${
                                transaction.valid
                                  ? ""
                                  : "bg-red-50"
                              }`}
                            >

                              <td className="py-3 text-slate-400">
                                {
                                  transaction.rowNumber
                                }
                              </td>

                              <td className="py-3">
                                {
                                  transaction.date
                                }
                              </td>

                              <td className="max-w-[220px] truncate py-3 font-medium">
                                {
                                  transaction.description
                                }
                              </td>

                              <td className="py-3 text-slate-500">
                                {
                                  transaction.category
                                }
                              </td>

                              <td className="py-3 capitalize">
                                {
                                  transaction.type
                                }
                              </td>

                              <td className="py-3 text-right font-semibold">

                                {currency ===
                                "AUD"
                                  ? `A$${transaction.amount.toLocaleString(
                                      "en-AU"
                                    )}`
                                  : `Rp${transaction.amount.toLocaleString(
                                      "id-ID"
                                    )}`}

                              </td>

                            </tr>

                          )
                        )}

                    </tbody>

                  </table>

                </div>

                {parsedTransactions.length >
                  30 && (

                  <p className="mt-4 text-center text-xs text-slate-400">
                    Showing the first 30 of{" "}
                    {
                      parsedTransactions.length
                    }{" "}
                    rows.
                  </p>

                )}

                {/* IMPORT BUTTON */}

                <div className="mt-6 border-t border-slate-100 pt-5">

                  {currency ===
                    "IDR" && (

                    <div className="mb-4 flex items-start gap-2 rounded-2xl bg-[#eff5ea] p-4 text-sm text-slate-600">

                      <RefreshCw
                        size={
                          16
                        }
                        className="mt-0.5 shrink-0 text-green-700"
                      />

                      <p>
                        IDR amounts will be preserved as their original values and converted to AUD before being used in dashboard calculations.
                      </p>

                    </div>

                  )}

                  <button
                    type="button"
                    onClick={
                      importTransactions
                    }
                    disabled={
                      importing ||
                      validTransactions.length ===
                        0
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#214f45] p-4 font-semibold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >

                    {importing ? (

                      <RefreshCw
                        size={
                          18
                        }
                        className="animate-spin"
                      />

                    ) : (

                      <Save
                        size={
                          18
                        }
                      />

                    )}

                    {importing
                      ? currency ===
                        "IDR"
                        ? "Converting & Importing..."
                        : "Importing..."
                      : `Import ${validTransactions.length} Transaction${
                          validTransactions.length ===
                          1
                            ? ""
                            : "s"
                        }`}

                  </button>

                </div>

              </div>

            </div>

          </>

        )}

      </div>

    </main>
  );
}

/* =========================================================
   COLUMN SELECT
========================================================= */

function ColumnSelect({
  label,
  value,
  headers,
  onChange,
  optional = false,
}: {
  label: string;

  value: string;

  headers: string[];

  onChange:
    (
      value: string
    ) => void;

  optional?: boolean;
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-100"
      >

        <option value="">
          {optional
            ? "None / not available"
            : "Select column"}
        </option>

        {headers.map(
          (
            header
          ) => (

            <option
              key={
                header
              }
              value={
                header
              }
            >
              {
                header
              }
            </option>

          )
        )}

      </select>

    </div>
  );
}