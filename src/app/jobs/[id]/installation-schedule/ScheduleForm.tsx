"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateInstallationPlan } from "@/app/actions/installationOrders";
import {
  ArrowLeft,
  Save,
  MapPin,
  Calendar,
  ClipboardList,
  Plus,
  X,
  Wrench,
  Eye,
  AlertCircle,
} from "lucide-react";

interface ScheduleOrderInput {
  id: string;
  jobId: string | null;
  installationNo: string;
  company: string | null;
  plannedStartDate: Date | string | null;
  plannedEndDate: Date | string | null;
  workLocation: string | null;
  siteAddress: string | null;
  address: string | null;
  workPlan: string | null;
  technicianNote: string | null;
}

interface ScheduleUserInput {
  id: string;
  fullName?: string | null;
  role?: string | null;
}

function getBkkDateTimeParts(
  value: Date | string | null | undefined,
  defaultHour: string
): { date: string; hour: string; minute: string } {
  if (!value) {
    return { date: "", hour: defaultHour, minute: "00" };
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return { date: "", hour: defaultHour, minute: "00" };
  }

  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

  const timeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

  const [hh = defaultHour, mm = "00"] = timeStr.split(":");
  return {
    date,
    hour: hh === "24" ? "00" : hh.padStart(2, "0"),
    minute: mm.padStart(2, "0"),
  };
}

export default function ScheduleForm({
  order,
}: {
  order: ScheduleOrderInput;
  currentUser?: ScheduleUserInput;
}) {
  const router = useRouter();
  const errorBannerRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [hasMissingWorkPlanHighlight, setHasMissingWorkPlanHighlight] = useState(false);

  const initStart = getBkkDateTimeParts(order.plannedStartDate, "09");
  const initEnd = getBkkDateTimeParts(order.plannedEndDate, "17");

  const [formData, setFormData] = useState({
    startDate: initStart.date,
    startHour: initStart.hour,
    startMinute: initStart.minute,

    endDate: initEnd.date,
    endHour: initEnd.hour,
    endMinute: initEnd.minute,

    workLocation: order.workLocation || order.siteAddress || order.address || "",
  });

  const [tasks, setTasks] = useState<string[]>(() => {
    if (!order.workPlan) return [""];
    const parsed = order.workPlan
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
    return parsed.length ? parsed : [""];
  });

  const handleTaskChange = (index: number, value: string) => {
    const newTasks = [...tasks];
    newTasks[index] = value;
    setTasks(newTasks);
    if (hasMissingWorkPlanHighlight && newTasks.some((t) => t.trim() !== "")) {
      setHasMissingWorkPlanHighlight(false);
    }
  };

  const addTask = () => setTasks([...tasks, ""]);

  const removeTask = (index: number) => {
    const newTasks = tasks.filter((_, i) => i !== index);
    if (newTasks.length === 0) newTasks.push("");
    setTasks(newTasks);
  };

  const [equipments, setEquipments] = useState<string[]>(() => {
    if (!order.technicianNote) return [""];
    const parsed = order.technicianNote
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
    return parsed.length ? parsed : [""];
  });

  const handleEquipmentChange = (index: number, value: string) => {
    const newEquipments = [...equipments];
    newEquipments[index] = value;
    setEquipments(newEquipments);
  };

  const addEquipment = () => setEquipments([...equipments, ""]);

  const removeEquipment = (index: number) => {
    const newEquipments = equipments.filter((_, i) => i !== index);
    if (newEquipments.length === 0) newEquipments.push("");
    setEquipments(newEquipments);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "startDate" && value && (!prev.endDate || prev.endDate < value)) {
        next.endDate = value;
      }
      return next;
    });
  };

  const showValidationError = (msg: string) => {
    setError(msg);
    requestAnimationFrame(() => {
      errorBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setHasMissingWorkPlanHighlight(false);

    if (!formData.startDate) {
      showValidationError("กรุณาระบุวันที่เริ่มงาน (Planned Start Date)");
      return;
    }

    if (!formData.endDate) {
      showValidationError("กรุณาระบุวันที่เสร็จสิ้น (Planned End Date)");
      return;
    }

    const startIso = `${formData.startDate}T${formData.startHour}:${formData.startMinute}:00+07:00`;
    const endIso = `${formData.endDate}T${formData.endHour}:${formData.endMinute}:00+07:00`;

    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      showValidationError("วันและเวลาเสร็จสิ้นต้องอยู่หลังวันและเวลาเริ่มงาน");
      return;
    }

    const cleanedTasks = tasks.map((t) => t.trim()).filter(Boolean);
    if (cleanedTasks.length === 0) {
      setHasMissingWorkPlanHighlight(true);
      showValidationError(
        "กรุณาระบุรายละเอียดแผนงาน (Work Plan) อย่างน้อย 1 ขั้นตอน เพื่อให้หน้าดูแผนงานแสดงข้อมูลได้ครบถ้วน"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        plannedStartDate: startIso,
        plannedEndDate: endIso,
        workLocation: formData.workLocation.trim(),
        workPlan: cleanedTasks.join("\n"),
        technicianNote: equipments.map((item) => item.trim()).filter(Boolean).join("\n"),
      };

      const res = await updateInstallationPlan(order.id, payload);
      if (!res.success) {
        throw new Error(res.error || "Failed to save plan");
      }
      alert("บันทึกแผนงานสำเร็จ (Schedule saved successfully)");
      router.push(order.jobId ? `/jobs?jobId=${order.jobId}` : "/service/installation");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกแผนงาน";
      showValidationError(message);
      setIsSubmitting(false);
    }
  };

  const validTaskCount = tasks.filter((t) => t.trim() !== "").length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3 bg-gray-50/50">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/service/installation")}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">วางแผนงานติดตั้ง (Work Schedule)</h1>
            <p className="text-sm text-gray-500">
              ใบงาน: {order.installationNo} • ลูกค้า: {order.company || "-"}
            </p>
          </div>
        </div>

        {order.jobId && (
          <Link
            href={`/jobs/${order.jobId}/installation-plan`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors"
          >
            <Eye className="w-4 h-4" />
            ดูหน้าแผนงาน
          </Link>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-6">
        {error && (
          <div
            ref={errorBannerRef}
            className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">ไม่สามารถบันทึกได้:</span> {error}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>
                เวลาเริ่มงาน (Planned Start) <span className="text-red-500">*</span>
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-[55%] p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              />
              <div className="flex w-[45%] items-center gap-1 border border-gray-300 rounded-lg px-2 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                <select
                  name="startHour"
                  value={formData.startHour}
                  onChange={handleChange}
                  className="w-full bg-transparent outline-none p-1 text-center appearance-none cursor-pointer"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={String(i).padStart(2, "0")}>
                      {String(i).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <span className="font-bold text-gray-400">:</span>
                <select
                  name="startMinute"
                  value={formData.startMinute}
                  onChange={handleChange}
                  className="w-full bg-transparent outline-none p-1 text-center appearance-none cursor-pointer"
                >
                  {Array.from({ length: 60 }).map((_, i) => (
                    <option key={i} value={String(i).padStart(2, "0")}>
                      {String(i).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-400 font-medium pl-1">น.</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>
                เวลาเสร็จสิ้น (Planned End) <span className="text-red-500">*</span>
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                min={formData.startDate || undefined}
                onChange={handleChange}
                className="w-[55%] p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              />
              <div className="flex w-[45%] items-center gap-1 border border-gray-300 rounded-lg px-2 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                <select
                  name="endHour"
                  value={formData.endHour}
                  onChange={handleChange}
                  className="w-full bg-transparent outline-none p-1 text-center appearance-none cursor-pointer"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={String(i).padStart(2, "0")}>
                      {String(i).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <span className="font-bold text-gray-400">:</span>
                <select
                  name="endMinute"
                  value={formData.endMinute}
                  onChange={handleChange}
                  className="w-full bg-transparent outline-none p-1 text-center appearance-none cursor-pointer"
                >
                  {Array.from({ length: 60 }).map((_, i) => (
                    <option key={i} value={String(i).padStart(2, "0")}>
                      {String(i).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-400 font-medium pl-1">น.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <MapPin className="w-4 h-4 text-red-500" />
            สถานที่ปฏิบัติงาน (Work Location)
          </label>
          <input
            type="text"
            name="workLocation"
            value={formData.workLocation}
            onChange={handleChange}
            placeholder="ระบุสถานที่ปฏิบัติงาน หรือวางลิงก์ Google Maps"
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          />
        </div>

        <div
          className={`space-y-3 rounded-xl p-4 border transition-colors ${
            hasMissingWorkPlanHighlight
              ? "border-red-300 bg-red-50/40"
              : "border-gray-200/80 bg-gray-50/40"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <ClipboardList className="w-4 h-4 text-emerald-500" />
              <span>
                รายละเอียดแผนงาน (Work Plan / Steps) <span className="text-red-500">*</span>
              </span>
            </label>
            <span
              className={`text-xs font-medium ${
                validTaskCount > 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {validTaskCount > 0
                ? `ระบุแล้ว ${validTaskCount} ขั้นตอน`
                : "จำเป็นต้องระบุอย่างน้อย 1 ขั้นตอน"}
            </span>
          </div>
          <div className="space-y-2">
            {tasks.map((task, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-gray-400 text-sm font-medium w-5 text-right">
                  {index + 1}.
                </span>
                <input
                  type="text"
                  value={task}
                  onChange={(e) => handleTaskChange(index, e.target.value)}
                  placeholder="ระบุขั้นตอนการทำงาน..."
                  className={`flex-1 p-2.5 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none ${
                    hasMissingWorkPlanHighlight ? "border-red-300" : "border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => removeTask(index)}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addTask}
              className="flex items-center gap-2 text-sm text-blue-600 font-medium px-2 py-2 hover:bg-blue-50 rounded-lg transition-colors ml-7"
            >
              <Plus className="w-4 h-4" />
              เพิ่มขั้นตอน (Add Step)
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Wrench className="w-4 h-4 text-orange-500" />
            หมายเหตุ / อุปกรณ์ที่ต้องเตรียม (Notes / Required Equipment)
          </label>
          <div className="space-y-2">
            {equipments.map((equipment, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-gray-400 text-sm font-medium w-5 text-right">•</span>
                <input
                  type="text"
                  value={equipment}
                  onChange={(e) => handleEquipmentChange(index, e.target.value)}
                  placeholder="เช่น ต้องใช้บันไดสูง, เตรียมสายไฟเพิ่ม..."
                  className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => removeEquipment(index)}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addEquipment}
              className="flex items-center gap-2 text-sm text-blue-600 font-medium px-2 py-2 hover:bg-blue-50 rounded-lg transition-colors ml-7"
            >
              <Plus className="w-4 h-4" />
              เพิ่มอุปกรณ์/หมายเหตุ (Add Item)
            </button>
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => router.push("/service/installation")}
            className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            disabled={isSubmitting}
          >
            ยกเลิก (Cancel)
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกแผนงาน (Save Plan)"}
          </button>
        </div>
      </form>
    </div>
  );
}
