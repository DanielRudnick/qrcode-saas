"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

type ErrorLevel = "L" | "M" | "Q" | "H";

const ERROR_LEVELS: { value: ErrorLevel; label: string; description: string }[] = [
  { value: "L", label: "Low (7%)", description: "Fastest scan" },
  { value: "M", label: "Medium (15%)", description: "Balanced" },
  { value: "Q", label: "Quartile (25%)", description: "Better recovery" },
  { value: "H", label: "High (30%)", description: "Most resilient" },
];

const SIZES = [128, 256, 512, 1024];

export default function QRGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState("https://example.com");
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [size, setSize] = useState(256);
  const [errorLevel, setErrorLevel] = useState<ErrorLevel>("M");
  const [margin, setMargin] = useState(4);
  const [error, setError] = useState("");

  const generate = useCallback(async () => {
    if (!canvasRef.current) return;
    const value = text.trim();
    if (!value) {
      setError("Enter text or a URL to generate a QR code.");
      return;
    }
    try {
      await QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin,
        color: { dark: fgColor, light: bgColor },
        errorCorrectionLevel: errorLevel,
      });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate QR code.");
    }
  }, [text, fgColor, bgColor, size, errorLevel, margin]);

  useEffect(() => {
    generate();
  }, [generate]);

  function downloadPNG() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "qrcode.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function downloadSVG() {
    const value = text.trim();
    if (!value) return;
    try {
      const svg = await QRCode.toString(value, {
        type: "svg",
        width: size,
        margin,
        color: { dark: fgColor, light: bgColor },
        errorCorrectionLevel: errorLevel,
      });
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "qrcode.svg";
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export SVG.");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Controls */}
      <div className="flex flex-col gap-6">
        {/* Text input */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            URL or text
          </label>
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-600 dark:focus:border-violet-400"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Foreground
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent"
              />
              <span className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                {fgColor}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Background
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent"
              />
              <span className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                {bgColor}
              </span>
            </div>
          </div>
        </div>

        {/* Size */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Size
          </label>
          <div className="flex gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  size === s
                    ? "border-violet-500 bg-violet-500 text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-violet-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-violet-600"
                }`}
              >
                {s}px
              </button>
            ))}
          </div>
        </div>

        {/* Error correction */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Error correction
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ERROR_LEVELS.map((lvl) => (
              <button
                key={lvl.value}
                onClick={() => setErrorLevel(lvl.value)}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  errorLevel === lvl.value
                    ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-violet-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                }`}
              >
                <div className="text-sm font-medium">{lvl.label}</div>
                <div className="text-xs opacity-60">{lvl.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Margin */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Quiet zone: {margin} modules
          </label>
          <input
            type="range"
            min={0}
            max={10}
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
        </div>
      </div>

      {/* Preview + download */}
      <div className="flex flex-col items-center gap-6">
        <div className="flex w-full flex-col items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <canvas
            ref={canvasRef}
            className="max-w-full rounded-xl shadow"
            style={{ width: Math.min(size, 280), height: Math.min(size, 280) }}
          />
        </div>
        <div className="flex w-full gap-3">
          <button
            onClick={downloadPNG}
            disabled={!!error || !text.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            PNG
          </button>
          <button
            onClick={downloadSVG}
            disabled={!!error || !text.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 shadow transition-colors hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-violet-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            SVG
          </button>
        </div>
      </div>
    </div>
  );
}
