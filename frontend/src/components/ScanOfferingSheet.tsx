"use client";

import { useState, useRef, useCallback } from "react";
import {
  ScanLine, Upload, X, CheckCircle, AlertCircle,
  Loader2, FileImage, ChevronRight, RefreshCw, Users, Receipt,
} from "lucide-react";
import api from "@/lib/api";

interface Offering { category: string; amount: number; paymentMethod: string; }
interface Attendance { men: number; women: number; children: number; total: number; preacher: string; }
interface ExtractedRow { date: string; serviceType: string; attendance: Attendance; offerings: Offering[]; }
type Step = "upload" | "scanning" | "preview" | "importing" | "done";

const CATEGORY_LABELS: Record<string, string> = {
  TITHE:"Members Tithe", MINISTERS_TITHE:"Ministers Tithe",
  SUNDAY_LOVE_OFFERING:"Sunday Love Offering", THANKSGIVING:"Thanksgiving",
  CRM:"CRM Offering", CHILDREN_TEENS_OFFERING:"Children/Teens Offering",
  TRUST_FRUIT:"First Fruit", FIRST_BORN_REDEMPTION:"1st Born Redemption",
  GOSPEL_FUND:"Workers Offering", HOUSE_FELLOWSHIP_OFFERING:"House Fellowship Offering",
  BUILDING_FUND:"Building Fund", WELFARE:"Welfare Offering",
  SPECIAL_DONATION:"Special Donation", PARTNERSHIP_SEED:"Partnership Seed",
  CONVENTION_LEVY:"Convention Levy", RUN:"RUN Offering",
  CSR:"CSR", OTHER_INCOME:"Other Income",
  HOLY_GHOST_CONGRESS:"Holy Ghost Congress", AFRICAN_MISSION_OFFERING:"African Mission Offering",
  CAMP_CLEARING:"Camp Clearing", SUNDAY_SCHOOL_OFFERING:"Sunday School Offering",
  JUNIOR_FELLOWSHIP:"Junior Fellowship", HOME_FELLOWSHIP:"Home Fellowship",
  GOOD_WOMEN_OFFERING:"Good Women Offering", RCCG_AUDITORIUM_CONTRIBUTION:"RCCG Auditorium Contribution",
  CSR_EDUCATION:"CSR Education", CONVENTION_CONGRESS_SUPPORT:"Convention/Congress Support",
  PASTORS_WELFARE_PURSE:"Pastors Welfare Purse", DAY_OUT_CARD:"Day Out Card",
  VICTORY_SERVICE:"Victory Service", SEED_FAITH_HOLY_COMMUNION:"Seed of Faith/Holy Communion",
  ZONE_LETS_GO_AFISHING:"Zone: Lets Go Afishing", CHURCH_PROJECT:"Church Project",
};
const SERVICE_LABELS: Record<string,string> = {
  SUNDAY_MORNING:"Sunday", TUESDAY:"Tuesday", THURSDAY:"Thursday",
};
const SERVICE_COLORS: Record<string,string> = {
  SUNDAY_MORNING:"bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  TUESDAY:"bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  THURSDAY:"bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
};

function nk(n: number) { return n.toLocaleString("en-NG",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtDate(d: string) {
  try { return new Date(d+"T12:00:00Z").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"}); }
  catch { return d; }
}

export function ScanOfferingSheet({ onClose, onImported }: { onClose:()=>void; onImported:()=>void; }) {
  const [step,          setStep]         = useState<Step>("upload");
  const [imageFile,     setImageFile]    = useState<File|null>(null);
  const [previewUrl,    setPreviewUrl]   = useState<string|null>(null);
  const [extracted,     setExtracted]    = useState<ExtractedRow[]>([]);
  const [importResult,  setImportResult] = useState<any>(null);
  const [error,         setError]        = useState<string|null>(null);
  const [drag,          setDrag]         = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file); setPreviewUrl(URL.createObjectURL(file)); setError(null);
  }, []);

  /**
   * Resize + compress the image client-side before sending.
   * Phone camera photos are often 3-8MB — base64-encoded that can exceed
   * Vercel's 4.5MB serverless request limit. Capping the longest side to
   * 1800px and exporting as JPEG q=0.82 keeps payloads well under 1.5MB
   * with no real loss in OCR accuracy.
   */
  const compressToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const MAX_DIM = 1800;
      let { width, height } = img;

      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round((height / width) * MAX_DIM); width = MAX_DIM; }
        else                 { width  = Math.round((width / height) * MAX_DIM); height = MAX_DIM; }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      resolve(dataUrl.split(",")[1]);
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
    img.src = url;
  });

  const handleScan = async () => {
    if (!imageFile) return;
    setStep("scanning"); setError(null);
    try {
      const b64 = await compressToBase64(imageFile);

      // Hard safety net — never send a payload that could hit Vercel's body limit
      const approxMB = (b64.length * 0.75) / (1024 * 1024);
      if (approxMB > 4) {
        setError("This photo is still too large after compression. Try cropping it to just the written notes, or split it into two smaller photos.");
        setStep("upload");
        return;
      }

      const res  = await api.post("/finance/scan", { image: b64, imageType: "image/jpeg" });
      const rows = res.data?.extracted;

      if (!Array.isArray(rows) || rows.length === 0) {
        setError("Could not detect any service records in this photo. Try a clearer, well-lit photo with the writing fully visible.");
        setStep("upload");
        return;
      }

      setExtracted(rows);
      setStep("preview");
    } catch (e: any) {
      const msg = typeof e?.response?.data?.message === "string"
        ? e.response.data.message
        : "Scanning failed. Make sure the image is clear and try again.";
      setError(msg);
      setStep("upload");
    }
  };

  const handleImport = async () => {
    setStep("importing"); setError(null);
    try {
      const res = await api.post("/finance/scan/import", { rows: extracted });
      setImportResult(res.data); setStep("done");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Import failed."); setStep("preview");
    }
  };

  const reset = () => {
    setStep("upload"); setImageFile(null); setPreviewUrl(null);
    setExtracted([]); setImportResult(null); setError(null);
  };

  const totalOfferings = extracted.reduce((s,r) => s+(r.offerings?.length??0), 0);
  const totalAmount    = extracted.reduce((s,r) => s+(r.offerings??[]).reduce((a,o) => a+Number(o.amount),0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#145C14]/10 flex items-center justify-center">
              <ScanLine size={17} className="text-[#145C14]" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">Scan Service Notes</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {step==="upload"   && "Photo of your handwritten weekly service record"}
                {step==="scanning" && "AI is reading your notes…"}
                {step==="preview"  && `Found ${extracted.length} services — review before saving`}
                {step==="importing"&& "Saving records…"}
                {step==="done"     && "All records saved successfully"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"><X size={16}/></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* UPLOAD */}
          {(step==="upload"||step==="scanning") && (
            <>
              <div
                onClick={()=>inputRef.current?.click()}
                onDragOver={e=>{e.preventDefault();setDrag(true);}}
                onDragLeave={()=>setDrag(false)}
                onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);}}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 flex flex-col items-center gap-3 transition
                  ${drag?"border-[#145C14] bg-green-50 dark:bg-green-900/20":""}
                  ${imageFile?"border-green-400 bg-green-50/50 dark:bg-green-900/10":"border-gray-200 dark:border-gray-600 hover:border-gray-300"}`}
              >
                {imageFile&&previewUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="notes" className="max-h-64 object-contain rounded-xl w-full"/>
                    <p className="text-xs font-bold text-green-600 flex items-center gap-1.5"><CheckCircle size={13}/>{imageFile.name} — click to replace</p>
                  </>
                ) : (
                  <>
                    <FileImage size={36} className="text-gray-300 dark:text-gray-600"/>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-600 dark:text-gray-300">Drop photo here or click to browse</p>
                      <p className="text-xs text-gray-400 mt-1">Handwritten weekly service notes</p>
                    </div>
                  </>
                )}
                <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}}/>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-3 text-xs text-blue-700 dark:text-blue-400 space-y-1">
                <p className="font-bold">Tips for best results</p>
                <p>• Good lighting, writing clearly visible</p>
                <p>• One photo can contain multiple weeks</p>
                <p>• Tuesday and Thursday will automatically post as CRM</p>
              </div>
            </>
          )}

          {/* PREVIEW */}
          {step==="preview" && extracted.length>0 && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {label:"Services",     value:extracted.length,      icon:<Users size={14} className="text-blue-500"/>},
                  {label:"Transactions", value:totalOfferings,          icon:<Receipt size={14} className="text-green-500"/>},
                  {label:"Total Amount", value:`₦${nk(totalAmount)}`,   icon:<CheckCircle size={14} className="text-[#145C14]"/>},
                ].map(c=>(
                  <div key={c.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 flex items-center gap-3">
                    {c.icon}
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">{c.label}</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">{c.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {extracted.map((row,i)=>(
                  <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SERVICE_COLORS[row.serviceType]??""}`}>
                          {SERVICE_LABELS[row.serviceType]??row.serviceType}
                        </span>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{fmtDate(row.date)}</span>
                      </div>
                      {row.attendance?.preacher&&<span className="text-[11px] text-gray-500">{row.attendance.preacher}</span>}
                    </div>
                    <div className="px-4 py-3 flex gap-6">
                      {row.attendance&&(
                        <div className="flex-shrink-0">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1"><Users size={10}/>Attendance</p>
                          <div className="flex gap-3 text-xs">
                            {[{l:"Men",v:row.attendance.men},{l:"Women",v:row.attendance.women},{l:"Children",v:row.attendance.children},{l:"Total",v:row.attendance.total,bold:true}].map(a=>(
                              <div key={a.l} className="text-center">
                                <p className={`font-bold text-gray-800 dark:text-white ${a.bold?"text-[#145C14] dark:text-green-400":""}`}>{a.v}</p>
                                <p className="text-[10px] text-gray-400">{a.l}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {row.attendance&&row.offerings?.length>0&&<div className="w-px bg-gray-200 dark:bg-gray-700 self-stretch"/>}
                      {row.offerings?.length>0&&(
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1"><Receipt size={10}/>Offerings</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {row.offerings.map((o,j)=>(
                              <div key={j} className="flex justify-between gap-2 text-xs">
                                <span className="text-gray-600 dark:text-gray-400 truncate">
                                  {CATEGORY_LABELS[o.category]??o.category}
                                  {o.paymentMethod==="TRANSFER"&&<span className="ml-1 text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-1 py-0.5 rounded">online</span>}
                                </span>
                                <span className="font-bold text-gray-800 dark:text-white whitespace-nowrap">₦{nk(o.amount)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between text-xs font-bold mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <span className="text-gray-400">Row total</span>
                            <span className="text-[#145C14] dark:text-green-400">₦{nk(row.offerings.reduce((s,o)=>s+Number(o.amount),0))}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
                <p className="font-bold">Check before saving</p>
                <p className="mt-0.5">Verify amounts and attendance match your original notes. Both attendance records and transactions will be created.</p>
              </div>
            </>
          )}

          {/* IMPORTING */}
          {step==="importing"&&(
            <div className="py-16 flex flex-col items-center gap-4">
              <Loader2 size={32} className="text-[#145C14] animate-spin"/>
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300">Saving records…</p>
            </div>
          )}

          {/* DONE */}
          {step==="done"&&importResult&&(
            <div className="space-y-4 py-4">
              <div className="rounded-2xl p-6 text-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
                <CheckCircle size={32} className="mx-auto mb-3 text-green-500"/>
                <p className="text-xl font-bold text-gray-800 dark:text-white">Done!</p>
                <div className="flex justify-center gap-6 mt-3 text-sm">
                  <div><p className="font-bold text-gray-800 dark:text-white">{importResult.sessionsCreated}</p><p className="text-xs text-gray-400">Attendance sessions</p></div>
                  <div><p className="font-bold text-gray-800 dark:text-white">{importResult.created}</p><p className="text-xs text-gray-400">Transactions</p></div>
                  {importResult.skipped>0&&<div><p className="font-bold text-amber-600">{importResult.skipped}</p><p className="text-xs text-gray-400">Skipped</p></div>}
                </div>
              </div>
              {importResult.errors?.length>0&&(
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {importResult.errors.map((e:string,i:number)=>(
                    <div key={i} className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">{e}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error&&(
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3 text-xs">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5"/>
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3 flex-shrink-0">
          <p className="text-[11px] text-gray-400">
            {step==="upload"  &&"JPG or PNG. One photo can cover multiple weeks."}
            {step==="preview" &&"Attendance sessions and finance transactions will both be created."}
            {step==="done"    &&"Go to Returns to generate this month's report."}
          </p>
          <div className="flex gap-2">
            {step==="done" ? (
              <>
                <button onClick={reset} className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-1.5">
                  <RefreshCw size={12}/>Scan Another
                </button>
                <button onClick={()=>{onImported();onClose();}} className="px-5 py-2 text-xs font-bold text-white bg-[#145C14] rounded-xl hover:bg-[#0f4a0f] transition flex items-center gap-1.5">
                  Done<ChevronRight size={12}/>
                </button>
              </>
            ):step==="preview"?(
              <>
                <button onClick={reset} className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">Re-scan</button>
                <button onClick={handleImport} className="px-5 py-2 text-xs font-bold text-white bg-[#145C14] rounded-xl hover:bg-[#0f4a0f] transition flex items-center gap-1.5">
                  <Upload size={12}/>Save All Records
                </button>
              </>
            ):(
              <>
                <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
                <button onClick={handleScan} disabled={!imageFile||step==="scanning"} className="px-5 py-2 text-xs font-bold text-white bg-[#145C14] rounded-xl hover:bg-[#0f4a0f] transition disabled:opacity-50 flex items-center gap-1.5">
                  {step==="scanning"?<><Loader2 size={12} className="animate-spin"/>Scanning…</>:<><ScanLine size={12}/>Scan Notes</>}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
