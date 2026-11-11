"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit2, Maximize2, Minimize2, Printer } from "lucide-react";

interface PrintButtonProps {
  deliveryId?: string;
  children?: React.ReactNode;
}

export default function PrintButton({ deliveryId, children }: PrintButtonProps) {
  const [scale, setScale] = useState(1);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [fitToScreen, setFitToScreen] = useState(true);

  useEffect(() => {
    const updateScale = () => {
      const vw = window.innerWidth;
      // 210mm at 96 DPI is ~794px
      const a4WidthPx = 794;
      const paddingPx = 16;
      if (vw < a4WidthPx + paddingPx) {
        setIsMobileViewport(true);
        const computed = Math.max(0.32, Math.min(1, (vw - paddingPx) / a4WidthPx));
        setScale(computed);
      } else {
        setIsMobileViewport(false);
        setScale(1);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  if (!children) {
    return (
      <button
        onClick={() => window.print()}
        className="px-6 py-2.5 bg-[#ff2301] text-white rounded-xl shadow-lg hover:bg-[#d61e00] font-bold text-sm tracking-widest uppercase transition-all"
      >
        พิมพ์ใบส่งมอบงาน
      </button>
    );
  }

  const shouldScale = isMobileViewport && fitToScreen && scale < 1;
  // 297mm at 96 DPI is ~1123px
  const scaledHeightPx = Math.ceil(1123 * scale) + 16;

  return (
    <>
      {/* Top Action Bar (Hidden when printing) */}
      <div className="print:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 px-3 py-2.5 sm:px-4 sm:py-3 mb-3 sm:mb-4 shadow-xs">
        <div className="max-w-[210mm] mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/repair-deliveries"
              className="inline-flex items-center gap-1.5 px-3 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
              <span>กลับ</span>
              <span className="hidden sm:inline">หน้ารายการ</span>
            </Link>

            {deliveryId && deliveryId !== "blank" && (
              <Link
                href={`/repair-deliveries/${deliveryId}/edit`}
                className="inline-flex items-center gap-1.5 px-3 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-all active:scale-95"
              >
                <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                <span>แก้ไข / เซ็น</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {isMobileViewport && (
              <button
                type="button"
                onClick={() => setFitToScreen((prev) => !prev)}
                className="inline-flex items-center gap-1 px-2.5 h-10 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-700 active:scale-95 transition-all"
                title={fitToScreen ? "สลับเป็นขนาดจริง 100%" : "ย่อให้พอดีจอมือถือ"}
              >
                {fitToScreen ? (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-gray-500" />
                    <span>100%</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-[#ff2301]" />
                    <span>พอดีจอ</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 h-10 bg-[#ff2301] hover:bg-[#d61e00] text-white rounded-xl shadow-md shadow-red-500/20 font-bold text-xs sm:text-sm transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Screen Stage (Print CSS keeps 1:1 A4) */}
      <div
        className={`pdf-scale-outer ${shouldScale ? "is-scaled" : ""}`}
        style={
          shouldScale
            ? ({
                "--pdf-scale": scale,
                "--pdf-scaled-height": `${scaledHeightPx}px`,
              } as React.CSSProperties)
            : undefined
        }
      >
        <div className={`pdf-scale-stage ${shouldScale ? "is-scaled" : ""}`}>
          {children}
        </div>
      </div>
    </>
  );
}
