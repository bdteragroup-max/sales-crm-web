"use client"

import React, { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"

export default function SearchableSelect({ 
  value, 
  onChange, 
  options, 
  placeholder,
  disabled = false,
  className = "",
  onCreate,
  isCreating = false
}: { 
  value: string, 
  onChange: (val: string) => void, 
  options: { label: string, value: string }[],
  placeholder: string,
  disabled?: boolean,
  className?: string,
  onCreate?: (val: string) => void,
  isCreating?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const selected = options.find(o => o.value === value)
    if (!isOpen) {
      setQuery(selected ? selected.label : "")
    }
  }, [value, options, isOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        const selected = options.find(o => o.value === value)
        setQuery(selected ? selected.label : "")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [value, options])

  const filteredOptions = query === "" 
    ? options 
    : options.filter(opt => opt.label.toLowerCase().includes(query.toLowerCase()))

  const exactMatch = options.some(opt => opt.label.toLowerCase() === query.toLowerCase())

  return (
    <div className={`relative w-full ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`} ref={wrapperRef}>
      <div className="relative flex items-center">
        <input 
          type="text"
          className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-8"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => !disabled && setIsOpen(true)}
          disabled={disabled}
        />
        <ChevronDown size={14} className="absolute right-3 text-gray-400 pointer-events-none" />
      </div>
      
      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-y-auto max-h-[200px] flex flex-col p-1">
          {filteredOptions.map((opt, i) => (
            <div 
              key={i}
              className={`px-3 py-2 text-sm rounded-md cursor-pointer transition-colors ${value === opt.value ? 'bg-orange-50 text-orange-700 font-bold' : 'hover:bg-gray-50 text-gray-700'}`}
              onClick={() => {
                onChange(opt.value)
                setIsOpen(false)
                setQuery(opt.label)
              }}
            >
              {opt.label}
            </div>
          ))}
          {query && !exactMatch && onCreate && (
            <div 
              className={`px-3 py-2 text-sm rounded-md cursor-pointer font-medium text-[#ff2301] hover:bg-red-50 flex items-center justify-between ${isCreating ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => {
                if (!isCreating) {
                  onCreate(query)
                }
              }}
            >
              <span>+ สร้างลูกค้าใหม่: "{query}"</span>
              {isCreating && <span className="animate-spin border-2 border-[#ff2301] border-t-transparent rounded-full w-4 h-4"></span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
