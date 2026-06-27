"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, Download, FileSpreadsheet, FileText, ChevronDown,
  X, CheckCircle, AlertCircle, Loader2, Table2, FileDown,
} from "lucide-react";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ImportColumn {
  key: string;
  label: string;
  required: boolean;
  hint?: string;
}

export interface PageImportExportConfig {
  label: string;
  getData: () => Promise<any[]>;
  importConfig?: {
    endpoint: string;
    columns: ImportColumn[];
    templateRow: Record<string, string | number | boolean>;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function flattenRow(row: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) { out[k] = ""; continue; }
    if (typeof v === "object") {
      for (const [k2, v2] of Object.entries(v as any)) {
        out[`${k}.${k2}`] = String(v2 ?? "");
      }
    } else {
      out[k] = String(v);
    }
  }
  return out;
}

function downloadCSV(rows: any[], filename: string) {
  const flat = rows.map(flattenRow);
  if (!flat.length) return;
  const headers = Object.keys(flat[0]);
  const csv = [
    headers.join(","),
    ...flat.map(r => headers.map(h => {
      const v = r[h] ?? "";
      return v.includes(",") || v.includes('"') || v.includes("\n")
        ? `"${v.replace(/"/g, '""')}"`
        : v;
    }).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  triggerDownload(blob, `rccg-${filename}-${today()}.csv`);
}

async function downloadExcel(rows: any[], filename: string) {
  const XLSX = (await import("xlsx")).default;
  const flat = rows.map(flattenRow);
  const ws   = XLSX.utils.json_to_sheet(flat);
  const wb   = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, filename.slice(0, 31));
  XLSX.writeFile(wb, `rccg-${filename}-${today()}.xlsx`);
}

async function downloadTemplateExcel(columns: ImportColumn[], templateRow: Record<string, any>, label: string) {
  const XLSX = (await import("xlsx")).default;
  const headers = columns.map(c => c.label + (c.required ? " *" : ""));
  const values  = columns.map(c => String(templateRow[c.key] ?? ""));
  const ws = XLSX.utils.aoa_to_sheet([headers, values]);
  // Column widths
  ws["!cols"] = columns.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, `rccg-${label.toLowerCase()}-import-template.xlsx`);
}

function exportAsPDF(rows: any[], title: string) {
  const flat = rows.map(flattenRow);
  if (!flat.length) return;
  const headers = Object.keys(flat[0]).slice(0, 12);
  const html = `<!DOCTYPE html><html><head><title>${title}</title><style>
    body{font-family:Arial,sans-serif;font-size:10px;padding:16px;color:#1a1a1a}
    h2{font-size:14px;margin-bottom:8px}
    p{font-size:10px;color:#666;margin-bottom:12px}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}
    th{background:#f0f0f0;font-weight:bold;font-size:9px;text-transform:uppercase}
    td{font-size:9px}
    tr:nth-child(even){background:#f9f9f9}
  </style></head><body>
  <h2>${title}</h2>
  <p>Exported ${new Date().toLocaleDateString("en-NG", {day:"numeric",month:"long",year:"numeric"})} · ${flat.length} records</p>
  <table>
    <thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${flat.map(r=>`<tr>${headers.map(h=>`<td>${r[h]??""}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("Allow pop-ups to export PDF"); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

async function parseFile(file: File): Promise<Record<string, string>[]> {
  if (file.name.endsWith(".csv") || file.type === "text/csv") {
    return parseCSV(await file.text());
  }
  const XLSX = (await import("xlsx")).default;
  const buf  = await file.arrayBuffer();
  const wb   = XLSX.read(buf, { type: "buffer" });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row;
  });
}

// Map template column labels → keys (handles "First Name *" → "firstName")
function mapHeaders(parsed: Record<string, string>[], columns: ImportColumn[]): Record<string, string>[] {
  const labelToKey: Record<string, string> = {};
  columns.forEach(c => {
    labelToKey[c.label.toLowerCase()] = c.key;
    labelToKey[(c.label + " *").toLowerCase()] = c.key;
    labelToKey[c.key.toLowerCase()] = c.key;
  });
  return parsed.map(row => {
    const mapped: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      const norm = k.toLowerCase().trim();
      mapped[labelToKey[norm] ?? k] = v;
    }
    return mapped;
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function today() { return new Date().toISOString().split("T")[0]; }

// ─── Import Modal ─────────────────────────────────────────────────────────────
function ImportModal({
  config,
  onClose,
}: {
  config: PageImportExportConfig;
  onClose: () => void;
}) {
  const ic = config.importConfig!;
  const [step, setStep]     = useState<"upload" | "preview" | "done">("upload");
  const [dragging, setDrag] = useState(false);
  const [loading, setLoad]  = useState(false);
  const [rows, setRows]     = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const handleFile = useCallback(async (file: File) => {
    setError(null); setLoad(true);
    try {
      const parsed = await parseFile(file);
      const mapped = mapHeaders(parsed, ic.columns);
      if (!mapped.length) { setError("File appears to be empty."); setLoad(false); return; }
      setRows(mapped);
      setStep("preview");
    } catch (e: any) {
      setError(`Could not read file: ${e.message}`);
    } finally { setLoad(false); }
  }, [ic.columns]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = async () => {
    setLoad(true); setError(null);
    try {
      const res = await api.post(ic.endpoint, { rows });
      setResult(res.data);
      setStep("done");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Import failed. Check the data and try again.");
    } finally { setLoad(false); }
  };

  const previewCols = ic.columns.map(c => c.key);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#145C14]/10 flex items-center justify-center">
              <Upload size={15} className="text-[#145C14]" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">
                Import {config.label}
              </h2>
              <p className="text-xs text-gray-400">Upload a CSV or Excel file</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* ── STEP: UPLOAD ── */}
          {step === "upload" && (
            <>
              {/* Template download */}
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs font-bold text-blue-800 dark:text-blue-300">Need a template?</p>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">Download the Excel template with the correct columns and an example row.</p>
                </div>
                <button
                  onClick={() => downloadTemplateExcel(ic.columns, ic.templateRow, config.label)}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-blue-900/40 border border-blue-300 dark:border-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/60 transition whitespace-nowrap ml-4"
                >
                  <FileDown size={13} /> Template
                </button>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition
                  ${dragging ? "border-[#145C14] bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-600 hover:border-[#145C14]/50 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
              >
                {loading ? (
                  <Loader2 size={28} className="text-[#145C14] animate-spin" />
                ) : (
                  <FileSpreadsheet size={28} className="text-gray-300 dark:text-gray-500" />
                )}
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    {loading ? "Reading file…" : "Drop your file here or click to browse"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Supports .csv and .xlsx files</p>
                </div>
                <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>

              {/* Column guide */}
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Expected columns</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ic.columns.map(c => (
                    <div key={c.key} className="flex items-start gap-1.5 text-[11px]">
                      <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.required ? "bg-[#145C14]" : "bg-gray-300"}`} />
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{c.label}</span>
                      {c.hint && <span className="text-gray-400">— {c.hint}</span>}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#145C14] mr-1 align-middle" />Required &nbsp;
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300 mr-1 align-middle" />Optional
                </p>
              </div>
            </>
          )}

          {/* ── STEP: PREVIEW ── */}
          {step === "preview" && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table2 size={15} className="text-[#145C14]" />
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{rows.length} rows ready to import</p>
                </div>
                <button onClick={() => setStep("upload")} className="text-xs text-gray-400 hover:text-gray-600 underline">
                  Upload a different file
                </button>
              </div>

              {/* Preview table */}
              <div className="overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 max-h-64">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <th className="px-3 py-2 text-left font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">#</th>
                      {previewCols.filter(k => rows[0]?.[k] !== undefined).map(k => (
                        <th key={k} className="px-3 py-2 text-left font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {ic.columns.find(c => c.key === k)?.label ?? k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 8).map((row, i) => (
                      <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                        {previewCols.filter(k => rows[0]?.[k] !== undefined).map(k => (
                          <td key={k} className="px-3 py-1.5 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[140px] truncate">
                            {row[k] || <span className="text-gray-300 italic">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 8 && (
                  <div className="px-3 py-2 text-[10px] text-gray-400 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    + {rows.length - 8} more rows
                  </div>
                )}
              </div>

              {/* Validation check */}
              {(() => {
                const missing = ic.columns.filter(c => c.required && rows.some(r => !r[c.key]));
                if (missing.length) return (
                  <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 text-xs">
                    <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-800 dark:text-amber-300">Missing required fields</p>
                      <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                        Some rows are missing: {missing.map(c => c.label).join(", ")}. Those rows will be skipped.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {/* ── STEP: DONE ── */}
          {step === "done" && result && (
            <div className="space-y-4">
              <div className={`rounded-xl p-5 text-center ${result.created > 0 ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700" : "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"}`}>
                <CheckCircle size={28} className={`mx-auto mb-2 ${result.created > 0 ? "text-green-500" : "text-gray-400"}`} />
                <p className="font-bold text-gray-800 dark:text-white text-lg">{result.created} record{result.created !== 1 ? "s" : ""} imported</p>
                {result.skipped > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{result.skipped} row{result.skipped !== 1 ? "s" : ""} skipped</p>
                )}
              </div>
              {result.errors.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Skipped rows</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <div key={i} className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">{e}</div>
                    ))}
                  </div>
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
          {step === "upload" && (
            <p className="text-[11px] text-gray-400">Files are processed locally before being sent to the server.</p>
          )}
          {step === "preview" && (
            <p className="text-[11px] text-gray-400">{rows.length} rows will be imported. Duplicates are automatically skipped.</p>
          )}
          {step === "done" && (
            <p className="text-[11px] text-gray-400">Refresh the page to see new records.</p>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              {step === "done" ? "Close" : "Cancel"}
            </button>
            {step === "preview" && (
              <button
                onClick={handleImport}
                disabled={loading}
                className="px-5 py-2 text-xs font-bold text-white bg-[#145C14] rounded-xl hover:bg-[#0f4a0f] transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? <><Loader2 size={12} className="animate-spin" /> Importing…</> : <><Upload size={12} /> Import {rows.length} rows</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Export Dropdown ──────────────────────────────────────────────────────────
export function ImportExportButton({ config }: { config: PageImportExportConfig }) {
  const [open,        setOpen]       = useState(false);
  const [showImport,  setShowImport] = useState(false);
  const [exporting,   setExporting]  = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const runExport = async (format: "csv" | "excel" | "pdf") => {
    setExporting(format); setOpen(false);
    try {
      const data = await config.getData();
      if (!data?.length) { alert("No data to export."); return; }
      const label = config.label.toLowerCase();
      if (format === "csv")   downloadCSV(data, label);
      if (format === "excel") await downloadExcel(data, label);
      if (format === "pdf")   exportAsPDF(data, `${config.label} — RCCG Great Joy Parish`);
    } catch {
      alert("Export failed. Please try again.");
    } finally { setExporting(null); }
  };

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-green-50 hover:text-[#145C14] hover:border-green-200 transition"
        >
          {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
          {exporting ? `Exporting…` : "Import / Export"}
          <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-50 overflow-hidden py-1.5">

            {/* Export section */}
            <div className="px-3 pt-1.5 pb-1">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Export</p>
            </div>
            {(["csv", "excel", "pdf"] as const).map(fmt => (
              <button key={fmt}
                onClick={() => runExport(fmt)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left"
              >
                {fmt === "csv"   && <FileText    size={13} className="text-green-500" />}
                {fmt === "excel" && <FileSpreadsheet size={13} className="text-emerald-600" />}
                {fmt === "pdf"   && <Download    size={13} className="text-red-500" />}
                Export as {fmt.toUpperCase()}
              </button>
            ))}

            {/* Import section */}
            {config.importConfig && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-700 mx-2 my-1.5" />
                <div className="px-3 pb-1">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Import</p>
                </div>
                <button
                  onClick={() => { setOpen(false); setShowImport(true); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left"
                >
                  <Upload size={13} className="text-[#145C14]" />
                  Import from CSV / Excel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {showImport && config.importConfig && (
        <ImportModal config={config} onClose={() => setShowImport(false)} />
      )}
    </>
  );
}
