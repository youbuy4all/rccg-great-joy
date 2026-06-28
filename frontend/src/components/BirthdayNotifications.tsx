"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Cake, X, MessageCircle, ChevronRight, Users, Check } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BirthdayMember {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  profilePhoto: string | null;
  birthdayDay: number;
  birthdayMonth: number;
  daysUntil: number;
  isToday: boolean;
  isThisWeek: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const GROUP_LINK = "https://chat.whatsapp.com/BmxqwhhraQu41XPPROJoz5";

/** Group announcement for one or many birthday members */
function groupMessage(members: BirthdayMember[]): string {
  if (members.length === 1) {
    const m = members[0];
    return (
      `🎂 Happy Birthday to our dear *${m.firstName} ${m.lastName}*!\n\n` +
      `On behalf of the RCCG Great Joy Parish family, we celebrate you today and pray that God's blessings overflow in your life this new year. May this be your best year yet! 🎉🙏\n\n` +
      `We love you! ❤️`
    );
  }
  const names = members.map(m => `• *${m.firstName} ${m.lastName}*`).join("\n");
  return (
    `🎂 Today, we celebrate our beloved members who are having their birthdays:\n\n${names}\n\n` +
    `On behalf of the RCCG Great Joy Parish family, we celebrate you all and pray that God's blessings overflow in your lives this new year! 🎉🙏\n\n` +
    `We love you all! ❤️`
  );
}

/** Copy message to clipboard then open the group */
async function postToGroup(members: BirthdayMember[]): Promise<boolean> {
  const msg = groupMessage(members);
  try {
    await navigator.clipboard.writeText(msg);
  } catch {
    // Fallback for older browsers
    const ta = document.createElement("textarea");
    ta.value = msg; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
  window.open(GROUP_LINK, "_blank");
  return true;
}

/** Convert Nigerian phone numbers to WhatsApp-compatible international format */
function toWANumber(phone: string): string {
  const clean = phone.replace(/[\s\-\(\)]/g, "");
  if (clean.startsWith("+"))  return clean.slice(1);
  if (clean.startsWith("234")) return clean;
  if (clean.startsWith("0"))   return "234" + clean.slice(1);
  return "234" + clean;
}

function waLink(member: BirthdayMember): string {
  const msg = encodeURIComponent(
    `Happy Birthday, ${member.firstName}! 🎂🎉\n\n` +
    `On behalf of RCCG Great Joy Parish, we celebrate you today and ` +
    `pray that God's blessings overflow in your life this new year. ` +
    `May this be your best year yet!\n\n` +
    `We love and appreciate you! 🙏❤️\n\n` +
    `— RCCG Great Joy Parish Family`
  );
  return `https://wa.me/${toWANumber(member.phone)}?text=${msg}`;
}

function dayLabel(m: BirthdayMember): string {
  if (m.isToday)        return "🎉 Birthday today!";
  if (m.daysUntil === 1) return "Tomorrow";
  if (m.daysUntil <= 7) return `In ${m.daysUntil} days`;
  return `${MONTHS[m.birthdayMonth - 1]} ${m.birthdayDay}`;
}

// ─── Single member card ───────────────────────────────────────────────────────
function BirthdayCard({
  m, highlight, onPostToGroup, copied,
}: {
  m: BirthdayMember;
  highlight?: boolean;
  onPostToGroup?: () => void;
  copied?: boolean;
}) {
  const initials = `${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase();
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 transition hover:bg-gray-50 dark:hover:bg-gray-700/50 ${highlight ? "bg-amber-50/60 dark:bg-amber-900/10" : ""}`}>
      {/* Avatar */}
      {m.profilePhoto ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={m.profilePhoto} alt={m.firstName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
          {initials}
        </div>
      )}

      {/* Name + label */}
      <div className="flex-1 min-w-0">
        <Link href={`/members/${m.id}`} className="text-xs font-bold text-gray-800 dark:text-white truncate hover:text-[#145C14] dark:hover:text-green-400 transition block">
          {m.firstName} {m.lastName}
        </Link>
        <p className={`text-[10px] ${m.isToday ? "text-amber-500 font-semibold" : "text-gray-400"}`}>
          {dayLabel(m)}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Post to group (today only) */}
        {onPostToGroup && (
          <button
            onClick={onPostToGroup}
            title="Copy birthday message and open WhatsApp group"
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition ${
              copied
                ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600"
            }`}
          >
            {copied ? <Check size={12} /> : <Users size={12} />}
          </button>
        )}
        {/* Direct WhatsApp to member */}
        <a
          href={waLink(m)}
          target="_blank"
          rel="noopener noreferrer"
          title={`Send WhatsApp wishes directly to ${m.firstName}`}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/40 transition"
        >
          <MessageCircle size={13} />
        </a>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function BirthdayNotifications() {
  const [open,    setOpen]    = useState(false);
  const [members, setMembers] = useState<BirthdayMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState<string | null>(null); // member id or "all"
  const ref = useRef<HTMLDivElement>(null);

  const handlePostToGroup = async (targets: BirthdayMember[], key: string) => {
    await postToGroup(targets);
    setCopied(key);
    setTimeout(() => setCopied(null), 2500);
  };

  // Fetch on mount + every 15 minutes
  const fetchBirthdays = async () => {
    try {
      const r = await api.get("/members/birthdays/upcoming");
      setMembers(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      console.error("[BirthdayNotifications] fetch failed:", e);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBirthdays();
    const id = setInterval(fetchBirthdays, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Segments
  const todayList    = members.filter(m => m.isToday);
  const weekList     = members.filter(m => !m.isToday && m.isThisWeek);
  const comingList   = members.filter(m => !m.isToday && !m.isThisWeek);
  const badgeCount   = todayList.length;

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Birthday notifications"
        className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-amber-50 hover:text-amber-500 hover:border-amber-200 dark:hover:bg-amber-900/20 transition"
      >
        <Bell size={15} />
      </button>

      {/* Badge — only shows on today's birthdays */}
      {!loading && badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-gray-800 pointer-events-none">
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Cake size={15} className="text-amber-500" />
              <span className="text-sm font-bold text-gray-800 dark:text-white">Birthdays</span>
              {badgeCount > 0 && (
                <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {badgeCount} today
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto">

            {/* Today */}
            {todayList.length > 0 && (
              <section>
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">🎂 Today</p>
                  <button
                    onClick={() => handlePostToGroup(todayList, "all")}
                    title="Copy group announcement and open WhatsApp group"
                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition ${
                      copied === "all"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400"
                    }`}
                  >
                    {copied === "all"
                      ? <><Check size={10} /> Copied!</>
                      : <><Users size={10} /> Post to Group</>}
                  </button>
                </div>
                {todayList.map(m => (
                  <BirthdayCard
                    key={m.id} m={m} highlight
                    onPostToGroup={() => handlePostToGroup([m], m.id)}
                    copied={copied === m.id}
                  />
                ))}
              </section>
            )}

            {/* This week */}
            {weekList.length > 0 && (
              <section>
                <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">This week</p>
                {weekList.map(m => <BirthdayCard key={m.id} m={m} />)}
              </section>
            )}

            {/* Coming up */}
            {comingList.length > 0 && (
              <section>
                <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Coming up</p>
                {comingList.map(m => <BirthdayCard key={m.id} m={m} />)}
              </section>
            )}

            {/* Empty */}
            {!loading && members.length === 0 && (
              <div className="py-10 text-center">
                <Cake size={28} className="mx-auto text-gray-200 dark:text-gray-600 mb-2" />
                <p className="text-xs font-bold text-gray-400">No birthdays in the next 30 days</p>
                <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-1">Make sure members have their date of birth saved.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2.5 flex items-center justify-between">
            <p className="text-[10px] text-gray-400">
              {members.length > 0 ? `${members.length} upcoming` : ""}
            </p>
            <Link
              href="/members"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 text-[11px] font-bold text-[#145C14] dark:text-green-400 hover:underline"
            >
              View all members <ChevronRight size={11} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
