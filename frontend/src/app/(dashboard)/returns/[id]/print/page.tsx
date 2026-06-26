"use client";

import { useState, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Printer, ArrowLeft, Loader2, Edit3, X } from "lucide-react";
import api from "@/lib/api";
import { MONTHS } from "@/lib/utils";
import { PARISH_INFO } from "@/lib/parish-info";

// ─── N:K formatter — exactly as printed on the official forms (no currency symbol) ──
function nk(n: number): string {
  return Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

interface PrintData {
  return: any;
  sessions: any[];
  grossByCategory: Record<string, number>;
  houseFellowshipCount: number;
  activeMemberCount: number;
  treasurerName: string;
  sections: { A_B: any[]; C: any[]; D: any[]; D_extra: any[] };
  totals: {
    totalNationalIncome: number;
    totalB: number; totalBParish: number;
    totalC: number; totalCParish: number;
    totalD: number;
    grandTotalRemittable: number;
    grandTotalParishBalance: number;
  };
  monetaryColumn: { label: string; category: string; gross: number; rows: { label: string; pct: number; amount: number }[] }[];
}

interface PastoralForm {
  numberOfBirths: number; numberOfDeaths: number; numberOfMarriages: number;
  newlyBaptisedWorkers: number; avgVigilAttendance: number; avgSpecialProgrammeAttendance: number;
  numberOfBaptisedWorkers: number; numberOfNewWorkers: number; numberOfDeacons: number;
  numberOfAssistantPastors: number; numberOfFullPastors: number; numberOfUnordainedMinisters: number;
  areaRequiringPraise: string; areaRequiringPrayer: string; generalWellBeing: string; otherRemarks: string;
}

// ─── Pastoral edit modal — hidden from print, fills the manual fields ──
function PastoralEditModal({ initial, onClose, onSaved }: { initial: any; onClose: () => void; onSaved: () => void }) {
  const { register, handleSubmit } = useForm<PastoralForm>({
    defaultValues: {
      numberOfBirths: initial?.numberOfBirths ?? 0,
      numberOfDeaths: initial?.numberOfDeaths ?? 0,
      numberOfMarriages: initial?.numberOfMarriages ?? 0,
      newlyBaptisedWorkers: initial?.newlyBaptisedWorkers ?? 0,
      avgVigilAttendance: initial?.avgVigilAttendance ?? 0,
      avgSpecialProgrammeAttendance: initial?.avgSpecialProgrammeAttendance ?? 0,
      numberOfBaptisedWorkers: initial?.numberOfBaptisedWorkers ?? 0,
      numberOfNewWorkers: initial?.numberOfNewWorkers ?? 0,
      numberOfDeacons: initial?.numberOfDeacons ?? 0,
      numberOfAssistantPastors: initial?.numberOfAssistantPastors ?? 0,
      numberOfFullPastors: initial?.numberOfFullPastors ?? 0,
      numberOfUnordainedMinisters: initial?.numberOfUnordainedMinisters ?? 0,
      areaRequiringPraise: initial?.areaRequiringPraise ?? "",
      areaRequiringPrayer: initial?.areaRequiringPrayer ?? "",
      generalWellBeing: initial?.generalWellBeing ?? "",
      otherRemarks: initial?.otherRemarks ?? "",
    },
  });

  const save = useMutation({
    mutationFn: (d: PastoralForm) => api.patch(`/returns/${initial.id}/pastoral`, d),
    onSuccess:  () => { onSaved(); onClose(); },
  });

  const inp = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#145C14]";
  const numField = (name: keyof PastoralForm, label: string) => (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
      <input {...register(name)} type="number" min="0" className={inp} />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-serif font-bold text-gray-900 text-lg">Edit Pastoral Report Data</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit(d => save.mutate(d))} className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {numField("numberOfBirths", "Number of Births")}
            {numField("numberOfDeaths", "Number of Deaths")}
            {numField("numberOfMarriages", "Number of Marriages")}
            {numField("newlyBaptisedWorkers", "Newly Baptised Workers")}
            {numField("avgVigilAttendance", "Avg Vigil Attendance")}
            {numField("avgSpecialProgrammeAttendance", "Avg Special Programme")}
            {numField("numberOfBaptisedWorkers", "Number of Baptised Workers")}
            {numField("numberOfNewWorkers", "Number of New Worker(s)")}
            {numField("numberOfDeacons", "Number of Deacons/Deaconess")}
            {numField("numberOfAssistantPastors", "Number of Assistant Pastors")}
            {numField("numberOfFullPastors", "Number of Full Pastors")}
            {numField("numberOfUnordainedMinisters", "Number of Unordained Ministers")}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Any area requiring special praise to God?</label>
            <textarea {...register("areaRequiringPraise")} rows={2} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Any area requiring special prayer?</label>
            <textarea {...register("areaRequiringPrayer")} rows={2} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">General well-being (Physical/Spiritual/Financial)</label>
            <textarea {...register("generalWellBeing")} rows={2} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Others</label>
            <textarea {...register("otherRemarks")} rows={2} className={inp} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={save.isPending}
              className="flex-1 py-2.5 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] disabled:opacity-70 flex items-center justify-center gap-2">
              {save.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReturnPrintPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);

  const { data, isLoading, refetch } = useQuery<PrintData>({
    queryKey: ["return-print-data", id],
    queryFn:  () => api.get(`/returns/${id}/print-data`).then(r => r.data),
  });

  if (isLoading || !data) {
    return <div className="flex justify-center py-24"><Loader2 size={28} className="animate-spin text-gray-300" /></div>;
  }

  const ret = data.return;
  const monthName = MONTHS[ret.month - 1];
  const sessionsByDate = [...data.sessions].sort((a, b) => new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime());

  // Average attendance by weekday grouping (matches the form's Tuesday/Thursday/Sunday average row)
  const avgByDay = (dayIndex: number) => {
    const rows = sessionsByDate.filter(s => new Date(s.serviceDate).getDay() === dayIndex);
    if (rows.length === 0) return { men: 0, women: 0, children: 0, total: 0 };
    const sum = (k: string) => rows.reduce((s, r) => s + (r[k] || 0), 0);
    return {
      men:      Math.round(sum("menCount") / rows.length),
      women:    Math.round(sum("womenCount") / rows.length),
      children: Math.round(sum("childrenCount") / rows.length),
      total:    Math.round(sum("totalCount") / rows.length),
    };
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Toolbar — hidden when printing */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shadow-sm">
        <button onClick={() => router.push("/returns")} className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-700">
          <ArrowLeft size={15} /> Back to Returns
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
            <Edit3 size={14} /> Edit Pastoral Data
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A]">
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      <style>{`
        @page { margin: 0; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-page {
            margin: 0 auto !important;
            min-height: auto !important;
            box-shadow: none !important;
            overflow: visible !important;
            page-break-after: always;
            break-after: page;
          }
          .print-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
        }
        .print-page { width: 210mm; min-height: 297mm; margin: 20px auto; background: white; padding: 12mm; box-shadow: 0 0 8px rgba(0,0,0,0.1); font-family: Georgia, serif; color: #1a1a1a; }
        .form-table, .form-table th, .form-table td { border: 1px solid #333; border-collapse: collapse; }
        .form-table th, .form-table td { padding: 3px 6px; font-size: 10px; }
        .form-title { text-align: center; font-weight: bold; font-size: 14px; text-transform: uppercase; }
        .section-title { font-weight: bold; font-size: 12px; background: #e8e8e8; padding: 4px 8px; }
      `}</style>

      {/* ════════════════════ PAGE 1 — Monthly General Progress Report Sheet ════════════════════ */}
      <div className="print-page">
        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',marginBottom:'6px',gap:'8px'}}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="RCCG" style={{width:'52px',height:'52px',borderRadius:'50%',objectFit:'cover',flexShrink:0}} />
          <div style={{fontSize:'9px',lineHeight:'1.5',marginRight:'4px'}}>
            <div style={{fontWeight:'bold'}}>AREA: {PARISH_INFO.areaName.toUpperCase()}</div>
            <div>PARISH: {PARISH_INFO.parishName.toUpperCase()}</div>
            <div>FOR THE MONTH OF: {monthName.toUpperCase()}</div>
          </div>
          <div style={{textAlign:'center',flex:1}}>
            <div style={{fontWeight:'bold',fontSize:'10px'}}>{PARISH_INFO.province.toUpperCase()}</div>
            <div style={{fontWeight:'bold',fontSize:'13px',textTransform:'uppercase'}}>Monthly General Progress Report Sheet</div>
          </div>
          <div style={{fontSize:'10px',fontWeight:'bold',whiteSpace:'nowrap'}}>YEAR: {ret.year}</div>
        </div>

        {/* Combined Attendance + Monetary */}
        <div style={{display:'flex',border:'1px solid #333'}}>

          {/* Left: Attendance table */}
          <div style={{flex:1,minWidth:0}}>
            <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed',fontSize:'8.5px'}}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{border:'1px solid #333',padding:'2px 2px',textAlign:'center',fontWeight:'bold',background:'#f0f0f0'}}>DATE</th>
                  <th rowSpan={2} style={{border:'1px solid #333',padding:'2px 2px',textAlign:'center',fontWeight:'bold',background:'#f0f0f0'}}>DAYS</th>
                  <th colSpan={4} style={{border:'1px solid #333',padding:'2px 2px',textAlign:'center',fontWeight:'bold',background:'#f0f0f0'}}>ATTENDANCE</th>
                  <th rowSpan={2} style={{border:'1px solid #333',padding:'2px 2px',textAlign:'center',fontWeight:'bold',background:'#f0f0f0'}}>Preacher</th>
                  <th rowSpan={2} style={{border:'1px solid #333',padding:'2px 2px',textAlign:'center',fontWeight:'bold',background:'#f0f0f0'}}>New<br/>Converts</th>
                  <th rowSpan={2} style={{border:'1px solid #333',padding:'2px 2px',textAlign:'center',fontWeight:'bold',background:'#f0f0f0'}}>New<br/>Guest</th>
                  <th rowSpan={2} style={{border:'1px solid #333',padding:'2px 2px',textAlign:'center',fontWeight:'bold',background:'#f0f0f0'}}>Sunday<br/>School<br/>Attend</th>
                  <th rowSpan={2} style={{border:'1px solid #333',padding:'2px 2px',textAlign:'center',fontWeight:'bold',background:'#f0f0f0'}}>House<br/>Fellow-<br/>ship</th>
                </tr>
                <tr>
                  <th style={{border:'1px solid #333',padding:'2px 2px',textAlign:'center',fontWeight:'bold',background:'#f0f0f0'}}>Men</th>
                  <th style={{border:'1px solid #333',padding:'2px 2px',textAlign:'center',fontWeight:'bold',background:'#f0f0f0'}}>Women</th>
                  <th style={{border:'1px solid #333',padding:'2px 2px',textAlign:'center',fontWeight:'bold',background:'#f0f0f0'}}>Children</th>
                  <th style={{border:'1px solid #333',padding:'2px 2px',textAlign:'center',fontWeight:'bold',background:'#f0f0f0'}}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sessionsByDate.map(s => {
                  const d = new Date(s.serviceDate);
                  const isSunday = d.getDay() === 0;
                  const cellStyle = {border:'1px solid #333',padding:'1px 2px'};
                  const cStyle = {...cellStyle,textAlign:'center' as const};
                  return (
                    <tr key={s.id} style={isSunday ? {color:'#b91c1c',fontWeight:'bold'} : undefined}>
                      <td style={cellStyle}>{d.toLocaleDateString("en-GB",{day:'2-digit',month:'2-digit',year:'2-digit'})}</td>
                      <td style={cellStyle}>{DAY_NAMES[d.getDay()].toUpperCase()}</td>
                      <td style={cStyle}>{s.menCount||""}</td>
                      <td style={cStyle}>{s.womenCount||""}</td>
                      <td style={cStyle}>{s.childrenCount||""}</td>
                      <td style={{...cStyle,fontWeight:'bold'}}>{s.totalCount||""}</td>
                      <td style={cellStyle}>{s.preacher||""}</td>
                      <td style={cStyle}></td>
                      <td style={cStyle}></td>
                      <td style={cStyle}>{s.sundaySchoolCount||""}</td>
                      <td style={cStyle}>{s.houseFellowshipCount||""}</td>
                    </tr>
                  );
                })}
                {sessionsByDate.length === 0 && (
                  <tr><td colSpan={11} style={{border:'1px solid #333',padding:'8px',textAlign:'center',color:'#999'}}>No sessions logged for {monthName} {ret.year}</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{fontWeight:'bold',background:'#f5f5f5'}}>
                  <td colSpan={2} style={{border:'1px solid #333',padding:'2px 3px'}}>Average<br/>Attendance</td>
                  <td style={{border:'1px solid #333',padding:'2px 2px',textAlign:'center'}}>Men</td>
                  <td style={{border:'1px solid #333',padding:'2px 2px',textAlign:'center'}}>Women</td>
                  <td style={{border:'1px solid #333',padding:'2px 2px',textAlign:'center'}}>Children</td>
                  <td style={{border:'1px solid #333',padding:'2px 2px',textAlign:'center'}}>Total</td>
                  <td colSpan={5} style={{border:'1px solid #333',padding:'2px 3px'}}></td>
                </tr>
                {[{label:"TUESDAY",day:2},{label:"THURSDAY",day:4},{label:"SUNDAY",day:0}].map(row => {
                  const avg = avgByDay(row.day);
                  return (
                    <tr key={row.label} style={row.label==="SUNDAY"?{color:'#b91c1c',fontWeight:'bold'}:undefined}>
                      <td colSpan={2} style={{border:'1px solid #333',padding:'1px 3px'}}>{row.label}</td>
                      <td style={{border:'1px solid #333',padding:'1px 2px',textAlign:'center'}}>{avg.men}</td>
                      <td style={{border:'1px solid #333',padding:'1px 2px',textAlign:'center'}}>{avg.women}</td>
                      <td style={{border:'1px solid #333',padding:'1px 2px',textAlign:'center'}}>{avg.children}</td>
                      <td style={{border:'1px solid #333',padding:'1px 2px',textAlign:'center'}}>{avg.total}</td>
                      <td colSpan={5} style={{border:'1px solid #333',padding:'1px 3px'}}></td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={9} style={{border:'1px solid #333',padding:'2px 4px',textAlign:'right',fontWeight:'bold'}}>TOTAL AMOUNT REMITTED (NGN)</td>
                  <td colSpan={2} style={{border:'1px solid #333',padding:'2px 4px',textAlign:'center',fontWeight:'bold',background:'#d4edda'}}>NGN {nk(data.totals.totalB)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Right: Monetary panel */}
          <div style={{width:'132px',borderLeft:'1px solid #333',flexShrink:0,fontSize:'8px'}}>
            <div style={{textAlign:'center',fontWeight:'bold',borderBottom:'1px solid #333',padding:'3px 2px',background:'#f0f0f0',fontSize:'9px',textTransform:'uppercase'}}>Monetary</div>
            {data.monetaryColumn.map(item => (
              <Fragment key={item.category}>
                <div style={{fontWeight:'bold',borderBottom:'1px solid #ccc',padding:'2px 4px',background:'#fafafa',textTransform:'uppercase',fontSize:'7.5px'}}>{item.label}</div>
                {item.rows.map((r, i) => (
                  <div key={i} style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #eee',padding:'1px 4px'}}>
                    <span style={{color:'#444'}}>{r.label}</span>
                    <span style={{fontWeight:'bold'}}>N&nbsp;{nk(r.amount)}</span>
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Signatures */}
        <div style={{display:'flex',justifyContent:'space-between',marginTop:'24px',fontSize:'9px'}}>
          <div>
            <div style={{borderTop:'1px solid black',width:'160px',paddingTop:'2px'}}>{data.treasurerName||'\u00A0'}</div>
            <div>TREASURER&apos;S NAME, SIGN. &amp; DATE</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{borderTop:'1px solid black',width:'160px',paddingTop:'2px',marginLeft:'auto'}}>{PARISH_INFO.pastorTitle}. {PARISH_INFO.pastorFullName}</div>
            <div>PASTOR&apos;S NAME, SIGN. &amp; DATE</div>
          </div>
        </div>
      </div>

      {/* ════════════════════ PAGE 2 — Financial Report ════════════════════ */}
      <div className="print-page">
        {/* Header */}
        <div style={{textAlign:'center',marginBottom:'8px'}}>
          <div style={{fontWeight:'bold',fontSize:'12px'}}>THE REDEEMED CHRISTIAN CHURCH OF GOD</div>
          <div style={{fontWeight:'bold',fontSize:'11px'}}>{PARISH_INFO.province.toUpperCase()}</div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',margin:'2px 0'}}>
            <span style={{flex:1,textAlign:'center',fontWeight:'bold',fontSize:'12px',textTransform:'uppercase'}}>
              Financial Report for the Month of: {monthName.toUpperCase()}
            </span>
            <span style={{fontWeight:'bold',fontSize:'11px',whiteSpace:'nowrap'}}>YEAR: {ret.year}</span>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',marginTop:'2px'}}>
            <span>AREA: {PARISH_INFO.areaName.toUpperCase()} AREA</span>
            <span>PARISH: {PARISH_INFO.parishName.toUpperCase()}</span>
          </div>
        </div>

        {/* Section A */}
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'9px',marginBottom:'4px'}}>
          <thead>
            <tr>
              <th rowSpan={2} style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold'}}>S/NO.</th>
              <th rowSpan={2} style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold'}}>ACC.<br/>CODE</th>
              <th rowSpan={2} style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold'}}>ITEMS</th>
              <th colSpan={2} style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold'}}>NATIONAL</th>
              <th colSpan={2} style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold'}}>PARISH</th>
            </tr>
            <tr>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold'}}>%</th>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold'}}>N:K</th>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold'}}>%</th>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold'}}>N:K</th>
            </tr>
            <tr>
              <td style={{border:'1px solid #333',padding:'2px 3px',fontWeight:'bold',fontSize:'9px'}}>A.</td>
              <td style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px'}}></td>
              <td style={{border:'1px solid #333',padding:'2px 3px',fontWeight:'bold',fontSize:'9px'}}>NATIONAL REMITTABLE FUNDS</td>
              <td style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px'}}></td>
              <td style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px'}}></td>
              <td style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px'}}></td>
              <td style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px'}}></td>
            </tr>
          </thead>
          <tbody>
            {data.sections.A_B.map((r, i) => (
              <tr key={r.category}>
                <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',fontSize:'9px'}}>{i + 1}</td>
                <td style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px'}}></td>
                <td style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px'}}>{r.formLabel}</td>
                <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',fontSize:'9px'}}>100%</td>
                <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'right',fontSize:'9px'}}>{nk(r.gross)}</td>
                <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',fontSize:'9px',background:'#e8e8e8'}}>✕</td>
                <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',fontSize:'9px',background:'#e8e8e8'}}>✕</td>
              </tr>
            ))}
            <tr style={{fontWeight:'bold',background:'#f5f5f5'}}>
              <td colSpan={3} style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px'}}>TOTAL NATIONAL INCOME (A)</td>
              <td style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px'}}></td>
              <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'right',fontSize:'9px',fontWeight:'bold'}}>{nk(data.totals.totalNationalIncome)}</td>
              <td colSpan={2} style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px'}}></td>
            </tr>
          </tbody>
        </table>

        {/* Section B */}
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'9px',marginBottom:'4px'}}>
          <thead>
            <tr>
              <th colSpan={5} style={{border:'1px solid #333',padding:'2px 3px',textAlign:'left',background:'#e8e8e8',fontWeight:'bold',fontSize:'9px'}}>B. NATIONAL REMITTABLE</th>
              <th colSpan={2} style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#e8e8e8',fontWeight:'bold',fontSize:'9px'}}>PARISH BALANCE</th>
            </tr>
            <tr>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold',fontSize:'9px'}}>S/NO.</th>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold',fontSize:'9px'}}>ACC. CODE</th>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold',fontSize:'9px'}}>ITEMS</th>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold',fontSize:'9px'}}>%</th>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold',fontSize:'9px'}}>N:K</th>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold',fontSize:'9px'}}>%</th>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold',fontSize:'9px'}}>N:K</th>
            </tr>
          </thead>
          <tbody>
            {data.sections.A_B.map((r, i) => {
              const nonParish = r.waterfall.filter((t: any) => t.tier !== "PARISH");
              const parish    = r.waterfall.find((t: any) => t.tier === "PARISH");
              return nonParish.map((t: any, ti: number) => (
                <tr key={`${r.category}-${ti}`}>
                  {ti === 0 && <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',fontSize:'9px'}} rowSpan={nonParish.length}>{i + 1}</td>}
                  {ti === 0 && <td style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px'}} rowSpan={nonParish.length}></td>}
                  {ti === 0 && <td style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px'}} rowSpan={nonParish.length}>{r.formLabel}</td>}
                  <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',fontSize:'9px'}}>{t.pct.toFixed(1)}%{t.tier!=="NATIONAL"?` (${t.label})`:""}</td>
                  <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'right',fontSize:'9px'}}>{nk(t.amount)}</td>
                  {ti === 0 && <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',fontSize:'9px'}} rowSpan={nonParish.length}>{parish?`${parish.pct.toFixed(2)}%`:"0.00%"}</td>}
                  {ti === 0 && <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'right',fontSize:'9px'}} rowSpan={nonParish.length}>{parish&&parish.amount>0?nk(parish.amount):"-"}</td>}
                </tr>
              ));
            })}
            <tr style={{fontWeight:'bold'}}>
              <td colSpan={3} style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px',background:'#f8d7da'}}>TOTAL (B)</td>
              <td style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px',background:'#f8d7da'}}></td>
              <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'right',fontSize:'9px',background:'#f8d7da'}}>{nk(data.totals.totalB)}</td>
              <td style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px'}}></td>
              <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'right',fontSize:'9px',background:'#d4edda'}}>{nk(data.totals.totalBParish)}</td>
            </tr>
          </tbody>
        </table>

        {/* Section C */}
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'9px',marginBottom:'4px'}}>
          <thead>
            <tr>
              <th colSpan={4} style={{border:'1px solid #333',padding:'2px 3px',textAlign:'left',background:'#e8e8e8',fontWeight:'bold',fontSize:'9px'}}>C. PROVINCIAL REMITTABLE</th>
              <th colSpan={2} style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#e8e8e8',fontWeight:'bold',fontSize:'9px'}}>PARISH BALANCE</th>
            </tr>
            <tr>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold',fontSize:'9px'}}>S/NO.</th>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold',fontSize:'9px'}}>ITEMS</th>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold',fontSize:'9px'}}>%</th>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold',fontSize:'9px'}}>N:K</th>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold',fontSize:'9px'}}>%</th>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold',fontSize:'9px'}}>N:K</th>
            </tr>
          </thead>
          <tbody>
            {data.sections.C.map((r, i) => {
              const provincial = r.waterfall.find((t: any) => t.tier === "PROVINCIAL");
              const parish     = r.waterfall.find((t: any) => t.tier === "PARISH");
              const hasParish  = parish && parish.amount > 0;
              return (
                <tr key={r.category}>
                  <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',fontSize:'9px'}}>{i + 1}</td>
                  <td style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px'}}>{r.formLabel}</td>
                  <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',fontSize:'9px'}}>{provincial?`${provincial.pct.toFixed(0)}%`:"—"}</td>
                  <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'right',fontSize:'9px'}}>{provincial?nk(provincial.amount):"0.00"}</td>
                  <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',fontSize:'9px',background:hasParish?undefined:'#e8e8e8'}}>{hasParish?`${parish!.pct.toFixed(0)}%`:"✕"}</td>
                  <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'right',fontSize:'9px',background:hasParish?undefined:'#e8e8e8'}}>{hasParish?nk(parish!.amount):"✕"}</td>
                </tr>
              );
            })}
            <tr style={{fontWeight:'bold'}}>
              <td colSpan={3} style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px',background:'#f8d7da'}}>TOTAL (C)</td>
              <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'right',fontSize:'9px',background:'#f8d7da'}}>{nk(data.totals.totalC)}</td>
              <td style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px'}}></td>
              <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'right',fontSize:'9px',background:'#d4edda'}}>{nk(data.totals.totalCParish)}</td>
            </tr>
          </tbody>
        </table>

        {/* Section D */}
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'9px',marginBottom:'4px'}}>
          <thead>
            <tr>
              <th colSpan={3} style={{border:'1px solid #333',padding:'2px 3px',textAlign:'left',background:'#e8e8e8',fontWeight:'bold',fontSize:'9px'}}>D. ZONAL AND AREA REMITTABLE</th>
              <th colSpan={2} style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#e8e8e8',fontWeight:'bold',fontSize:'9px'}}>PARISH BALANCE</th>
            </tr>
            <tr>
              <th colSpan={2} style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold',fontSize:'9px'}}>ITEM</th>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold',fontSize:'9px'}}>%</th>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold',fontSize:'9px'}}>N:K</th>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold',fontSize:'9px'}}>%</th>
              <th style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',background:'#f0f0f0',fontWeight:'bold',fontSize:'9px'}}>N:K</th>
            </tr>
          </thead>
          <tbody>
            {data.sections.D.map(r => {
              const tier = r.waterfall[0];
              return (
                <tr key={r.category}>
                  <td colSpan={2} style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px'}}>{r.formLabel}</td>
                  <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',fontSize:'9px'}}>{tier?`${tier.pct.toFixed(1)}%`:"—"}</td>
                  <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'right',fontSize:'9px'}}>{tier?nk(tier.amount):"0.00"}</td>
                  <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',fontSize:'9px',background:'#e8e8e8'}}>✕</td>
                  <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',fontSize:'9px',background:'#e8e8e8'}}>✕</td>
                </tr>
              );
            })}
            {data.sections.D_extra.map((r: any, i: number) => (
              <tr key={`extra-${i}`}>
                <td colSpan={2} style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px'}}>{r.formLabel}</td>
                <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',fontSize:'9px'}}>{r.pct?`${r.pct.toFixed(1)}%`:"0.0%"}</td>
                <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'right',fontSize:'9px'}}>{nk(r.amount)}</td>
                <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',fontSize:'9px',background:'#e8e8e8'}}>✕</td>
                <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'center',fontSize:'9px',background:'#e8e8e8'}}>✕</td>
              </tr>
            ))}
            <tr style={{fontWeight:'bold'}}>
              <td colSpan={2} style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px',background:'#f8d7da'}}>TOTAL (D)</td>
              <td style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px',background:'#f8d7da'}}></td>
              <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'right',fontSize:'9px',background:'#f8d7da'}}>{nk(data.totals.totalD)}</td>
              <td colSpan={2} style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px'}}></td>
            </tr>
            <tr style={{fontWeight:'bold'}}>
              <td colSpan={2} style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px',background:'#fff3cd'}}>TOTAL (B+C+D)</td>
              <td style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px',background:'#fff3cd'}}></td>
              <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'right',fontSize:'9px',background:'#fff3cd'}}>{nk(data.totals.grandTotalRemittable)}</td>
              <td style={{border:'1px solid #333',padding:'2px 3px',fontSize:'9px',background:'#e8e8e8'}}>✕</td>
              <td style={{border:'1px solid #333',padding:'2px 3px',textAlign:'right',fontSize:'9px',background:'#d4edda'}}>{nk(data.totals.grandTotalParishBalance)}</td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div style={{display:'flex',justifyContent:'space-between',marginTop:'12px',fontSize:'9px'}}>
          <div>
            Pastor in Charge of Parish&apos;s Sign &amp; Date:&nbsp;
            <span style={{display:'inline-block',width:'100px',borderBottom:'1px solid black'}}>&nbsp;</span>
          </div>
          <div>
            Checked &amp; Collected by: Name&nbsp;
            <span style={{display:'inline-block',width:'100px',borderBottom:'1px solid black'}}>&nbsp;</span>
          </div>
        </div>
      </div>

      {/* ════════════════════ PAGE 3 — Pastoral Report ════════════════════ */}
      <div className="print-page text-sm">
        <div className="flex items-start gap-3 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="RCCG" className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
          <div className="text-center flex-1">
            <div className="font-bold">{PARISH_INFO.province.toUpperCase()}</div>
            <div className="form-title">Pastoral Report — {monthName} {ret.year}</div>
          </div>
        </div>

        <div className="font-bold text-base mb-2">A. PASTORAL</div>
        <table className="w-full text-sm">
          <tbody>
            {[
              ["1", "Number of Birth:", ret.numberOfBirths || "NONE"],
              ["2", "Number of Death:", ret.numberOfDeaths || "NONE"],
              ["3", "Number of Marriages:", ret.numberOfMarriages || "NONE"],
              ["5", "Number of House Fellowship Centres:", data.houseFellowshipCount],
              ["6", "Number of Newly Baptised Workers During the Month:", ret.newlyBaptisedWorkers || "NONE"],
              ["7", "Average Attendance at Vigil:", ret.avgVigilAttendance || ""],
              ["8", "Average Attendance of Other Special Programmes:", ret.avgSpecialProgrammeAttendance || ""],
              ["9", "Number of Baptised Workers:", ret.numberOfBaptisedWorkers || ""],
              ["10", "Number of New Worker(s):", ret.numberOfNewWorkers || "NONE"],
              ["11", "Number of Deacons/Deaconess:", ret.numberOfDeacons || ""],
              ["12", "Number of Assistant Pastors:", ret.numberOfAssistantPastors || "NONE"],
              ["13", "Number of Full Pastors:", ret.numberOfFullPastors || "NONE"],
              ["14", "Number of Unordained Ministers:", ret.numberOfUnordainedMinisters || ""],
            ].map(([num, label, val]) => (
              <tr key={num}>
                <td className="w-6 align-top py-1">{num}</td>
                <td className="py-1">{label}</td>
                <td className="text-right font-bold py-1 pr-4">{val}</td>
              </tr>
            ))}
            <tr>
              <td className="w-6 align-top py-1">15</td>
              <td colSpan={2} className="py-1">
                Name of Parish (Give Detailed Address of the Parish): {PARISH_INFO.fullAddress}.
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-3">Title &amp; Full Name of Pastor/Minister In-Charge (Surname First): {PARISH_INFO.pastorTitle} {PARISH_INFO.pastorFullName}</div>
        <div className="mt-1">Phone number of Pastor/Minister In-Charge of Parish: {PARISH_INFO.pastorPhone}</div>

        <div className="font-bold text-base mt-5 mb-2">GENERAL</div>
        <div className="space-y-3">
          <div><span className="font-semibold">1&nbsp;&nbsp;Any area requiring special praise to God?:</span> {ret.areaRequiringPraise || ""}</div>
          <div><span className="font-semibold">2&nbsp;&nbsp;Any area requiring special prayer?:</span> {ret.areaRequiringPrayer || ""}</div>
          <div>
            <span className="font-semibold">3&nbsp;&nbsp;General well-being of congregation: (Physical (Health), Spiritual (revival needed))? Financial etc.:</span>
            <div className="mt-1">{ret.generalWellBeing || ""}</div>
          </div>
          <div><span className="font-semibold italic">4&nbsp;&nbsp;Others</span> {ret.otherRemarks || ""}</div>
        </div>

        <div className="flex justify-between mt-12 pt-4 text-xs">
          <div>
            <div className="border-t border-black w-48 pt-1">{ret.submittedAt ? new Date(ret.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "____________"}</div>
            <div>Date</div>
          </div>
          <div className="text-right">
            <div className="border-t border-black w-48 pt-1">&nbsp;</div>
            <div>Signature</div>
          </div>
        </div>

        <div className="mt-10 text-xs">
          <div className="font-bold">NOTES:</div>
          {PARISH_INFO.noteRecipients.map((n, i) => <div key={i}>{n}</div>)}
        </div>
      </div>

      {showEdit && (
        <PastoralEditModal
          initial={ret}
          onClose={() => setShowEdit(false)}
          onSaved={() => { refetch(); qc.invalidateQueries({ queryKey: ["returns"] }); }}
        />
      )}
    </div>
  );
}
