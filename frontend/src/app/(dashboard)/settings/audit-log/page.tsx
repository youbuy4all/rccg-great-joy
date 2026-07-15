"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileClock, ChevronDown, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import api from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

interface AuditLogEntry {
  id:          string;
  action:      string;
  entity:      string;
  entityId:    string | null;
  oldValues:   Record<string, any> | null;
  newValues:   Record<string, any> | null;
  ipAddress:   string | null;
  createdAt:   string;
  performedBy: string;
}

const ACTION_COLORS: Record<string, string> = {
  DELETE_TRANSACTION:      "bg-red-100 text-red-700",
  BULK_DELETE_TRANSACTION: "bg-red-100 text-red-700",
  EDIT_TRANSACTION:        "bg-amber-100 text-amber-700",
  MARK_REMITTED:           "bg-blue-100 text-blue-700",
  PASSWORD_RESET:          "bg-purple-100 text-purple-700",
};

function actionColor(action: string) {
  return ACTION_COLORS[action] || "bg-gray-100 text-gray-600";
}

function actionLabel(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function ValueDiff({ oldValues, newValues }: { oldValues: Record<string, any> | null; newValues: Record<string, any> | null }) {
  if (!oldValues && !newValues) return <p className="text-xs text-gray-400 italic">No additional details recorded</p>;

  const keys = [...new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})])];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
      {oldValues && (
        <div>
          <p className="font-bold text-gray-400 uppercase tracking-wide mb-1.5">Before</p>
          <pre className="bg-red-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap text-red-800 font-mono text-[11px]">
            {JSON.stringify(oldValues, null, 2)}
          </pre>
        </div>
      )}
      {newValues && (
        <div>
          <p className="font-bold text-gray-400 uppercase tracking-wide mb-1.5">After</p>
          <pre className="bg-green-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap text-green-800 font-mono text-[11px]">
            {JSON.stringify(newValues, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function AuditLogPage() {
  const [page, setPage]     = useState(1);
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, entity, action],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "50" });
      if (entity) params.set("entity", entity);
      if (action) params.set("action", action);
      return api.get(`/audit-logs?${params}`).then(r => r.data as { logs: AuditLogEntry[]; pagination: { page: number; totalPages: number; total: number } });
    },
  });

  const logs       = data?.logs ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg">Audit Log</h2>
        <p className="text-gray-400 text-sm mt-0.5">A record of who did what — edits, deletions, and remittance actions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
        <Filter size={14} className="text-gray-400" />
        <select
          value={entity}
          onChange={e => { setEntity(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#145C14]"
        >
          <option value="">All Entities</option>
          <option value="Transaction">Transaction</option>
          <option value="User">User</option>
        </select>
        <select
          value={action}
          onChange={e => { setAction(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#145C14]"
        >
          <option value="">All Actions</option>
          <option value="EDIT_TRANSACTION">Edit Transaction</option>
          <option value="DELETE_TRANSACTION">Delete Transaction</option>
          <option value="BULK_DELETE_TRANSACTION">Bulk Delete Transaction</option>
          <option value="MARK_REMITTED">Mark Remitted</option>
          <option value="PASSWORD_RESET">Password Reset</option>
        </select>
        {pagination && (
          <span className="ml-auto text-xs text-gray-400 font-medium">{pagination.total} total entries</span>
        )}
      </div>

      {/* Log list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <FileClock size={36} className="mb-3 text-gray-200" />
            <p className="font-semibold text-sm">No audit log entries found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {logs.map(log => {
              const isOpen = expanded === log.id;
              return (
                <div key={log.id}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : log.id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap", actionColor(log.action))}>
                        {actionLabel(log.action)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {log.performedBy} <span className="font-normal text-gray-400">— {log.entity}</span>
                        </p>
                        <p className="text-[11px] text-gray-400">{formatDate(log.createdAt, { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                    <ChevronDown size={16} className={cn("text-gray-400 flex-shrink-0 transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4">
                      <ValueDiff oldValues={log.oldValues} newValues={log.newValues} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-semibold text-gray-500 px-2">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
