"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  Columns2,
  Database,
  FileText,
  ImagePlus,
  Languages,
  Loader2,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  createSunwaysReport,
  getSunwaysCompanySuggestions,
  quickCreateCompanyForSunways,
  updateSunwaysReport,
} from "@/app/actions/sunwaysReports";
import { translateSunwaysBundle } from "@/app/actions/translateReport";
import {
  SUNWAYS_FIELD_LABELS,
  SUNWAYS_INSPECTION_ITEMS,
  createDefaultMpptRows,
  createEmptyTextBundle,
  extractTextBundleFromRecord,
  type SunwaysBilingualData,
  type SunwaysCompanyContactOption,
  type SunwaysCompanyOption,
  type SunwaysInspectionKey,
  type SunwaysLang,
  type SunwaysMpptRow,
  type SunwaysReportPayload,
  type SunwaysReportRecord,
  type SunwaysReportStatus,
  type SunwaysTextBundle,
} from "@/app/lib/sunwaysReportConfig";

interface SunwaysReportFormProps {
  mode: "create" | "edit";
  initialReport?: SunwaysReportRecord;
  currentUserName?: string;
  initialCompanies?: SunwaysCompanyOption[];
}

type BilingualTextField =
  | "companyName"
  | "communicationPerson"
  | "contactDetail"
  | "plantName"
  | "country"
  | "plantCapacity"
  | "inverterModel"
  | "serialNumber"
  | "firmwareVersion"
  | "countryCode"
  | "dataloggerSn"
  | "externalDataloggerDetails"
  | "faultObserved"
  | "dataloggerSoftwareVersion"
  | "portalFaultObserved"
  | "pvModuleWp"
  | "backupDataObservation"
  | "otherRemarks"
  | "inspectorName";

const NON_TRANSLATED_SHARED_FIELDS: BilingualTextField[] = [
  "contactDetail",
  "plantCapacity",
  "inverterModel",
  "serialNumber",
  "firmwareVersion",
  "countryCode",
  "dataloggerSn",
  "dataloggerSoftwareVersion",
];

function BilingualLabel({
  th,
  en,
  required,
}: {
  th: string;
  en: string;
  required?: boolean;
}) {
  return (
    <label className="block mb-1.5">
      <span className="text-xs font-semibold text-slate-800">
        {th}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
      <span className="block text-[11px] text-slate-500">{en}</span>
    </label>
  );
}

export default function SunwaysReportForm({
  mode,
  initialReport,
  currentUserName = "",
  initialCompanies = [],
}: SunwaysReportFormProps) {
  const router = useRouter();

  const initialDefaultLang: SunwaysLang =
    initialReport?.defaultLang === "EN" ? "EN" : "TH";

  const [activeLang, setActiveLang] = useState<SunwaysLang>(initialDefaultLang);
  const [sideBySide, setSideBySide] = useState(false);

  const [reportDate, setReportDate] = useState<string>(() => {
    if (initialReport?.reportDate) {
      return new Date(initialReport.reportDate).toISOString().slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  });

  const [status, setStatus] = useState<SunwaysReportStatus>(
    (initialReport?.status as SunwaysReportStatus) || "DRAFT"
  );

  const [thData, setThData] = useState<SunwaysTextBundle>(() => {
    if (initialReport) {
      const b = extractTextBundleFromRecord(initialReport, "TH");
      if (!b.country) b.country = "ประเทศไทย";
      return b;
    }
    const empty = createEmptyTextBundle("ประเทศไทย");
    empty.inspectorName = currentUserName;
    return empty;
  });

  const [enData, setEnData] = useState<SunwaysTextBundle>(() => {
    if (initialReport) {
      const b = extractTextBundleFromRecord(initialReport, "EN");
      if (!b.country) b.country = "Thailand";
      return b;
    }
    const empty = createEmptyTextBundle("Thailand");
    empty.inspectorName = currentUserName;
    return empty;
  });

  const [mpptRows, setMpptRows] = useState<SunwaysMpptRow[]>(() => {
    if (Array.isArray(initialReport?.mpptRows) && initialReport.mpptRows.length > 0) {
      return initialReport.mpptRows;
    }
    return createDefaultMpptRows(12);
  });

  const [installationImages, setInstallationImages] = useState<string[]>(() =>
    Array.isArray(initialReport?.installationImages)
      ? initialReport.installationImages.filter(Boolean)
      : []
  );

  const [portalImages, setPortalImages] = useState<string[]>(() =>
    Array.isArray(initialReport?.bilingualData?.portalImages)
      ? initialReport.bilingualData.portalImages.filter(Boolean)
      : []
  );

  const [backupImages, setBackupImages] = useState<string[]>(() =>
    Array.isArray(initialReport?.bilingualData?.backupImages)
      ? initialReport.bilingualData.backupImages.filter(Boolean)
      : []
  );

  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Company database autocomplete state
  const [recentCompanies, setRecentCompanies] = useState<SunwaysCompanyOption[]>(
    initialCompanies || []
  );
  const [companyResults, setCompanyResults] = useState<SunwaysCompanyOption[]>(
    initialCompanies || []
  );
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [searchingCompanies, setSearchingCompanies] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [linkedCompany, setLinkedCompany] = useState<SunwaysCompanyOption | null>(() => {
    const initialName = (initialReport?.companyName || "").trim().toLowerCase();
    if (!initialName) return null;
    return (
      (initialCompanies || []).find(
        (c) => c.companyName.trim().toLowerCase() === initialName
      ) || null
    );
  });
  const companyDropdownRef = useRef<HTMLDivElement>(null);
  const companySearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const companySearchReqIdRef = useRef(0);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        companyDropdownRef.current &&
        !companyDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCompanyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleCompanyInputChange = (lang: SunwaysLang, value: string) => {
    updateTextField(lang, "companyName", value);
    if (linkedCompany && linkedCompany.companyName.trim() !== value.trim()) {
      setLinkedCompany(null);
    }
    setIsCompanyDropdownOpen(true);

    if (companySearchTimerRef.current) {
      clearTimeout(companySearchTimerRef.current);
    }

    const q = value.trim();
    if (!q) {
      setCompanyResults(recentCompanies);
      setSearchingCompanies(false);
      return;
    }

    const qLower = q.toLowerCase();
    const localMatches = recentCompanies.filter(
      (c) =>
        c.companyName.toLowerCase().includes(qLower) ||
        (c.taxId || "").toLowerCase().includes(qLower) ||
        c.contacts.some(
          (ct) =>
            (ct.contactName || "").toLowerCase().includes(qLower) ||
            (ct.mobilePhone || "").includes(q)
        )
    );
    if (localMatches.length > 0) {
      setCompanyResults(localMatches);
    }

    const reqId = ++companySearchReqIdRef.current;
    setSearchingCompanies(true);
    companySearchTimerRef.current = setTimeout(async () => {
      try {
        const res = await getSunwaysCompanySuggestions(q);
        if (reqId === companySearchReqIdRef.current && res.success) {
          setCompanyResults(res.data);
        }
      } finally {
        if (reqId === companySearchReqIdRef.current) {
          setSearchingCompanies(false);
        }
      }
    }, 220);
  };

  const applyContactOption = (
    contact: SunwaysCompanyContactOption,
    targetLang: SunwaysLang
  ) => {
    const cleanName = (contact.contactName || "").replace(/[\t\r\n]+/g, " ").trim();
    const phone = (contact.mobilePhone || "").trim();
    const email = (contact.email || "").trim();
    const combinedContact = [phone, email].filter(Boolean).join(" / ");

    if (cleanName) {
      setBundle(targetLang, (prev) => ({
        ...prev,
        communicationPerson: cleanName,
        contactDetail: combinedContact || prev.contactDetail,
      }));
      const otherLang: SunwaysLang = targetLang === "TH" ? "EN" : "TH";
      setBundle(otherLang, (prev) => ({
        ...prev,
        communicationPerson: prev.communicationPerson || cleanName,
        contactDetail: combinedContact || prev.contactDetail,
      }));
    } else if (combinedContact) {
      updateTextField(targetLang, "contactDetail", combinedContact);
    }
  };

  const handleSelectCompany = (comp: SunwaysCompanyOption, targetLang: SunwaysLang) => {
    const cleanCompany = comp.companyName.trim();
    const prevCompany = (targetLang === "TH" ? thData : enData).companyName;
    const otherLang: SunwaysLang = targetLang === "TH" ? "EN" : "TH";

    setBundle(targetLang, (prev) => ({ ...prev, companyName: cleanCompany }));
    setBundle(otherLang, (prev) => ({
      ...prev,
      companyName:
        !prev.companyName || prev.companyName === prevCompany
          ? cleanCompany
          : prev.companyName,
    }));

    setLinkedCompany(comp);
    if (comp.contacts && comp.contacts.length > 0) {
      applyContactOption(comp.contacts[0], targetLang);
    }
    setIsCompanyDropdownOpen(false);
  };

  const handleQuickCreateCompany = async (rawName: string, targetLang: SunwaysLang) => {
    const cleanName = rawName.trim();
    if (!cleanName) return;

    const current = targetLang === "TH" ? thData : enData;
    setCreatingCompany(true);
    try {
      const res = await quickCreateCompanyForSunways({
        companyName: cleanName,
        contactName: current.communicationPerson,
        contactDetail: current.contactDetail,
      });

      if (!res.success || !res.data) {
        Swal.fire(
          "บันทึกชื่อบริษัทไม่สำเร็จ",
          res.error || "กรุณาลองใหม่อีกครั้ง",
          "error"
        );
        return;
      }

      const savedComp = res.data;
      setRecentCompanies((prev) => [
        savedComp,
        ...prev.filter((item) => item.id !== savedComp.id),
      ]);
      handleSelectCompany(savedComp, targetLang);

      Swal.fire({
        icon: "success",
        title: res.alreadyExists
          ? "พบบริษัทนี้ในฐานข้อมูลแล้ว และเชื่อมข้อมูลให้เรียบร้อย"
          : "เพิ่มบริษัทใหม่ลงฐานข้อมูลลูกค้าเรียบร้อย",
        text: savedComp.companyName,
        timer: 1600,
        showConfirmButton: false,
      });
    } finally {
      setCreatingCompany(false);
    }
  };

  const currentBundle = activeLang === "TH" ? thData : enData;
  const setBundle = (lang: SunwaysLang, updater: (prev: SunwaysTextBundle) => SunwaysTextBundle) => {
    if (lang === "TH") {
      setThData(updater);
    } else {
      setEnData(updater);
    }
  };

  const updateTextField = (
    lang: SunwaysLang,
    field: BilingualTextField,
    value: string
  ) => {
    setBundle(lang, (prev) => ({ ...prev, [field]: value }));
    // Mirror hardware/code fields to the opposite language if it is still empty or previously synced
    if (NON_TRANSLATED_SHARED_FIELDS.includes(field)) {
      const otherLang: SunwaysLang = lang === "TH" ? "EN" : "TH";
      const curThis = (lang === "TH" ? thData : enData)[field];
      setBundle(otherLang, (prev) =>
        !prev[field] || prev[field] === curThis ? { ...prev, [field]: value } : prev
      );
    }
  };

  const updateCableField = (
    lang: SunwaysLang,
    key: keyof SunwaysTextBundle["cablesSpec"],
    value: string
  ) => {
    setBundle(lang, (prev) => ({
      ...prev,
      cablesSpec: { ...prev.cablesSpec, [key]: value },
    }));
  };

  const updateAcField = (
    lang: SunwaysLang,
    key: keyof SunwaysTextBundle["acMeasurement"],
    value: string
  ) => {
    setBundle(lang, (prev) => ({
      ...prev,
      acMeasurement: { ...prev.acMeasurement, [key]: value },
    }));
    const otherLang: SunwaysLang = lang === "TH" ? "EN" : "TH";
    const curThis = (lang === "TH" ? thData : enData).acMeasurement[key];
    setBundle(otherLang, (prev) =>
      !prev.acMeasurement[key] || prev.acMeasurement[key] === curThis
        ? { ...prev, acMeasurement: { ...prev.acMeasurement, [key]: value } }
        : prev
    );
  };

  const updateInspectionField = (
    lang: SunwaysLang,
    itemKey: SunwaysInspectionKey,
    part: "result" | "suggestion",
    value: string
  ) => {
    setBundle(lang, (prev) => ({
      ...prev,
      inspectionResults: {
        ...prev.inspectionResults,
        [itemKey]: {
          ...prev.inspectionResults[itemKey],
          [part]: value,
        },
      },
    }));
  };

  const updateFanField = <K extends keyof SunwaysTextBundle["fanCheck"]>(
    lang: SunwaysLang,
    key: K,
    value: SunwaysTextBundle["fanCheck"][K]
  ) => {
    setBundle(lang, (prev) => ({
      ...prev,
      fanCheck: { ...prev.fanCheck, [key]: value },
    }));
    if (key === "fansWorking" || key === "nothingStuck" || key === "restartNoiseCheck") {
      const otherLang: SunwaysLang = lang === "TH" ? "EN" : "TH";
      setBundle(otherLang, (prev) => ({
        ...prev,
        fanCheck: { ...prev.fanCheck, [key]: value },
      }));
    }
  };

  const handleImageUpload = async (
    slot: "installation" | "portal" | "backup",
    files: FileList | null
  ) => {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter((f) => f.size <= 20 * 1024 * 1024);
    if (validFiles.length === 0) {
      Swal.fire("ไฟล์มีขนาดใหญ่เกิน 20MB", "กรุณาเลือกไฟล์ภาพที่ขนาดไม่เกิน 20MB", "warning");
      return;
    }

    setUploadingSlot(slot);
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const uploadedUrls: string[] = [];

      for (const file of validFiles) {
        const suffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `sunways-${slot}-${suffix}-${safeName}`;
        const { data, error } = await supabase.storage
          .from("uploadsService")
          .upload(path, file, { contentType: file.type, upsert: true });

        if (error) {
          console.error("Supabase upload error:", error);
          continue;
        }
        const {
          data: { publicUrl },
        } = supabase.storage.from("uploadsService").getPublicUrl(data.path);
        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length > 0) {
        if (slot === "installation") {
          setInstallationImages((prev) => [...prev, ...uploadedUrls]);
        } else if (slot === "portal") {
          setPortalImages((prev) => [...prev, ...uploadedUrls]);
        } else {
          setBackupImages((prev) => [...prev, ...uploadedUrls]);
        }
      } else {
        Swal.fire("อัปโหลดรูปไม่สำเร็จ", "กรุณาตรวจสอบไฟล์และลองใหม่อีกครั้ง", "error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      Swal.fire("เกิดข้อผิดพลาดในการอัปโหลด", msg, "error");
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleTranslateDirection = async (from: SunwaysLang, to: SunwaysLang) => {
    const source = from === "TH" ? thData : enData;
    setTranslating(true);
    try {
      const res = await translateSunwaysBundle(source, to);
      if (!res.success || !res.data) {
        Swal.fire("แปลข้อความไม่สำเร็จ", res.error || "กรุณาลองใหม่อีกครั้ง", "error");
        return;
      }

      const translated = res.data;
      if (to === "EN") {
        setEnData(translated);
        setActiveLang("EN");
      } else {
        setThData(translated);
        setActiveLang("TH");
      }

      Swal.fire({
        icon: "success",
        title:
          to === "EN"
            ? "แปลข้อมูลเป็นภาษาอังกฤษเรียบร้อย (TH → EN)"
            : "แปลข้อมูลเป็นภาษาไทยเรียบร้อย (EN → TH)",
        text: "คุณสามารถตรวจสอบหรือปรับแก้ไขข้อความภาษาปลายทางได้ทันที หรือเปิดโหมดเทียบ 2 ภาษา",
        timer: 2200,
        showConfirmButton: false,
      });
    } finally {
      setTranslating(false);
    }
  };

  const handleSubmit = async (openPrintAfter = false) => {
    const primary = activeLang === "TH" ? thData : enData;
    if (!primary.companyName.trim() && !primary.plantName.trim() && !primary.serialNumber.trim()) {
      Swal.fire(
        "กรุณากรอกข้อมูลสำคัญ",
        "โปรดระบุอย่างน้อย ชื่อบริษัท (Company Name), ชื่อโครงการ (Plant Name) หรือ Serial Number",
        "warning"
      );
      return;
    }

    setSaving(true);
    try {
      const bilingualData: SunwaysBilingualData = {
        th: thData,
        en: enData,
        portalImages,
        backupImages,
      };

      const payload: SunwaysReportPayload = {
        reportNumber: initialReport?.reportNumber,
        reportDate,
        status,
        defaultLang: activeLang,
        active: primary,
        bilingualData,
        mpptRows,
        installationImages,
      };

      const res =
        mode === "edit" && initialReport?.id
          ? await updateSunwaysReport(initialReport.id, payload)
          : await createSunwaysReport(payload);

      if (!res.success || !res.data) {
        Swal.fire("บันทึกไม่สำเร็จ", res.error || "กรุณาลองใหม่อีกครั้ง", "error");
        return;
      }

      await Swal.fire({
        icon: "success",
        title: mode === "edit" ? "บันทึกการแก้ไขแล้ว" : "สร้างรายงาน Sunways เรียบร้อยแล้ว",
        text: `เลขที่เอกสาร: ${res.data.reportNumber}`,
        timer: 1400,
        showConfirmButton: false,
      });

      if (openPrintAfter) {
        router.push(`/service/sunways-reports/${res.data.id}/print`);
      } else {
        router.push("/service/sunways-reports");
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const renderDualOrSingleInput = (
    field: BilingualTextField,
    label: { th: string; en: string },
    options?: { multiline?: boolean; rows?: number; placeholderTh?: string; placeholderEn?: string }
  ) => {
    const isTextarea = Boolean(options?.multiline);
    const rows = options?.rows || 3;

    const renderControl = (lang: SunwaysLang) => {
      const val = (lang === "TH" ? thData : enData)[field];
      const ph = lang === "TH" ? options?.placeholderTh || label.th : options?.placeholderEn || label.en;
      const commonClass =
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all";
      if (isTextarea) {
        return (
          <textarea
            rows={rows}
            value={val}
            onChange={(e) => updateTextField(lang, field, e.target.value)}
            placeholder={ph}
            className={commonClass}
          />
        );
      }
      return (
        <input
          type="text"
          value={val}
          onChange={(e) => updateTextField(lang, field, e.target.value)}
          placeholder={ph}
          className={commonClass}
        />
      );
    };

    return (
      <div>
        <BilingualLabel th={label.th} en={label.en} />
        {sideBySide ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <div className="text-[10px] font-bold uppercase text-orange-600 mb-1">
                ภาษาไทย (TH)
              </div>
              {renderControl("TH")}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-indigo-600 mb-1">
                English (EN)
              </div>
              {renderControl("EN")}
            </div>
          </div>
        ) : (
          renderControl(activeLang)
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-24">
      {/* Top Sticky Action Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/service/sunways-reports"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              รายการทั้งหมด
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold italic font-serif tracking-tight">
                  <span className="text-[#E87722]">sun</span>
                  <span className="text-[#594D46]">ways</span>
                </span>
                <span className="text-sm font-bold text-slate-900">
                  Inverter Check Points
                </span>
                {initialReport?.reportNumber && (
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold">
                    {initialReport.reportNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                แบบฟอร์มตรวจสอบและตรวจรับอินเวอร์เตอร์ Sunways (รองรับภาษาไทย ↔ อังกฤษ ครบ 4 หน้า)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              บันทึกข้อมูล
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-sm disabled:opacity-60"
            >
              <Printer className="w-4 h-4" />
              บันทึก & พิมพ์ PDF
            </button>
          </div>
        </div>

        {/* Bilingual Toolbar */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setSideBySide(false);
                  setActiveLang("TH");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  !sideBySide && activeLang === "TH"
                    ? "bg-white text-orange-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                กรอกภาษาไทย (TH)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSideBySide(false);
                  setActiveLang("EN");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  !sideBySide && activeLang === "EN"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Fill in English (EN)
              </button>
              <button
                type="button"
                onClick={() => setSideBySide((s) => !s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                  sideBySide
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                เทียบ 2 ภาษา (TH / EN)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={translating}
              onClick={() => handleTranslateDirection("TH", "EN")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold disabled:opacity-60"
            >
              {translating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Languages className="w-3.5 h-3.5" />
              )}
              แปลข้อมูลทั้งหมด ไทย → อังกฤษ
            </button>
            <button
              type="button"
              disabled={translating}
              onClick={() => handleTranslateDirection("EN", "TH")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-semibold disabled:opacity-60"
            >
              {translating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowLeftRight className="w-3.5 h-3.5" />
              )}
              แปลข้อมูลทั้งหมด อังกฤษ → ไทย
            </button>
          </div>
        </div>
      </div>

      {/* Document Meta (Date + Status + Inspector) */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <BilingualLabel th="วันที่รายงาน" en="Date" required />
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 outline-none"
            />
          </div>
          <div>
            <BilingualLabel th="สถานะรายงาน" en="Report Status" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SunwaysReportStatus)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 outline-none bg-white"
            >
              <option value="DRAFT">แบบร่าง (Draft)</option>
              <option value="COMPLETED">ตรวจเช็คเสร็จสิ้น (Completed)</option>
              <option value="SUBMITTED">ส่งรายงานให้ลูกค้า/Sunways แล้ว (Submitted)</option>
            </select>
          </div>
          <div>
            {renderDualOrSingleInput("inspectorName", {
              th: SUNWAYS_FIELD_LABELS.inspectorName.th,
              en: SUNWAYS_FIELD_LABELS.inspectorName.en,
            })}
          </div>
        </div>
      </section>

      {/* ==================== SECTION 1: PAGE 1 METADATA & INSTALLATION IMAGE ==================== */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center">
              1
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                หน้าที่ 1: ข้อมูลทั่วไปของโครงการและอินเวอร์เตอร์
              </h2>
              <p className="text-xs text-slate-500">
                Inverter Check Points — Company, Plant & Inverter Specification
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Searchable DB Company Combobox (or free-text + quick save to Clients DB) */}
          <div ref={companyDropdownRef} className="relative">
            <div className="flex items-start justify-between gap-2">
              <BilingualLabel
                th={SUNWAYS_FIELD_LABELS.companyName.th}
                en={SUNWAYS_FIELD_LABELS.companyName.en}
              />
              <div className="flex items-center gap-1.5 pt-0.5">
                {linkedCompany && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                    <Database className="w-3 h-3" />
                    เชื่อมฐานข้อมูลแล้ว
                  </span>
                )}
                {currentBundle.companyName && (
                  <button
                    type="button"
                    onClick={() => {
                      updateTextField(activeLang, "companyName", "");
                      if (sideBySide) {
                        updateTextField("TH", "companyName", "");
                        updateTextField("EN", "companyName", "");
                      }
                      setLinkedCompany(null);
                      setCompanyResults(recentCompanies);
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-600 inline-flex items-center gap-0.5"
                    title="ล้างชื่อบริษัท"
                  >
                    <X className="w-3 h-3" />
                    ล้าง
                  </button>
                )}
              </div>
            </div>

            {sideBySide ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <div className="text-[10px] font-bold uppercase text-orange-600 mb-1">
                    ภาษาไทย (TH — พิมพ์ค้นหาฐานข้อมูลได้)
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={thData.companyName}
                      onChange={(e) => handleCompanyInputChange("TH", e.target.value)}
                      onFocus={() => {
                        setIsCompanyDropdownOpen(true);
                        if (!thData.companyName.trim()) {
                          setCompanyResults(recentCompanies);
                        }
                      }}
                      placeholder="พิมพ์ค้นหาชื่อบริษัท หรือพิมพ์เพิ่มเอง..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-indigo-600 mb-1">
                    English (EN)
                  </div>
                  <input
                    type="text"
                    value={enData.companyName}
                    onChange={(e) => updateTextField("EN", "companyName", e.target.value)}
                    placeholder="Company Name"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={currentBundle.companyName}
                  onChange={(e) => handleCompanyInputChange(activeLang, e.target.value)}
                  onFocus={() => {
                    setIsCompanyDropdownOpen(true);
                    if (!currentBundle.companyName.trim()) {
                      setCompanyResults(recentCompanies);
                    }
                  }}
                  placeholder={
                    activeLang === "TH"
                      ? "พิมพ์ค้นหาจากฐานข้อมูลลูกค้า (ชื่อบริษัท / ผู้ติดต่อ / เบอร์ / Tax ID) หรือพิมพ์ใหม่ได้เลย..."
                      : "Search company database or type a custom company name..."
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-9 text-sm text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                />
                <div className="absolute right-2.5 top-2.5 text-slate-400">
                  {searchingCompanies ? (
                    <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </div>
              </div>
            )}

            {isCompanyDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-72 overflow-y-auto z-40 divide-y divide-slate-100">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between bg-slate-50/70">
                  <span>
                    {(sideBySide ? thData.companyName : currentBundle.companyName).trim()
                      ? `ผลการค้นหาในฐานข้อมูล (${companyResults.length})`
                      : `ลูกค้าในฐานข้อมูลล่าสุด (${companyResults.length})`}
                  </span>
                  {searchingCompanies && (
                    <span className="text-orange-600 inline-flex items-center gap-1 font-normal">
                      <Loader2 className="w-3 h-3 animate-spin" /> กำลังค้นหา...
                    </span>
                  )}
                </div>

                {companyResults.length > 0 ? (
                  companyResults.map((comp) => (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() =>
                        handleSelectCompany(comp, sideBySide ? "TH" : activeLang)
                      }
                      className="w-full text-left px-3 py-2.5 hover:bg-orange-50/70 transition-colors flex flex-col gap-0.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          {comp.companyName}
                        </span>
                        {comp.taxId && (
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            Tax: {comp.taxId}
                          </span>
                        )}
                      </div>
                      {(comp.address || comp.province) && (
                        <div className="text-[11px] text-slate-500 truncate pl-5">
                          {[comp.address, comp.district, comp.province]
                            .filter(Boolean)
                            .join(" ")}
                        </div>
                      )}
                      {comp.contacts[0] && (
                        <div className="text-[10px] text-slate-400 pl-5">
                          ผู้ติดต่อ: {comp.contacts[0].contactName}
                          {comp.contacts[0].mobilePhone
                            ? ` (${comp.contacts[0].mobilePhone})`
                            : ""}
                          {comp.contacts[0].email ? ` • ${comp.contacts[0].email}` : ""}
                        </div>
                      )}
                    </button>
                  ))
                ) : !searchingCompanies ? (
                  <div className="px-3 py-3 text-xs text-slate-500">
                    ไม่พบชื่อนี้ในฐานข้อมูลลูกค้า (สามารถใช้งานชื่อที่พิมพ์นี้ต่อได้ทันที)
                  </div>
                ) : null}

                {(() => {
                  const typedQuery = (
                    sideBySide ? thData.companyName : currentBundle.companyName
                  ).trim();
                  const exactMatch = companyResults.some(
                    (c) => c.companyName.trim().toLowerCase() === typedQuery.toLowerCase()
                  );
                  if (!typedQuery || exactMatch) return null;
                  return (
                    <div className="p-2 bg-orange-50/50">
                      <button
                        type="button"
                        disabled={creatingCompany}
                        onClick={() =>
                          handleQuickCreateCompany(
                            typedQuery,
                            sideBySide ? "TH" : activeLang
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg bg-white hover:bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60"
                      >
                        {creatingCompany ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        บันทึก &ldquo;{typedQuery}&rdquo; เพิ่มเข้าฐานข้อมูลลูกค้า (Clients)
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div>
            {renderDualOrSingleInput(
              "communicationPerson",
              SUNWAYS_FIELD_LABELS.communicationPerson
            )}
            {linkedCompany && linkedCompany.contacts.length > 1 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400">เลือกผู้ติดต่อจากฐานข้อมูล:</span>
                {linkedCompany.contacts.map((ct) => (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => applyContactOption(ct, activeLang)}
                    className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                      currentBundle.communicationPerson === ct.contactName.trim()
                        ? "bg-orange-50 text-orange-700 border-orange-300 font-semibold"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {ct.contactName}
                  </button>
                ))}
              </div>
            )}
          </div>
          {renderDualOrSingleInput("contactDetail", SUNWAYS_FIELD_LABELS.contactDetail, {
            placeholderTh: "เบอร์โทร / อีเมลผู้ติดต่อ",
            placeholderEn: "Phone / Email",
          })}
          {renderDualOrSingleInput("plantName", SUNWAYS_FIELD_LABELS.plantName)}
          {renderDualOrSingleInput("country", SUNWAYS_FIELD_LABELS.country)}
          {renderDualOrSingleInput("plantCapacity", SUNWAYS_FIELD_LABELS.plantCapacity, {
            placeholderTh: "เช่น 50 kWp / 100 kW",
            placeholderEn: "e.g. 50 kWp",
          })}
          {renderDualOrSingleInput("inverterModel", SUNWAYS_FIELD_LABELS.inverterModel, {
            placeholderTh: "เช่น STT-50KTL / STS-6KTL",
            placeholderEn: "e.g. STT-50KTL",
          })}
          {renderDualOrSingleInput("serialNumber", SUNWAYS_FIELD_LABELS.serialNumber)}
          {renderDualOrSingleInput("firmwareVersion", SUNWAYS_FIELD_LABELS.firmwareVersion)}
          {renderDualOrSingleInput("countryCode", SUNWAYS_FIELD_LABELS.countryCode)}
          {renderDualOrSingleInput("dataloggerSn", SUNWAYS_FIELD_LABELS.dataloggerSn)}
          {renderDualOrSingleInput(
            "externalDataloggerDetails",
            SUNWAYS_FIELD_LABELS.externalDataloggerDetails
          )}
        </div>

        {renderDualOrSingleInput("faultObserved", SUNWAYS_FIELD_LABELS.faultObserved, {
          multiline: true,
          rows: 3,
          placeholderTh: "ระบุรหัส Error / อาการผิดปกติที่พบเบื้องต้น...",
          placeholderEn: "Describe observed fault codes or symptoms...",
        })}

        {/* Installation Images */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <BilingualLabel
              th={SUNWAYS_FIELD_LABELS.installationImage.th}
              en={SUNWAYS_FIELD_LABELS.installationImage.en}
            />
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-semibold cursor-pointer">
              {uploadingSlot === "installation" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImagePlus className="w-3.5 h-3.5" />
              )}
              อัปโหลดรูปหน้างาน
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleImageUpload("installation", e.target.files)}
              />
            </label>
          </div>
          {installationImages.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {installationImages.map((url, idx) => (
                <div
                  key={idx}
                  className="relative group border border-slate-200 rounded-xl overflow-hidden bg-slate-50 aspect-[4/3]"
                >
                  <img
                    src={url}
                    alt={`Installation ${idx + 1}`}
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setInstallationImages((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-rose-600 text-white opacity-90 hover:opacity-100 shadow"
                    title="ลบรูปภาพ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center text-xs text-slate-400">
              ยังไม่มีรูปภาพหน้างานการติดตั้ง (จะแสดงในกล่อง Installation Image หน้า 1)
            </div>
          )}
        </div>
      </section>

      {/* ==================== SECTION 2: PAGE 2 DATALOGGER & PORTAL + ITEMS 1-4 ==================== */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center">
            2
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              หน้าที่ 2: Datalogger, ข้อมูล Portal และรายการตรวจสอบ 1–4
            </h2>
            <p className="text-xs text-slate-500">
              Datalogger Software, Portal Faults & Inspection Items (1–4)
            </p>
          </div>
        </div>

        {renderDualOrSingleInput(
          "dataloggerSoftwareVersion",
          SUNWAYS_FIELD_LABELS.dataloggerSoftwareVersion
        )}

        {renderDualOrSingleInput(
          "portalFaultObserved",
          SUNWAYS_FIELD_LABELS.portalFaultObserved,
          {
            multiline: true,
            rows: 4,
            placeholderTh: "บันทึกอาการผิดปกติที่ตรวจพบจาก Backup data หรือบน Portal...",
            placeholderEn: "Describe faults observed from backed data or monitoring portal...",
          }
        )}

        {/* Portal Screenshots */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700">
              รูปภาพหน้าจอ Portal / กราฟแจ้งเตือน (แนบเพิ่มได้ในหน้า 2)
            </span>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer">
              {uploadingSlot === "portal" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              แนบรูป Portal
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleImageUpload("portal", e.target.files)}
              />
            </label>
          </div>
          {portalImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {portalImages.map((url, idx) => (
                <div
                  key={idx}
                  className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 aspect-[4/3]"
                >
                  <img src={url} alt={`Portal ${idx + 1}`} className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() =>
                      setPortalImages((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-rose-600 text-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inspection Items 1-4 */}
        <div className="space-y-4">
          {SUNWAYS_INSPECTION_ITEMS.filter((it) => it.page === 2).map((item, idx) => (
            <InspectionCard
              key={item.key}
              index={idx + 1}
              item={item}
              activeLang={activeLang}
              sideBySide={sideBySide}
              thData={thData}
              enData={enData}
              onUpdateResult={updateInspectionField}
              extraMiddleContent={
                item.key === "cables" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-sky-50/70 rounded-xl border border-sky-100">
                    {(
                      [
                        ["acCables", SUNWAYS_FIELD_LABELS.cableAc],
                        ["acCableType", SUNWAYS_FIELD_LABELS.cableAcType],
                        ["dcCables", SUNWAYS_FIELD_LABELS.cableDc],
                        ["dcCableType", SUNWAYS_FIELD_LABELS.cableDcType],
                      ] as const
                    ).map(([subKey, lbl]) => (
                      <div key={subKey}>
                        <div className="text-[11px] font-semibold text-slate-700 mb-1">
                          {activeLang === "TH" ? lbl.th : lbl.en}
                        </div>
                        {sideBySide ? (
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="text"
                              value={thData.cablesSpec[subKey]}
                              onChange={(e) => updateCableField("TH", subKey, e.target.value)}
                              placeholder="TH"
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                            />
                            <input
                              type="text"
                              value={enData.cablesSpec[subKey]}
                              onChange={(e) => updateCableField("EN", subKey, e.target.value)}
                              placeholder="EN"
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                            />
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={currentBundle.cablesSpec[subKey]}
                            onChange={(e) =>
                              updateCableField(activeLang, subKey, e.target.value)
                            }
                            placeholder="เช่น 4x16 sq.mm / XLPE"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : null
              }
            />
          ))}
        </div>
      </section>

      {/* ==================== SECTION 3: PAGE 3 ITEMS 5-8 + MPPT + FAN ==================== */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
            3
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              หน้าที่ 3: รายการตรวจสอบ 5–8, ตารางค่า MPPT และสถานะพัดลม
            </h2>
            <p className="text-xs text-slate-500">
              Grounding, AC Measurement, PV Module, LCD, MPPT DC Values & Fan Status
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {SUNWAYS_INSPECTION_ITEMS.filter((it) => it.page === 3).map((item, idx) => (
            <InspectionCard
              key={item.key}
              index={idx + 5}
              item={item}
              activeLang={activeLang}
              sideBySide={sideBySide}
              thData={thData}
              enData={enData}
              onUpdateResult={updateInspectionField}
              extraMiddleContent={
                item.key === "ac_measurement" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                    {(
                      [
                        ["phaseA", SUNWAYS_FIELD_LABELS.acPhaseA],
                        ["phaseB", SUNWAYS_FIELD_LABELS.acPhaseB],
                        ["phaseC", SUNWAYS_FIELD_LABELS.acPhaseC],
                        ["frequency", SUNWAYS_FIELD_LABELS.acFreq],
                      ] as const
                    ).map(([subKey, lbl]) => (
                      <div key={subKey}>
                        <div className="text-[11px] font-semibold text-slate-700 mb-1">
                          {activeLang === "TH" ? lbl.th : lbl.en}
                        </div>
                        <input
                          type="text"
                          value={currentBundle.acMeasurement[subKey]}
                          onChange={(e) => updateAcField(activeLang, subKey, e.target.value)}
                          placeholder={subKey === "frequency" ? "50.0 Hz" : "230V / 15.2A"}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                ) : item.key === "pv_module" ? (
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                    {renderDualOrSingleInput("pvModuleWp", SUNWAYS_FIELD_LABELS.pvModuleWp, {
                      placeholderTh: "เช่น 550 Wp (จำนวน 80 แผง)",
                      placeholderEn: "e.g. 550 Wp x 80 panels",
                    })}
                  </div>
                ) : null
              }
            />
          ))}
        </div>

        {/* MPPT Measurement Table */}
        <div className="pt-2 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                ตารางตรวจวัดค่า DC แต่ละ MPPT (MPPT Measurements)
              </h3>
              <p className="text-xs text-slate-500">
                รองรับแบบ 2 คอลัมน์คู่ (12 MPPT) ตามแบบฟอร์ม PDF และสามารถเพิ่มแถวได้
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setMpptRows((prev) => [
                  ...prev,
                  {
                    mppt: `MPPT ${prev.length + 1}`,
                    dcVoltage: "",
                    dcCurrent: "",
                    stringsPv: "",
                  },
                ])
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่ม MPPT
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left">MPPT</th>
                  <th className="px-3 py-2 text-left">DC Voltage (V)</th>
                  <th className="px-3 py-2 text-left">DC Current (A)</th>
                  <th className="px-3 py-2 text-left">Strings / PV</th>
                  <th className="px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mpptRows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.mppt}
                        onChange={(e) =>
                          setMpptRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, mppt: e.target.value } : r))
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.dcVoltage}
                        onChange={(e) =>
                          setMpptRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, dcVoltage: e.target.value } : r
                            )
                          )
                        }
                        placeholder="V"
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.dcCurrent}
                        onChange={(e) =>
                          setMpptRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, dcCurrent: e.target.value } : r
                            )
                          )
                        }
                        placeholder="A"
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.stringsPv}
                        onChange={(e) =>
                          setMpptRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, stringsPv: e.target.value } : r
                            )
                          )
                        }
                        placeholder="เช่น 2 Strings / 18 Panels"
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                      />
                    </td>
                    <td className="p-2 text-center">
                      {mpptRows.length > 6 && (
                        <button
                          type="button"
                          onClick={() =>
                            setMpptRows((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Check Fan Status Block */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
          <div>
            <div className="text-sm font-bold text-slate-900">
              {SUNWAYS_FIELD_LABELS.fanStatusTitle.th} / {SUNWAYS_FIELD_LABELS.fanStatusTitle.en}
            </div>
            <div className="text-xs text-slate-500">
              {SUNWAYS_FIELD_LABELS.fanStatusDesc.th} ({SUNWAYS_FIELD_LABELS.fanStatusDesc.en})
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(
              [
                ["fansWorking", "fansWorkingNote", SUNWAYS_FIELD_LABELS.fanAllWorking],
                ["nothingStuck", "nothingStuckNote", SUNWAYS_FIELD_LABELS.fanNothingStuck],
                ["restartNoiseCheck", "fanNoiseNote", SUNWAYS_FIELD_LABELS.fanRestartNoise],
              ] as const
            ).map(([flagKey, noteKey, lbl]) => {
              const currentFlag = currentBundle.fanCheck[flagKey];
              return (
                <div key={flagKey} className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                  <div className="text-xs font-semibold text-slate-800">{lbl.th}</div>
                  <div className="text-[11px] text-slate-500">{lbl.en}</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateFanField(activeLang, flagKey, "YES")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                        currentFlag === "YES"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      ปกติ / Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => updateFanField(activeLang, flagKey, "NO")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                        currentFlag === "NO"
                          ? "bg-rose-600 text-white border-rose-600"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      พบปัญหา / No
                    </button>
                  </div>
                  <input
                    type="text"
                    value={currentBundle.fanCheck[noteKey]}
                    onChange={(e) => updateFanField(activeLang, noteKey, e.target.value)}
                    placeholder={activeLang === "TH" ? "รายละเอียดเพิ่มเติม..." : "Note..."}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== SECTION 4: PAGE 4 OBSERVATIONS & REMARKS ==================== */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
            4
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              หน้าที่ 4: ข้อสังเกตข้อมูลสำรองและหมายเหตุเพิ่มเติม
            </h2>
            <p className="text-xs text-slate-500">
              Back up data Observation & Other Remarks or note
            </p>
          </div>
        </div>

        {renderDualOrSingleInput(
          "backupDataObservation",
          SUNWAYS_FIELD_LABELS.backupObservation,
          {
            multiline: true,
            rows: 4,
            placeholderTh: "สรุปผลการวิเคราะห์ข้อมูล Log / Backup data ของอินเวอร์เตอร์...",
            placeholderEn: "Summarize backup data / inverter log observations...",
          }
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700">
              แนบรูปประกอบ Backup Data / กราฟ (หน้า 4)
            </span>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer">
              {uploadingSlot === "backup" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImagePlus className="w-3.5 h-3.5" />
              )}
              แนบรูป Backup Data
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleImageUpload("backup", e.target.files)}
              />
            </label>
          </div>
          {backupImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {backupImages.map((url, idx) => (
                <div
                  key={idx}
                  className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 aspect-[4/3]"
                >
                  <img src={url} alt={`Backup ${idx + 1}`} className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() =>
                      setBackupImages((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-rose-600 text-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {renderDualOrSingleInput("otherRemarks", SUNWAYS_FIELD_LABELS.otherRemarks, {
          multiline: true,
          rows: 4,
          placeholderTh: "หมายเหตุหรือข้อเสนอแนะเพิ่มเติมสำหรับทีมวิศวกรหรือลูกค้า...",
          placeholderEn: "Other remarks or follow-up notes...",
        })}
      </section>

      {/* Bottom Save Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>ระบบบันทึกข้อมูลทั้งฉบับภาษาไทย (TH) และภาษาอังกฤษ (EN) ไว้พร้อมกัน</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit(false)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
          >
            <Save className="w-4 h-4" />
            บันทึกข้อมูล
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold"
          >
            <FileText className="w-4 h-4" />
            บันทึก & เปิดหน้าพิมพ์ 4 หน้า
          </button>
        </div>
      </div>
    </div>
  );
}

function InspectionCard({
  index,
  item,
  activeLang,
  sideBySide,
  thData,
  enData,
  onUpdateResult,
  extraMiddleContent,
}: {
  index: number;
  item: (typeof SUNWAYS_INSPECTION_ITEMS)[number];
  activeLang: SunwaysLang;
  sideBySide: boolean;
  thData: SunwaysTextBundle;
  enData: SunwaysTextBundle;
  onUpdateResult: (
    lang: SunwaysLang,
    key: SunwaysInspectionKey,
    part: "result" | "suggestion",
    value: string
  ) => void;
  extraMiddleContent?: React.ReactNode;
}) {
  const presetsTh = ["ปกติ", "ผ่าน", "ไม่พบสิ่งผิดปกติ", "ผิดปกติ"];
  const presetsEn = ["Normal", "Pass", "No abnormality found", "Abnormal"];
  const currentRes = (activeLang === "TH" ? thData : enData).inspectionResults[item.key];

  return (
    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/40 space-y-3">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
        <div>
          <div className="text-sm font-bold text-slate-900">
            {index}. {item.titleTh}
          </div>
          <div className="text-xs font-medium text-slate-600">{item.titleEn}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            เกณฑ์ตรวจเช็ค: {item.contentTh} ({item.contentEn})
          </div>
        </div>
        {!sideBySide && (
          <div className="flex flex-wrap gap-1 shrink-0">
            {(activeLang === "TH" ? presetsTh : presetsEn).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onUpdateResult(activeLang, item.key, "result", preset)}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                  currentRes?.result === preset
                    ? "bg-orange-600 text-white border-orange-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        )}
      </div>

      {extraMiddleContent}

      {sideBySide ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(["TH", "EN"] as const).map((lang) => {
            const val = (lang === "TH" ? thData : enData).inspectionResults[item.key];
            return (
              <div
                key={lang}
                className="space-y-2 p-2.5 rounded-xl bg-white border border-slate-200"
              >
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  {lang === "TH" ? "ภาษาไทย (TH)" : "English (EN)"}
                </div>
                <textarea
                  rows={2}
                  value={val?.result || ""}
                  onChange={(e) => onUpdateResult(lang, item.key, "result", e.target.value)}
                  placeholder={lang === "TH" ? "ผลการตรวจสอบ" : "Inspection results"}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                />
                <textarea
                  rows={2}
                  value={val?.suggestion || ""}
                  onChange={(e) => onUpdateResult(lang, item.key, "suggestion", e.target.value)}
                  placeholder={lang === "TH" ? "ข้อเสนอแนะ" : "Suggestion"}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] font-semibold text-slate-700 mb-1">
              {activeLang === "TH" ? "ผลการตรวจสอบ (Inspection results)" : "Inspection results"}
            </div>
            <textarea
              rows={2}
              value={currentRes?.result || ""}
              onChange={(e) =>
                onUpdateResult(activeLang, item.key, "result", e.target.value)
              }
              placeholder={
                activeLang === "TH" ? "กรอกผลการตรวจสอบ..." : "Enter inspection results..."
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-700 mb-1">
              {activeLang === "TH" ? "ข้อเสนอแนะ (Suggestion)" : "Suggestion"}
            </div>
            <textarea
              rows={2}
              value={currentRes?.suggestion || ""}
              onChange={(e) =>
                onUpdateResult(activeLang, item.key, "suggestion", e.target.value)
              }
              placeholder={
                activeLang === "TH" ? "กรอกข้อเสนอแนะ..." : "Enter suggestion..."
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
