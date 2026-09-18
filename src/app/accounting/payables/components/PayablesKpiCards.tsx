"use client";

import React from "react";
import {
  DollarSign,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
} from "lucide-react";
import { DashboardSummary, StatusTabType, formatCurrency } from "./payablesTypes";

interface PayablesKpiCardsProps {
  summary: DashboardSummary;
  activeStatusTab: StatusTabType;
  onSelectStatusTab: (status: StatusTabType) => void;
}

export default function PayablesKpiCards({
  summary,
  activeStatusTab,
  onSelectStatusTab,
}: PayablesKpiCardsProps) {
  const cards = [
    {
      id: "ALL" as StatusTabType,
      title: "ยอดรอจ่ายสุทธิรวม",
      countText: `${summary.pendingCount || 0} รายการรอจ่าย`,
      subText: `Gross: ${formatCurrency(summary.totalPendingGross)}`,
      amount: summary.totalPendingNet,
      isOverdue: false,
      icon: DollarSign,
    },
    {
      id: "AWAITING_GR" as StatusTabType,
      title: "รอตรวจรับของ (Hold)",
      countText: `${summary.awaitingGrCount || 0} รายการ`,
      subText: "ติดเงื่อนไข 3-Way Match",
      amount: summary.awaitingGrAmount,
      isOverdue: false,
      icon: ShieldAlert,
    },
    {
      id: "PENDING" as StatusTabType,
      title: "พร้อมจ่ายเงิน",
      countText: `${summary.readyToPayCount || 0} รายการ`,
      subText: "ตรวจรับแล้ว / งวดมัดจำ",
      amount: summary.readyToPayAmount,
      isOverdue: false,
      icon: CheckCircle2,
    },
    {
      id: "OVERDUE" as StatusTabType,
      title: "เกินกำหนดชำระ",
      countText: `${summary.overdueCount || 0} รายการ`,
      subText: "เกินกำหนดรอบชำระ",
      amount: summary.overdueAmount,
      isOverdue: true,
      icon: AlertTriangle,
    },
    {
      id: "PAID_VERIFIED" as StatusTabType,
      title: "จ่ายแล้วในระบบ",
      countText: `${summary.paidCount || 0} รายการ`,
      subText: "ตัดจ่ายและออก 50 ทวิ",
      amount: summary.paidAmount,
      isOverdue: false,
      icon: FileCheck2,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {cards.map((card) => {
        const isActive = activeStatusTab === card.id;
        const IconComponent = card.icon;

        return (
          <div
            key={card.id}
            onClick={() => onSelectStatusTab(card.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onSelectStatusTab(card.id);
              }
            }}
            className={`group relative overflow-hidden bg-white p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 text-left select-none flex flex-col justify-between ${
              isActive
                ? "ring-2 ring-red-600 border-red-600 bg-red-50/10 shadow-sm"
                : "border-slate-200/90 hover:border-slate-300"
            }`}
          >
            {/* Top Row: Title and Icon */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-red-600" />}
                  <span>{card.title}</span>
                </span>
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 border ${
                    isActive
                      ? "bg-red-600 text-white border-red-600 shadow-xs"
                      : card.isOverdue
                      ? "bg-red-50 text-red-600 border-red-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>
              </div>

              {/* Amount Display */}
              <div className="mt-3">
                <div
                  className={`text-2xl font-black tracking-tight tabular-nums leading-none ${
                    card.isOverdue ? "text-red-600" : "text-slate-900"
                  }`}
                >
                  {formatCurrency(card.amount)}
                </div>
              </div>
            </div>

            {/* Bottom Row: Symmetrical 2-Line Sub-stats without truncation */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-0.5 text-[11px]">
              <div className="font-bold text-slate-700 flex items-center justify-between">
                <span>{card.countText}</span>
              </div>
              <div className="text-[10px] font-medium text-slate-400">
                {card.subText}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
