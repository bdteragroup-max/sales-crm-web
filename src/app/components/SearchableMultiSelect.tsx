"use client"

import React, { useState, useRef, useEffect } from "react"
import { ChevronDown, X } from "lucide-react"

export default function SearchableMultiSelect({ 
  values, 
  onChange, 
  options, 
  placeholder,
  disabled = false,
  className = ""
}: { 
  values: string[], 
  onChange: (vals: string[]) => void, 
  options: { label: string, value: string }[],
  placeholder: string,
  disabled?: boolean,
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredOptions = query === "" 
    ? options 
    : options.filter(opt => opt.label.toLowerCase().includes(query.toLowerCase()))

  const toggleOption = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter(v => v !== val))
    } else {
      onChange([...values, val])
    }
  }

  const removeOption = (val: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(values.filter(v => v !== val))
  }

  return (
    <div className={`relative w-full ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`} ref={wrapperRef}>
      <div 
        className="min-h-[44px] w-full px-2 py-1.5 bg-white border border-gray-200 rounded-md flex flex-wrap gap-2 items-center cursor-text focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-transparent relative pr-8 transition-all"
        onClick={() => {
          if (!disabled) setIsOpen(true)
        }}
      >
        {values.length === 0 && query === "" && !isOpen && (
          <span className="text-gray-400 text-sm absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {placeholder}
          </span>
        )}
        
        {values.map(val => {
          const opt = options.find(o => o.value === val)
          return (
            <span key={val} className="flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-md text-xs font-medium">
              {opt ? opt.label : val}
              {!disabled && (
                <button type="button" onClick={(e) => removeOption(val, e)} className="text-orange-500 hover:text-orange-800">
                  <X size={14} />
                </button>
              )}
            </span>
          )
        })}

        <input 
          type="text"
          className="flex-1 min-w-[60px] bg-transparent outline-none text-sm text-gray-700 py-1 px-1"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          disabled={disabled}
        />
        
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
      
      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-y-auto max-h-[200px] flex flex-col p-1">
          {filteredOptions.map((opt, i) => {
            const isSelected = values.includes(opt.value)
            return (
              <div 
                key={i}
                className={`px-3 py-2 text-sm rounded-md cursor-pointer transition-colors flex items-center justify-between ${isSelected ? 'bg-orange-50 text-orange-700 font-bold' : 'hover:bg-gray-50 text-gray-700'}`}
                onClick={() => {
                  toggleOption(opt.value)
                  // Don't close so they can select multiple
                  // setIsOpen(false) 
                  // setQuery("")
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <span className="w-2 h-2 rounded-full bg-orange-500"></span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
