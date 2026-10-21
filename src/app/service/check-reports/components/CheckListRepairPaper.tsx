"use client";

import React from "react";

interface CheckListRepairPaperProps {
  report: any;
  className?: string;
}

export default function CheckListRepairPaper({
  report,
  className = "",
}: CheckListRepairPaperProps) {
  const checkDateStr = report?.checkDate
    ? new Date(report.checkDate).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "-";

  const diode = report?.diodeMeasurement || {};
  const pInput = report?.powerInputVoltage || {};
  const pOutput = report?.powerOutputVoltage || {};
  const hasPowerVoltage = Boolean(
    pInput.inputDc ||
      pInput.input1PhaseAc ||
      pInput.input3PhaseRs ||
      pOutput.output1PhaseLn ||
      pOutput.output3Phase220Uv ||
      pOutput.output3Phase380Uv
  );

  const compCode = (report?.companyCode || "TG").toUpperCase();
  const logoSrc =
    compCode === "TE"
      ? "/6.png"
      : compCode === "TP"
      ? "/7.png"
      : "/4.png";

  const companyTitle =
    compCode === "TP"
      ? "บริษัท เทอรา พาวเวอร์ จำกัด"
      : compCode === "TE"
      ? "บริษัท เทอรา อิเล็คทริค แอนด์ เอ็นเนอร์ยี่ จำกัด"
      : "บริษัท เทอรา กรุ๊ป จำกัด";

  // Parse CR Number e.g. CR69-03009 into [ 69 ] and [ 03009 ]
  const rawCr = (report?.crNumber || "").replace(/^CR/i, "").trim();
  const crParts = rawCr.split(/[-_]/);
  const crYear = crParts[0] || "69";
  const crSeq = crParts.slice(1).join("-") || (rawCr ? rawCr : "00000");

  return (
    <div
      className={`check-list-repair-paper bg-white border-2 border-black w-full max-w-[840px] p-6 text-black text-[11px] leading-snug font-['Sarabun',sans-serif] flex flex-col justify-between box-border mx-auto print:border-none print:p-0 ${className}`}
      style={{ boxSizing: "border-box" }}
    >
      <div>
        {/* Header matching Excel layout */}
        <div className="flex items-center justify-between border-b-2 border-black pb-2.5 mb-2.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-24 flex items-center justify-start shrink-0">
              <img
                src={logoSrc}
                alt={compCode}
                className="max-h-10 max-w-full object-contain"
              />
            </div>
            <div>
              <div className="font-bold text-[13px]">{companyTitle}</div>
              <div className="text-[10px] text-gray-600">
                Service & Engineering Division — Inverter Inspection & Repair
              </div>
            </div>
          </div>

          {/* Top right CR number matching Screenshot 4: เลขที่ CR  [ 69 ]  [ 03009 ] */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span>เลขที่ CR</span>
              <span className="border border-black px-2.5 py-0.5 min-w-[34px] text-center font-mono font-bold bg-white text-black text-[12px]">
                {crYear}
              </span>
              <span className="border border-black px-3.5 py-0.5 min-w-[60px] text-center font-mono font-bold bg-white text-black text-[12px]">
                {crSeq}
              </span>
            </div>
            {report?.convertedJobNumber && (
              <div className="text-[10px] font-bold text-gray-700 mt-1 font-mono">
                Ref RO: {report.convertedJobNumber}
              </div>
            )}
          </div>
        </div>

        {/* Title Matching Screenshot 4 */}
        <div className="text-center mb-1">
          <h2 className="text-base font-bold uppercase tracking-wide">
            Check list repair
          </h2>
          <div className="text-xs text-gray-700">
            (รายงานการตรวจเช็คอินเวอร์เตอร์)
          </div>
        </div>

        {/* Subtext Matching Screenshot 4 */}
        <div className="text-[11px] text-gray-800 mb-1 font-medium">
          กรอกข้อมูลลงในตารางให้ครบถ้วน
        </div>

        {/* Top Summary Table matching Screenshot 4 */}
        <table className="w-full border-collapse border border-black text-[11px] text-center mb-2">
          <thead>
            <tr className="bg-neutral-100 font-bold">
              <th className="border border-black p-1.5 w-[14%]">วันที่ตรวจเช็ค</th>
              <th className="border border-black p-1.5 w-[22%]">ชื่อบริษัทลูกค้า</th>
              <th className="border border-black p-1.5 w-[14%]">Inverter ยี่ห้อ</th>
              <th className="border border-black p-1.5 w-[16%]">Model</th>
              <th className="border border-black p-1.5 w-[16%]">Serial No.</th>
              <th className="border border-black p-1.5 w-[9%]">ผู้ตรวจสอบ</th>
              <th className="border border-black p-1.5 w-[9%]">เซลล์ผู้ดูแล</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1.5 font-mono">{checkDateStr}</td>
              <td className="border border-black p-1.5 font-medium text-left px-2">
                {report?.customerCompany || report?.customerName || "-"}
              </td>
              <td className="border border-black p-1.5 font-bold uppercase">
                {diode.inverterBrand || report?.inverterBrand || "-"}
              </td>
              <td className="border border-black p-1.5 font-bold font-mono">
                {diode.inverterModel || report?.inverterModel || "-"}
              </td>
              <td className="border border-black p-1.5 font-mono text-[10px]">
                {diode.inverterSerial || report?.serialNumber || "-"}
              </td>
              <td className="border border-black p-1.5">
                {report?.inspectorName || "-"}
              </td>
              <td className="border border-black p-1.5">
                {report?.salesPerson || "-"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Symptoms Row matching Screenshot 4 */}
        <div className="border border-black p-2 mb-3 bg-white text-[11.5px] leading-relaxed">
          <span className="font-bold">อาการเสีย : </span>
          <span className="font-medium text-gray-900">
            {report?.symptoms || "ไม่ระบุอาการเสีย"}
          </span>
        </div>

        {/* หัวข้อการตรวจเช็ค Section Header matching Screenshot 5 */}
        <div className="font-bold text-[12px] bg-white border border-black text-center py-1 mb-2">
          หัวข้อการตรวจเช็ค
        </div>

        {/* 1. ตรวจเช็คพาวเวอร์บอร์ด */}
        <div className="mb-3">
          <div className="font-bold text-[11.5px] mb-1.5">
            1. ตรวจเช็คพาวเวอร์บอร์ด
          </div>

          <div className="grid grid-cols-3 gap-2.5 mb-2">
            {/* 1.1 ตรวจเช็คไดโอด Module IGBT */}
            <div className="flex flex-col items-center">
              <div className="font-bold text-[10px] mb-1 text-center w-full min-h-[24px] flex items-center justify-center">
                1.1 ตรวจเช็คไอโอด Module IGBT
              </div>
              <div className="w-full h-40 border border-black bg-white flex items-center justify-center p-1 overflow-hidden">
                {diode.meterPhotoDiode ? (
                  <img
                    src={diode.meterPhotoDiode}
                    alt="Meter 1.1 Diode IGBT"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-gray-400 p-2">
                    <span className="text-[9.5px] font-mono block">(ไม่มีรูปถ่ายมิเตอร์ 1.1)</span>
                    <span className="text-[8.5px] text-gray-400">ภาพมิเตอร์วัดไดโอด Module IGBT</span>
                  </div>
                )}
              </div>
              {/* Box matching Screenshot 5: Module IGBT ใช้งานได้ปกติ/ไม่ปกติ */}
              <div className="border border-black text-center py-1 px-1.5 font-bold text-[10px] bg-white mt-1 w-full">
                Module IGBT ใช้งานได้
                {diode.igbtStatus === "NORMAL" ? (
                  <>
                    <span className="text-[#008000] font-black underline ml-1">ปกติ</span>
                    <span className="text-gray-400 font-normal">/ไม่ปกติ</span>
                  </>
                ) : diode.igbtStatus === "ABNORMAL" ? (
                  <>
                    <span className="text-gray-400 font-normal ml-1">ปกติ/</span>
                    <span className="text-rose-600 font-black underline">ไม่ปกติ</span>
                  </>
                ) : (
                  <>
                    <span className="text-[#008000] font-bold ml-1">ปกติ</span>
                    <span className="text-gray-600">/ไม่ปกติ</span>
                  </>
                )}
              </div>
            </div>

            {/* 1.2 ตรวจสอบแต่ละเฟสถึงกันหรือไม่ */}
            <div className="flex flex-col items-center">
              <div className="font-bold text-[10px] mb-1 text-center w-full min-h-[24px] flex items-center justify-center">
                1.2 ตรวจสอบแต่ละเฟสถึงกันหรือไม่
              </div>
              <div className="w-full h-40 border border-black bg-white flex items-center justify-center p-1 overflow-hidden">
                {diode.meterPhotoPhase ? (
                  <img
                    src={diode.meterPhotoPhase}
                    alt="Meter 1.2 Phase Short"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-gray-400 p-2">
                    <span className="text-[9.5px] font-mono block">(ไม่มีรูปถ่ายมิเตอร์ 1.2)</span>
                    <span className="text-[8.5px] text-gray-400">ภาพมิเตอร์วัดแต่ละเฟสถึงกัน</span>
                  </div>
                )}
              </div>
              {/* Box matching Screenshot 5: เฟสถึงกัน/ไม่ถึงกัน */}
              <div className="border border-black text-center py-1 px-1.5 font-bold text-[10px] bg-white mt-1 w-full">
                {diode.phaseShortCheck === "SHORT" ? (
                  <>
                    <span className="text-rose-600 font-black underline">เฟสถึงกัน</span>
                    <span className="text-gray-400 font-normal">/ไม่ถึงกัน</span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-500 font-normal">เฟสถึงกัน/</span>
                    <span className="text-[#008000] font-black underline">ไม่ถึงกัน</span>
                  </>
                )}
              </div>
            </div>

            {/* 1.3 ตรวจเช็คไฟ 24 Vdc ออกจากบอร์ดหรือไม่ */}
            <div className="flex flex-col items-center">
              <div className="font-bold text-[10px] mb-1 text-center w-full min-h-[24px] flex items-center justify-center">
                1.3 ตรวจเช็คไฟ 24 Vdc ออกจากบอร์ดหรือไม่
              </div>
              <div className="w-full h-40 border border-black bg-white flex items-center justify-center p-1 overflow-hidden">
                {diode.meterPhotoPower24V ? (
                  <img
                    src={diode.meterPhotoPower24V}
                    alt="Meter 1.3 Power 24V"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-gray-400 p-2">
                    <span className="text-[9.5px] font-mono block">(ไม่มีรูปถ่ายมิเตอร์ 1.3)</span>
                    <span className="text-[8.5px] text-gray-400">ภาพมิเตอร์ไฟ 24 Vdc บอร์ด</span>
                  </div>
                )}
              </div>
              <div className="border border-black text-center py-1 px-1 font-bold text-[10px] bg-white mt-1 w-full truncate">
                {diode.powerBoard24VStatus === "NORMAL" ? (
                  <span className="text-[#008000] font-black underline">
                    ปกติ (มีไฟ {diode.powerBoard24VValue ? `${diode.powerBoard24VValue}` : "24 Vdc"})
                  </span>
                ) : diode.powerBoard24VStatus === "ABNORMAL" ? (
                  <span className="text-rose-600 font-black underline">
                    ผิดปกติ (ไม่มีไฟ)
                  </span>
                ) : (
                  <span className="text-gray-700 font-medium">
                    ไฟ 24 Vdc บอร์ด: มีไฟ / ไม่มีไฟ
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. ตรวจเช็คบอร์ดคอนโทรล */}
        <div className="mb-3">
          <div className="font-bold text-[11.5px] mb-1.5">
            2. ตรวจเช็คบอร์ดคอนโทรล
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-2">
            {/* 2.1 ตรวจเช็คไฟ 24 Vdc ออกจากเทอร์มินอลหรือไม่ เช่น DI1 X1 */}
            <div className="flex flex-col items-center">
              <div className="font-bold text-[10px] mb-1 text-center w-full min-h-[24px] flex items-center justify-center">
                2.1 ตรวจเช็คไฟ 24 Vdc ออกจากเทอร์มินอล เช่น DI1 X1
              </div>
              <div className="w-full h-36 border border-black bg-white flex items-center justify-center p-1 overflow-hidden">
                {diode.meterPhotoControl24V ? (
                  <img
                    src={diode.meterPhotoControl24V}
                    alt="Meter 2.1 Control 24V"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-gray-400 p-2">
                    <span className="text-[9.5px] font-mono block">(ไม่มีรูปถ่ายมิเตอร์ 2.1)</span>
                    <span className="text-[8.5px] text-gray-400">ภาพมิเตอร์ไฟ 24 Vdc เทอร์มินอล</span>
                  </div>
                )}
              </div>
              <div className="border border-black text-center py-1 px-1 font-bold text-[10px] bg-white mt-1 w-full truncate">
                {diode.controlBoard24VStatus === "NORMAL" ? (
                  <span className="text-[#008000] font-black underline">
                    ปกติ (มีไฟ {diode.controlBoard24VValue ? `${diode.controlBoard24VValue}` : "24 Vdc"})
                  </span>
                ) : diode.controlBoard24VStatus === "ABNORMAL" ? (
                  <span className="text-rose-600 font-black underline">
                    ผิดปกติ (ไม่มีไฟ)
                  </span>
                ) : (
                  <span className="text-gray-700 font-medium">
                    ไฟ 24 Vdc เทอร์มินอล: มีไฟ / ไม่มีไฟ
                  </span>
                )}
              </div>
            </div>

            {/* 2.2 ตรวจเช็คไฟ 10 Vdc ออกจากเทอร์มินอลหรือไม่ เช่น +10V เทียบ GND */}
            <div className="flex flex-col items-center">
              <div className="font-bold text-[10px] mb-1 text-center w-full min-h-[24px] flex items-center justify-center">
                2.2 ตรวจเช็คไฟ 10 Vdc ออกจากเทอร์มินอล เช่น +10V เทียบ GND
              </div>
              <div className="w-full h-36 border border-black bg-white flex items-center justify-center p-1 overflow-hidden">
                {diode.meterPhotoControl10V ? (
                  <img
                    src={diode.meterPhotoControl10V}
                    alt="Meter 2.2 Control 10V"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-gray-400 p-2">
                    <span className="text-[9.5px] font-mono block">(ไม่มีรูปถ่ายมิเตอร์ 2.2)</span>
                    <span className="text-[8.5px] text-gray-400">ภาพมิเตอร์ไฟ 10 Vdc (+10V-GND)</span>
                  </div>
                )}
              </div>
              <div className="border border-black text-center py-1 px-1 font-bold text-[10px] bg-white mt-1 w-full truncate">
                {diode.controlBoard10VStatus === "NORMAL" ? (
                  <span className="text-[#008000] font-black underline">
                    ปกติ (มีไฟ {diode.controlBoard10VValue ? `${diode.controlBoard10VValue}` : "10 Vdc"})
                  </span>
                ) : diode.controlBoard10VStatus === "ABNORMAL" ? (
                  <span className="text-rose-600 font-black underline">
                    ผิดปกติ (ไม่มีไฟ)
                  </span>
                ) : (
                  <span className="text-gray-700 font-medium">
                    ไฟ 10 Vdc เทอร์มินอล: มีไฟ / ไม่มีไฟ
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. ตรวจเช็คคาปาซิเตอร์ตัวใหญ่ */}
        <div className="mb-3">
          <div className="font-bold text-[11.5px] mb-1">
            3. ตรวจเช็คคาปาซิเตอร์ตัวใหญ่
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-2">
            <div className="border border-black p-2 bg-white flex flex-col justify-between">
              <div className="space-y-1 text-[10.5px]">
                <div>
                  <span className="font-bold">สภาพคาปาซิเตอร์: </span>
                  {diode.capacitorStatus === "NORMAL" ? (
                    <span className="font-bold text-[#008000]">ปกติ (ไม่บวม / ไม่รั่วซึม)</span>
                  ) : diode.capacitorStatus === "ABNORMAL" ? (
                    <span className="font-bold text-rose-600">ผิดปกติ (บวม / รั่วซึม / เสื่อมสภาพ)</span>
                  ) : (
                    <span className="text-gray-600">ยังไม่ได้ระบุ</span>
                  )}
                </div>
                <div>
                  <span className="font-bold">ค่าความจุ / รายละเอียด: </span>
                  <span>{diode.capacitorValue || "สภาพสมบูรณ์ ไม่พบคราบน้ำยาหรือรอยบวม"}</span>
                </div>
              </div>
              <div className="border border-black text-center py-1 px-2 font-bold text-[10px] bg-white mt-2">
                คาปาซิเตอร์ตัวใหญ่:{" "}
                {diode.capacitorStatus === "NORMAL" ? (
                  <span className="text-[#008000] font-black underline">ปกติ</span>
                ) : diode.capacitorStatus === "ABNORMAL" ? (
                  <span className="text-rose-600 font-black underline">ไม่ปกติ</span>
                ) : (
                  <span className="text-gray-600 font-normal">ปกติ / ไม่ปกติ</span>
                )}
              </div>
            </div>

            <div className="w-full h-32 border border-black bg-white flex items-center justify-center p-1 overflow-hidden">
              {diode.photoCapacitor ? (
                <img
                  src={diode.photoCapacitor}
                  alt="3. Capacitors"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-gray-400 p-2">
                  <span className="text-[9.5px] font-mono block">(ไม่มีรูปถ่ายคาปาซิเตอร์ 3)</span>
                  <span className="text-[8.5px] text-gray-400">ภาพคาปาซิเตอร์ตัวใหญ่ DC Bus</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. ทำการบันทึกค่าพารามิเตอร์(ให้พิมพ์เอา) */}
        <div className="mb-3">
          <div className="font-bold text-[11.5px] mb-1">
            4. ทำการบันทึกค่าพารามิเตอร์(ให้พิมพ์เอา)
          </div>
          <div className="border border-black p-2 bg-white min-h-[44px] font-mono text-[10px] whitespace-pre-wrap leading-relaxed">
            {diode.parameterNotes ? (
              diode.parameterNotes
            ) : (
              <span className="text-gray-400 font-sans italic">
                - ไม่ได้ระบุหรือสำรองค่าพารามิเตอร์ -
              </span>
            )}
          </div>
        </div>

        {/* ================= SECTION: ผลการตรวจวัดไดโอดภายในตัวเครื่องอินเวอร์เตอร์ (Screenshot 3) ================= */}
        <div className="mb-4">
          <div className="text-center font-bold text-[12px] mb-1.5">
            ผลการตรวจวัดไดโอดภายในตัวเครื่องอินเวอร์เตอร์
          </div>

          {/* TABLE 1: ขั้ว (+) Matching Top Table in Screenshot 3 */}
          <table className="w-full border-collapse border-2 border-black text-[10px] text-center mb-2.5">
            <thead>
              <tr className="border-b border-black">
                {/* Left Header */}
                <th className="border-r border-black p-1 font-bold w-[12%] bg-white" rowSpan={1}>
                  สายมัลติมิเตอร์ขั้วลบ (สีดำ)
                </th>
                <th className="border-r-2 border-black p-1 font-bold w-[38%] bg-white" colSpan={4}>
                  สายมัลติมิเตอร์ขั้วบวก (สีแดง)
                </th>
                {/* Right Header */}
                <th className="border-r border-black p-1 font-bold w-[12%] bg-white" rowSpan={1}>
                  สายมัลติมิเตอร์ขั้วบวก (สีแดง)
                </th>
                <th className="p-1 font-bold w-[38%] bg-white" colSpan={4}>
                  สายมัลติมิเตอร์ขั้วลบ (สีดำ)
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: R & U */}
              <tr className="border-b border-black">
                {/* Left (+) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white" rowSpan={1}>
                  +
                </td>
                <td className="border-r border-black font-bold p-1 w-[8%] bg-[#b4a7d6]">
                  R
                </td>
                <td className="border-r border-black font-mono p-1 w-[11%] bg-white">
                  {diode.pos_to_r_black || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 w-[8%] bg-[#f6b26b]">
                  U
                </td>
                <td className="border-r-2 border-black font-mono p-1 w-[11%] bg-white">
                  {diode.pos_to_u_red || "-"}
                </td>

                {/* Right (+) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white" rowSpan={1}>
                  +
                </td>
                <td className="border-r border-black font-bold p-1 w-[8%] bg-[#b4a7d6]">
                  R
                </td>
                <td className="border-r border-black font-mono p-1 w-[11%] bg-white">
                  {diode.pos_to_r_red || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 w-[8%] bg-[#f6b26b]">
                  U
                </td>
                <td className="font-mono p-1 w-[11%] bg-white">
                  {diode.pos_to_u_black || "-"}
                </td>
              </tr>

              {/* Row 2: S & V */}
              <tr className="border-b border-black">
                {/* Left (+) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  +
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#b4a7d6]">
                  S
                </td>
                <td className="border-r border-black font-mono p-1 bg-white">
                  {diode.pos_to_s_black || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#f6b26b]">
                  V
                </td>
                <td className="border-r-2 border-black font-mono p-1 bg-white">
                  {diode.pos_to_v_red || "-"}
                </td>

                {/* Right (+) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  +
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#b4a7d6]">
                  S
                </td>
                <td className="border-r border-black font-mono p-1 bg-white">
                  {diode.pos_to_s_red || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#f6b26b]">
                  V
                </td>
                <td className="font-mono p-1 bg-white">
                  {diode.pos_to_v_black || "-"}
                </td>
              </tr>

              {/* Row 3: T & W */}
              <tr>
                {/* Left (+) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  +
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#b4a7d6]">
                  T
                </td>
                <td className="border-r border-black font-mono p-1 bg-white">
                  {diode.pos_to_t_black || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#f6b26b]">
                  W
                </td>
                <td className="border-r-2 border-black font-mono p-1 bg-white">
                  {diode.pos_to_w_red || "-"}
                </td>

                {/* Right (+) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  +
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#b4a7d6]">
                  T
                </td>
                <td className="border-r border-black font-mono p-1 bg-white">
                  {diode.pos_to_t_red || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#f6b26b]">
                  W
                </td>
                <td className="font-mono p-1 bg-white">
                  {diode.pos_to_w_black || "-"}
                </td>
              </tr>
            </tbody>
          </table>

          {/* TABLE 2: ขั้ว (-) Matching Bottom Table in Screenshot 3 */}
          <table className="w-full border-collapse border-2 border-black text-[10px] text-center">
            <thead>
              <tr className="border-b border-black">
                {/* Left Header */}
                <th className="border-r border-black p-1 font-bold w-[12%] bg-white" rowSpan={1}>
                  สายมัลติมิเตอร์ขั้วบวก (สีแดง)
                </th>
                <th className="border-r-2 border-black p-1 font-bold w-[38%] bg-white" colSpan={4}>
                  สายมัลติมิเตอร์ขั้วลบ (สีดำ)
                </th>
                {/* Right Header */}
                <th className="border-r border-black p-1 font-bold w-[12%] bg-white" rowSpan={1}>
                  สายมัลติมิเตอร์ขั้วลบ (สีดำ)
                </th>
                <th className="p-1 font-bold w-[38%] bg-white" colSpan={4}>
                  สายมัลติมิเตอร์ขั้วบวก (สีแดง)
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: R & U */}
              <tr className="border-b border-black">
                {/* Left (-) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  -
                </td>
                <td className="border-r border-black font-bold p-1 w-[8%] bg-[#b4a7d6]">
                  R
                </td>
                <td className="border-r border-black font-mono p-1 w-[11%] bg-white">
                  {diode.neg_to_r_red || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 w-[8%] bg-[#f6b26b]">
                  U
                </td>
                <td className="border-r-2 border-black font-mono p-1 w-[11%] bg-white">
                  {diode.neg_to_u_black || "-"}
                </td>

                {/* Right (-) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  -
                </td>
                <td className="border-r border-black font-bold p-1 w-[8%] bg-[#b4a7d6]">
                  R
                </td>
                <td className="border-r border-black font-mono p-1 w-[11%] bg-white">
                  {diode.neg_to_r_black || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 w-[8%] bg-[#f6b26b]">
                  U
                </td>
                <td className="font-mono p-1 w-[11%] bg-white">
                  {diode.neg_to_u_red || "-"}
                </td>
              </tr>

              {/* Row 2: S & V */}
              <tr className="border-b border-black">
                {/* Left (-) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  -
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#b4a7d6]">
                  S
                </td>
                <td className="border-r border-black font-mono p-1 bg-white">
                  {diode.neg_to_s_red || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#f6b26b]">
                  V
                </td>
                <td className="border-r-2 border-black font-mono p-1 bg-white">
                  {diode.neg_to_v_black || "-"}
                </td>

                {/* Right (-) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  -
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#b4a7d6]">
                  S
                </td>
                <td className="border-r border-black font-mono p-1 bg-white">
                  {diode.neg_to_s_black || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#f6b26b]">
                  V
                </td>
                <td className="font-mono p-1 bg-white">
                  {diode.neg_to_v_red || "-"}
                </td>
              </tr>

              {/* Row 3: T & W */}
              <tr>
                {/* Left (-) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  -
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#b4a7d6]">
                  T
                </td>
                <td className="border-r border-black font-mono p-1 bg-white">
                  {diode.neg_to_t_red || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#f6b26b]">
                  W
                </td>
                <td className="border-r-2 border-black font-mono p-1 bg-white">
                  {diode.neg_to_w_black || "-"}
                </td>

                {/* Right (-) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  -
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#b4a7d6]">
                  T
                </td>
                <td className="border-r border-black font-mono p-1 bg-white">
                  {diode.neg_to_t_black || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#f6b26b]">
                  W
                </td>
                <td className="font-mono p-1 bg-white">
                  {diode.neg_to_w_red || "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* POWER VOLTAGE SECTION (ถ้ามีค่าหรือบันทึกหลัง QC) */}
        {hasPowerVoltage && (
          <div className="mb-4">
            <div className="font-bold text-[11.5px] mb-1">
              การตรวจวัดแรงดันไฟฟ้า (Power Voltage Measurement - หลัง QC ทดสอบเครื่อง)
            </div>
            <table className="w-full border-collapse border border-black text-[10.5px] mb-2">
              <tbody>
                <tr className="bg-neutral-100">
                  <td className="border border-black p-1 font-bold" colSpan={2}>
                    POWER INPUT VOLTAGE (ก่อน/ระหว่างติดตั้ง)
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 w-1/2">
                    1 เฟส DC (+) , (-) : <b>{pInput.inputDc ? `${pInput.inputDc} Vdc` : "-"}</b>
                  </td>
                  <td className="border border-black p-1 w-1/2">
                    1 เฟส (220-230Vac) L-N : <b>{pInput.input1PhaseAc ? `${pInput.input1PhaseAc} Vac` : "-"}</b>
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1" colSpan={2}>
                    3 เฟส (380-400Vac) R-S : <b>{pInput.input3PhaseRs ? `${pInput.input3PhaseRs} Vac` : "-"}</b> , 
                    R-T : <b>{pInput.input3PhaseRt ? `${pInput.input3PhaseRt} Vac` : "-"}</b> , 
                    S-T : <b>{pInput.input3PhaseSt ? `${pInput.input3PhaseSt} Vac` : "-"}</b>
                  </td>
                </tr>
                <tr className="bg-neutral-100">
                  <td className="border border-black p-1 font-bold" colSpan={2}>
                    POWER OUTPUT VOLTAGE (ระหว่างตรวจเช็ค)
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1">
                    1 เฟส L-N (220-230Vac) : <b>{pOutput.output1PhaseLn ? `${pOutput.output1PhaseLn} Vac` : "-"}</b>
                  </td>
                  <td className="border border-black p-1">
                    3 เฟส (220-230Vac) U-V: <b>{pOutput.output3Phase220Uv || "-"}</b>, U-W: <b>{pOutput.output3Phase220Uw || "-"}</b>, V-W: <b>{pOutput.output3Phase220Vw || "-"}</b>
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1" colSpan={2}>
                    3 เฟส (380-400Vac) U-V : <b>{pOutput.output3Phase380Uv ? `${pOutput.output3Phase380Uv} Vac` : "-"}</b> , 
                    U-W : <b>{pOutput.output3Phase380Uw ? `${pOutput.output3Phase380Uw} Vac` : "-"}</b> , 
                    V-W : <b>{pOutput.output3Phase380Vw ? `${pOutput.output3Phase380Vw} Vac` : "-"}</b>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Findings & Required Parts */}
        <div className="mb-4 border border-black p-2 text-[10.5px] space-y-1 bg-white">
          <div>
            <span className="font-bold">สาเหตุความเสียหาย / ข้อวินิจฉัย: </span>
            <span>{report?.causeOfFault || "-"}</span>
          </div>
          <div>
            <span className="font-bold">ข้อเสนอแนะในการซ่อมแซม: </span>
            <span>{report?.recommendations || "-"}</span>
          </div>
          <div>
            <span className="font-bold">อะไหล่ที่ต้องเปลี่ยน: </span>
            <span>
              {Array.isArray(report?.requireParts) && report.requireParts.length > 0
                ? report.requireParts
                    .map((p: any) => `${p.partName || "-"} (${p.qty || 1} ชิ้น)`)
                    .join(", ")
                : "ไม่มี / ซ่อมระดับบอร์ด"}
            </span>
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="border border-black grid grid-cols-2 text-center text-[10.5px] mt-2 print:break-inside-avoid">
        <div className="border-r border-black p-2 flex flex-col justify-between min-h-[80px]">
          <div className="font-bold">ผู้ทำรายงาน / ช่างผู้ตรวจเช็ค (Inspector)</div>
          <div className="my-auto py-1">
            <div className="font-bold">
              ( {report?.inspectorName || "......................................................"} )
            </div>
            <div className="text-[10px] mt-0.5 text-gray-800">วันที่ {checkDateStr}</div>
          </div>
        </div>
        <div className="p-2 flex flex-col justify-between min-h-[80px]">
          <div className="font-bold">ผู้ตรวจสอบ / หัวหน้างาน (Approved By)</div>
          <div className="my-auto py-1">
            <div className="font-bold">
              ( {report?.approvedByName || report?.reportBy || "......................................................"} )
            </div>
            <div className="text-[10px] mt-0.5 text-gray-800">
              {report?.approvedDate
                ? new Date(report.approvedDate).toLocaleDateString("th-TH")
                : "วันที่ ........ / ........ / ................"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
