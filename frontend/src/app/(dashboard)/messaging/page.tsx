"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send, MessageSquare, Loader2, CheckCircle } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Department } from "@/types";

type Channel  = "WHATSAPP" | "SMS" | "EMAIL";
type Target   = "ALL" | "WORKERS" | "DEPARTMENT";

const TEMPLATES = [
  { id: "t1", label: "Service Reminder",    body: "Dear {name}, you are reminded of our Sunday service tomorrow at 9am. God bless you." },
  { id: "t2", label: "Tithe Reminder",      body: "Dear {name}, please remember to bring your tithe and offering as we gather to worship God this Sunday." },
  { id: "t3", label: "Workers Meeting",     body: "Dear {name}, there is a workers meeting this Saturday at 8am. Please ensure your attendance. Thank you." },
  { id: "t4", label: "Monthly Thanksgiving",body: "Dear {name}, our monthly thanksgiving service holds this Sunday. Come prepared to testify and worship." },
  { id: "t5", label: "Custom",              body: "" },
];

const CHANNEL_CONFIG: Record<Channel, { label: string; color: string }> = {
  WHATSAPP: { label: "WhatsApp", color: "bg-green-500"  },
  SMS:      { label: "SMS",      color: "bg-blue-500"   },
  EMAIL:    { label: "Email",    color: "bg-purple-500" },
};

export default function MessagingPage() {
  const [target,      setTarget]      = useState<Target>("ALL");
  const [deptId,      setDeptId]      = useState("");
  const [channel,     setChannel]     = useState<Channel>("WHATSAPP");
  const [templateId,  setTemplateId]  = useState("t1");
  const [body,        setBody]        = useState(TEMPLATES[0].body);
  const [sent,        setSent]        = useState(false);

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn:  () => api.get("/departments").then(r => r.data),
  });

  const send = useMutation({
    mutationFn: () => api.post("/messaging/send", { target, departmentId: deptId || undefined, channel, message: body }),
    onSuccess:  () => { setSent(true); setTimeout(() => setSent(false), 4000); },
  });

  const selectTemplate = (id: string) => {
    setTemplateId(id);
    const tpl = TEMPLATES.find(t => t.id === id);
    if (tpl && id !== "t5") setBody(tpl.body);
  };

  const charCount = body.length;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg">Messaging</h2>
        <p className="text-gray-400 text-sm mt-0.5">Send messages to members via WhatsApp, SMS or Email</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm divide-y divide-gray-100 dark:divide-gray-700">

        {/* Recipients */}
        <div className="p-5 space-y-3">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Recipients</p>
          <div className="grid grid-cols-3 gap-2">
            {(["ALL","WORKERS","DEPARTMENT"] as Target[]).map(t => (
              <button key={t} onClick={() => setTarget(t)}
                className={cn(
                  "py-2.5 rounded-xl text-sm font-bold border-2 transition",
                  target === t
                    ? "border-[#145C14] bg-[#145C14]/8 text-[#145C14]"
                    : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                )}>
                {t === "ALL" ? "All Members" : t === "WORKERS" ? "Workers Only" : "Department"}
              </button>
            ))}
          </div>
          {target === "DEPARTMENT" && (
            <select value={deptId} onChange={e => setDeptId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#145C14]">
              <option value="">Select department…</option>
              {departments?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
        </div>

        {/* Channel */}
        <div className="p-5 space-y-3">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Channel</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(CHANNEL_CONFIG) as Channel[]).map(c => (
              <button key={c} onClick={() => setChannel(c)}
                className={cn(
                  "py-2.5 rounded-xl text-sm font-bold border-2 transition",
                  channel === c
                    ? "border-[#145C14] bg-[#145C14]/8 text-[#145C14]"
                    : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                )}>
                {CHANNEL_CONFIG[c].label}
              </button>
            ))}
          </div>
        </div>

        {/* Template */}
        <div className="p-5 space-y-3">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Template</p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => selectTemplate(t.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold border transition",
                  templateId === t.id
                    ? "border-[#145C14] bg-[#145C14]/8 text-[#145C14]"
                    : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
                )}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message body */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Message</p>
            <span className={cn("text-xs font-medium", charCount > 160 ? "text-orange-500" : "text-gray-400")}>
              {charCount} chars {channel === "SMS" && charCount > 160 && `(${Math.ceil(charCount / 160)} SMS)`}
            </span>
          </div>
          <textarea
            value={body}
            onChange={e => { setBody(e.target.value); setTemplateId("t5"); }}
            rows={5}
            placeholder="Type your message here…"
            className="w-full px-3.5 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-[#145C14] focus:border-transparent resize-none placeholder-gray-400 dark:placeholder-gray-500"
          />
          <p className="text-xs text-gray-400">
            Use <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-gray-600 dark:text-gray-400 font-mono text-[11px]">{"{name}"}</code> to personalise with the member's first name.
          </p>
        </div>

        {/* Send */}
        <div className="p-5 flex items-center gap-3">
          <button
            onClick={() => send.mutate()}
            disabled={!body.trim() || send.isPending || (target === "DEPARTMENT" && !deptId)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition disabled:opacity-50 shadow-sm shadow-green-900/20">
            {send.isPending ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <><Send size={15} /> Send Message</>}
          </button>

          {sent && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-bold animate-fade-in">
              <CheckCircle size={16} /> Message queued successfully!
            </div>
          )}
          {send.isError && (
            <p className="text-red-600 text-sm font-medium">
              {(send.error as any)?.response?.data?.message || "Send failed. Check Twilio configuration."}
            </p>
          )}
        </div>
      </div>

      {/* Twilio notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <div className="flex items-start gap-2">
          <MessageSquare size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold mb-1">Twilio Integration Required</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              Sending messages requires <code className="bg-amber-100 px-1 rounded font-mono text-[11px]">TWILIO_ACCOUNT_SID</code>,{" "}
              <code className="bg-amber-100 px-1 rounded font-mono text-[11px]">TWILIO_AUTH_TOKEN</code>, and{" "}
              <code className="bg-amber-100 px-1 rounded font-mono text-[11px]">TWILIO_WHATSAPP_FROM</code> to be set in your environment variables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
