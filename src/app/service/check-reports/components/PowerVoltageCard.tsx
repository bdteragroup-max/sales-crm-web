"use client";

import React from "react";
import { Gauge, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { PowerVoltageCheck } from "@/app/actions/inverterCheckReports";

interface PowerVoltageCardProps {
  inputVoltage: Partial<PowerVoltageCheck>;
  outputVoltage: Partial<PowerVoltageCheck>;
  onInputChange: (val: Partial<PowerVoltageCheck>) => void;
  onOutputChange: (val: Partial<PowerVoltageCheck>) => void;
  disabled?: boolean;
}

export default function PowerVoltageCard({
  inputVoltage,
  outputVoltage,
  onInputChange,
  onOutputChange,
  disabled = false,
}: PowerVoltageCardProps) {
  const updateInput = (field: keyof PowerVoltageCheck, val: string) => {
    onInputChange({ ...inputVoltage, [field]: val });
  };

  const updateOutput = (field: keyof PowerVoltageCheck, val: string) => {
    onOutputChange({ ...outputVoltage, [field]: val });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
          <Gauge className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">
            การตรวจวัดแรงดันไฟฟ้า (Power Voltage Measurement)
          </h3>
          <p className="text-xs text-slate-500">
            บันทึกค่าแรงดันไฟฟ้าฝั่งขาเข้า (Input) และขาออก (Output) ขณะทำการตรวจเช็ค
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ================= INPUT VOLTAGE ================= */}
        <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-slate-800 text-sm">
              POWER INPUT VOLTAGE (ก่อน/ระหว่างติดตั้ง)
            </h4>
          </div>

          <div className="space-y-3">
            {/* 1 Phase DC */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                1 เฟส DC (+) , (-) [Vdc]
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={disabled}
                  value={inputVoltage.inputDc || ""}
                  onChange={(e) => updateInput("inputDc", e.target.value)}
                  placeholder="เช่น 540"
                  className="w-full text-xs px-3 py-2 pr-12 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-2 text-[11px] font-medium text-slate-400">
                  Vdc
                </span>
              </div>
            </div>

            {/* 1 Phase AC (220-230Vac) L-N */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                1 เฟส AC (220-230Vac) L-N [Vac]
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={disabled}
                  value={inputVoltage.input1PhaseAc || ""}
                  onChange={(e) => updateInput("input1PhaseAc", e.target.value)}
                  placeholder="เช่น 228"
                  className="w-full text-xs px-3 py-2 pr-12 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-2 text-[11px] font-medium text-slate-400">
                  Vac
                </span>
              </div>
            </div>

            {/* 3 Phase AC (380-400Vac) R-S, R-T, S-T */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                3 เฟส AC (380-400Vac) R-S, R-T, S-T [Vac]
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div className="relative">
                  <input
                    type="text"
                    disabled={disabled}
                    value={inputVoltage.input3PhaseRs || ""}
                    onChange={(e) => updateInput("input3PhaseRs", e.target.value)}
                    placeholder="R-S"
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 block text-center mt-0.5">R-S</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    disabled={disabled}
                    value={inputVoltage.input3PhaseRt || ""}
                    onChange={(e) => updateInput("input3PhaseRt", e.target.value)}
                    placeholder="R-T"
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 block text-center mt-0.5">R-T</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    disabled={disabled}
                    value={inputVoltage.input3PhaseSt || ""}
                    onChange={(e) => updateInput("input3PhaseSt", e.target.value)}
                    placeholder="S-T"
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 block text-center mt-0.5">S-T</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= OUTPUT VOLTAGE ================= */}
        <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <ArrowUpFromLine className="w-4 h-4 text-amber-600" />
            <h4 className="font-bold text-slate-800 text-sm">
              POWER OUTPUT VOLTAGE (ระหว่างตรวจเช็ค)
            </h4>
          </div>

          <div className="space-y-3">
            {/* 1 Phase AC L-N */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                1 เฟส L-N (220-230Vac) [Vac]
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={disabled}
                  value={outputVoltage.output1PhaseLn || ""}
                  onChange={(e) => updateOutput("output1PhaseLn", e.target.value)}
                  placeholder="เช่น 225"
                  className="w-full text-xs px-3 py-2 pr-12 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <span className="absolute right-3 top-2 text-[11px] font-medium text-slate-400">
                  Vac
                </span>
              </div>
            </div>

            {/* 3 Phase 220V U-V, U-W, V-W */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                3 เฟส (220-230Vac) U-V, U-W, V-W [Vac]
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <input
                    type="text"
                    disabled={disabled}
                    value={outputVoltage.output3Phase220Uv || ""}
                    onChange={(e) => updateOutput("output3Phase220Uv", e.target.value)}
                    placeholder="U-V"
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 block text-center mt-0.5">U-V</span>
                </div>
                <div>
                  <input
                    type="text"
                    disabled={disabled}
                    value={outputVoltage.output3Phase220Uw || ""}
                    onChange={(e) => updateOutput("output3Phase220Uw", e.target.value)}
                    placeholder="U-W"
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 block text-center mt-0.5">U-W</span>
                </div>
                <div>
                  <input
                    type="text"
                    disabled={disabled}
                    value={outputVoltage.output3Phase220Vw || ""}
                    onChange={(e) => updateOutput("output3Phase220Vw", e.target.value)}
                    placeholder="V-W"
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 block text-center mt-0.5">V-W</span>
                </div>
              </div>
            </div>

            {/* 3 Phase 380V U-V, U-W, V-W */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                3 เฟส (380-400Vac) U-V, U-W, V-W [Vac]
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <input
                    type="text"
                    disabled={disabled}
                    value={outputVoltage.output3Phase380Uv || ""}
                    onChange={(e) => updateOutput("output3Phase380Uv", e.target.value)}
                    placeholder="U-V"
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 block text-center mt-0.5">U-V</span>
                </div>
                <div>
                  <input
                    type="text"
                    disabled={disabled}
                    value={outputVoltage.output3Phase380Uw || ""}
                    onChange={(e) => updateOutput("output3Phase380Uw", e.target.value)}
                    placeholder="U-W"
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 block text-center mt-0.5">U-W</span>
                </div>
                <div>
                  <input
                    type="text"
                    disabled={disabled}
                    value={outputVoltage.output3Phase380Vw || ""}
                    onChange={(e) => updateOutput("output3Phase380Vw", e.target.value)}
                    placeholder="V-W"
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 block text-center mt-0.5">V-W</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
