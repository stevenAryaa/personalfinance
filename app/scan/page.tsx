"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  Camera,
  Upload,
  X,
  Sparkles,
  Save,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type DetectedTransaction = {
  description: string;
  amount: number;
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

  // --------------------------------
  // OPEN CAMERA
  // --------------------------------

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

  // --------------------------------
  // ATTACH CAMERA STREAM
  // --------------------------------

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

  // --------------------------------
  // STOP CAMERA
  // --------------------------------

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

  // --------------------------------
  // TAKE PHOTO
  // --------------------------------

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
          URL.createObjectURL(
            blob
          );

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

  // --------------------------------
  // UPLOAD IMAGE
  // --------------------------------

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

  // --------------------------------
  // REMOVE IMAGE
  // --------------------------------

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

  // --------------------------------
  // CONVERT IMAGE → BASE64
  // --------------------------------

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

  // --------------------------------
  // ANALYZE WITH GROQ
  // --------------------------------

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
          result.description ||
          "",

        amount:
          Number(result.amount) ||
          0,

        date:
          result.date ||
          "",

        type:
          result.type ===
          "income"
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

  // --------------------------------
  // SAVE TO SUPABASE
  // --------------------------------

  async function saveTransaction() {
    if (!detected) return;

    try {
      setSaving(true);
      setError("");

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
                detected.amount,

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
      console.error(err);

      setError(
        "Could not save the transaction."
      );
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------
  // CLEANUP
  // --------------------------------

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
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">

      <div className="mx-auto max-w-3xl">

        <Link
          href="/"
          className="mb-6 inline-block font-medium text-blue-600"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="text-4xl font-bold">
          Scan Receipt
        </h1>

        <p className="mt-3 text-lg text-slate-500">
          Take a photo or upload a receipt and let AI extract the transaction.
        </p>

        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* SAVED */}

        {saved && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
            Transaction saved successfully.
          </div>
        )}

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm">

          {/* INITIAL */}

          {!cameraOpen &&
            !preview && (
              <div className="rounded-3xl border-2 border-dashed border-slate-300 p-12 text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                  <Camera size={30} />
                </div>

                <h2 className="mt-5 text-xl font-semibold">
                  Add Receipt
                </h2>

                <p className="mt-2 text-slate-500">
                  Take a new photo or upload an image.
                </p>

                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">

                  <button
                    onClick={
                      openCamera
                    }
                    className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white"
                  >
                    <Camera
                      size={18}
                      className="mr-2 inline"
                    />

                    Open Camera
                  </button>

                  <label className="cursor-pointer rounded-xl border border-slate-300 px-6 py-3 font-semibold">

                    <Upload
                      size={18}
                      className="mr-2 inline"
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

                <div className="overflow-hidden rounded-3xl bg-black">

                  <video
                    ref={
                      videoRef
                    }
                    autoPlay
                    playsInline
                    muted
                    className="aspect-video w-full object-cover"
                  />

                </div>

                <div className="mt-5 flex gap-3">

                  <button
                    onClick={
                      takePhoto
                    }
                    className="flex-1 rounded-xl bg-blue-600 py-4 font-semibold text-white"
                  >
                    <Camera
                      size={18}
                      className="mr-2 inline"
                    />

                    Take Photo
                  </button>

                  <button
                    onClick={
                      stopCamera
                    }
                    className="rounded-xl border border-slate-300 px-6"
                  >
                    Cancel
                  </button>

                </div>
              </div>
            )}

          {/* IMAGE */}

          {preview && (
            <div>

              <div className="relative overflow-hidden rounded-3xl bg-slate-100">

                <img
                  src={preview}
                  alt="Receipt preview"
                  className="max-h-[500px] w-full object-contain"
                />

                <button
                  onClick={
                    removeImage
                  }
                  className="absolute right-4 top-4 rounded-full bg-black/70 p-2 text-white"
                >
                  <X size={20} />
                </button>

              </div>

              {!detected && (
                <button
                  onClick={
                    analyzeReceipt
                  }
                  disabled={
                    loading
                  }
                  className="mt-5 w-full rounded-xl bg-blue-600 p-4 font-semibold text-white disabled:opacity-50"
                >

                  <Sparkles
                    size={18}
                    className="mr-2 inline"
                  />

                  {loading
                    ? "Analyzing..."
                    : "Analyze Receipt"}

                </button>
              )}

            </div>
          )}
        </div>

        {/* DETECTED FORM */}

        {detected && (
          <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">

            <div className="mb-6 flex items-center justify-between">

              <div>
                <p className="text-sm font-medium text-blue-600">
                  AI DETECTED
                </p>

                <h2 className="text-2xl font-bold">
                  Review Transaction
                </h2>
              </div>

              <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600">
                {detected.confidence}% confidence
              </div>

            </div>

            <div className="space-y-5">

              {/* DESCRIPTION */}

              <div>
                <label className="mb-2 block font-medium">
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
                        e.target
                          .value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 p-3"
                />
              </div>

              {/* AMOUNT */}

              <div>
                <label className="mb-2 block font-medium">
                  Amount
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={
                    detected.amount
                  }
                  onChange={(e) =>
                    setDetected({
                      ...detected,
                      amount:
                        Number(
                          e.target
                            .value
                        ),
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 p-3"
                />
              </div>

              {/* DATE */}

              <div>
                <label className="mb-2 block font-medium">
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
                        e.target
                          .value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 p-3"
                />
              </div>

              {/* TYPE */}

              <div>
                <label className="mb-2 block font-medium">
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
                        e.target
                          .value as
                          | "income"
                          | "expense",
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 p-3"
                >

                  <option value="expense">
                    Expense
                  </option>

                  <option value="income">
                    Income
                  </option>

                </select>
              </div>

              {/* CATEGORY */}

              <div>
                <label className="mb-2 block font-medium">
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
                        e.target
                          .value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 p-3"
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

              {/* SAVE */}

              <button
                onClick={
                  saveTransaction
                }
                disabled={
                  saving ||
                  saved
                }
                className="w-full rounded-xl bg-green-600 p-4 font-semibold text-white disabled:opacity-50"
              >

                <Save
                  size={18}
                  className="mr-2 inline"
                />

                {saved
                  ? "Saved"
                  : saving
                    ? "Saving..."
                    : "Save Transaction"}

              </button>

            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="hidden"
        />

      </div>
    </main>
  );
}