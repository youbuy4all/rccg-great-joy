"use client";

import { useQuery } from "@tanstack/react-query";
import { Layers, Users } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import type { Department } from "@/types";

export default function DepartmentsPage() {
  const { data: departments, isLoading } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn:  () => api.get("/departments").then(r => r.data),
  });

  const COLORS = [
    "#145C14","#1E7B1E","#4A8F4A","#7A5C1A",
    "#3A6A8A","#8A4A4A","#3A7A6A","#6A8A3A","#5A3E8C","#2E6B8A"
  ];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="font-serif font-bold text-gray-900 text-2xl">Departments & Units</h1>
        <p className="text-gray-400 text-sm font-medium mt-0.5">{departments?.length || 0} active departments</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 h-40 animate-pulse border border-green-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {departments?.map((dept, idx) => {
            const color = COLORS[idx % COLORS.length];
            const pct   = dept.budgetUsedPct;
            return (
              <div key={dept.id} className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 hover:shadow-md transition cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: color + "18" }}>
                      <Layers size={20} color={color} />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-gray-900 text-[15px]">{dept.name}</h3>
                      <p className="text-xs text-gray-400 font-medium">
                        HOD: {dept.hod ? `${dept.hod.firstName} ${dept.hod.lastName}` : "Unassigned"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                    <Users size={12} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-500">{dept.memberCount}</span>
                  </div>
                </div>

                {/* Budget bar */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-400">Budget usage</span>
                    <span className={cn("text-xs font-bold", pct > 80 ? "text-red-600" : "text-green-600")}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%`, background: pct > 80 ? "#B52B2B" : color }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-xs text-gray-400 font-medium">Spent: {formatCurrency(dept.spent)}</span>
                    <span className="text-xs text-gray-400 font-medium">Budget: {formatCurrency(dept.budget)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
