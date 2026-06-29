"use client";

import { useState, useRef, useCallback } from "react";
import {
  ScanLine, Upload, X, CheckCircle, AlertCircle,
  Loader2, FileImage, ChevronRight, RefreshCw,
} from "lucide-react";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExtractedOffering {
  [category: string]: number;
}

interface ExtractedRow {
  date:        string;
  serviceType: string;
  offerings:   ExtractedOffering;
}

interface ScanSummary {
  totalRows:         number;
  totalTransactions: number;
  totalAmount:       number;
}

type Step = "upload" | "scanning" | "preview" | "importing" | "done";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  MINISTERS_TITHE:        "Ministers Tithe",
  TITHE:                  "Members Tithe",
  THANKSGIVING:           "Thanksgiving Offering",
  SUNDAY_LOVE_OFFERING:   "Sunday Love Offering",
  CRM:                    "CRM Offering",
  GOSPEL_FUND:            "Workers Offering",
  TRUST_FRUIT:            "First Fruit",
  FIRST_BORN_REDEMPTION:  "1st Born Redemption",
  SUNDAY_SCHOOL_OFFERING: "Sunday School Offering",
  JUNIOR_FELLOWSHIP:      "Junior Fellowship",
  HOME_FELLOWSHIP:        "Home Fellowship",
  CHURCH_PROJECT:         "Church Project",
};

const SERVICE_LABELS: Record<string, string> = {
  SUNDAY_SERVICE:   "Sunday",
  TUESDAY_SERVICE:  "Tuesday",
  THURSDAY_SERVICE: "Thursday",
};

function nk(n: number) {
  return n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
  try {
    return new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return d; }
}

// ─── Image Upload Zone ────────────────────────────────────────────────────────
function ImageZone({
  label, hint, file, onFile, accent,
}: {
  label:   string;
  hint:    string;
  file:    File | null;
  onFile:  (f: File) => void;
  accent:  string;
}) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handle = useCallback((f: File) => {
    if (f.type.startsWith("image/")) onFile(f);
  }, [onFile]);

  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-5 flex flex-col items-center gap-2 transition
        ${drag ? `border-${accent}-400 bg-${accent}-50 dark:bg-${accent}-900/20` : ""}
        ${file ? "border-green-400 bg-green-50 dark:bg-green-900/10" : `border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500`}`}
    >
      {file ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={URL.createObjectURL(file)}
            alt={label}
            className="w-full max-h-36 object-contain rounded-xl"
          />
          <p className="text-[11px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle size={11} /> {file.name}
          </p>
          <p className="text-[10px] text-gray-400">Click to replace</p>
        </>
      ) : (
        <>
          <FileImage size={28} className="text-gray-300 dark:text-gray-600" />
          <p className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">{label}</p>
          <p className="text-[11px] text-gray-400 text-center">{hint}</p>
          <p className="text-[10px] text-gray-300 dark:text-gray-600">JPG, PNG accepted</p>
        </>
      )}
      <input
        ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); }}
      />
    </div>
  );
}

// ─── Preview Table ────────────────────────────────────────────────────────────
function PreviewTable({ rows }: { rows: ExtractedRow[] }) {
  // Collect all categories that appear
  const allCategories = Array.from(
    new Set(rows.flatMap(r => Object.keys(r.offerings)))
  ).sort();

  const totalByCategory: Record<string, number> = {};
  allCategories.forEach(c => {
    totalByCategory[c] = rows.reduce((s, r) => s + (r.offerings[c] || 0), 0);
  });
  const grandTotal = Object.values(totalByCategory).reduce((a, b) => a + b, 0);

  return (
    <div className="overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-[11px] min-w-[600px]">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700/60">
            <th className="px-3 py-2 text-left font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">Date</th>
            <th className="px-3 py-2 text-left font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">Service</th>
            {allCategories.map(c => (
              <th key={c} className="px-3 py-2 text-right font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {CATEGORY_LABELS[c] ?? c}
              </th>
            ))}
            <th className="px-3 py-2 text-right font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">Row Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const rowTotal = Object.values(row.offerings).reduce((a, b) => a + b, 0);
            return (
              <tr key={i} className={`border-t border-gray-100 dark:border-gray-700 ${
                row.serviceType === "SUNDAY_SERVICE" ? "bg-amber-50/40 dark:bg-amber-900/5" : ""
              }`}>
                <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {fmtDate(row.date)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    row.serviceType === "SUNDAY_SERVICE"
                      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                      : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  }`}>
                    {SERVICE_LABELS[row.serviceType] ?? row.serviceType}
                  </span>
                </td>
                {allCategories.map(c => (
                  <td key={c} className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                    {row.offerings[c] ? <span>₦{nk(row.offerings[c])}</span> : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-bold text-gray-800 dark:text-white">
                  ₦{nk(rowTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/60 font-bold">
            <td className="px-3 py-2 text-gray-700 dark:text-gray-300" colSpan={2}>TOTALS</td>
            {allCategories.map(c => (
              <td key={c} className="px-3 py-2 text-right text-gray-800 dark:text-white">
                ₦{nk(totalByCategory[c])}
              </td>
            ))}
            <td className="px-3 py-2 text-right text-[#145C14] dark:text-green-400">
              ₦{nk(grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ScanOfferingSheet({ onClose, onImported }: {
  onClose:    () => void;
  onImported: () => void;
}) {
  const [step,            setStep]           = useState<Step>("upload");
  const [financeFile,     setFinanceFile]     = useState<File | null>(null);
  const [attendanceFile,  setAttendanceFile]  = useState<File | null>(null);
  const [extracted,       setExtracted]       = useState<ExtractedRow[]>([]);
  const [summary,         setSummary]         = useState<ScanSummary | null>(null);
  const [importResult,    setImportResult]    = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [error,           setError]           = useState<string | null>(null);

  // Convert File to base64
  const toBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = () => res((r.result as string).split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const handleScan = async () => {
    if (!financeFile || !attendanceFile) return;
    setStep("scanning"); setError(null);

    try {
      const [financeB64, attendanceB64] = await Promise.all([
        toBase64(financeFile),
        toBase64(attendanceFile),
      ]);

      const res = await api.post("/finance/scan", {
        financeImage:        financeB64,
        financeImageType:    financeFile.type,
        attendanceImage:     attendanceB64,
        attendanceImageType: attendanceFile.type,
      });

      setExtracted(res.data.extracted);
      setSummary(res.data.summary);
      setStep("preview");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Scanning failed. Check both images and try again.");
      setStep("upload");
    }
  };

  const handleImport = async () => {
    setStep("importing"); setError(null);
    try {
      const res = await api.post("/finance/scan/import", { rows: extracted });
      setImportResult(res.data);
      setStep("done");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Import failed.");
      setStep("preview");
    }
  };

  const reset = () => {
    setStep("upload"); setFinanceFile(null); setAttendanceFile(null);
    setExtracted([]); setSummary(null); setImportResult(null); setError(null);
  };

  const canScan = financeFile && attendanceFile;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#145C14]/10 flex items-center justify-center">
              <ScanLine size={17} className="text-[#145C14]" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">Scan Offering Sheet</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {step === "upload"    && "Upload the Finance sheet and Attendance sheet for the same month"}
                {step === "scanning"  && "Claude is reading both documents…"}
                {step === "preview"   && `Review ${extracted.length} service rows before importing`}
                {step === "importing" && "Creating transactions…"}
                {step === "done"      && "Import complete"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* UPLOAD STEP */}
          {(step === "upload" || step === "scanning") && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <ImageZone
                  label="Finance / Offering Sheet"
                  hint="The sheet with amount columns (Ministers Tithes, CRM, etc.)"
                  file={financeFile}
                  onFile={setFinanceFile}
                  accent="blue"
                />
                <ImageZone
                  label="Attendance / Progress Sheet"
                  hint="The sheet with dates and days (18/2/24 SUNDAY, etc.)"
                  file={attendanceFile}
                  onFile={setAttendanceFile}
                  accent="green"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-3 text-xs text-blue-700 dark:text-blue-400">
                <p className="font-bold mb-1">How it works</p>
                <p>Claude reads both images together — the Attendance sheet provides the dates, the Finance sheet provides the amounts. Both must be for the same month.</p>
              </div>
            </>
          )}

          {/* PREVIEW STEP */}
          {step === "preview" && extracted.length > 0 && (
            <>
              {/* Summary cards */}
              {summary && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Service Rows", value: summary.totalRows },
                    { label: "Transactions", value: summary.totalTransactions },
                    { label: "Total Amount", value: `₦${nk(summary.totalAmount)}` },
                  ].map(c => (
                    <div key={c.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3">
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">{c.label}</p>
                      <p className="text-base font-bold text-gray-800 dark:text-white mt-0.5">{c.value}</p>
                    </div>
                  ))}
                </div>
              )}

              <PreviewTable rows={extracted} />

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
                <p className="font-bold">Please verify before importing</p>
                <p className="mt-0.5">Check that amounts and dates match your original documents. Each row above becomes individual transactions in the Finance records. Church Project amounts will be recorded but excluded from Returns.</p>
              </div>
            </>
          )}

          {/* IMPORTING STEP */}
          {step === "importing" && (
            <div className="py-12 flex flex-col items-center gap-4">
              <Loader2 size={32} className="text-[#145C14] animate-spin" />
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300">Creating transactions…</p>
              <p className="text-xs text-gray-400">Please wait, do not close this window</p>
            </div>
          )}

          {/* DONE STEP */}
          {step === "done" && importResult && (
            <div className="space-y-4 py-4">
              <div className={`rounded-2xl p-6 text-center border ${
                importResult.created > 0
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
                  : "bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700"
              }`}>
                <CheckCircle size={32} className={`mx-auto mb-3 ${importResult.created > 0 ? "text-green-500" : "text-gray-400"}`} />
                <p className="text-xl font-bold text-gray-800 dark:text-white">{importResult.created} transaction{importResult.created !== 1 ? "s" : ""} created</p>
                {importResult.skipped > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{importResult.skipped} row{importResult.skipped !== 1 ? "s" : ""} skipped</p>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Skipped rows</p>
                  {importResult.errors.map((e, i) => (
                    <div key={i} className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">{e}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3 text-xs">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-[11px] text-gray-400">
            {step === "upload"  && "Both images are required"}
            {step === "preview" && "Totals should match your physical documents"}
            {step === "done"    && "You can now generate Returns for this month"}
          </div>
          <div className="flex gap-2">
            {step === "done" ? (
              <>
                <button onClick={reset}
                  className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-1.5">
                  <RefreshCw size={12} /> Scan Another Month
                </button>
                <button onClick={() => { onImported(); onClose(); }}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#145C14] rounded-xl hover:bg-[#0f4a0f] transition flex items-center gap-1.5">
                  Done <ChevronRight size={12} />
                </button>
              </>
            ) : step === "preview" ? (
              <>
                <button onClick={reset}
                  className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  Re-scan
                </button>
                <button onClick={handleImport}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#145C14] rounded-xl hover:bg-[#0f4a0f] transition flex items-center gap-1.5">
                  <Upload size={12} /> Import {summary?.totalTransactions} Transactions
                </button>
              </>
            ) : (
              <>
                <button onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  Cancel
                </button>
                <button onClick={handleScan} disabled={!canScan || step === "scanning"}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#145C14] rounded-xl hover:bg-[#0f4a0f] transition disabled:opacity-50 flex items-center gap-1.5">
                  {step === "scanning"
                    ? <><Loader2 size={12} className="animate-spin" /> Scanning…</>
                    : <><ScanLine size={12} /> Scan Documents</>}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
