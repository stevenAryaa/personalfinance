"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  Camera,
  Upload,
  X,
  Sparkles,
  Save,
  Wallet,
  RefreshCw,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type DetectedTransaction = {
  description: string;
  amount: number;
  currency: "AUD" | "IDR";
  date: string;
  type: "income" | "expense";
  category: string;
  confidence: number;
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

export default function ScanReceiptPage() {
  const videoRef =
    useRef<HTMLVideoElement>(null);

  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  const [stream, setStream] =
    useState<MediaStream | null>(null);

  const [cameraOpen, setCameraOpen] =
    useState(false);

  const [image, setImage] =
    useState<File | null>(null);

  const [preview, setPreview] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [detected, setDetected] =
    useState<DetectedTransaction | null>(
      null
    );

  async function openCamera() {
    try {
      setError("");

      if (
        !navigator.mediaDevices
          ?.getUserMedia
      ) {
        setError(
          "Your browser does not support camera access."
        );

        return;
      }

      const mediaStream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              facingMode: {
                ideal: "environment",
              },
            },

            audio: false,
          }
        );

      setStream(mediaStream);
      setCameraOpen(true);
    } catch (err) {
      console.error(err);

      setError(
        "Could not access your camera. Please allow camera permission."
      );
    }
  }

  useEffect(() => {
    if (
      !cameraOpen ||
      !stream ||
      !videoRef.current
    ) {
      return;
    }

    const video =
      videoRef.current;

    video.srcObject = stream;

    video.play().catch((err) => {
      console.error(err);

      setError(
        "Camera opened but video could not start."
      );
    });
  }, [cameraOpen, stream]);

  function stopCamera() {
    if (stream) {
      stream
        .getTracks()
        .forEach((track) =>
          track.stop()
        );
    }

    if (videoRef.current) {
      videoRef.current.srcObject =
        null;
    }

    setStream(null);
    setCameraOpen(false);
  }

  function takePhoto() {
    const video =
      videoRef.current;

    const canvas =
      canvasRef.current;

    if (!video || !canvas) {
      setError(
        "Camera is not ready."
      );

      return;
    }

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setError(
        "Camera is still loading. Try again in a moment."
      );

      return;
    }

    canvas.width =
      video.videoWidth;

    canvas.height =
      video.videoHeight;

    const context =
      canvas.getContext("2d");

    if (!context) {
      setError(
        "Could not capture image."
      );

      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError(
            "Could not create photo."
          );

          return;
        }

        const file =
          new File(
            [blob],
            `receipt-${Date.now()}.jpg`,
            {
              type: "image/jpeg",
            }
          );

        if (preview) {
          URL.revokeObjectURL(
            preview
          );
        }

        const imageUrl =
          URL.createObjectURL(blob);

        setImage(file);
        setPreview(imageUrl);

        setDetected(null);
        setSaved(false);
        setError("");

        stopCamera();
      },

      "image/jpeg",
      0.9
    );
  }

  function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please upload an image."
      );

      return;
    }

    if (preview) {
      URL.revokeObjectURL(
        preview
      );
    }

    setImage(file);

    setPreview(
      URL.createObjectURL(file)
    );

    setDetected(null);
    setSaved(false);
    setError("");

    stopCamera();
  }

  function removeImage() {
    if (preview) {
      URL.revokeObjectURL(
        preview
      );
    }

    setImage(null);
    setPreview(null);
    setDetected(null);
    setSaved(false);
    setError("");
  }

  function fileToBase64(
    file: File
  ): Promise<string> {
    return new Promise(
      (resolve, reject) => {
        const reader =
          new FileReader();

        reader.onload = () => {
          resolve(
            reader.result as string
          );
        };

        reader.onerror =
          reject;

        reader.readAsDataURL(
          file
        );
      }
    );
  }

  async function analyzeReceipt() {
    if (!image) {
      setError(
        "Take or upload a receipt first."
      );

      return;
    }

    try {
      setLoading(true);

      setError("");
      setDetected(null);

      const base64 =
        await fileToBase64(
          image
        );

      const response =
        await fetch(
          "/api/scan-receipt",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              image: base64,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Analysis failed."
        );
      }

      setDetected({
        description:
          result.description || "",

        amount:
          Number(result.amount) || 0,

        currency:
          result.currency === "IDR"
            ? "IDR"
            : "AUD",

        date:
          result.date || "",

        type:
          result.type === "income"
            ? "income"
            : "expense",

        category:
          result.category ||
          "Other",

        confidence:
          Number(
            result.confidence
          ) || 0,
      });
    } catch (err) {
      console.error(err);

      setError(
        "AI could not analyze this image. Try a clearer photo."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveTransaction() {
    if (!detected) return;

    try {
      setSaving(true);
      setError("");

      let normalizedAUDAmount =
        detected.amount;

      if (
        detected.currency === "IDR"
      ) {
        const rateResponse =
          await fetch(
            "/api/exchange-rate"
          );

        if (
          !rateResponse.ok
        ) {
          throw new Error(
            "Could not get exchange rate for IDR conversion."
          );
        }

        const rateData =
          await rateResponse.json();

        const audToIdr =
          Number(
            rateData.rate
          );

        if (
          !audToIdr ||
          audToIdr <= 0
        ) {
          throw new Error(
            "Invalid exchange rate."
          );
        }

        normalizedAUDAmount =
          detected.amount /
          audToIdr;
      }

      const { error } =
        await supabase
          .from("transactions")
          .insert([
            {
              date:
                detected.date,

              description:
                detected.description,

              amount:
                normalizedAUDAmount,

              original_amount:
                detected.amount,

              currency:
                detected.currency,

              type:
                detected.type,

              category:
                detected.category,

              source:
                "receipt",
            },
          ]);

      if (error) {
        throw error;
      }

      setSaved(true);
    } catch (err) {
      console.error(
        "Save error:",
        err
      );

      if (
        err instanceof Error
      ) {
        setError(
          err.message
        );
      } else {
        setError(
          "Could not save transaction."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    return () => {
      stream
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );
    };
  }, [stream]);

  return (
    <main className="min-h-screen bg-[#eef4ee] p-4 text-slate-900 sm:p-6">

      <div className="mx-auto max-w-4xl">

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
            AI receipt scanner
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Scan Receipt
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
            Take a photo or upload a receipt. Coinest will extract the amount,
            currency, date, merchant, and category automatically.
          </p>

        </div>

        {/* ALERTS */}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {saved && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            Transaction saved successfully.
          </div>
        )}

        {/* SCANNER CARD */}

        <div className="overflow-hidden rounded-[28px] bg-white shadow-sm">

          {/* CARD HEADER */}

          <div className="border-b border-slate-100 p-5 sm:p-6">

            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-[#eff5ea] p-3 text-green-800">
                <Camera size={21} />
              </div>

              <div>

                <p className="font-bold">
                  Receipt Capture
                </p>

                <p className="text-sm text-slate-500">
                  Use your camera or upload an existing image.
                </p>

              </div>

            </div>

          </div>

          <div className="p-4 sm:p-6">

            {/* INITIAL SCREEN */}

            {!cameraOpen &&
              !preview && (

                <div className="rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center sm:px-10 sm:py-14">

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eff5ea] text-green-800">
                    <Camera
                      size={30}
                    />
                  </div>

                  <h2 className="mt-5 text-xl font-bold">
                    Add a receipt
                  </h2>

                  <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                    Take a clear photo of the receipt or choose one from your device.
                  </p>

                  <div className="mt-7 grid gap-3 sm:grid-cols-2">

                    <button
                      type="button"
                      onClick={
                        openCamera
                      }
                      className="flex items-center justify-center gap-2 rounded-2xl bg-[#214f45] px-5 py-4 font-semibold text-white transition hover:bg-green-900"
                    >
                      <Camera
                        size={18}
                      />
                      Open Camera
                    </button>

                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 font-semibold text-slate-700 transition hover:bg-slate-50">

                      <Upload
                        size={18}
                      />

                      Upload Image

                      <input
                        type="file"
                        accept="image/*"
                        onChange={
                          handleUpload
                        }
                        className="hidden"
                      />

                    </label>

                  </div>

                </div>

              )}

            {/* CAMERA */}

            {cameraOpen &&
              !preview && (

                <div>

                  <div className="overflow-hidden rounded-[24px] bg-black">

                    <video
                      ref={
                        videoRef
                      }
                      autoPlay
                      playsInline
                      muted
                      className="aspect-[3/4] w-full object-cover sm:aspect-video"
                    />

                  </div>

                  <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">

                    <button
                      type="button"
                      onClick={
                        takePhoto
                      }
                      className="flex items-center justify-center gap-2 rounded-2xl bg-[#214f45] py-4 font-semibold text-white"
                    >
                      <Camera
                        size={18}
                      />
                      Take Photo
                    </button>

                    <button
                      type="button"
                      onClick={
                        stopCamera
                      }
                      className="rounded-2xl border border-slate-200 px-5 font-semibold text-slate-600"
                    >
                      Cancel
                    </button>

                  </div>

                </div>

              )}

            {/* IMAGE PREVIEW */}

            {preview && (

              <div>

                <div className="relative overflow-hidden rounded-[24px] bg-slate-100">

                  <img
                    src={preview}
                    alt="Receipt preview"
                    className="max-h-[600px] w-full object-contain"
                  />

                  <button
                    type="button"
                    onClick={
                      removeImage
                    }
                    className="absolute right-3 top-3 rounded-full bg-black/70 p-2.5 text-white backdrop-blur"
                  >
                    <X
                      size={18}
                    />
                  </button>

                </div>

                {!detected && (

                  <button
                    type="button"
                    onClick={
                      analyzeReceipt
                    }
                    disabled={
                      loading
                    }
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#214f45] p-4 font-semibold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >

                    {loading ? (
                      <RefreshCw
                        size={18}
                        className="animate-spin"
                      />
                    ) : (
                      <Sparkles
                        size={18}
                      />
                    )}

                    {loading
                      ? "Analyzing Receipt..."
                      : "Analyze Receipt"}

                  </button>

                )}

              </div>

            )}

          </div>

        </div>

        {/* DETECTED TRANSACTION */}

        {detected && (

          <div className="mt-5 overflow-hidden rounded-[28px] bg-white shadow-sm">

            {/* DETECTED HEADER */}

            <div className="border-b border-slate-100 p-5 sm:p-6">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
                    AI detected
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    Review Transaction
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Check the detected details before saving.
                  </p>

                </div>

                <div className="w-fit rounded-full bg-[#eff5ea] px-4 py-2 text-sm font-semibold text-green-800">
                  {detected.confidence}% confidence
                </div>

              </div>

            </div>

            {/* FORM */}

            <div className="space-y-5 p-5 sm:p-6">

              {/* DESCRIPTION */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>

                <input
                  value={
                    detected.description
                  }
                  onChange={(e) =>
                    setDetected({
                      ...detected,
                      description:
                        e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-100"
                />

              </div>

              {/* AMOUNT + CURRENCY */}

              <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Amount ({detected.currency})
                  </label>

                  <div className="relative">

                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 font-semibold text-slate-500">
                      {detected.currency ===
                      "AUD"
                        ? "A$"
                        : "Rp"}
                    </div>

                    <input
                      type="number"
                      step={
                        detected.currency ===
                        "IDR"
                          ? "1"
                          : "0.01"
                      }
                      value={
                        detected.amount
                      }
                      onChange={(e) =>
                        setDetected({
                          ...detected,
                          amount:
                            Number(
                              e.target.value
                            ),
                        })
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-14 pr-4 text-lg font-semibold outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-100"
                    />

                  </div>

                </div>

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Currency
                  </label>

                  <select
                    value={
                      detected.currency
                    }
                    onChange={(e) =>
                      setDetected({
                        ...detected,
                        currency:
                          e.target.value as
                            | "AUD"
                            | "IDR",
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-100"
                  >
                    <option value="AUD">
                      AUD — Australian Dollar
                    </option>

                    <option value="IDR">
                      IDR — Indonesian Rupiah
                    </option>
                  </select>

                </div>

              </div>

              {/* DATE */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Date
                </label>

                <input
                  type="date"
                  value={
                    detected.date
                  }
                  onChange={(e) =>
                    setDetected({
                      ...detected,
                      date:
                        e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-100"
                />

              </div>

              {/* TYPE + CATEGORY */}

              <div className="grid gap-4 sm:grid-cols-2">

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Type
                  </label>

                  <select
                    value={
                      detected.type
                    }
                    onChange={(e) =>
                      setDetected({
                        ...detected,
                        type:
                          e.target.value as
                            | "income"
                            | "expense",
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-100"
                  >
                    <option value="expense">
                      Expense
                    </option>

                    <option value="income">
                      Income
                    </option>
                  </select>

                </div>

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Category
                  </label>

                  <select
                    value={
                      detected.category
                    }
                    onChange={(e) =>
                      setDetected({
                        ...detected,
                        category:
                          e.target.value,
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-100"
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
                          {category}
                        </option>
                      )
                    )}

                  </select>

                </div>

              </div>

              {/* CURRENCY EXPLANATION */}

              <div className="rounded-2xl bg-[#eff5ea] p-4">

                <p className="text-sm font-semibold text-green-900">
                  {detected.currency ===
                  "IDR"
                    ? "Indonesian Rupiah detected"
                    : "Australian Dollar detected"}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {detected.currency ===
                  "IDR"
                    ? "The original IDR amount will be preserved and converted to AUD using the exchange rate when you save."
                    : "This amount will be stored directly as AUD."}
                </p>

              </div>

              {/* SAVE */}

              <button
                type="button"
                onClick={
                  saveTransaction
                }
                disabled={
                  saving ||
                  saved
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#214f45] p-4 font-semibold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-50"
              >

                <Save
                  size={18}
                />

                {saved
                  ? "Transaction Saved"
                  : saving
                  ? "Saving..."
                  : "Save Transaction"}

              </button>

              {saved && (

                <Link
                  href="/"
                  className="block w-full rounded-2xl border border-green-200 bg-green-50 p-4 text-center font-semibold text-green-800"
                >
                  View Dashboard
                </Link>

              )}

            </div>

          </div>

        )}

        {/* TIP */}

        {!detected && (

          <div className="mt-5 rounded-2xl bg-[#eff5ea] p-4 text-sm text-slate-600">

            <p className="font-semibold text-green-900">
              For best results
            </p>

            <p className="mt-1">
              Keep the receipt flat, make sure the total and currency are visible,
              and avoid shadows or blurry photos.
            </p>

          </div>

        )}

        <canvas
          ref={
            canvasRef
          }
          className="hidden"
        />

      </div>

    </main>
  );
}