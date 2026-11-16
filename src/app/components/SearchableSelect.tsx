"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronDown } from "lucide-react"

type DropdownCoords = {
  left: number
  width: number
  top?: number
  bottom?: number
  maxHeight: number
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className = "",
  inputClassName = "",
  onCreate,
  isCreating = false,
}: {
  value: string
  onChange: (val: string) => void
  options: { label: string; value: string }[]
  placeholder: string
  disabled?: boolean
  className?: string
  inputClassName?: string
  onCreate?: (val: string) => void
  isCreating?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [coords, setCoords] = useState<DropdownCoords | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label || ""
  const displayValue = isOpen ? query : selectedLabel

  const updateCoords = useCallback(() => {
    const el = wrapperRef.current
    if (!el || typeof window === "undefined") return
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const edgeGap = 8
    const safeWidth = Math.max(Math.min(rect.width, vw - edgeGap * 2), 120)
    const clampedLeft = Math.max(edgeGap, Math.min(rect.left, vw - safeWidth - edgeGap))
    const spaceBelow = vh - rect.bottom - edgeGap
    const spaceAbove = rect.top - edgeGap
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow
    const maxHeight = Math.min(240, Math.max(120, openUp ? spaceAbove - 4 : spaceBelow - 4))

    setCoords({
      left: clampedLeft,
      width: safeWidth,
      top: openUp ? undefined : rect.bottom + 4,
      bottom: openUp ? vh - rect.top + 4 : undefined,
      maxHeight,
    })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node
      if (wrapperRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return
      }
      setIsOpen(false)
    }
    function handleScrollOrResize() {
      updateCoords()
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    window.addEventListener("scroll", handleScrollOrResize, true)
    window.addEventListener("resize", handleScrollOrResize)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
      window.removeEventListener("scroll", handleScrollOrResize, true)
      window.removeEventListener("resize", handleScrollOrResize)
    }
  }, [isOpen, updateCoords])

  const filteredOptions =
    query === ""
      ? options
      : options.filter((opt) => opt.label.toLowerCase().includes(query.toLowerCase()))

  const exactMatch = options.some((opt) => opt.label.toLowerCase() === query.toLowerCase())

  return (
    <div className={`relative w-full ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`} ref={wrapperRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          className={`w-full px-3.5 py-2 text-base sm:text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] pr-9 transition-all min-h-[42px] sm:min-h-[38px] ${inputClassName}`}
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!isOpen) updateCoords()
            setIsOpen(true)
          }}
          onFocus={() => {
            if (disabled) return
            setQuery("")
            updateCoords()
            setIsOpen(true)
          }}
          disabled={disabled}
        />
        <ChevronDown size={15} className="absolute right-3 text-gray-400 pointer-events-none" />
      </div>

      {isOpen &&
        !disabled &&
        coords &&
        (filteredOptions.length > 0 || (Boolean(query.trim()) && !exactMatch && Boolean(onCreate))) &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              maxHeight: `${coords.maxHeight}px`,
            }}
            className="z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl overflow-y-auto flex flex-col p-1 overscroll-contain"
          >
            {filteredOptions.map((opt, i) => (
              <div
                key={i}
                className={`px-3 py-2.5 sm:py-2 text-sm rounded-lg cursor-pointer transition-colors break-words whitespace-normal ${
                  value === opt.value ? "bg-red-50 text-[#ff2301] font-bold" : "hover:bg-gray-100 text-gray-700"
                }`}
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                  setQuery("")
                }}
              >
                {opt.label}
              </div>
            ))}
            {query.trim() && !exactMatch && onCreate && (
              <div
                className={`px-3 py-2.5 sm:py-2 text-sm rounded-lg cursor-pointer font-medium text-[#ff2301] hover:bg-red-50 flex items-center justify-between ${
                  isCreating ? "opacity-50 pointer-events-none" : ""
                }`}
                onClick={() => {
                  if (!isCreating) {
                    onCreate(query.trim())
                  }
                }}
              >
                <span className="break-words">+ สร้างลูกค้าใหม่: &ldquo;{query.trim()}&rdquo;</span>
                {isCreating && <span className="animate-spin border-2 border-[#ff2301] border-t-transparent rounded-full w-4 h-4"></span>}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}
